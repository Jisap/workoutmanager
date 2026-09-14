'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Dumbbell,
  Clock,
  Calendar,
  Play,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
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
  Table2,
  LayoutGrid,
  Eye,
  RotateCcw,
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
    return { badge: 'bg-blue-100 text-blue-800 border-blue-200', icon: Dumbbell, bar: 'bg-blue-500' };
  if (lower.includes('crossfit') || lower.includes('wod') || lower.includes('funcional'))
    return { badge: 'bg-orange-100 text-orange-800 border-orange-200', icon: Zap, bar: 'bg-orange-500' };
  if (lower.includes('cardio') || lower.includes('correr') || lower.includes('run'))
    return { badge: 'bg-pink-100 text-pink-800 border-pink-200', icon: Heart, bar: 'bg-pink-500' };
  if (lower.includes('hyrox') || lower.includes('hybrid'))
    return { badge: 'bg-purple-100 text-purple-800 border-purple-200', icon: Flame, bar: 'bg-purple-500' };
  if (lower.includes('yoga') || lower.includes('stretch') || lower.includes('movilidad'))
    return { badge: 'bg-teal-100 text-teal-800 border-teal-200', icon: Activity, bar: 'bg-teal-500' };
  return { badge: 'bg-gray-100 text-gray-700 border-gray-200', icon: BarChart2, bar: 'bg-gray-400' };
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
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide border ${style.badge}`}>
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
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Restore preferred view mode from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('wm_history_view_mode');
    if (saved === 'cards' || saved === 'table') {
      setViewMode(saved);
    }
  }, []);

  const handleViewChange = (mode: 'table' | 'cards') => {
    setViewMode(mode);
    localStorage.setItem('wm_history_view_mode', mode);
  };

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

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterType, pageSize]);

  // Pagination calculations
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedWorkouts = useMemo(() => {
    return filtered.slice(startIndex, endIndex);
  }, [filtered, startIndex, endIndex]);

  // Group paginated items by month (for Card view)
  const grouped = useMemo(() => groupByMonth(paginatedWorkouts), [paginatedWorkouts]);
  const monthKeys = useMemo(() => Array.from(grouped.keys()).sort((a, b) => b.localeCompare(a)), [grouped]);

  const handleRepeat = (workoutId: number) => {
    setSelectedWorkout(null);
    router.push(`/workouts/log?mode=repeat&workoutId=${workoutId}`);
  };

  // Pagination page numbers generator
  const paginationPages = useMemo(() => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safeCurrentPage > 3) pages.push('...');
      const start = Math.max(2, safeCurrentPage - 1);
      const end = Math.min(totalPages - 1, safeCurrentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (safeCurrentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  }, [totalPages, safeCurrentPage]);

  return (
    <div className="space-y-4 pb-20">
      {/* Top Toolbar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-gray-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre de entreno o ejercicio…"
              className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50/50 hover:bg-white focus:bg-white shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Filter by Type */}
            <div className="relative shrink-0 flex-1 sm:flex-initial">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full sm:w-auto appearance-none pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50/50 hover:bg-white focus:bg-white shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all cursor-pointer font-medium text-gray-700"
              >
                <option value="all">Todos los tipos</option>
                {types.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <ChevronRight className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 rotate-90 pointer-events-none" />
            </div>

            {/* View Switcher (Table vs Cards) */}
            <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200 shrink-0">
              <button
                type="button"
                onClick={() => handleViewChange('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'table'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
                title="Vista Tabla compacta"
              >
                <Table2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tabla</span>
              </button>
              <button
                type="button"
                onClick={() => handleViewChange('cards')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'cards'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
                title="Vista Tarjetas"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tarjetas</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filter Summary & Count */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-gray-100">
          <div className="flex items-center gap-1.5">
            <span>
              Total: <strong className="text-gray-800 font-bold">{filtered.length}</strong> sesiones
            </span>
            {(search || filterType !== 'all') && (
              <>
                <span>·</span>
                <span className="text-blue-600 font-medium">Filtrado activo</span>
              </>
            )}
          </div>
          {filtered.length > 0 && (
            <div className="text-gray-500">
              Página <strong className="text-gray-800">{safeCurrentPage}</strong> de{' '}
              <strong className="text-gray-800">{totalPages}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Empty State */}
      {filtered.length === 0 && (
        <Card className="border-dashed bg-gray-50/70 border-gray-200">
          <CardContent className="py-14 text-center space-y-4">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto text-gray-400">
              <Dumbbell className="w-7 h-7" />
            </div>
            <div className="max-w-sm mx-auto">
              <h3 className="text-base font-bold text-gray-900">No hay entrenamientos</h3>
              <p className="text-xs text-gray-500 mt-1">
                {history.length === 0
                  ? 'Aún no has registrado ningún entrenamiento. Empieza hoy registrando tu primera sesión.'
                  : 'No se encontraron sesiones con los filtros aplicados. Prueba limpiando la búsqueda.'}
              </p>
            </div>
            {history.length === 0 ? (
              <Link href="/workouts/new">
                <Button className="text-xs">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Comenzar mi primer entrenamiento
                </Button>
              </Link>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  setSearch('');
                  setFilterType('all');
                }}
              >
                Limpiar filtros
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── 1. VISTA TABLA (ESTILO EXCEL / COMPACTA) ─── */}
      {filtered.length > 0 && viewMode === 'table' && (
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Fecha & Hora</th>
                  <th className="py-3 px-4">Entrenamiento</th>
                  <th className="py-3 px-3">Tipo</th>
                  <th className="py-3 px-3 text-center">Duración</th>
                  <th className="py-3 px-3 text-center">Volumen</th>
                  <th className="py-3 px-3 text-center">Series</th>
                  <th className="py-3 px-4 hidden md:table-cell">Ejercicios Realizados</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedWorkouts.map((workout) => {
                  const style = getTypeStyle(workout.typeName);
                  const TypeIcon = style.icon;
                  const dateObj = new Date(workout.startTime);

                  return (
                    <tr
                      key={workout.id}
                      className="hover:bg-blue-50/40 transition-colors group cursor-pointer"
                      onClick={() => setSelectedWorkout(workout)}
                    >
                      {/* Fecha / Hora */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-gray-900">
                          {dateObj.toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-gray-300" />
                          {dateObj.toLocaleTimeString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}h
                        </div>
                      </td>

                      {/* Nombre */}
                      <td className="py-3 px-4 font-bold text-gray-900 max-w-[200px]">
                        <div className="truncate flex items-center gap-1.5" title={workout.name}>
                          <span>{workout.name}</span>
                          {workout.notes && (
                            <span title={workout.notes}>
                              <FileText className="w-3 h-3 text-amber-500 shrink-0" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Tipo */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${style.badge}`}
                        >
                          <TypeIcon className="w-2.5 h-2.5" />
                          {workout.typeName}
                        </span>
                      </td>

                      {/* Duración */}
                      <td className="py-3 px-3 text-center whitespace-nowrap text-gray-700 font-semibold tabular-nums">
                        {workout.totalTimeSeconds ? (
                          <span className="bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                            {Math.round(workout.totalTimeSeconds / 60)} min
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>

                      {/* Volumen */}
                      <td className="py-3 px-3 text-center whitespace-nowrap font-bold text-gray-800 tabular-nums">
                        {workout.totalVolume > 0 ? (
                          <span className="text-blue-700 bg-blue-50/70 px-2 py-0.5 rounded-md border border-blue-100">
                            {(workout.totalVolume / 1000).toFixed(1)}k kg
                          </span>
                        ) : (
                          <span className="text-gray-400">0 kg</span>
                        )}
                      </td>

                      {/* Series */}
                      <td className="py-3 px-3 text-center whitespace-nowrap font-bold text-gray-700 tabular-nums">
                        {workout.totalSets}
                      </td>

                      {/* Ejercicios resumidos */}
                      <td className="py-3 px-4 hidden md:table-cell max-w-[280px]">
                        <div className="flex flex-wrap gap-1">
                          {workout.exercisesSummary.slice(0, 2).map((ex, idx) => (
                            <span
                              key={idx}
                              className="inline-block bg-gray-100 text-gray-700 text-[10px] px-1.5 py-0.5 rounded border border-gray-200/60 truncate max-w-[120px]"
                              title={`${ex.name} (${ex.setsCount} series)`}
                            >
                              {ex.name}
                            </span>
                          ))}
                          {workout.exercisesSummary.length > 2 && (
                            <span className="text-[10px] text-gray-400 font-semibold self-center">
                              +{workout.exercisesSummary.length - 2} más
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Acciones */}
                      <td
                        className="py-3 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                            onClick={() => setSelectedWorkout(workout)}
                            title="Ver detalles"
                          >
                            <Eye className="w-3.5 h-3.5 sm:mr-1" />
                            <span className="hidden sm:inline">Detalles</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-200 rounded-lg font-semibold"
                            onClick={() => handleRepeat(workout.id)}
                            title="Repetir entrenamiento"
                          >
                            <Play className="w-3 h-3 fill-current sm:mr-1" />
                            <span className="hidden sm:inline">Repetir</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── 2. VISTA TARJETAS (AGRUPADAS POR MES) ─── */}
      {filtered.length > 0 && viewMode === 'cards' && (
        <div className="space-y-6">
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
                    <span className="text-xs text-gray-400 font-medium">
                      {(monthVolume / 1000).toFixed(1)}k kg en esta página
                    </span>
                  )}
                </div>

                {/* Workout cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {monthWorkouts.map((workout) => {
                    const style = getTypeStyle(workout.typeName);
                    const TypeIcon = style.icon;

                    return (
                      <Card
                        key={workout.id}
                        className="overflow-hidden border-gray-200 hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className={`h-1 w-full ${style.bar}`} />

                          <CardContent className="p-4 space-y-3">
                            {/* Name + badge + time */}
                            <div className="flex items-start gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-bold text-gray-900 text-sm truncate">
                                    {workout.name}
                                  </h3>
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide shrink-0 border ${style.badge}`}
                                  >
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
                                <p className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">
                                  Duración
                                </p>
                                <p className="text-xs font-black text-gray-900 tabular-nums mt-0.5">
                                  {workout.totalTimeSeconds
                                    ? `${Math.round(workout.totalTimeSeconds / 60)} min`
                                    : '—'}
                                </p>
                              </div>
                              <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                                <p className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">
                                  Volumen
                                </p>
                                <p className="text-xs font-black text-gray-900 tabular-nums mt-0.5">
                                  {workout.totalVolume > 0
                                    ? `${(workout.totalVolume / 1000).toFixed(1)}k kg`
                                    : '0 kg'}
                                </p>
                              </div>
                              <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                                <p className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">
                                  Series
                                </p>
                                <p className="text-xs font-black text-gray-900 tabular-nums mt-0.5">
                                  {workout.totalSets}
                                </p>
                              </div>
                            </div>

                            {/* Exercise summary */}
                            <div className="space-y-1">
                              {workout.exercisesSummary.slice(0, 3).map((ex, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between text-xs text-gray-600"
                                >
                                  <span className="truncate pr-2">
                                    {idx + 1}. {ex.name}
                                  </span>
                                  <span className="font-semibold text-gray-900 tabular-nums shrink-0">
                                    {ex.setsCount} ser.
                                    {ex.maxWeight > 0 && ` · ${ex.maxWeight}kg`}
                                  </span>
                                </div>
                              ))}
                              {workout.exercisesSummary.length > 3 && (
                                <p className="text-[11px] text-gray-400 italic text-center pt-0.5">
                                  +{workout.exercisesSummary.length - 3} ejercicios más
                                </p>
                              )}
                            </div>
                          </CardContent>
                        </div>

                        {/* Actions */}
                        <div className="p-4 pt-0">
                          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
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
                              className="text-xs gap-1.5 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 text-gray-700 flex-1 font-semibold"
                              onClick={() => handleRepeat(workout.id)}
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              Repetir
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── CONTROLES DE PAGINACIÓN ─── */}
      {filtered.length > 0 && (
        <div className="bg-white p-3 sm:p-4 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Tamaño de página & Rango */}
          <div className="flex items-center gap-3 text-xs text-gray-600">
            <span>
              Mostrando <strong className="text-gray-900">{startIndex + 1}</strong> –{' '}
              <strong className="text-gray-900">{endIndex}</strong> de{' '}
              <strong className="text-gray-900">{totalItems}</strong>
            </span>
            <div className="flex items-center gap-1 border-l border-gray-200 pl-3">
              <span className="text-gray-400">Ver:</span>
              {[10, 20, 50].map((sz) => (
                <button
                  key={sz}
                  onClick={() => setPageSize(sz)}
                  className={`px-2 py-0.5 rounded-md font-bold text-xs transition-colors ${
                    pageSize === sz
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>

          {/* Navegación por páginas */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage(1)}
              className="h-8 w-8 p-0 rounded-lg"
              title="Primera página"
            >
              <ChevronsLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-8 w-8 p-0 rounded-lg"
              title="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            {/* Números de página */}
            <div className="flex items-center gap-1 px-1">
              {paginationPages.map((page, idx) => {
                if (page === '...') {
                  return (
                    <span key={`ellipsis-${idx}`} className="px-1 text-xs text-gray-400 font-bold">
                      …
                    </span>
                  );
                }
                const pageNum = Number(page);
                const isCurrent = pageNum === safeCurrentPage;
                return (
                  <button
                    key={`page-${pageNum}`}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`h-8 min-w-[32px] px-2 rounded-lg text-xs font-bold transition-all ${
                      isCurrent
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 w-8 p-0 rounded-lg"
              title="Página siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage(totalPages)}
              className="h-8 w-8 p-0 rounded-lg"
              title="Última página"
            >
              <ChevronsRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Modal de detalles */}
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
