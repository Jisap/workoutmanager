'use client';

import { useState, useMemo } from 'react';
import { useTransitionNavigate } from '@/components/layout/route-transition';
import {
  Flame,
  Calendar as CalendarIcon,
  TrendingUp,
  Clock,
  Dumbbell,
  Play,
  Plus,
  X,
  Layers,
  FileText,
  Sparkles,
  ChevronRight,
  Info,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export interface SetDetail {
  setNumber: number;
  weight: number | null;
  repCount: number | null;
  rpe: number | null;
  distance: number | null;
  durationSeconds: number | null;
}

export interface HeatmapExercise {
  name: string;
  orderIndex: number;
  sets: SetDetail[];
  maxWeight: number;
  volume: number;
}

export interface HeatmapWorkout {
  id: number;
  name: string;
  notes: string | null;
  startTime: Date | string;
  totalTimeSeconds: number | null;
  typeId: number;
  typeName: string;
  totalVolume: number;
  totalSetsCount: number;
  exercises: HeatmapExercise[];
}

export interface ConsistencyData {
  dailyCounts: Record<string, number>;
  workoutsByDate: Record<string, HeatmapWorkout[]>;
  currentStreak: number;
  longestStreak: number;
  totalWorkouts: number;
  avgPerWeek: number;
}

interface ConsistencyHeatmapProps {
  data: ConsistencyData;
}

export function ConsistencyHeatmap({ data }: ConsistencyHeatmapProps) {
  const navigate = useTransitionNavigate();

  // Día seleccionado actualmente para ver detalles en el modal / panel
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Generar los últimos 365 días
  const days = useMemo(() => {
    const result = [];
    const today = new Date();
    for (let i = 364; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const workouts = data.workoutsByDate?.[dateKey] || [];

      result.push({
        date: d,
        dateKey,
        count: data.dailyCounts[dateKey] || 0,
        workouts,
      });
    }
    return result;
  }, [data.dailyCounts, data.workoutsByDate]);

  // Función para determinar el color según la intensidad (estilo GitHub verde)
  const getColor = (count: number, isSelected: boolean) => {
    if (isSelected) return 'bg-purple-600 ring-2 ring-purple-600 ring-offset-1 z-10';
    if (count === 0) return 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700';
    if (count === 1) return 'bg-emerald-300 hover:bg-emerald-400';
    if (count === 2) return 'bg-emerald-500 hover:bg-emerald-600';
    return 'bg-emerald-700 hover:bg-emerald-800';
  };

  const selectedDayData = useMemo(() => {
    if (!selectedDateKey) return null;
    const dayObj = days.find((d) => d.dateKey === selectedDateKey);
    const workouts = data.workoutsByDate?.[selectedDateKey] || [];
    return {
      dateKey: selectedDateKey,
      date: dayObj ? dayObj.date : new Date(selectedDateKey),
      workouts,
    };
  }, [selectedDateKey, days, data.workoutsByDate]);

  const handleDayClick = (dateKey: string) => {
    setSelectedDateKey(dateKey);
    setIsModalOpen(true);
  };

  const handleRepeatWorkout = (workoutId: number) => {
    setIsModalOpen(false);
    navigate(`/workouts/log?mode=repeat&workoutId=${workoutId}`);
  };

  const handleStartNewWorkout = () => {
    setIsModalOpen(false);
    navigate('/workouts/new');
  };

  return (
    <div className="space-y-6">
      {/* 1. KPIs DE CONSISTENCIA */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-orange-200/90 bg-orange-50/70 shadow-2xs dark:border-orange-800/60 dark:bg-orange-950/40">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-orange-100 rounded-2xl text-orange-600 shadow-inner dark:bg-orange-900/30 dark:text-orange-400">
              <Flame className="w-6 h-6" />
            </div>

            <div>
              <p className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">Racha Actual</p>
              <p className="text-2xl font-black text-gray-900 dark:text-gray-100 tabular-nums">
                {data.currentStreak} <span className="text-sm font-medium text-gray-500 dark:text-gray-400">días seguidos</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200/90 bg-blue-50/70 shadow-2xs dark:border-blue-800/60 dark:bg-blue-950/40">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-2xl text-blue-600 shadow-inner dark:bg-blue-900/30 dark:text-blue-400">
              <TrendingUp className="w-6 h-6" />
            </div>

            <div>
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Racha Más Larga</p>
              <p className="text-2xl font-black text-gray-900 dark:text-gray-100 tabular-nums">
                {data.longestStreak} <span className="text-sm font-medium text-gray-500 dark:text-gray-400">días récord</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200/90 bg-purple-50/70 shadow-2xs dark:border-purple-800/60 dark:bg-purple-950/40">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-2xl text-purple-600 shadow-inner dark:bg-purple-900/30 dark:text-purple-400">
              <CalendarIcon className="w-6 h-6" />
            </div>

            <div>
              <p className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Frecuencia Semanal</p>
              <p className="text-2xl font-black text-gray-900 dark:text-gray-100 tabular-nums">
                {data.avgPerWeek} <span className="text-sm font-medium text-gray-500 dark:text-gray-400">días / semana</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. HEATMAP GRID INTERACTIVO ESTILO GITHUB */}
      <Card className="border-gray-200/90 shadow-xs dark:bg-gray-900 dark:border-gray-700">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" /> Mapa de Actividad (Últimos 12 Meses)
              </h3>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                Haz clic en cualquier día para ver el contenido del entrenamiento, sus series y poder repetirlo.
              </p>
            </div>

            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 self-start sm:self-auto bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
              <span className="text-[11px]">Menos</span>
              <div className="w-3 h-3 rounded-xs bg-gray-100 dark:bg-gray-800" />
              <div className="w-3 h-3 rounded-xs bg-emerald-300" />
              <div className="w-3 h-3 rounded-xs bg-emerald-500" />
              <div className="w-3 h-3 rounded-xs bg-emerald-700" />
              <span className="text-[11px]">Más</span>
            </div>
          </div>

          {/* Grid de 53 semanas x 7 días */}
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-1 min-w-max p-1">
              {Array.from({ length: 53 }).map((_, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-1">
                  {Array.from({ length: 7 }).map((_, dayIndex) => {
                    const globalIndex = 364 - (weekIndex * 7 + (6 - dayIndex));
                    const day = days[globalIndex];

                    if (!day) return <div key={dayIndex} className="w-3.5 h-3.5 rounded-xs" />;

                    const isSelected = selectedDateKey === day.dateKey;

                    return (
                      <button
                        key={dayIndex}
                        type="button"
                        onClick={() => handleDayClick(day.dateKey)}
                        className={`w-3.5 h-3.5 rounded-xs ${getColor(
                          day.count,
                          isSelected
                        )} transition-all active:scale-90 cursor-pointer relative group focus:outline-none`}
                        aria-label={`${day.date.toLocaleDateString('es-ES')}: ${day.count} entrenamiento(s)`}
                      >
                        {/* Tooltip flotante al pasar el cursor */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-30 pointer-events-none">
                          <div className="bg-gray-900 text-white text-[11px] rounded-lg px-2.5 py-1 whitespace-nowrap shadow-lg dark:bg-gray-700 dark:text-gray-100 dark:border dark:border-gray-600">
                            <span className="font-semibold">
                              {day.count === 0
                                ? 'Sin entrenamientos'
                                : `${day.count} ${day.count === 1 ? 'entrenamiento' : 'entrenamientos'}`}
                            </span>

                            <span className="block text-gray-300 dark:text-gray-300 text-[10px]">
                              {day.date.toLocaleDateString('es-ES', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 pt-1 border-t border-gray-100 dark:border-gray-800">
            <span>💡 Haz clic en cualquier recuadro para abrir el detalle completo.</span>
            <span>{data.totalWorkouts} días activos en total</span>
          </div>
        </CardContent>
      </Card>

      {/* 3. MODAL / DIALOG DETALLADO DEL DÍA SELECCIONADO */}
      {isModalOpen && selectedDayData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 dark:bg-gray-900 dark:border-gray-700 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header del Modal */}
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/80 dark:bg-gray-800/60">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CalendarIcon className="w-3.5 h-3.5" /> Detalle del Día
                </span>

                <h3 className="font-bold text-base text-gray-900 dark:text-gray-100 capitalize">
                  {selectedDayData.date.toLocaleDateString('es-ES', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </h3>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {selectedDayData.workouts.length === 0 ? (
                /* Caso: Día sin entrenamientos */
                <div className="text-center py-10 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500 flex items-center justify-center mx-auto">
                    <CalendarIcon className="w-6 h-6" />
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">Día de descanso</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto mt-1">
                      No hubo entrenamientos registrados en esta fecha. ¡El descanso también es parte del progreso!
                    </p>
                  </div>

                  <div className="pt-2">
                    <Button
                      onClick={handleStartNewWorkout}
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5 rounded-xl shadow-xs"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Iniciar un entrenamiento hoy</span>
                    </Button>
                  </div>
                </div>
              ) : (
                /* Caso: Lista de entrenamientos realizados ese día */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {selectedDayData.workouts.length}{' '}
                      {selectedDayData.workouts.length === 1
                        ? 'entrenamiento realizado'
                        : 'entrenamientos realizados'}
                    </span>

                    <Button
                      onClick={handleStartNewWorkout}
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 gap-1 text-gray-700 dark:text-gray-300 dark:border-gray-700"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Añadir otro hoy</span>
                    </Button>
                  </div>

                  {selectedDayData.workouts.map((workout) => (
                    <div
                      key={workout.id}
                      className="bg-gray-50/90 rounded-2xl p-4 border border-gray-200/90 dark:bg-gray-800/50 dark:border-gray-700 space-y-3.5 shadow-2xs"
                    >
                      {/* Cabecera del Entrenamiento */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-gray-200/70 dark:border-gray-700">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-sm sm:text-base text-gray-900 dark:text-gray-100">
                              {workout.name}
                            </h4>

                            {workout.typeName && (
                              <span className="px-2 py-0.5 text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full">
                                {workout.typeName}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {new Date(workout.startTime).toLocaleTimeString('es-ES', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            horas
                          </p>
                        </div>

                        {/* Botón de Repetir */}
                        <Button
                          onClick={() => handleRepeatWorkout(workout.id)}
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 rounded-xl shadow-xs self-start sm:self-auto active:scale-95 transition-all"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Repetir hoy</span>
                        </Button>
                      </div>

                      {/* KPIs del Entrenamiento */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-white p-2 rounded-xl border border-gray-200/70 dark:bg-gray-800 dark:border-gray-700">
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 block font-medium">Duración</span>
                          <span className="font-bold text-xs text-gray-900 dark:text-gray-100 tabular-nums">
                            {workout.totalTimeSeconds
                              ? `${Math.round(workout.totalTimeSeconds / 60)} min`
                              : '—'}
                          </span>
                        </div>

                        <div className="bg-white p-2 rounded-xl border border-gray-200/70 dark:bg-gray-800 dark:border-gray-700">
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 block font-medium">Volumen</span>
                          <span className="font-bold text-xs text-gray-900 dark:text-gray-100 tabular-nums">
                            {workout.totalVolume > 0
                              ? `${workout.totalVolume.toLocaleString('es-ES')} kg`
                              : '0 kg'}
                          </span>
                        </div>

                        <div className="bg-white p-2 rounded-xl border border-gray-200/70 dark:bg-gray-800 dark:border-gray-700">
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 block font-medium">Series</span>
                          <span className="font-bold text-xs text-gray-900 dark:text-gray-100 tabular-nums">
                            {workout.totalSetsCount} series
                          </span>
                        </div>
                      </div>

                      {/* Notas si existen */}
                      {workout.notes && (
                        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200">
                          <span className="font-semibold block text-[11px] text-amber-800 dark:text-amber-300">Notas:</span>
                          <p className="italic">{workout.notes}</p>
                        </div>
                      )}

                      {/* Desglose de Ejercicios y Series */}
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                          Ejercicios y Series Realizadas ({workout.exercises.length}):
                        </span>

                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {workout.exercises.map((ex, idx) => (
                            <div
                              key={idx}
                              className="p-2.5 bg-white rounded-xl border border-gray-200/70 dark:bg-gray-800 dark:border-gray-700 space-y-1"
                            >
                              <div className="flex items-center justify-between text-xs font-bold text-gray-900 dark:text-gray-100">
                                <span>
                                  {idx + 1}. {ex.name}
                                </span>
                                {ex.maxWeight > 0 && (
                                  <span className="text-[11px] text-purple-700 dark:text-purple-300 font-semibold bg-purple-50 dark:bg-purple-900/30 px-1.5 py-0.2 rounded">
                                    Máx: {ex.maxWeight} kg
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap gap-1 pt-0.5">
                                {ex.sets.map((s, sIdx) => (
                                  <span
                                    key={sIdx}
                                    className="px-1.5 py-0.5 text-[10px] bg-gray-50 rounded border border-gray-200 text-gray-700 font-medium tabular-nums dark:bg-gray-700/50 dark:border-gray-600 dark:text-gray-300"
                                  >
                                    {s.weight ? `${s.weight}kg × ` : ''}
                                    {s.repCount ? `${s.repCount}` : s.distance ? `${s.distance}m` : `${s.durationSeconds}s`}
                                    {s.rpe ? <span className="text-gray-400 dark:text-gray-500"> (RPE {s.rpe})</span> : ''}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer del Modal */}
            <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/60 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="text-xs rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}