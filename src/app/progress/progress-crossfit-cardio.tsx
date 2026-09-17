'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, Heart, Flame, Clock, Award, Timer, Activity, Trophy, BarChart3, TrendingUp, Layers, CheckCircle2 } from 'lucide-react';
import { type ModalityConfig } from '@/lib/db/schema';
import { formatModalitySummary } from '@/lib/modality-utils';

interface ProgressCrossfitCardioProps {
  crossfit: {
    totalWods: number;
    wods: {
      id: number;
      name: string;
      date: string;
      modality?: string | null;
      modalityConfig?: ModalityConfig | null;
      totalTimeMinutes: number;
      totalTimeSeconds?: number | null;
      exercisesCount: number;
      notes: string | null;
    }[];
    modalityBreakdown?: {
      modality: string;
      count: number;
      percentage: number;
    }[];
    fastestForTime?: {
      id: number;
      name: string;
      modality: string | null;
      modalityConfig?: ModalityConfig | null;
      date: string;
      totalTimeMinutes: number;
      totalTimeSeconds: number | null;
    }[];
  };
  hyroxCardio: {
    totalMinutes: number;
    totalSessions: number;
    sessions: {
      id: number;
      name: string;
      date: string;
      modality?: string | null;
      modalityConfig?: ModalityConfig | null;
      totalTimeMinutes: number;
      totalTimeSeconds?: number | null;
      notes: string | null;
    }[];
    modalityBreakdown?: {
      modality: string;
      count: number;
    }[];
  };
}

export function ProgressCrossfitCardio({ crossfit, hyroxCardio }: ProgressCrossfitCardioProps) {
  const [selectedModalityFilter, setSelectedModalityFilter] = useState<string>('all');

  const modalityBreakdown = crossfit.modalityBreakdown || [];
  const fastestForTime = crossfit.fastestForTime || [];

  // Filtrado de WODs por modalidad
  const filteredWods = useMemo(() => {
    if (selectedModalityFilter === 'all') return crossfit.wods;
    return crossfit.wods.filter((w) => w.modality === selectedModalityFilter);
  }, [crossfit.wods, selectedModalityFilter]);

  // Lista única de modalidades registradas para los botones de filtro
  const allUsedModalities = useMemo(() => {
    const set = new Set<string>();
    for (const w of crossfit.wods) if (w.modality) set.add(w.modality);
    for (const s of hyroxCardio.sessions) if (s.modality) set.add(s.modality);
    return Array.from(set).sort();
  }, [crossfit.wods, hyroxCardio.sessions]);

  return (
    <div className="space-y-6">
      {/* ─── 1. RESUMEN DE SESIONES FUNCIONALES Y CARDIO ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">WODs / CrossFit</span>
            <p className="text-2xl font-black text-orange-600 dark:text-orange-400 tabular-nums">
              {crossfit.totalWods}
            </p>
            <p className="text-[11px] text-gray-400">sesiones funcionales</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Sesiones Hyrox / Cardio</span>
            <p className="text-2xl font-black text-pink-600 dark:text-pink-400 tabular-nums">
              {hyroxCardio.totalSessions}
            </p>
            <p className="text-[11px] text-gray-400">entrenamientos de resistencia</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Tiempo en Cardio</span>
            <p className="text-2xl font-black text-gray-900 dark:text-gray-100 tabular-nums">
              {hyroxCardio.totalMinutes} <span className="text-xs font-bold text-gray-400">min</span>
            </p>
            <p className="text-[11px] text-gray-400">{(hyroxCardio.totalMinutes / 60).toFixed(1)} horas acumuladas</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Modalidades Únicas</span>
            <p className="text-2xl font-black text-purple-600 dark:text-purple-400 tabular-nums">
              {allUsedModalities.length}
            </p>
            <p className="text-[11px] text-purple-600 font-semibold">Formatos practicados</p>
          </CardContent>
        </Card>
      </div>

      {/* ─── 2. DISTRIBUCIÓN POR MODALIDAD & RANKING FOR TIME ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribución de Modalidades */}
        <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
          <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800 bg-orange-50/40 dark:bg-orange-950/20">
            <CardTitle className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-orange-600" />
                Distribución por Modalidad de WOD
              </span>
              <span className="text-xs font-normal text-gray-400">
                {modalityBreakdown.reduce((acc, m) => acc + m.count, 0)} sesiones categorizadas
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-4">
            {modalityBreakdown.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-6">
                Aún no has registrado modalidades (AMRAP, For Time, EMOM, etc.).
              </p>
            ) : (
              <div className="space-y-3">
                {modalityBreakdown.map((item) => (
                  <div key={item.modality} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-orange-500" />
                        {item.modality}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 font-mono font-semibold">
                        {item.count} {item.count === 1 ? 'sesión' : 'sesiones'} ({item.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-linear-to-r from-orange-500 to-amber-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(4, item.percentage)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mejores Tiempos For Time / AFAP */}
        <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
          <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800 bg-amber-50/40 dark:bg-amber-950/20">
            <CardTitle className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                Mejores Tiempos (For Time / AFAP)
              </span>
              <span className="text-xs font-normal text-amber-600 dark:text-amber-400 font-semibold">
                Velocidad & Sprint
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-3">
            {fastestForTime.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-6">
                Registra WODs con modalidad "For Time" o "AFAP" para ver tus récords de velocidad aquí.
              </p>
            ) : (
              <div className="space-y-2">
                {fastestForTime.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          idx === 0
                            ? 'bg-amber-400 text-amber-950 shadow-xs'
                            : idx === 1
                            ? 'bg-gray-300 text-gray-800'
                            : idx === 2
                            ? 'bg-amber-700 text-amber-100'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 text-[11px]'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-xs text-gray-900 dark:text-gray-100 truncate">{item.name}</p>
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                          <span>{formatModalitySummary(item.modality, item.modalityConfig)}</span>
                          <span>·</span>
                          <span>{new Date(item.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                        </div>
                      </div>
                    </div>

                    <div className="font-mono text-xs font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800 shrink-0">
                      ⏱️ {item.totalTimeMinutes} min
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── 3. SECCIÓN HISTORIAL DE WODS & SESIONES ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CrossFit WODs */}
        <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
          <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800 bg-orange-50/40 dark:bg-orange-950/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <CardTitle className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Zap className="w-4 h-4 text-orange-600" />
                Historial de WODs & Sesiones CrossFit
              </CardTitle>

              {/* Filtro rápido por modalidad */}
              {allUsedModalities.length > 0 && (
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                  <button
                    type="button"
                    onClick={() => setSelectedModalityFilter('all')}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                      selectedModalityFilter === 'all'
                        ? 'bg-orange-600 text-white shadow-2xs'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    Todos
                  </button>
                  {allUsedModalities.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSelectedModalityFilter(m)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                        selectedModalityFilter === m
                          ? 'bg-orange-600 text-white shadow-2xs'
                          : 'bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/40 hover:bg-orange-100'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-3">
            {filteredWods.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-6">
                No hay WODs {selectedModalityFilter !== 'all' ? `con modalidad ${selectedModalityFilter}` : ''} registrados todavía.
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {filteredWods.map((wod) => (
                  <div
                    key={wod.id}
                    className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-bold text-xs text-gray-900 dark:text-gray-100 truncate">{wod.name}</p>
                        {wod.modality && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-orange-100 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800 shrink-0">
                            <Flame className="w-2.5 h-2.5" />
                            {formatModalitySummary(wod.modality, wod.modalityConfig)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-gray-400">
                        <span>{new Date(wod.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                        <span>·</span>
                        <span>{wod.exercisesCount} ejercicios</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 bg-white dark:bg-gray-900 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 font-mono text-xs font-bold text-orange-600 dark:text-orange-400">
                      <Timer className="w-3.5 h-3.5" />
                      <span>{wod.totalTimeMinutes > 0 ? `${wod.totalTimeMinutes} min` : 'Completado'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hyrox & Endurance */}
        <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
          <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800 bg-pink-50/40 dark:bg-pink-950/20">
            <CardTitle className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Heart className="w-4 h-4 text-pink-600" />
              Sesiones Hyrox & Cardio / Endurance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-3">
            {hyroxCardio.sessions.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-6">
                No hay sesiones de Hyrox o Cardio registradas todavía.
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {hyroxCardio.sessions.map((sess) => (
                  <div
                    key={sess.id}
                    className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-bold text-xs text-gray-900 dark:text-gray-100 truncate">{sess.name}</p>
                        {sess.modality && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-pink-100 dark:bg-pink-950/40 text-pink-800 dark:text-pink-300 border border-pink-200 dark:border-pink-800 shrink-0">
                            <Flame className="w-2.5 h-2.5" />
                            {formatModalitySummary(sess.modality, sess.modalityConfig)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-gray-400">
                        <span>{new Date(sess.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 bg-white dark:bg-gray-900 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 font-mono text-xs font-bold text-pink-600 dark:text-pink-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{sess.totalTimeMinutes > 0 ? `${sess.totalTimeMinutes} min` : 'Completado'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
