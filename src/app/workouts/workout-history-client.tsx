'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Dumbbell,
  Clock,
  Calendar,
  Play,
  ChevronRight,
  X,
  Search,
  Filter,
  Layers,
  Flame,
  Zap,
  Heart,
  Activity,
  BarChart2,
  FileText,
  Plus,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// ---------- Types ----------
export interface WorkoutHistoryItem {
  id: number;
  name: string;
  typeName: string;
  typeId: number;
  startTime: Date | string;
  totalTimeSeconds: number | null;
  notes: string | null;
  totalVolume: number;
  totalSets: number;
  exercisesSummary: {
    name: string;
    setsCount: number;
    maxWeight: number;
  }[];
}

interface WorkoutHistoryClientProps {
  history: WorkoutHistoryItem[];
}

// ---------- Helpers ----------

function getTypeStyle(typeName: string): {
  badge: string;
  icon: React.ElementType;
  bar: string;
} {
  const lower = typeName.toLowerCase();
  if (lower.includes('muscu') || lower.includes('fuerza') || lower.includes('gym'))
    return { badge: 'bg-blue-100 text-blue-800', icon: Dumbbell, bar: 'bg-blue-500' };
  if (lower.includes('crossfit') || lower.includes('wod') || lower.includes('funcional'))
    return { badge: 'bg-orange-100 text-orange-800', icon: Zap, bar: 'bg-orange-500' };
  if (lower.includes('cardio') || lower.includes('correr') || lower.includes('run'))
    return { badge: 'bg-pink-100 text-pink-800', icon: Heart, bar: 'bg-pink-500' };
  if (lower.includes('hyrox') || lower.includes('hybrid'))
    return { badge: 'bg-purple-100 text-purple-800', icon: Flame, bar: 'bg-purple-500' };
  if (lower.includes('yoga') || lower.includes('stretch') || lower.includes('movilidad'))
    return { badge: 'bg-teal-100 text-teal-800', icon: Activity, bar: 'bg-teal-500' };
  return { badge: 'bg-gray-100 text-gray-700', icon: BarChart2, bar: 'bg-gray-400' };
}

function formatMonthKey(dateStr: string): string {
  const [year, month] = dateStr.split('-');
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
}

function groupByMonth(items: WorkoutHistoryItem[]): Map<string, WorkoutHistoryItem[]> {
  const map = new Map<string, WorkoutHistoryItem[]>();
  for (const item of items) {
    const d = new Date(item.startTime);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return map;
}

// ---------- Detail Modal ----------
function WorkoutDetailModal({
  workout,
  onClose,
  onRepeat,
}: {
  workout: WorkoutHistoryItem;
  onClose: () => void;
  onRepeat: () => void;
}) {
  const style = getTypeStyle(workout.typeName);
  const TypeIcon = style.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3 bg-gray-50/80">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${style.badge}`}>
                <TypeIcon className="w-3 h-3" />
                {workout.typeName}
              </span>
            </div>
            <h3 className="font-extrabold text-base text-gray-900 truncate">{workout.name}</h3>
            <p className="text-xs text-gray-500 flex items-center gap-1.5">
              <Calendar className="w-3 h-3" />
              {new Date(workout.startTime).toLocaleDateString('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
              {' · '}
              {new Date(workout.startTime).toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit',
              })}h
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-gray-50 rounded-xl border border-gray-200/70 p-2.5">
              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Duración</p>
              <p className="text-sm font-black text-gray-900 tabular-nums mt-0.5">
                {workout.totalTimeSeconds ? `${Math.round(workout.totalTimeSeconds / 60)} min` : '—'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl border border-gray-200/70 p-2.5">
              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Volumen</p>
              <p className="text-sm font-black text-gray-900 tabular-nums mt-0.5">
                {workout.totalVolume > 0 ? `${(workout.totalVolume / 1000).toFixed(1)}k kg` : '0 kg'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl border border-gray-200/70 p-2.5">
              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Series</p>
              <p className="text-sm font-black text-gray-900 tabular-nums mt-0.5">{workout.totalSets}</p>
            </div>
          </div>

          {/* Notes */}
          {workout.notes && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex gap-2">
              <FileText className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
              <p className="italic">{workout.notes}</p>
            </div>
          )}

          {/* Exercises */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
              Ejercicios ({workout.exercisesSummary.length})
            </span>
            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {workout.exercisesSummary.map((ex, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-200/70 text-xs"
                >
                  <span className="font-semibold text-gray-800 truncate pr-2">
                    {idx + 1}. {ex.name}
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    <span className="text-gray-500">{ex.setsCount} series</span>
                    {ex.maxWeight > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] bg-purple-50 text-purple-700 font-bold rounded border border-purple-100">
                        Máx {ex.maxWeight}kg
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/80 flex items-center gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs rounded-xl">
            Cerrar
          </Button>
          <Button
            size="sm"
            onClick={onRepeat}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 rounded-xl shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Repetir este entrenamiento
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------- Main Component ----------
export function WorkoutHistoryClient({ history }: WorkoutHistoryClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutHistoryItem | null>(null);

  // Unique workout types for the filter dropdown
  const types = useMemo(() => {
    const set = new Set<string>();
    for (const w of history) set.add(w.typeName);
    return Array.from(set).sort();
  }, [history]);

  // Filtered list
  const filtered = useMemo(() => {
    return history.filter((w) => {
      const matchType = filterType === 'all' || w.typeName === filterType;
      const matchSearch =
        search.trim() === '' ||
        w.name.toLowerCase().includes(search.toLowerCase()) ||
        w.exercisesSummary.some((e) => e.name.toLowerCase().includes(search.toLowerCase()));
      return matchType && matchSearch;
    });
  }, [history, search, filterType]);

  // Group by month
  const grouped = useMemo(() => groupByMonth(filtered), [filtered]);
  const monthKeys = useMemo(() => Array.from(grouped.keys()).sort((a, b) => b.localeCompare(a)), [grouped]);

  const handleRepeat = (workoutId: number) => {
    setSelectedWorkout(null);
    router.push(`/workouts/log?mode=repeat&workoutId=${workoutId}`);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o ejercicio…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="relative shrink-0">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="appearance-none pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition cursor-pointer"
          >
            <option value="all">Todos los tipos</option>
            {types.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <ChevronRight className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 rotate-90 pointer-events-none" />
        </div>
      </div>

      {/* Active filter summary */}
      {(search || filterType !== 'all') && (
        <p className="text-xs text-gray-500">
          {filtered.length} resultado{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
          {filterType !== 'all' && ` · Tipo: ${filterType}`}
          {search && ` · "${search}"`}
        </p>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <Card className="border-dashed bg-gray-50">
          <CardContent className="py-12 text-center space-y-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
              <Dumbbell className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Sin resultados</h3>
              <p className="text-sm text-gray-500 mt-1">
                {history.length === 0
                  ? 'Registra tu primera sesión para empezar a ver tu progreso.'
                  : 'Prueba cambiando los filtros de búsqueda.'}
              </p>
            </div>
            {history.length === 0 && (
              <Link href="/workouts/new">
                <Button>
                  <Plus className="w-4 h-4 mr-1.5" />
                  Comenzar mi primer entrenamiento
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* Months */}
      {monthKeys.map((monthKey) => {
        const monthWorkouts = grouped.get(monthKey)!;
        const monthLabel = formatMonthKey(monthKey);
        const monthVolume = monthWorkouts.reduce((s, w) => s + w.totalVolume, 0);

        return (
          <div key={monthKey} className="space-y-3">
            {/* Month header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-gray-700 capitalize">{monthLabel}</h2>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
                  {monthWorkouts.length} sesión{monthWorkouts.length !== 1 ? 'es' : ''}
                </span>
              </div>
              {monthVolume > 0 && (
                <span className="text-xs text-gray-400">
                  {(monthVolume / 1000).toFixed(1)}k kg totales
                </span>
              )}
            </div>

            {/* Workout cards */}
            <div className="space-y-3">
              {monthWorkouts.map((workout) => {
                const style = getTypeStyle(workout.typeName);
                const TypeIcon = style.icon;

                return (
                  <Card
                    key={workout.id}
                    className="overflow-hidden border-gray-200 hover:border-blue-200 hover:shadow-md transition-all"
                  >
                    <div className={`h-0.5 w-full ${style.bar}`} />

                    <CardContent className="p-4 space-y-3">
                      {/* Name + badge + time */}
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-gray-900 text-sm truncate">{workout.name}</h3>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide shrink-0 ${style.badge}`}>
                              <TypeIcon className="w-2.5 h-2.5" />
                              {workout.typeName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(workout.startTime).toLocaleDateString('es-ES', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                              })}
                            </span>
                            <span className="text-gray-300">·</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(workout.startTime).toLocaleTimeString('es-ES', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}h
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* KPIs */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                          <p className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Duración</p>
                          <p className="text-xs font-black text-gray-900 tabular-nums mt-0.5">
                            {workout.totalTimeSeconds ? `${Math.round(workout.totalTimeSeconds / 60)} min` : '—'}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                          <p className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Volumen</p>
                          <p className="text-xs font-black text-gray-900 tabular-nums mt-0.5">
                            {workout.totalVolume > 0
                              ? `${(workout.totalVolume / 1000).toFixed(1)}k kg`
                              : '0 kg'}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                          <p className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Series</p>
                          <p className="text-xs font-black text-gray-900 tabular-nums mt-0.5">
                            {workout.totalSets}
                          </p>
                        </div>
                      </div>

                      {/* Exercise summary */}
                      <div className="space-y-1">
                        {workout.exercisesSummary.slice(0, 3).map((ex, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs text-gray-600">
                            <span className="truncate pr-2">{idx + 1}. {ex.name}</span>
                            <span className="font-semibold text-gray-900 tabular-nums shrink-0">
                              {ex.setsCount} ser.{ex.maxWeight > 0 && ` · ${ex.maxWeight}kg`}
                            </span>
                          </div>
                        ))}
                        {workout.exercisesSummary.length > 3 && (
                          <p className="text-[11px] text-gray-400 italic text-center pt-0.5">
                            +{workout.exercisesSummary.length - 3} ejercicios más
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs gap-1.5 hover:bg-gray-100 text-gray-600 flex-1"
                          onClick={() => setSelectedWorkout(workout)}
                        >
                          <Layers className="w-3.5 h-3.5" />
                          Ver detalles
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs gap-1.5 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 text-gray-700 flex-1"
                          onClick={() => handleRepeat(workout.id)}
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          Repetir
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Detail modal */}
      {selectedWorkout && (
        <WorkoutDetailModal
          workout={selectedWorkout}
          onClose={() => setSelectedWorkout(null)}
          onRepeat={() => handleRepeat(selectedWorkout.id)}
        />
      )}
    </div>
  );
}
