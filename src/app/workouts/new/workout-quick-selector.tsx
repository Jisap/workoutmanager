'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
  ChevronsLeft,
  ChevronsRight,
  X,
  Sparkles,
  Eye,
  Filter,
  Activity,
  Zap,
  Heart,
  BarChart2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface SetDetailPreview {
  setNumber: number;
  weight: number | null;
  repCount: number | null;
  rpe: number | null;
  distance: number | null;
  durationSeconds: number | null;
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
  timeCapSeconds: number | null;
  formattedSummary?: string;
}

export interface SerializedWorkout {
  id: number;
  name: string;
  notes: string | null;
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
  if (lower.includes('muscu') || lower.includes('fuerza') || lower.includes('gym'))
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

export function WorkoutQuickSelector({
  recentWorkouts,
  templates,
}: WorkoutQuickSelectorProps) {
  const router = useRouter();
  const detailRef = useRef<HTMLDivElement>(null);

  const hasRecents = recentWorkouts.length > 0;
  const hasTemplates = templates.length > 0;

  if (!hasRecents && !hasTemplates) {
    return null;
  }

  const [activeTab, setActiveTab] = useState<TabType>(hasRecents ? 'recent' : 'templates');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Paginación
  const [pageSize, setPageSize] = useState<number>(5);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Tipos únicos para el filtro
  const uniqueTypes = useMemo(() => {
    const list = activeTab === 'recent' ? recentWorkouts : templates;
    const set = new Set<string>();
    for (const item of list) {
      if (item.typeName) set.add(item.typeName);
    }
    return Array.from(set).sort();
  }, [activeTab, recentWorkouts, templates]);

  // Lista filtrada
  const filteredList = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (activeTab === 'recent') {
      return recentWorkouts.filter((w) => {
        const matchesType = typeFilter === 'all' || w.typeName === typeFilter;
        const matchesQuery =
          q === '' ||
          w.name.toLowerCase().includes(q) ||
          (w.typeName && w.typeName.toLowerCase().includes(q)) ||
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
          t.exercises.some((e) => e.name.toLowerCase().includes(q));
        return matchesType && matchesQuery;
      });
    }
  }, [activeTab, searchQuery, typeFilter, recentWorkouts, templates]);

  // Reiniciar página cuando cambian filtros o pestañas
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter, activeTab, pageSize]);

  // Scroll suave al panel de detalle cuando se selecciona una rutina
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

  // Cálculo de paginación
  const totalItems = filteredList.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const paginatedList = useMemo(() => {
    return filteredList.slice(startIndex, endIndex);
  }, [filteredList, startIndex, endIndex]);

  // Objeto seleccionado actualmente
  const selectedWorkout = activeTab === 'recent' ? recentWorkouts.find((w) => w.id === selectedId) : null;
  const selectedTemplate = activeTab === 'templates' ? templates.find((t) => t.id === selectedId) : null;

  const handleStartWorkout = (id: number) => {
    if (activeTab === 'recent') {
      const target = recentWorkouts.find((w) => w.id === id);
      const isFinished = !!(target?.totalTimeSeconds && target.totalTimeSeconds > 0);
      if (isFinished) {
        router.push(`/workouts/log?mode=repeat&workoutId=${id}`);
      } else {
        router.push(`/workouts/log?mode=resume&workoutId=${id}`);
      }
    } else {
      router.push(`/workouts/log?mode=template&templateId=${id}`);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/90 dark:border-gray-700 shadow-xs overflow-hidden space-y-4 p-4 sm:p-5">
      {/* ─── 1. HEADER Y NAVEGACIÓN POR PESTAÑAS ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
        <div>
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Repetir Entrenamiento o Cargar Plantilla
          </span>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mt-0.5">
            Selecciona una sesión realizada o plantilla previa
          </h2>
        </div>

        {/* Pestañas: Recientes vs Plantillas */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl self-start sm:self-auto">
          {hasRecents && (
            <button
              onClick={() => {
                setActiveTab('recent');
                setSelectedId(null);
                setSearchQuery('');
                setTypeFilter('all');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'recent'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-300 shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Entrenamientos Realizados ({recentWorkouts.length})</span>
            </button>
          )}

          {hasTemplates && (
            <button
              onClick={() => {
                setActiveTab('templates');
                setSelectedId(null);
                setSearchQuery('');
                setTypeFilter('all');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'templates'
                  ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-300 shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Mis Plantillas ({templates.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── 2. BARRA DE HERRAMIENTAS (BÚSQUEDA Y FILTROS) ─── */}
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
            className="w-full pl-9 pr-8 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-800 hover:bg-white dark:hover:bg-gray-800 focus:bg-white dark:focus:bg-gray-800 dark:text-gray-100 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {uniqueTypes.length > 0 && (
          <div className="relative shrink-0">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full sm:w-auto appearance-none pl-8 pr-8 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-800 hover:bg-white dark:hover:bg-gray-800 focus:bg-white dark:focus:bg-gray-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer font-medium text-gray-700 dark:text-gray-300"
            >
              <option value="all">Todas las modalidades</option>
              {uniqueTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ─── 3. TABLA DE ENTRENAMIENTOS / PLANTILLAS CON PAGINACIÓN ─── */}
      {paginatedList.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-800/30">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            No se encontraron {activeTab === 'recent' ? 'entrenamientos' : 'plantillas'}
          </p>
          <p className="text-xs text-gray-400 mt-1">Prueba con otros términos de búsqueda o filtros</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200/90 dark:border-gray-700">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/90 dark:bg-gray-800/70 border-b border-gray-200 dark:border-gray-700 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <th className="py-3 px-3 sm:px-4">{activeTab === 'recent' ? 'Entrenamiento' : 'Plantilla'}</th>
                <th className="py-3 px-3">
                  {activeTab === 'recent' ? 'Fecha' : 'Ejercicios'}
                </th>
                {activeTab === 'recent' && (
                  <th className="py-3 px-3 hidden md:table-cell text-center">Métricas</th>
                )}
                <th className="py-3 px-3 hidden lg:table-cell">Ejercicios</th>
                <th className="py-3 px-3 sm:px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {paginatedList.map((item) => {
                const isSelected = item.id === selectedId;
                const isRecent = activeTab === 'recent';
                const workout = isRecent ? (item as SerializedWorkout) : null;
                const template = !isRecent ? (item as SerializedTemplate) : null;
                const typeStyle = getTypeStyle(item.typeName);
                const TypeIcon = typeStyle.icon;

                return (
                  <tr
                    key={item.id}
                    onClick={() => handleSelectRoutine(item.id)}
                    className={`transition-colors cursor-pointer ${
                      isSelected
                        ? isRecent
                          ? 'bg-blue-50/80 dark:bg-blue-950/40 border-l-4 border-l-blue-600 font-medium'
                          : 'bg-purple-50/80 dark:bg-purple-950/40 border-l-4 border-l-purple-600 font-medium'
                        : 'hover:bg-gray-50/80 dark:hover:bg-gray-800/60'
                    }`}
                  >
                    {/* Nombre y Modalidad */}
                    <td className="py-3 px-3 sm:px-4">
                      <div className="space-y-1 min-w-[140px] max-w-[240px]">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-gray-900 dark:text-gray-100 truncate text-xs sm:text-sm">
                            {item.name}
                          </span>
                        </div>
                        {item.typeName && (
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md text-[10px] font-bold uppercase tracking-wide border ${typeStyle.badge}`}
                          >
                            <TypeIcon className="w-2.5 h-2.5" />
                            {item.typeName}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Fecha / Conteo */}
                    <td className="py-3 px-3 whitespace-nowrap text-gray-500 dark:text-gray-400">
                      {isRecent && workout ? (
                        <div className="space-y-0.5">
                          <span className="flex items-center gap-1 font-medium text-gray-700 dark:text-gray-300">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            {new Date(workout.startTime).toLocaleDateString('es-ES', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                          <span className="text-[10px] text-gray-400 block">
                            {new Date(workout.startTime).toLocaleTimeString('es-ES', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}h
                          </span>
                        </div>
                      ) : template ? (
                        <span className="font-semibold text-purple-700 dark:text-purple-300">
                          {template.exercises.length} ejercicios
                        </span>
                      ) : null}
                    </td>

                    {/* Métricas (para entrenamientos recientes) */}
                    {isRecent && workout && (
                      <td className="py-3 px-3 hidden md:table-cell text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-2 text-[11px] text-gray-600 dark:text-gray-400">
                          {workout.totalTimeSeconds ? (
                            <span className="tabular-nums font-semibold" title="Duración">
                              ⏱️ {Math.round(workout.totalTimeSeconds / 60)} min
                            </span>
                          ) : null}
                          {workout.totalVolume > 0 && (
                            <span className="tabular-nums font-semibold" title="Volumen">
                              🏋️ {(workout.totalVolume / 1000).toFixed(1)}k kg
                            </span>
                          )}
                          <span className="tabular-nums font-semibold" title="Series">
                            📋 {workout.totalSetsCount} ser.
                          </span>
                        </div>
                      </td>
                    )}

                    {/* Resumen de Ejercicios */}
                    <td className="py-3 px-3 hidden lg:table-cell max-w-[260px]">
                      <div className="flex flex-wrap gap-1">
                        {item.exercises.slice(0, 3).map((ex, exIdx) => (
                          <span
                            key={exIdx}
                            className="inline-block bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-[10px] px-1.5 py-0.5 rounded border border-gray-200/70 dark:border-gray-700 truncate max-w-[120px]"
                            title={ex.name}
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
                    </td>

                    {/* Acciones */}
                    <td
                      className="py-3 px-3 sm:px-4 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant={isSelected ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleSelectRoutine(item.id)}
                          className={`h-7 px-2.5 text-xs rounded-lg cursor-pointer ${
                            isSelected
                              ? isRecent
                                ? 'bg-blue-600 hover:bg-blue-700 text-white font-semibold'
                                : 'bg-purple-600 hover:bg-purple-700 text-white font-semibold'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5 sm:mr-1" />
                          <span className="hidden sm:inline">
                            {isSelected ? 'Ocultar' : 'Detalle'}
                          </span>
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => handleStartWorkout(item.id)}
                          className={`h-7 px-2.5 text-xs text-white rounded-lg font-semibold shadow-2xs cursor-pointer gap-1 ${
                            isRecent
                              ? workout && (!workout.totalTimeSeconds || workout.totalTimeSeconds === 0)
                                ? 'bg-amber-600 hover:bg-amber-700'
                                : 'bg-emerald-600 hover:bg-emerald-700'
                              : 'bg-purple-600 hover:bg-purple-700'
                          }`}
                          title={
                            isRecent && workout && (!workout.totalTimeSeconds || workout.totalTimeSeconds === 0)
                              ? 'Continuar entrenamiento guardado'
                              : 'Iniciar este entrenamiento'
                          }
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span className="hidden sm:inline">
                            {isRecent && workout && (!workout.totalTimeSeconds || workout.totalTimeSeconds === 0)
                              ? 'Continuar'
                              : 'Iniciar'}
                          </span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── 4. CONTROLES DE PAGINACIÓN ─── */}
      {totalItems > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-3">
            <span>
              Mostrando <strong className="text-gray-900 dark:text-gray-100">{startIndex + 1}</strong>–
              <strong className="text-gray-900 dark:text-gray-100">{endIndex}</strong> de{' '}
              <strong className="text-gray-900 dark:text-gray-100">{totalItems}</strong> {activeTab === 'recent' ? 'entrenamientos' : 'plantillas'}
            </span>
            <div className="flex items-center gap-1 border-l border-gray-200 dark:border-gray-700 pl-3">
              <span className="text-gray-400">Ver:</span>
              {[5, 10, 20].map((sz) => (
                <button
                  key={sz}
                  onClick={() => setPageSize(sz)}
                  className={`px-1.5 py-0.5 rounded font-medium cursor-pointer ${
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

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage(1)}
              className="h-7 w-7 p-0 rounded-lg cursor-pointer"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-7 px-2 text-xs rounded-lg cursor-pointer gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Anterior</span>
            </Button>
            <span className="px-2 font-medium text-gray-700 dark:text-gray-300">
              Página {safeCurrentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="h-7 px-2 text-xs rounded-lg cursor-pointer gap-1"
            >
              <span className="hidden sm:inline">Siguiente</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage(totalPages)}
              className="h-7 w-7 p-0 rounded-lg cursor-pointer"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* ─── 5. DETALLE COMPLETO DE LA RUTINA SELECCIONADA (SOLO APARECE SI SE SELECCIONA) ─── */}
      {selectedId && (selectedWorkout || selectedTemplate) && (
        <div
          ref={detailRef}
          className="bg-gray-50/90 dark:bg-gray-800/60 rounded-2xl p-4 sm:p-5 border-2 border-blue-200 dark:border-blue-800/70 space-y-4 animate-in fade-in duration-200 mt-4 shadow-sm"
        >
          {/* Header del Detalle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200/80 dark:border-gray-700">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Detalle Seleccionado
                </span>
                {(selectedWorkout?.typeName || selectedTemplate?.typeName) && (
                  <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                    {selectedWorkout?.typeName || selectedTemplate?.typeName}
                  </span>
                )}
              </div>
              <h3 className="font-extrabold text-base sm:text-lg text-gray-900 dark:text-gray-100">
                {selectedWorkout?.name || selectedTemplate?.name}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {selectedWorkout ? (
                  <>
                    Sesión completada el{' '}
                    <strong className="text-gray-700 dark:text-gray-300">
                      {new Date(selectedWorkout.startTime).toLocaleDateString('es-ES', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </strong>{' '}
                    a las{' '}
                    {new Date(selectedWorkout.startTime).toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}h
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
                className="text-xs rounded-xl cursor-pointer"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Cerrar Detalle
              </Button>

              <Button
                onClick={() => handleStartWorkout(selectedId)}
                size="sm"
                className={`gap-2 text-xs font-bold px-4 py-2 rounded-xl shadow-sm cursor-pointer ${
                  activeTab === 'recent'
                    ? selectedWorkout && (!selectedWorkout.totalTimeSeconds || selectedWorkout.totalTimeSeconds === 0)
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                }`}
              >
                <Play className="w-4 h-4 fill-current" />
                <span>
                  {activeTab === 'recent'
                    ? selectedWorkout && (!selectedWorkout.totalTimeSeconds || selectedWorkout.totalTimeSeconds === 0)
                      ? 'Continuar y Finalizar Sesión'
                      : 'Repetir este entrenamiento'
                    : 'Iniciar este entrenamiento'}
                </span>
              </Button>
            </div>
          </div>

          {/* KPIs Clave del Entrenamiento */}
          {selectedWorkout && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-white dark:bg-gray-900 p-2.5 rounded-xl border border-gray-200/80 dark:border-gray-700">
                <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-blue-500" /> Duración
                </span>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-0.5 tabular-nums">
                  {selectedWorkout.totalTimeSeconds
                    ? `${Math.round(selectedWorkout.totalTimeSeconds / 60)} min`
                    : '—'}
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

          {/* Notas si existen */}
          {selectedWorkout?.notes && (
            <div className="p-3 bg-amber-50/70 dark:bg-amber-900/20 border border-amber-200/80 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200">
              <span className="font-semibold flex items-center gap-1 mb-0.5">
                <FileText className="w-3.5 h-3.5" /> Notas de la sesión:
              </span>
              <p className="italic text-amber-800 dark:text-amber-300">{selectedWorkout.notes}</p>
            </div>
          )}

          {/* DESGLOSE DETALLADO DE EJERCICIOS Y SERIES */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Dumbbell className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" /> Ejercicios & Cargas
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {selectedWorkout
                  ? `${selectedWorkout.exercises.length} ejercicios registrados`
                  : `${selectedTemplate?.exercises.length} ejercicios configurados`}
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

                    {/* Series individuales */}
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {ex.sets.map((s, sIdx) => (
                        <span
                          key={sIdx}
                          className="px-2 py-0.5 text-[11px] rounded-md bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium tabular-nums"
                        >
                          <strong className="text-gray-400 mr-1 text-[10px]">S{s.setNumber}:</strong>
                          {s.weight ? `${s.weight}kg × ` : ''}
                          {s.repCount ? `${s.repCount} reps` : s.distance ? `${s.distance}m` : `${s.durationSeconds}s`}
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
                      ) : ex.targetWeight ? (
                        <span className="text-purple-700 dark:text-purple-300 font-semibold">{ex.targetWeight} kg</span>
                      ) : ex.targetReps ? (
                        <span className="text-purple-700 dark:text-purple-300">{ex.targetReps} reps</span>
                      ) : ex.timeCapSeconds ? (
                        <span className="text-gray-500 dark:text-gray-400">Cap: {ex.timeCapSeconds}s</span>
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
