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
  Trash2,
  Loader2,
  Bookmark,
  History,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { deleteWorkout, deleteWorkoutTemplate, saveAsTemplate } from './actions';

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

export interface UserTemplateItem {
  id: number;
  name: string;
  typeName: string;
  typeId: number;
  createdAt: Date | string;
  description: string | null;
  exercisesCount: number;
  exercises: {
    name: string;
    targetReps: number | null;
    targetWeight: number | null;
    targetDurationSeconds: number | null;
  }[];
}

interface WorkoutHistoryClientProps {
  history: WorkoutHistoryItem[];
  templates: UserTemplateItem[];
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

// ---------- Detail Modal (para Historial) ----------
function WorkoutDetailModal({
  workout,
  onClose,
  onRepeat,
  onConvertToTemplate,
  onDelete,
}: {
  workout: WorkoutHistoryItem;
  onClose: () => void;
  onRepeat: () => void;
  onConvertToTemplate: () => void;
  onDelete: () => void;
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
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors shrink-0 cursor-pointer"
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
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/80 flex items-center justify-between gap-2 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl gap-1.5 px-2.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Eliminar</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onConvertToTemplate}
              className="text-xs text-purple-700 hover:text-purple-800 hover:bg-purple-50 border-purple-200 rounded-xl gap-1.5 cursor-pointer font-semibold"
            >
              <Bookmark className="w-3.5 h-3.5 text-purple-600" />
              <span>Guardar como Plantilla</span>
            </Button>
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs rounded-xl cursor-pointer">
              Cerrar
            </Button>
            <Button
              size="sm"
              onClick={onRepeat}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 rounded-xl shadow-sm cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Repetir entrenamiento
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Main Component ----------
export function WorkoutHistoryClient({ history, templates: initialTemplates = [] }: WorkoutHistoryClientProps) {
  const router = useRouter();

  // Active Main Tab: 'history' or 'templates'
  const [activeTab, setActiveTab] = useState<'history' | 'templates'>('history');

  // Workouts state
  const [workouts, setWorkouts] = useState<WorkoutHistoryItem[]>(history);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutHistoryItem | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Templates state
  const [templates, setTemplates] = useState<UserTemplateItem[]>(initialTemplates);
  const [templateSearch, setTemplateSearch] = useState('');

  // Deletion modal state
  const [deletingItem, setDeletingItem] = useState<{
    type: 'workout' | 'template';
    id: number;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Template conversion modal state
  const [convertingWorkout, setConvertingWorkout] = useState<WorkoutHistoryItem | null>(null);
  const [templateNameInput, setTemplateNameInput] = useState('');
  const [templateDescInput, setTemplateDescInput] = useState('');
  const [isConverting, setIsConverting] = useState(false);

  // Sync props
  useEffect(() => {
    setWorkouts(history);
  }, [history]);

  useEffect(() => {
    setTemplates(initialTemplates);
  }, [initialTemplates]);

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

  // Unique workout types for the filter dropdown (strictly workouts)
  const workoutTypes = useMemo(() => {
    const set = new Set<string>();
    for (const w of workouts) set.add(w.typeName);
    return Array.from(set).sort();
  }, [workouts]);

  // Filtered workouts list
  const filteredWorkouts = useMemo(() => {
    return workouts.filter((w) => {
      const matchType = filterType === 'all' || w.typeName === filterType;
      const matchSearch =
        search.trim() === '' ||
        w.name.toLowerCase().includes(search.toLowerCase()) ||
        w.exercisesSummary.some((e) => e.name.toLowerCase().includes(search.toLowerCase()));
      return matchType && matchSearch;
    });
  }, [workouts, search, filterType]);

  // Filtered templates list
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      return (
        templateSearch.trim() === '' ||
        t.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
        t.typeName.toLowerCase().includes(templateSearch.toLowerCase()) ||
        t.exercises.some((e) => e.name.toLowerCase().includes(templateSearch.toLowerCase()))
      );
    });
  }, [templates, templateSearch]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterType, pageSize]);

  // Pagination calculations for workouts
  const totalItems = filteredWorkouts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedWorkouts = useMemo(() => {
    return filteredWorkouts.slice(startIndex, endIndex);
  }, [filteredWorkouts, startIndex, endIndex]);

  // Group paginated items by month (for Card view)
  const grouped = useMemo(() => groupByMonth(paginatedWorkouts), [paginatedWorkouts]);
  const monthKeys = useMemo(() => Array.from(grouped.keys()).sort((a, b) => b.localeCompare(a)), [grouped]);

  const handleRepeatWorkout = (workoutId: number) => {
    setSelectedWorkout(null);
    router.push(`/workouts/log?mode=repeat&workoutId=${workoutId}`);
  };

  const handleStartTemplate = (templateId: number) => {
    router.push(`/workouts/log?mode=template&templateId=${templateId}`);
  };

  const openConvertToTemplate = (workout: WorkoutHistoryItem) => {
    const cleanName =
      workout.name
        .replace(/\s*\(Copia\)+/gi, '')
        .replace(/\s*\(Repetici[oó]n\)+/gi, '')
        .replace(/\s*·\s*\d{1,2}\s+[a-záéíóú]+/gi, '')
        .trim() || 'Mi Plantilla';
    setConvertingWorkout(workout);
    setTemplateNameInput(cleanName);
    setTemplateDescInput(workout.notes || '');
  };

  const handleConfirmConvertToTemplate = async () => {
    if (!convertingWorkout) return;
    if (!templateNameInput.trim()) {
      alert('Por favor introduce un nombre para la plantilla');
      return;
    }

    setIsConverting(true);
    try {
      const res = await saveAsTemplate({
        workoutId: convertingWorkout.id,
        name: templateNameInput.trim(),
        description: templateDescInput.trim() || undefined,
      });

      if (res.template) {
        setTemplates((prev) => [res.template as UserTemplateItem, ...prev]);
      }

      setConvertingWorkout(null);
      if (selectedWorkout) setSelectedWorkout(null);
      setActiveTab('templates');
    } catch (err) {
      console.error(err);
      alert('Error al guardar la plantilla');
    } finally {
      setIsConverting(false);
    }
  };

  // Confirm delete handler
  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);
    try {
      if (deletingItem.type === 'template') {
        await deleteWorkoutTemplate(deletingItem.id);
        setTemplates((prev) => prev.filter((t) => t.id !== deletingItem.id));
      } else {
        await deleteWorkout(deletingItem.id);
        setWorkouts((prev) => prev.filter((w) => w.id !== deletingItem.id));
        if (selectedWorkout && selectedWorkout.id === deletingItem.id) {
          setSelectedWorkout(null);
        }
      }
      setDeletingItem(null);
    } catch (err) {
      console.error(err);
      alert('Error al eliminar');
    } finally {
      setIsDeleting(false);
    }
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
    <div className="space-y-5 pb-20">
      {/* ─── NAVEGACIÓN POR PESTAÑAS (TABS) ─── */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Historial de Sesiones</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              activeTab === 'history' ? 'bg-blue-700/70 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            {workouts.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'templates'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span>Mis Plantillas</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              activeTab === 'templates' ? 'bg-blue-700/70 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            {templates.length}
          </span>
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          PESTAÑA 1: HISTORIAL DE SESIONES REALES
          ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <div className="space-y-4">
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
                  placeholder="Buscar en historial por nombre o ejercicio…"
                  className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50/50 hover:bg-white focus:bg-white shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full cursor-pointer"
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
                    {workoutTypes.map((t) => (
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
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
                  Total: <strong className="text-gray-800 font-bold">{filteredWorkouts.length}</strong> sesiones
                </span>
                {(search || filterType !== 'all') && (
                  <>
                    <span>·</span>
                    <span className="text-blue-600 font-medium">Filtro aplicado</span>
                  </>
                )}
              </div>
              {filteredWorkouts.length > 0 && (
                <div className="text-gray-500">
                  Página <strong className="text-gray-800">{safeCurrentPage}</strong> de{' '}
                  <strong className="text-gray-800">{totalPages}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Empty State */}
          {filteredWorkouts.length === 0 && (
            <Card className="border-dashed bg-gray-50/70 border-gray-200">
              <CardContent className="py-14 text-center space-y-4">
                <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto text-gray-400">
                  <Dumbbell className="w-7 h-7" />
                </div>
                <div className="max-w-sm mx-auto">
                  <h3 className="text-base font-bold text-gray-900">No hay sesiones en el historial</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {workouts.length === 0
                      ? 'Aún no has registrado ningún entrenamiento. Empieza hoy registrando tu primera sesión.'
                      : 'No se encontraron sesiones con los filtros aplicados.'}
                  </p>
                </div>
                {workouts.length === 0 ? (
                  <Link href="/workouts/new">
                    <Button className="text-xs">
                      <Plus className="w-4 h-4 mr-1.5" />
                      Registrar mi primer entrenamiento
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

          {/* 1. Vista Tabla */}
          {filteredWorkouts.length > 0 && viewMode === 'table' && (
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
                          key={`wkt-${workout.id}`}
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
                                className="h-7 px-2 text-xs text-purple-700 hover:text-purple-800 hover:bg-purple-50 rounded-lg cursor-pointer"
                                onClick={() => openConvertToTemplate(workout)}
                                title="Guardar como plantilla"
                              >
                                <Bookmark className="w-3.5 h-3.5 sm:mr-1 text-purple-600" />
                                <span className="hidden xl:inline">Plantilla</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                                onClick={() => setSelectedWorkout(workout)}
                                title="Ver detalles"
                              >
                                <Eye className="w-3.5 h-3.5 sm:mr-1" />
                                <span className="hidden sm:inline">Detalles</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-200 rounded-lg font-semibold cursor-pointer"
                                onClick={() => handleRepeatWorkout(workout.id)}
                                title="Repetir entrenamiento"
                              >
                                <Play className="w-3 h-3 fill-current sm:mr-1" />
                                <span className="hidden sm:inline">Repetir</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                                onClick={() =>
                                  setDeletingItem({
                                    type: 'workout',
                                    id: workout.id,
                                    name: workout.name,
                                  })
                                }
                                title="Eliminar entrenamiento"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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

          {/* 2. Vista Tarjetas */}
          {filteredWorkouts.length > 0 && viewMode === 'cards' && (
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
                            key={`wkt-card-${workout.id}`}
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
                                  className="text-xs gap-1.5 hover:bg-gray-100 text-gray-600 flex-1 cursor-pointer"
                                  onClick={() => setSelectedWorkout(workout)}
                                >
                                  <Layers className="w-3.5 h-3.5" />
                                  Detalles
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs gap-1 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 text-purple-700 flex-1 font-semibold cursor-pointer"
                                  onClick={() => openConvertToTemplate(workout)}
                                  title="Guardar como plantilla"
                                >
                                  <Bookmark className="w-3.5 h-3.5 text-purple-600" />
                                  Plantilla
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs gap-1 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 text-gray-700 flex-1 font-semibold cursor-pointer"
                                  onClick={() => handleRepeatWorkout(workout.id)}
                                >
                                  <Play className="w-3.5 h-3.5 fill-current" />
                                  Repetir
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 rounded-xl shrink-0 cursor-pointer"
                                  onClick={() =>
                                    setDeletingItem({
                                      type: 'workout',
                                      id: workout.id,
                                      name: workout.name,
                                    })
                                  }
                                  title="Eliminar entrenamiento"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
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

          {/* Paginación */}
          {filteredWorkouts.length > 0 && (
            <div className="bg-white p-3 sm:p-4 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
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
                      className={`px-2 py-0.5 rounded-md font-bold text-xs transition-colors cursor-pointer ${
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

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safeCurrentPage <= 1}
                  onClick={() => setCurrentPage(1)}
                  className="h-8 w-8 p-0 rounded-lg cursor-pointer"
                  title="Primera página"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safeCurrentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="h-8 w-8 p-0 rounded-lg cursor-pointer"
                  title="Página anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

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
                        className={`h-8 min-w-[32px] px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
                  className="h-8 w-8 p-0 rounded-lg cursor-pointer"
                  title="Página siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="h-8 w-8 p-0 rounded-lg cursor-pointer"
                  title="Última página"
                >
                  <ChevronsRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          PESTAÑA 2: MIS PLANTILLAS GUARDADAS
          ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          {/* Toolbar de Plantillas */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
                placeholder="Buscar en mis plantillas..."
                className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50/50 hover:bg-white focus:bg-white shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
              />
              {templateSearch && (
                <button
                  onClick={() => setTemplateSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <Link href="/workouts/log?mode=new-template">
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-xl shadow-xs">
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Crear Plantilla
              </Button>
            </Link>
          </div>

          {/* Empty state de plantillas */}
          {filteredTemplates.length === 0 && (
            <Card className="border-dashed bg-gray-50/70 border-gray-200">
              <CardContent className="py-14 text-center space-y-4">
                <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto text-purple-600">
                  <Bookmark className="w-7 h-7" />
                </div>
                <div className="max-w-sm mx-auto">
                  <h3 className="text-base font-bold text-gray-900">No tienes plantillas guardadas</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {templates.length === 0
                      ? 'Crea plantillas personalizadas de tus rutinas habituales para iniciarlas rápidamente cuando quieras.'
                      : 'No se encontraron plantillas con ese nombre.'}
                  </p>
                </div>
                <Link href="/workouts/log?mode=new-template">
                  <Button className="text-xs bg-purple-600 hover:bg-purple-700 text-white">
                    <Plus className="w-4 h-4 mr-1.5" />
                    Crear mi primera plantilla
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Grid de Plantillas */}
          {filteredTemplates.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTemplates.map((template) => {
                const style = getTypeStyle(template.typeName);
                const TypeIcon = style.icon;

                return (
                  <Card
                    key={`tpl-card-${template.id}`}
                    className="border-gray-200/90 shadow-2xs hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between overflow-hidden"
                  >
                    <div>
                      <div className="h-1 bg-gradient-to-r from-indigo-500 to-blue-500" />
                      <CardHeader className="p-4 pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${style.badge}`}
                              >
                                <TypeIcon className="w-2.5 h-2.5" />
                                {template.typeName}
                              </span>
                              <span className="text-[10px] text-gray-400 font-medium">
                                {template.exercisesCount} ejercicio{template.exercisesCount !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <CardTitle className="text-base font-bold text-gray-900 truncate">
                              {template.name}
                            </CardTitle>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setDeletingItem({
                                type: 'template',
                                id: template.id,
                                name: template.name,
                              })
                            }
                            className="h-7 w-7 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg shrink-0 cursor-pointer"
                            title="Eliminar plantilla"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>

                        {template.description && (
                          <CardDescription className="text-xs text-gray-500 italic line-clamp-2 mt-1">
                            {template.description}
                          </CardDescription>
                        )}
                      </CardHeader>

                      <CardContent className="p-4 pt-0 space-y-2">
                        {/* Listado de ejercicios en la plantilla */}
                        <div className="bg-gray-50/80 rounded-xl p-2.5 border border-gray-100 space-y-1.5 max-h-48 overflow-y-auto">
                          {template.exercises.map((ex, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-xs text-gray-700"
                            >
                              <span className="truncate pr-2 font-medium">
                                {idx + 1}. {ex.name}
                              </span>
                              <span className="shrink-0 text-gray-500 font-mono text-[11px]">
                                {ex.targetReps ? `${ex.targetReps} reps` : 'Libre'}
                                {ex.targetWeight ? ` · ${ex.targetWeight}kg` : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </div>

                    {/* Action button */}
                    <div className="p-4 pt-0">
                      <Button
                        onClick={() => handleStartTemplate(template.id)}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl gap-2 shadow-xs cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Iniciar este entrenamiento
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal de detalles de entrenamiento */}
      {selectedWorkout && (
        <WorkoutDetailModal
          workout={selectedWorkout}
          onClose={() => setSelectedWorkout(null)}
          onRepeat={() => handleRepeatWorkout(selectedWorkout.id)}
          onConvertToTemplate={() => openConvertToTemplate(selectedWorkout)}
          onDelete={() =>
            setDeletingItem({
              type: 'workout',
              id: selectedWorkout.id,
              name: selectedWorkout.name,
            })
          }
        />
      )}

      {/* Modal para Convertir Entrenamiento en Plantilla */}
      {convertingWorkout && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => e.target === e.currentTarget && !isConverting && setConvertingWorkout(null)}
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-gray-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                <Bookmark className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Convertir en Plantilla
                </h3>
                <p className="text-xs text-gray-500">
                  Guarda la estructura de este entrenamiento como rutina reutilizable
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">
                  Nombre de la plantilla <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={templateNameInput}
                  onChange={(e) => setTemplateNameInput(e.target.value)}
                  placeholder="Ej: Empuje Pesado, Full Body A..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium text-gray-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">
                  Descripción o notas (opcional)
                </label>
                <textarea
                  value={templateDescInput}
                  onChange={(e) => setTemplateDescInput(e.target.value)}
                  placeholder="Ej: Buena sesión de fuerza, descansos de 2 min..."
                  rows={2}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl bg-gray-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-gray-800"
                />
              </div>

              {/* Resumen de ejercicios a incluir */}
              <div className="bg-purple-50/70 border border-purple-100 rounded-xl p-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-purple-950">
                    {convertingWorkout.exercisesSummary.length} ejercicios incluidos
                  </span>
                  <span className="text-[11px] text-purple-700">{convertingWorkout.typeName}</span>
                </div>
                <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                  {convertingWorkout.exercisesSummary.map((ex, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs text-purple-900">
                      <span className="truncate pr-2 font-medium">
                        {idx + 1}. {ex.name}
                      </span>
                      <span className="text-purple-600 shrink-0 font-mono text-[11px]">
                        {ex.setsCount} series {ex.maxWeight > 0 ? `· máx ${ex.maxWeight}kg` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <Button
                variant="outline"
                size="sm"
                disabled={isConverting}
                onClick={() => setConvertingWorkout(null)}
                className="text-xs rounded-xl cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={isConverting}
                onClick={handleConfirmConvertToTemplate}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5 rounded-xl shadow-xs font-semibold cursor-pointer"
              >
                {isConverting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Bookmark className="w-3.5 h-3.5" />
                    Guardar Plantilla
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {deletingItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => e.target === e.currentTarget && !isDeleting && setDeletingItem(null)}
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-gray-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  {deletingItem.type === 'template' ? 'Eliminar Plantilla' : 'Eliminar Entrenamiento'}
                </h3>
                <p className="text-xs text-gray-500">Esta acción no se puede deshacer</p>
              </div>
            </div>

            <p className="text-xs text-gray-600">
              ¿Estás seguro de que deseas eliminar{' '}
              <strong className="text-gray-900 font-semibold">"{deletingItem.name}"</strong>?
              {deletingItem.type === 'workout' && ' Se eliminarán todos los registros y series de esta sesión.'}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <Button
                variant="outline"
                size="sm"
                disabled={isDeleting}
                onClick={() => setDeletingItem(null)}
                className="text-xs rounded-xl cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="bg-red-600 hover:bg-red-700 text-white text-xs gap-1.5 rounded-xl shadow-xs cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Sí, eliminar
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
