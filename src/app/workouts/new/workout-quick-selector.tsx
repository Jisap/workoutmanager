'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useTransitionNavigate } from '@/components/layout/route-transition';
import {
  Clock,
  Copy,
  Search,
  Play,
  Dumbbell,
  Calendar,
  Layers,
  Flame,
  FileText,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  X,
  Sparkles,
  Filter,
  Activity,
  Zap,
  Heart,
  BarChart2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type ModalityConfig } from '@/lib/db/schema';
import { formatModalitySummary } from '@/lib/modality-utils';

export interface SetDetailPreview {
  setNumber: number;
  weight: number | null;
  repCount: number | null;
  rpe: number | null;
  distance: number | null;
  durationSeconds: number | null;
  calories: number | null;
}

export interface WorkoutExercisePreview {
  name: string;
  orderIndex: number;
  sets: SetDetailPreview[];
  maxWeight: number;
  volume: number;
}

export interface TemplateExercisePreview {
  name: string;
  orderIndex: number;
  targetReps: number | null;
  targetWeight: number | null;
  targetDistance: number | null;
  targetCalories: number | null;
  timeCapSeconds: number | null;
  formattedSummary?: string;
}

export interface SerializedWorkout {
  id: number;
  name: string;
  notes: string | null;
  modality?: string | null;
  modalityConfig?: ModalityConfig | null;
  startTime: Date | string;
  totalTimeSeconds: number | null;
  typeId: number;
  typeName?: string;
  totalVolume: number;
  totalSetsCount: number;
  exercises: WorkoutExercisePreview[];
}

export interface SerializedTemplate {
  id: number;
  name: string;
  description: string | null;
  modality?: string | null;
  modalityConfig?: ModalityConfig | null;
  typeId: number | null;
  typeName?: string;
  createdAt: Date | string;
  exercisesCount?: number;
  totalSetsCount?: number;
  exercises: TemplateExercisePreview[];
}

interface WorkoutQuickSelectorProps {
  recentWorkouts: SerializedWorkout[];
  templates: SerializedTemplate[];
}

type TabType = 'recent' | 'templates';

function getTypeStyle(typeName?: string): {
  badge: string;
  icon: React.ElementType;
} {
  const lower = (typeName || '').toLowerCase();
  if (lower.includes('muscu') || lower.includes('fuerza') || lower.includes('gym') || lower.includes('pierna') || lower.includes('leg'))
    return { badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800', icon: Dumbbell };
  if (lower.includes('crossfit') || lower.includes('wod') || lower.includes('funcional'))
    return { badge: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800', icon: Zap };
  if (lower.includes('cardio') || lower.includes('correr') || lower.includes('run'))
    return { badge: 'bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-300 border-pink-200 dark:border-pink-800', icon: Heart };
  if (lower.includes('hyrox') || lower.includes('hybrid'))
    return { badge: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800', icon: Flame };
  if (lower.includes('yoga') || lower.includes('stretch') || lower.includes('movilidad'))
    return { badge: 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800', icon: Activity };
  return { badge: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700', icon: BarChart2 };
}

function isDraftWorkout(w: SerializedWorkout): boolean {
  return !w.totalTimeSeconds || w.totalTimeSeconds <= 0;
}

export function WorkoutQuickSelector({
  recentWorkouts,
  templates,
}: WorkoutQuickSelectorProps) {
  const navigate = useTransitionNavigate();
  const detailRef = useRef<HTMLDivElement>(null);

  const hasRecents = recentWorkouts.length > 0;
  const hasTemplates = templates.length > 0;

  const [activeTab, setActiveTab] = useState<TabType>(hasRecents ? 'recent' : 'templates');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Tarjetas: 6 por página encajan en grid 1/2 col sin scroll infinito
  const [pageSize, setPageSize] = useState<number>(6);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const uniqueTypes = useMemo(() => {
    const list = activeTab === 'recent' ? recentWorkouts : templates;
    const set = new Set<string>();
    for (const item of list) {
      if (item.typeName) set.add(item.typeName);
    }
    return Array.from(set).sort();
  }, [activeTab, recentWorkouts, templates]);

  const filteredList = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (activeTab === 'recent') {
      return recentWorkouts.filter((w) => {
        const matchesType = typeFilter === 'all' || w.typeName === typeFilter;
        const matchesQuery =
          q === '' ||
          w.name.toLowerCase().includes(q) ||
          (w.typeName && w.typeName.toLowerCase().includes(q)) ||
          (w.modality && w.modality.toLowerCase().includes(q)) ||
          w.exercises.some((e) => e.name.toLowerCase().includes(q));
        return matchesType && matchesQuery;
      });
    } else {
      return templates.filter((t) => {
        const matchesType = typeFilter === 'all' || t.typeName === typeFilter;
        const matchesQuery =
          q === '' ||
          t.name.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          (t.typeName && t.typeName.toLowerCase().includes(q)) ||
          (t.modality && t.modality.toLowerCase().includes(q)) ||
          t.exercises.some((e) => e.name.toLowerCase().includes(q));
        return matchesType && matchesQuery;
      });
    }
  }, [activeTab, searchQuery, typeFilter, recentWorkouts, templates]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter, activeTab, pageSize]);

  const handleSelectRoutine = (id: number) => {
    if (selectedId === id) {
      setSelectedId(null);
    } else {
      setSelectedId(id);
      setTimeout(() => {
        detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    }
  };

  const totalItems = filteredList.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const paginatedList = useMemo(() => {
    return filteredList.slice(startIndex, endIndex);
  }, [filteredList, startIndex, endIndex]);

  const selectedWorkout = activeTab === 'recent' ? recentWorkouts.find((w) => w.id === selectedId) : null;
  const selectedTemplate = activeTab === 'templates' ? templates.find((t) => t.id === selectedId) : null;

  const handleStartWorkout = (id: number) => {
    if (activeTab === 'recent') {
      const target = recentWorkouts.find((w) => w.id === id);
      const isFinished = target ? !isDraftWorkout(target) : true;
      if (isFinished) {
        navigate(`/workouts/log?mode=repeat&workoutId=${id}`);
      } else {
        navigate(`/workouts/log?mode=resume&workoutId=${id}`);
      }
    } else {
      navigate(`/workouts/log?mode=template&templateId=${id}`);
    }
  };

  const switchTab = (tab: TabType) => {
    setActiveTab(tab);
    setSelectedId(null);
    setSearchQuery('');
    setTypeFilter('all');
  };

  if (!hasRecents && !hasTemplates) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/90 dark:border-gray-700 shadow-xs overflow-hidden space-y-4 p-4 sm:p-5">
      {/* Header + tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
        <div>
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Repetir algo que ya hiciste
          </span>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mt-0.5">
            Elige y entrena en 1 toque
          </h2>
        </div>

        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl self-start sm:self-auto">
          {hasRecents && (
            <button
              onClick={() => switchTab('recent')}
              className={`flex items-center gap-1.5 px-3 h-9 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'recent'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-300 shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Realizados ({recentWorkouts.length})</span>
            </button>
          )}

          {hasTemplates && (
            <button
              onClick={() => switchTab('templates')}
              className={`flex items-center gap-1.5 px-3 h-9 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'templates'
                  ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-300 shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Plantillas ({templates.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Buscador + filtro por tipo */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'recent'
                ? 'Buscar por nombre, ejercicio o modalidad…'
                : 'Buscar plantilla por nombre o ejercicio…'
            }
            className="w-full h-11 pl-9 pr-8 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-800 dark:text-gray-100 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-full cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {uniqueTypes.length > 0 && (
          <div className="relative shrink-0">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full sm:w-auto h-11 appearance-none pl-8 pr-8 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer font-medium text-gray-700 dark:text-gray-300"
            >
              <option value="all">Todos los tipos</option>
              {uniqueTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Lista como tarjetas mobile-first */}
      {paginatedList.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-800/30">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            No se encontraron {activeTab === 'recent' ? 'entrenamientos' : 'plantillas'}
          </p>
          <p className="text-xs text-gray-400 mt-1">Prueba con otros términos de búsqueda o filtros</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {paginatedList.map((item) => {
            const isSelected = item.id === selectedId;
            const isRecent = activeTab === 'recent';
            const workout = isRecent ? (item as SerializedWorkout) : null;
            const template = !isRecent ? (item as SerializedTemplate) : null;
            const draft = !!(workout && isDraftWorkout(workout));
            const typeStyle = getTypeStyle(item.typeName);
            const TypeIcon = typeStyle.icon;

            return (
              <article
                key={item.id}
                className={`rounded-2xl border p-3.5 flex flex-col gap-2.5 transition-all text-left ${
                  isSelected
                    ? isRecent
                      ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/50 dark:bg-blue-950/30'
                      : 'border-purple-500 ring-2 ring-purple-500/20 bg-purple-50/50 dark:bg-purple-950/30'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50/40 dark:bg-gray-800/40 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleSelectRoutine(item.id)}
                  className="flex flex-col gap-2 text-left cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-gray-900 dark:text-gray-100 text-sm leading-snug line-clamp-2">
                      {item.name}
                    </span>
                    {isRecent && workout && (
                      draft ? (
                        <span className="shrink-0 inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
                          Sin finalizar
                        </span>
                      ) : (
                        <span className="shrink-0 inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                          Completado
                        </span>
                      )
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {item.typeName && (
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border ${typeStyle.badge}`}
                      >
                        <TypeIcon className="w-2.5 h-2.5" />
                        {item.typeName}
                      </span>
                    )}
                    {item.modality && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-orange-100 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800 shrink-0">
                        <Flame className="w-2.5 h-2.5" />
                        {formatModalitySummary(item.modality, item.modalityConfig)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
                    {isRecent && workout ? (
                      <>
                        <span className="inline-flex items-center gap-1 font-medium">
                          <Calendar className="w-3 h-3" />
                          {new Date(workout.startTime).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                        {workout.totalTimeSeconds ? (
                          <span className="tabular-nums">⏱️ {Math.round(workout.totalTimeSeconds / 60)} min</span>
                        ) : (
                          <span className="tabular-nums text-amber-600 dark:text-amber-400 font-semibold">
                            ⏸️ a medias
                          </span>
                        )}
                        {workout.totalVolume > 0 && (
                          <span className="tabular-nums">🏋️ {(workout.totalVolume / 1000).toFixed(1)}k kg</span>
                        )}
                        <span className="tabular-nums">📋 {workout.totalSetsCount} ser.</span>
                      </>
                    ) : template ? (
                      <span className="font-semibold text-purple-700 dark:text-purple-300">
                        {template.exercises.length} ejercicios · {template.totalSetsCount ?? '—'} series
                      </span>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {item.exercises.slice(0, 3).map((ex, exIdx) => (
                      <span
                        key={exIdx}
                        className="inline-block bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 text-[10px] px-1.5 py-0.5 rounded border border-gray-200/70 dark:border-gray-700 truncate max-w-[120px]"
                      >
                        {ex.name}
                      </span>
                    ))}
                    {item.exercises.length > 3 && (
                      <span className="text-[10px] text-gray-400 self-center font-medium">
                        +{item.exercises.length - 3}
                      </span>
                    )}
                  </div>

                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-400">
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isSelected ? 'rotate-180' : ''}`} />
                    {isSelected ? 'Ocultar detalle' : 'Ver detalle'}
                  </span>
                </button>

                {/* Acción primaria siempre visible y táctil */}
                <Button
                  onClick={() => handleStartWorkout(item.id)}
                  className={`w-full h-11 text-sm text-white rounded-xl font-bold shadow-2xs cursor-pointer gap-1.5 ${
                    isRecent
                      ? draft
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-purple-600 hover:bg-purple-700'
                  }`}
                  title={
                    isRecent && draft
                      ? 'Continuar entrenamiento sin finalizar'
                      : 'Iniciar este entrenamiento'
                  }
                >
                  <Play className="w-4 h-4 fill-current" />
                  {isRecent && draft ? 'Continuar' : isRecent ? 'Repetir' : 'Iniciar'}
                </Button>
              </article>
            );
          })}
        </div>
      )}

      {/* Paginación simplificada */}
      {totalItems > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <span>
              <strong className="text-gray-900 dark:text-gray-100">{startIndex + 1}</strong>–
              <strong className="text-gray-900 dark:text-gray-100">{endIndex}</strong> de{' '}
              <strong className="text-gray-900 dark:text-gray-100">{totalItems}</strong>
            </span>
            <div className="flex items-center gap-1 border-l border-gray-200 dark:border-gray-700 pl-2">
              {[6, 12, 24].map((sz) => (
                <button
                  key={sz}
                  onClick={() => setPageSize(sz)}
                  className={`px-2 h-7 rounded font-medium cursor-pointer ${
                    pageSize === sz
                      ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-11 px-3 text-xs rounded-xl cursor-pointer gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </Button>
            <span className="px-2 font-medium text-gray-700 dark:text-gray-300 tabular-nums">
              {safeCurrentPage}/{totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="h-11 px-3 text-xs rounded-xl cursor-pointer gap-1"
            >
              Siguiente
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detalle de la rutina seleccionada */}
      {selectedId && (selectedWorkout || selectedTemplate) && (
        <div
          ref={detailRef}
          className="bg-gray-50/90 dark:bg-gray-800/60 rounded-2xl p-4 sm:p-5 border-2 border-blue-200 dark:border-blue-800/70 space-y-4 animate-in fade-in duration-200 mt-4 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200/80 dark:border-gray-700">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Detalle seleccionado
                </span>
                {(selectedWorkout?.typeName || selectedTemplate?.typeName) && (
                  <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                    {selectedWorkout?.typeName || selectedTemplate?.typeName}
                  </span>
                )}
                {(selectedWorkout?.modality || selectedTemplate?.modality) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-full bg-orange-100 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                    <Flame className="w-2.5 h-2.5" />
                    {formatModalitySummary(
                      selectedWorkout?.modality || selectedTemplate?.modality,
                      selectedWorkout?.modalityConfig || selectedTemplate?.modalityConfig
                    )}
                  </span>
                )}
                {selectedWorkout && isDraftWorkout(selectedWorkout) && (
                  <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
                    Sin finalizar — puedes continuarlo
                  </span>
                )}
              </div>
              <h3 className="font-extrabold text-base sm:text-lg text-gray-900 dark:text-gray-100">
                {selectedWorkout?.name || selectedTemplate?.name}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {selectedWorkout ? (
                  <>
                    Sesión del{' '}
                    <strong className="text-gray-700 dark:text-gray-300">
                      {new Date(selectedWorkout.startTime).toLocaleDateString('es-ES', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })}
                    </strong>
                  </>
                ) : (
                  selectedTemplate?.description || 'Plantilla guardada para entrenar'
                )}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedId(null)}
                className="h-11 text-xs rounded-xl cursor-pointer"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Cerrar
              </Button>

              <Button
                onClick={() => handleStartWorkout(selectedId)}
                size="sm"
                className={`gap-2 h-11 text-xs font-bold px-4 rounded-xl shadow-sm cursor-pointer ${
                  activeTab === 'recent'
                    ? selectedWorkout && isDraftWorkout(selectedWorkout)
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                }`}
              >
                <Play className="w-4 h-4 fill-current" />
                <span>
                  {activeTab === 'recent'
                    ? selectedWorkout && isDraftWorkout(selectedWorkout)
                      ? 'Continuar sesión'
                      : 'Repetir entrenamiento'
                    : 'Iniciar entrenamiento'}
                </span>
              </Button>
            </div>
          </div>

          {selectedWorkout && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-white dark:bg-gray-900 p-2.5 rounded-xl border border-gray-200/80 dark:border-gray-700">
                <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-blue-500" /> Duración
                </span>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-0.5 tabular-nums">
                  {selectedWorkout.totalTimeSeconds
                    ? `${Math.round(selectedWorkout.totalTimeSeconds / 60)} min`
                    : 'Sin finalizar'}
                </p>
              </div>

              <div className="bg-white dark:bg-gray-900 p-2.5 rounded-xl border border-gray-200/80 dark:border-gray-700">
                <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-amber-500" /> Volumen
                </span>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-0.5 tabular-nums">
                  {selectedWorkout.totalVolume > 0
                    ? `${selectedWorkout.totalVolume.toLocaleString('es-ES')} kg`
                    : '0 kg'}
                </p>
              </div>

              <div className="bg-white dark:bg-gray-900 p-2.5 rounded-xl border border-gray-200/80 dark:border-gray-700">
                <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-purple-500" /> Series
                </span>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-0.5 tabular-nums">
                  {selectedWorkout.totalSetsCount} series
                </p>
              </div>

              <div className="bg-white dark:bg-gray-900 p-2.5 rounded-xl border border-gray-200/80 dark:border-gray-700">
                <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 flex items-center gap-1">
                  <Dumbbell className="w-3 h-3 text-emerald-500" /> Ejercicios
                </span>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-0.5 tabular-nums">
                  {selectedWorkout.exercises.length}
                </p>
              </div>
            </div>
          )}

          {selectedWorkout?.notes && (
            <div className="p-3 bg-amber-50/70 dark:bg-amber-900/20 border border-amber-200/80 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200">
              <span className="font-semibold flex items-center gap-1 mb-0.5">
                <FileText className="w-3.5 h-3.5" /> Notas de la sesión:
              </span>
              <p className="italic text-amber-800 dark:text-amber-300">{selectedWorkout.notes}</p>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Dumbbell className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" /> Ejercicios y cargas
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {selectedWorkout
                  ? `${selectedWorkout.exercises.length} ejercicios`
                  : `${selectedTemplate?.exercises.length} ejercicios`}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1">
              {selectedWorkout ? (
                selectedWorkout.exercises.map((ex, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200/80 dark:border-gray-700 space-y-1.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-gray-900 dark:text-gray-100 flex items-center gap-1.5 truncate pr-2">
                        <span className="text-[10px] w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="truncate">{ex.name}</span>
                      </span>
                      {ex.maxWeight > 0 && (
                        <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded-md shrink-0">
                          Máx: {ex.maxWeight} kg
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {ex.sets.map((s, sIdx) => (
                        <span
                          key={sIdx}
                          className="px-2 py-0.5 text-[11px] rounded-md bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium tabular-nums"
                        >
                          <strong className="text-gray-400 mr-1 text-[10px]">S{s.setNumber}:</strong>
                          {s.weight ? `${s.weight}kg × ` : ''}
                          {s.repCount ? `${s.repCount} reps` : s.distance ? `${s.distance}m` : `${s.durationSeconds}s`}
                          {s.calories ? ` · ${s.calories}kcal` : ''}
                          {s.rpe ? <span className="text-gray-400 text-[10px]"> @RPE{s.rpe}</span> : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              ) : selectedTemplate ? (
                selectedTemplate.exercises.map((ex, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200/80 dark:border-gray-700 flex items-center justify-between shadow-2xs"
                  >
                    <span className="font-bold text-xs text-gray-900 dark:text-gray-100 flex items-center gap-1.5 truncate pr-2">
                      <span className="text-[10px] w-4 h-4 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="truncate">{ex.name}</span>
                    </span>

                    <div className="text-xs text-gray-600 dark:text-gray-400 font-medium shrink-0">
                      {ex.formattedSummary ? (
                        <span className="text-purple-700 dark:text-purple-300 font-mono text-[11px] font-semibold bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded-md border border-purple-100/60 dark:border-purple-800">
                          {ex.formattedSummary}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">Sin objetivos</span>
                      )}
                    </div>
                  </div>
                ))
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
