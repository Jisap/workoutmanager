'use client';

import { useState, useMemo, useEffect, useDeferredValue, useRef } from 'react';
import { useTransitionNavigate } from '@/components/layout/route-transition';
import { TransitionLink as Link } from '@/components/layout/transition-link';
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
  FileText,
  Plus,
  Table2,
  LayoutGrid,
  Eye,
  Trash2,
  Loader2,
  Bookmark,
  History,
  Pencil,
  Check,
  Save,
  Undo2,
  MoreHorizontal,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { deleteWorkout, deleteWorkoutTemplate, saveAsTemplate, updateWorkout, updateWorkoutTemplate } from './actions';
import { type ModalityConfig } from '@/lib/db/schema';
import { formatModalitySummary } from '@/lib/modality-utils';
import { notify } from '@/lib/notify';
import dynamic from 'next/dynamic';
import { getTypeStyle, isWorkoutSavedAsTemplate, type ExerciseDetailItem } from './history-utils';

// Modales diferidos: no viajan en el JS inicial de /workouts, se descargan
// al abrir el primero (los 5 comparten chunk). Fallback mínimo mientras tanto.
function ModalFallback() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" aria-hidden>
      <Loader2 className="h-6 w-6 animate-spin text-white" />
    </div>
  );
}

const WorkoutDetailModal = dynamic(
  () => import('./history-modals').then((m) => m.WorkoutDetailModal),
  { loading: ModalFallback }
);
const EditWorkoutModal = dynamic(
  () => import('./history-modals').then((m) => m.EditWorkoutModal),
  { loading: ModalFallback }
);
const EditTemplateModal = dynamic(
  () => import('./history-modals').then((m) => m.EditTemplateModal),
  { loading: ModalFallback }
);
const ExerciseDetailModal = dynamic(
  () => import('./history-modals').then((m) => m.ExerciseDetailModal),
  { loading: ModalFallback }
);

// ---------- Types ----------
export interface WorkoutHistoryItem {
  id: number;
  name: string;
  typeName: string;
  typeId: number;
  templateId?: number | null;
  savedAsTemplate?: boolean;
  startTime: Date | string;
  totalTimeSeconds: number | null;
  notes: string | null;
  totalVolume: number;
  totalSets: number;
  modality?: string | null;
  modalityConfig?: ModalityConfig | null;
  exercisesSummary: {
    name: string;
    setsCount: number;
    maxWeight: number;
    totalReps?: number;
    repsSummary?: string;
    sets?: {
      id?: number;
      setNumber: number;
      weight: number | null;
      repCount: number | null;
      distance?: number | null;
      durationSeconds?: number | null;
      formatted?: string;
    }[];
  }[];
}

export interface UserTemplateItem {
  id: number;
  name: string;
  typeName: string;
  typeId: number;
  modality?: string | null;
  modalityConfig?: ModalityConfig | null;
  createdAt: Date | string;
  description: string | null;
  exercisesCount: number;
  totalSetsCount?: number;
  exercises: {
    name: string;
    setsCount?: number;
    targetReps: number | null;
    targetWeight: number | null;
    targetDurationSeconds: number | null;
    formattedSummary?: string;
  }[];
}

interface WorkoutHistoryClientProps {
  history: WorkoutHistoryItem[];
  templates: UserTemplateItem[];
}

// ---------- Helpers ----------

// Menú overflow de acciones por fila/tarjeta (punto 3: 5 botones -> 1 primario
// + resto en overflow). Local al historial, sin dependencias nuevas.
function RowActionsMenu({
  onDetails,
  onTemplate,
  templateSaved,
  onEdit,
  onDelete,
}: {
  onDetails: () => void;
  onTemplate: () => void;
  templateSaved: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const itemClass =
    'flex w-full items-center gap-2 rounded-lg px-3 h-11 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer';

  return (
    <div className="relative shrink-0">
      <Button
        variant="ghost"
        size="sm"
        className="h-9 w-9 p-0 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 rounded-lg cursor-pointer"
        onClick={() => setOpen((v) => !v)}
        title="Más acciones"
        aria-label="Más acciones"
      >
        <MoreHorizontal className="w-4 h-4" />
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-30 cursor-default" onClick={close} />
          <div className="absolute right-0 z-40 w-52 p-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl">
            <button type="button" className={itemClass} onClick={() => { close(); onDetails(); }}>
              <Eye className="w-4 h-4 text-gray-400" /> Ver detalles
            </button>
            <button type="button" className={itemClass} onClick={() => { close(); onTemplate(); }}>
              <Bookmark className="w-4 h-4 text-purple-500" fill={templateSaved ? 'currentColor' : 'none'} />
              {templateSaved ? 'Ya es plantilla' : 'Guardar como plantilla'}
            </button>
            <button type="button" className={itemClass} onClick={() => { close(); onEdit(); }}>
              <Pencil className="w-4 h-4 text-blue-500" /> Editar nombre y notas
            </button>
            <button
              type="button"
              className={`${itemClass} text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30`}
              onClick={() => { close(); onDelete(); }}
            >
              <Trash2 className="w-4 h-4" /> Eliminar
            </button>
          </div>
        </>
      )}
    </div>
  );
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

// ---------- Main Component ----------
export function WorkoutHistoryClient({ history, templates: initialTemplates = [] }: WorkoutHistoryClientProps) {
  const navigate = useTransitionNavigate();

  // Active Main Tab: 'history' or 'templates'
  const [activeTab, setActiveTab] = useState<'history' | 'templates'>('history');

  // Workouts state
  const [workouts, setWorkouts] = useState<WorkoutHistoryItem[]>(history);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterModality, setFilterModality] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'finished' | 'draft'>('all');
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutHistoryItem | null>(() => {
    // Deep-link: `?open=<workoutId>` preselecciona el modal de detalle
    // (p. ej. desde las tarjetas del dashboard). Lazy initializer: sin
    // efectos ni renders en cascada.
    if (typeof window === 'undefined') return null;
    const openId = Number(new URLSearchParams(window.location.search).get('open'));
    if (!Number.isInteger(openId)) return null;
    return history.find((w) => w.id === openId) ?? null;
  });
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  // Filtros colapsables en móvil (punto 3 del informe: 7 controles apilados)
  const [showFilters, setShowFilters] = useState(false);
  // Borrado con deshacer (30s): se quita de la UI al instante y el borrado
  // real en servidor se retrasa; Deshacer lo restaura sin pérdida de datos.
  const [lastDeleted, setLastDeleted] = useState<{
    kind: 'workout' | 'template';
    item: WorkoutHistoryItem | UserTemplateItem;
    index: number;
    expiresAt: number;
  } | null>(null);
  const [undoSecondsLeft, setUndoSecondsLeft] = useState(0);
  const pendingDeleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Conteo de finalizados y guardados sin finalizar
  const finishedCount = useMemo(
    () => workouts.filter((w) => !!(w.totalTimeSeconds && w.totalTimeSeconds > 0)).length,
    [workouts]
  );
  const draftCount = useMemo(
    () => workouts.filter((w) => !w.totalTimeSeconds || w.totalTimeSeconds === 0).length,
    [workouts]
  );

  // Templates state
  const [templates, setTemplates] = useState<UserTemplateItem[]>(initialTemplates);
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateViewMode, setTemplateViewMode] = useState<'table' | 'cards'>('cards');

  // Búsquedas diferidas: el input responde al instante y el filtrado
  // (con .some anidados sobre cientos de sesiones) no bloquea cada tecla.
  const deferredSearch = useDeferredValue(search);
  const deferredTemplateSearch = useDeferredValue(templateSearch);

  // Deletion modal state
  const [deletingItem, setDeletingItem] = useState<{
    type: 'workout' | 'template';
    id: number;
    name: string;
  } | null>(null);

  // Edit workout modal state
  const [editingWorkout, setEditingWorkout] = useState<{
    id: number;
    name: string;
    notes: string;
  } | null>(null);
  const [isSavingWorkoutEdit, setIsSavingWorkoutEdit] = useState(false);

  // Edit template modal state
  const [editingTemplate, setEditingTemplate] = useState<{
    id: number;
    name: string;
    description: string;
  } | null>(null);
  const [isSavingTemplateEdit, setIsSavingTemplateEdit] = useState(false);

  // Template conversion modal state
  const [convertingWorkout, setConvertingWorkout] = useState<WorkoutHistoryItem | null>(null);

  // Exercise detail modal state
  const [exerciseDetail, setExerciseDetail] = useState<{
    workoutName: string;
    typeName: string;
    startTime: Date | string;
    exercises: ExerciseDetailItem[];
  } | null>(null);
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

  // Restore preferred view modes from localStorage; sin preferencia,
  // cards por defecto en móvil (punto 3: tabla con scroll horizontal).
  useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 640px)').matches;
    const saved = localStorage.getItem('wm_history_view_mode');
    if (saved === 'cards' || saved === 'table') {
      setViewMode(saved);
    } else if (isMobile) {
      setViewMode('cards');
    }
    const savedTpl = localStorage.getItem('wm_template_view_mode');
    if (savedTpl === 'cards' || savedTpl === 'table') {
      setTemplateViewMode(savedTpl);
    }
    // Filtros: abiertos en desktop, colapsados en móvil
    setShowFilters(!isMobile);
  }, []);

  // Deep-link `?open=` persistente (punto 3): se escribe al abrir el detalle
  // y se limpia al cerrarlo, así sobrevive a recarga y se puede compartir.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (selectedWorkout) {
      params.set('open', String(selectedWorkout.id));
      window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
    } else if (params.has('open')) {
      params.delete('open');
      const qs = params.toString();
      window.history.replaceState(null, '', qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
    }
  }, [selectedWorkout?.id]);

  const closeDetailModal = () => {
    setSelectedWorkout(null);
  };

  const handleViewChange = (mode: 'table' | 'cards') => {
    setViewMode(mode);
    localStorage.setItem('wm_history_view_mode', mode);
  };

  const handleTemplateViewChange = (mode: 'table' | 'cards') => {
    setTemplateViewMode(mode);
    localStorage.setItem('wm_template_view_mode', mode);
  };

  // Unique workout types for the filter dropdown (strictly workouts)
  const workoutTypes = useMemo(() => {
    const set = new Set<string>();
    for (const w of workouts) set.add(w.typeName);
    return Array.from(set).sort();
  }, [workouts]);

  // Unique modalities for filter dropdown
  const availableModalities = useMemo(() => {
    const set = new Set<string>();
    for (const w of workouts) {
      if (w.modality) set.add(w.modality);
    }
    return Array.from(set).sort();
  }, [workouts]);

  // Filtered workouts list
  const filteredWorkouts = useMemo(() => {
    return workouts.filter((w) => {
      const matchType = filterType === 'all' || w.typeName === filterType;
      const matchModality = filterModality === 'all' || w.modality === filterModality;
      const isFinished = !!(w.totalTimeSeconds && w.totalTimeSeconds > 0);
      const matchStatus =
        filterStatus === 'all' ||
        (filterStatus === 'finished' && isFinished) ||
        (filterStatus === 'draft' && !isFinished);
      const matchSearch =
        deferredSearch.trim() === '' ||
        w.name.toLowerCase().includes(deferredSearch.toLowerCase()) ||
        w.exercisesSummary.some((e) => e.name.toLowerCase().includes(deferredSearch.toLowerCase()));
      return matchType && matchModality && matchStatus && matchSearch;
    });
  }, [workouts, deferredSearch, filterType, filterModality, filterStatus]);

  // Filtered templates list
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      return (
        deferredTemplateSearch.trim() === '' ||
        t.name.toLowerCase().includes(deferredTemplateSearch.toLowerCase()) ||
        t.typeName.toLowerCase().includes(deferredTemplateSearch.toLowerCase()) ||
        t.exercises.some((e) => e.name.toLowerCase().includes(deferredTemplateSearch.toLowerCase()))
      );
    });
  }, [templates, deferredTemplateSearch]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearch, filterType, filterStatus, pageSize]);

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

  // Totales por mes sobre TODO lo filtrado (punto 3): el header antes sumaba
  // solo la página visible ("Xkg en esta página"), que era engañoso.
  const monthTotals = useMemo(() => {
    const map = new Map<string, { count: number; volume: number }>();
    for (const w of filteredWorkouts) {
      const d = new Date(w.startTime);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const cur = map.get(key) ?? { count: 0, volume: 0 };
      cur.count += 1;
      cur.volume += w.totalVolume;
      map.set(key, cur);
    }
    return map;
  }, [filteredWorkouts]);

  const handleRepeatWorkout = (workoutId: number, isFinished: boolean = true) => {
    setSelectedWorkout(null);
    if (isFinished) {
      navigate(`/workouts/log?mode=repeat&workoutId=${workoutId}`);
    } else {
      navigate(`/workouts/log?mode=resume&workoutId=${workoutId}`);
    }
  };

  const handleStartTemplate = (templateId: number) => {
    navigate(`/workouts/log?mode=template&templateId=${templateId}`);
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
      notify.warning('Falta el nombre', 'Introduce un nombre para la plantilla');
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
        const savedId = convertingWorkout.id;
        setWorkouts((prev) => prev.map((w) => (w.id === savedId ? { ...w, savedAsTemplate: true } : w)));
        // Punto 3: mantener contexto — no se cambia a la pestaña de plantillas.
        notify.success('Plantilla guardada', `"${res.template.name}" está en Mis Plantillas`);
      }

      setConvertingWorkout(null);
      if (selectedWorkout) setSelectedWorkout(null);
    } catch (err) {
      console.error(err);
      notify.errorFrom(err, 'Error al guardar la plantilla');
    } finally {
      setIsConverting(false);
    }
  };

  // Borrado por etapas con deshacer (punto 3): al confirmar se retira de la
  // UI y el borrado real en servidor se retrasa 30s. Deshacer lo restaura.
  // Si se confirma otro borrado antes, el anterior se ejecuta al instante.
  const flushPendingDelete = async () => {
    if (pendingDeleteTimer.current) {
      clearTimeout(pendingDeleteTimer.current);
      pendingDeleteTimer.current = null;
    }
    if (!lastDeleted) return;
    const pending = lastDeleted;
    setLastDeleted(null);
    try {
      if (pending.kind === 'template') {
        await deleteWorkoutTemplate(pending.item.id);
      } else {
        await deleteWorkout(pending.item.id);
      }
    } catch (err) {
      console.error(err);
      // Si falla el servidor, restaurar en UI para no perder el dato
      if (pending.kind === 'template') {
        setTemplates((prev) => {
          const next = [...prev];
          next.splice(Math.min(pending.index, next.length), 0, pending.item as UserTemplateItem);
          return next;
        });
      } else {
        setWorkouts((prev) => {
          const next = [...prev];
          next.splice(Math.min(pending.index, next.length), 0, pending.item as WorkoutHistoryItem);
          return next;
        });
      }
      notify.errorFrom(err, 'Error al eliminar');
    }
  };

  const handleUndoDelete = () => {
    if (pendingDeleteTimer.current) {
      clearTimeout(pendingDeleteTimer.current);
      pendingDeleteTimer.current = null;
    }
    if (!lastDeleted) return;
    const pending = lastDeleted;
    setLastDeleted(null);
    if (pending.kind === 'template') {
      setTemplates((prev) => {
        const next = [...prev];
        next.splice(Math.min(pending.index, next.length), 0, pending.item as UserTemplateItem);
        return next;
      });
      notify.info('Plantilla restaurada', `"${pending.item.name}"`);
    } else {
      setWorkouts((prev) => {
        const next = [...prev];
        next.splice(Math.min(pending.index, next.length), 0, pending.item as WorkoutHistoryItem);
        return next;
      });
      notify.info('Entrenamiento restaurado', `"${pending.item.name}"`);
    }
  };

  // Cuenta atrás del banner de deshacer
  useEffect(() => {
    if (!lastDeleted) {
      setUndoSecondsLeft(0);
      return;
    }
    const tick = () => {
      const left = Math.max(0, Math.ceil((lastDeleted.expiresAt - Date.now()) / 1000));
      setUndoSecondsLeft(left);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lastDeleted]);

  // Si se desmonta con un borrado pendiente, ejecutarlo (evita zombis)
  useEffect(() => {
    return () => {
      if (pendingDeleteTimer.current) clearTimeout(pendingDeleteTimer.current);
    };
  }, []);

  // Confirm delete handler (por etapas: UI inmediata + servidor diferido)
  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    await flushPendingDelete();
    if (deletingItem.type === 'template') {
      const idx = templates.findIndex((t) => t.id === deletingItem.id);
      const item = templates[idx];
      if (!item) {
        setDeletingItem(null);
        return;
      }
      setTemplates((prev) => prev.filter((t) => t.id !== deletingItem.id));
      setDeletingItem(null);
      const expiresAt = Date.now() + 30_000;
      setLastDeleted({ kind: 'template', item, index: Math.max(0, idx), expiresAt });
      pendingDeleteTimer.current = setTimeout(() => {
        pendingDeleteTimer.current = null;
        flushPendingDelete();
      }, 30_000);
    } else {
      const idx = workouts.findIndex((w) => w.id === deletingItem.id);
      const item = workouts[idx];
      if (!item) {
        setDeletingItem(null);
        return;
      }
      setWorkouts((prev) => prev.filter((w) => w.id !== deletingItem.id));
      if (selectedWorkout && selectedWorkout.id === deletingItem.id) {
        setSelectedWorkout(null);
      }
      setDeletingItem(null);
      const expiresAt = Date.now() + 30_000;
      setLastDeleted({ kind: 'workout', item, index: Math.max(0, idx), expiresAt });
      pendingDeleteTimer.current = setTimeout(() => {
        pendingDeleteTimer.current = null;
        flushPendingDelete();
      }, 30_000);
    }
  };

  // Confirm edit workout handler
  const handleConfirmEditWorkout = async (name: string, notes: string) => {
    if (!editingWorkout) return;
    setIsSavingWorkoutEdit(true);
    try {
      await updateWorkout({
        id: editingWorkout.id,
        name,
        notes: notes || null,
      });

      setWorkouts((prev) =>
        prev.map((w) =>
          w.id === editingWorkout.id ? { ...w, name, notes: notes || null } : w
        )
      );

      if (selectedWorkout && selectedWorkout.id === editingWorkout.id) {
        setSelectedWorkout((prev) =>
          prev ? { ...prev, name, notes: notes || null } : null
        );
      }

      setEditingWorkout(null);
      notify.success('Entrenamiento actualizado', `"${name}"`);
    } catch (err) {
      console.error(err);
      notify.errorFrom(err, 'Error al actualizar el entrenamiento');
    } finally {
      setIsSavingWorkoutEdit(false);
    }
  };

  // Confirm edit template handler
  const handleConfirmEditTemplate = async (name: string, description: string) => {
    if (!editingTemplate) return;
    setIsSavingTemplateEdit(true);
    try {
      await updateWorkoutTemplate({
        id: editingTemplate.id,
        name,
        description: description || null,
      });

      setTemplates((prev) =>
        prev.map((t) =>
          t.id === editingTemplate.id ? { ...t, name, description: description || null } : t
        )
      );

      setEditingTemplate(null);
      notify.success('Plantilla actualizada', `"${name}"`);
    } catch (err) {
      console.error(err);
      notify.errorFrom(err, 'Error al actualizar la plantilla');
    } finally {
      setIsSavingTemplateEdit(false);
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
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Historial de Sesiones</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              activeTab === 'history' ? 'bg-blue-700/70 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
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
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span>Mis Plantillas</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              activeTab === 'templates' ? 'bg-blue-700/70 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            {templates.length}
          </span>
        </button>
      </div>

      {/* Banner de deshacer borrado (30s, punto 3) */}
      {lastDeleted && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-gray-800 dark:border-gray-200 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 shadow-md">
          <p className="text-xs font-semibold truncate">
            {lastDeleted.kind === 'template' ? 'Plantilla eliminada' : 'Entrenamiento eliminado'}:{" "}
            <span className="font-bold">“{lastDeleted.item.name}”</span>
          </p>
          <Button
            size="sm"
            onClick={handleUndoDelete}
            className="h-11 px-4 text-xs font-bold rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white hover:opacity-90 shrink-0 cursor-pointer gap-1.5"
          >
            <Undo2 className="w-4 h-4" />
            Deshacer ({undoSecondsLeft}s)
          </Button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          PESTAÑA 1: HISTORIAL DE SESIONES REALES
          ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Top Toolbar */}
          <div className="bg-white dark:bg-gray-900 p-3 sm:p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
              {/* Search (siempre visible) */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar en historial por nombre o ejercicio…"
                  className="w-full h-11 pl-9 pr-8 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-800 hover:bg-white dark:hover:bg-gray-800 focus:bg-white dark:focus:bg-gray-800 dark:text-gray-100 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-0.5 rounded-full cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Toggle filtros en móvil (punto 3: 7 controles apilados) */}
              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                className="sm:hidden inline-flex items-center justify-center gap-1.5 h-11 px-3 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300 cursor-pointer"
              >
                <Filter className="w-3.5 h-3.5" />
                Filtros
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showFilters ? 'rotate-90' : ''}`} />
              </button>

              <div className={`items-center gap-2 flex-wrap ${showFilters ? 'flex' : 'hidden sm:flex'}`}>
                {/* Filter by Type */}
                <div className="relative shrink-0 flex-1 sm:flex-initial">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 pointer-events-none" />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full sm:w-auto appearance-none pl-8 pr-8 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-800 hover:bg-white dark:hover:bg-gray-800 focus:bg-white dark:focus:bg-gray-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all cursor-pointer font-medium text-gray-700 dark:text-gray-300"
                  >
                    <option value="all">Todos los tipos</option>
                    {workoutTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <ChevronRight className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 rotate-90 pointer-events-none" />
                </div>

                {/* Filter by Modality */}
                {availableModalities.length > 0 && (
                  <div className="relative shrink-0 flex-1 sm:flex-initial">
                    <Flame className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-orange-500 pointer-events-none" />
                    <select
                      value={filterModality}
                      onChange={(e) => setFilterModality(e.target.value)}
                      className="w-full sm:w-auto appearance-none pl-8 pr-8 py-2 text-sm border border-orange-200 dark:border-orange-800/60 rounded-xl bg-orange-50/40 dark:bg-orange-950/20 hover:bg-orange-50 dark:hover:bg-orange-950/30 focus:bg-white dark:focus:bg-gray-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all cursor-pointer font-medium text-orange-800 dark:text-orange-300"
                    >
                      <option value="all">Todas las modalidades</option>
                      {availableModalities.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <ChevronRight className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-orange-400 rotate-90 pointer-events-none" />
                  </div>
                )}

                {/* View Switcher (Table vs Cards) */}
                <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleViewChange('table')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      viewMode === 'table'
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-xs'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
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
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-xs'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                    }`}
                    title="Vista Tarjetas"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Tarjetas</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Píldoras de filtrado por Estado (Todos / Finalizados / Sin finalizar) */}
            <div className={`items-center gap-1.5 pt-1 overflow-x-auto pb-0.5 ${showFilters ? 'flex' : 'hidden sm:flex'}`}>
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  filterStatus === 'all'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Todos ({workouts.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('finished')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  filterStatus === 'finished'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                }`}
              >
                <Check className="w-3 h-3 stroke-[3]" />
                Finalizados ({finishedCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('draft')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  filterStatus === 'draft'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                }`}
              >
                <Save className="w-3 h-3" />
                Sin finalizar ({draftCount})
              </button>
            </div>

            {/* Filter Summary & Count */}
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-1.5">
                <span>
                  Mostrando: <strong className="text-gray-800 dark:text-gray-200 font-bold">{filteredWorkouts.length}</strong> {filteredWorkouts.length === 1 ? 'sesión' : 'sesiones'}
                </span>
                {(search || filterType !== 'all' || filterStatus !== 'all') && (
                  <>
                    <span>·</span>
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">Filtros activos</span>
                  </>
                )}
              </div>
              {filteredWorkouts.length > 0 && (
                <div className="text-gray-500">
                  Página <strong className="text-gray-800 dark:text-gray-200">{safeCurrentPage}</strong> de{' '}
                  <strong className="text-gray-800 dark:text-gray-200">{totalPages}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Empty State */}
          {filteredWorkouts.length === 0 && (
            <Card className="border-dashed bg-gray-50/70 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700">
              <CardContent className="py-14 text-center space-y-4">
                <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto text-gray-400 dark:text-gray-500">
                  <Dumbbell className="w-7 h-7" />
                </div>
                <div className="max-w-sm mx-auto">
                  <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">No hay sesiones que coincidan</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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
                      setFilterStatus('all');
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
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/90 dark:border-gray-700 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50/80 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Fecha & Hora</th>
                      <th className="py-3 px-4">Entrenamiento</th>
                      <th className="py-3 px-3">Tipo</th>
                      <th className="py-3 px-3 text-center">Estado / Duración</th>
                      <th className="py-3 px-3 text-center">Volumen</th>
                      <th className="py-3 px-3 text-center">Series</th>
                      <th className="py-3 px-4 hidden lg:table-cell">Ejercicios Realizados</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {paginatedWorkouts.map((workout) => {
                      const style = getTypeStyle(workout.typeName);
                      const TypeIcon = style.icon;
                      const dateObj = new Date(workout.startTime);
                      const isFinished = !!(workout.totalTimeSeconds && workout.totalTimeSeconds > 0);

                      return (
                        <tr
                          key={`wkt-${workout.id}`}
                          className="hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-colors group"
                        >
                          {/* Fecha / Hora */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-semibold text-gray-900 dark:text-gray-100">
                              {dateObj.toLocaleDateString('es-ES', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </div>
                            <div className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3 text-gray-300 dark:text-gray-600" />
                              {dateObj.toLocaleTimeString('es-ES', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}h
                            </div>
                          </td>

                          {/* Nombre (2 líneas + tooltip: no se pierde información) */}
                          <td className="py-3 px-4 font-bold text-gray-900 dark:text-gray-100 min-w-[150px] max-w-[260px]">
                            <div className="flex items-start gap-1.5" title={workout.name}>
                              <span className="line-clamp-2 break-words leading-snug">{workout.name}</span>
                              {workout.notes && (
                                <span title={workout.notes} className="mt-0.5">
                                  <FileText className="w-3 h-3 text-amber-500 shrink-0" />
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Tipo y Modalidad (las insignias pueden partir línea) */}
                          <td className="py-3 px-3 min-w-[120px] max-w-[220px]">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${style.badge}`}
                              >
                                <TypeIcon className="w-2.5 h-2.5" />
                                {workout.typeName}
                              </span>
                              {workout.modality && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800 shrink-0">
                                  <Flame className="w-2.5 h-2.5" />
                                  {formatModalitySummary(workout.modality, workout.modalityConfig)}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Estado / Duración */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {isFinished ? (
                              <div className="inline-flex flex-col items-center gap-0.5">
                                <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                  <Check className="w-2.5 h-2.5 stroke-[3]" /> Finalizado
                                </span>
                                <span className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold tabular-nums">
                                  {Math.round(workout.totalTimeSeconds! / 60)} min
                                </span>
                              </div>
                            ) : (
                              <div className="inline-flex flex-col items-center gap-0.5">
                                <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                  <Save className="w-2.5 h-2.5" /> Sin finalizar
                                </span>
                                <span className="text-[10px] text-gray-400 dark:text-gray-500">Guardado</span>
                              </div>
                            )}
                          </td>

                          {/* Volumen */}
                          <td className="py-3 px-3 text-center whitespace-nowrap font-bold text-gray-800 dark:text-gray-200 tabular-nums">
                            {workout.totalVolume > 0 ? (
                              <span className="text-blue-700 dark:text-blue-300 bg-blue-50/70 dark:bg-blue-900/20 px-2 py-0.5 rounded-md border border-blue-100 dark:border-blue-800">
                                {(workout.totalVolume / 1000).toFixed(1)}k kg
                              </span>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-500">0 kg</span>
                            )}
                          </td>

                          {/* Series */}
                          <td className="py-3 px-3 text-center whitespace-nowrap font-bold text-gray-700 dark:text-gray-300 tabular-nums">
                            {workout.totalSets}
                          </td>

                          {/* Ejercicios resumidos (chips acotados + tooltip con el detalle) */}
                          <td className="py-3 px-4 hidden lg:table-cell max-w-[240px]">
                            <div
                              className="flex flex-wrap gap-1 cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/10 rounded-lg p-1 -m-1 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExerciseDetail({
                                  workoutName: workout.name,
                                  typeName: workout.typeName,
                                  startTime: workout.startTime,
                                  exercises: workout.exercisesSummary,
                                });
                              }}
                              title="Ver detalle de ejercicios y cargas"
                            >
                              {workout.exercisesSummary.slice(0, 3).map((ex, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-[10px] px-2 py-0.5 rounded-md border border-gray-200/70 dark:border-gray-700 truncate max-w-[160px]"
                                  title={`${ex.name}: ${ex.repsSummary || `${ex.setsCount} series`}`}
                                >
                                  <strong className="font-semibold text-gray-900 dark:text-gray-100 truncate">{ex.name}</strong>
                                  <span className="text-blue-700 dark:text-blue-400 font-mono shrink-0">
                                    ({ex.repsSummary || `${ex.setsCount}s`})
                                  </span>
                                </span>
                              ))}
                              {workout.exercisesSummary.length > 3 && (
                                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold self-center">
                                  +{workout.exercisesSummary.length - 3} más
                                </span>
                              )}
                              <ChevronRight className="w-3 h-3 text-gray-400 dark:text-gray-500 shrink-0 self-center ml-0.5" />
                            </div>
                          </td>

                          {/* Acciones: Repetir primario + resto en overflow (punto 3) */}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                className={`h-9 px-3 text-xs rounded-lg font-bold text-white cursor-pointer gap-1 ${
                                  isFinished
                                    ? 'bg-emerald-600 hover:bg-emerald-700'
                                    : 'bg-amber-600 hover:bg-amber-700'
                                }`}
                                onClick={() => handleRepeatWorkout(workout.id, isFinished)}
                                title={isFinished ? 'Repetir entrenamiento' : 'Continuar / Finalizar entrenamiento'}
                              >
                                <Play className="w-3 h-3 fill-current" />
                                {isFinished ? 'Repetir' : 'Continuar'}
                              </Button>
                              <RowActionsMenu
                                onDetails={() => setSelectedWorkout(workout)}
                                onTemplate={() => openConvertToTemplate(workout)}
                                templateSaved={isWorkoutSavedAsTemplate(workout)}
                                onEdit={() =>
                                  setEditingWorkout({
                                    id: workout.id,
                                    name: workout.name,
                                    notes: workout.notes || '',
                                  })
                                }
                                onDelete={() =>
                                  setDeletingItem({
                                    type: 'workout',
                                    id: workout.id,
                                    name: workout.name,
                                  })
                                }
                              />
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
                const totals = monthTotals.get(monthKey);
                const monthVolume = totals?.volume ?? 0;

                return (
                  <div key={monthKey} className="space-y-3">
                    {/* Month header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 capitalize">{monthLabel}</h2>
                        <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full font-medium">
                          {monthWorkouts.length} sesión{monthWorkouts.length !== 1 ? 'es' : ''}
                        </span>
                      </div>
                      {monthVolume > 0 && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                          {(monthVolume / 1000).toFixed(1)}k kg este mes
                        </span>
                      )}
                    </div>

                    {/* Workout cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {monthWorkouts.map((workout) => {
                        const style = getTypeStyle(workout.typeName);
                        const TypeIcon = style.icon;
                        const isFinished = !!(workout.totalTimeSeconds && workout.totalTimeSeconds > 0);

                        return (
                          <Card
                            key={`wkt-card-${workout.id}`}
                            className="overflow-hidden border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between"
                          >
                            <div>
                              <div className={`h-1 w-full ${style.bar}`} />

                              <CardContent className="p-4 space-y-3">
                                {/* Name + badge + time */}
                                <div className="flex items-start gap-3">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm truncate">
                                        {workout.name}
                                      </h3>
                                      <span
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide shrink-0 border ${style.badge}`}
                                      >
                                        <TypeIcon className="w-2.5 h-2.5" />
                                        {workout.typeName}
                                      </span>
                                      {workout.modality && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-orange-100 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800 shrink-0">
                                          <Flame className="w-2 h-2" />
                                          {formatModalitySummary(workout.modality, workout.modalityConfig)}
                                        </span>
                                      )}
                                      {workout.totalTimeSeconds && workout.totalTimeSeconds > 0 ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                          <Check className="w-2 h-2 stroke-[3]" /> Finalizado
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                          <Save className="w-2 h-2" /> Sin finalizar
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
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
                                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 border border-gray-100 dark:border-gray-800">
                                    <p className="text-[9px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider">
                                      Duración
                                    </p>
                                    <p className="text-xs font-black text-gray-900 dark:text-gray-100 tabular-nums mt-0.5">
                                      {workout.totalTimeSeconds && workout.totalTimeSeconds > 0
                                        ? `${Math.round(workout.totalTimeSeconds / 60)} min`
                                        : '—'}
                                    </p>
                                  </div>
                                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 border border-gray-100 dark:border-gray-800">
                                    <p className="text-[9px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider">
                                      Volumen
                                    </p>
                                    <p className="text-xs font-black text-gray-900 dark:text-gray-100 tabular-nums mt-0.5">
                                      {workout.totalVolume > 0
                                        ? `${(workout.totalVolume / 1000).toFixed(1)}k kg`
                                        : '0 kg'}
                                    </p>
                                  </div>
                                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 border border-gray-100 dark:border-gray-800">
                                    <p className="text-[9px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider">
                                      Series
                                    </p>
                                    <p className="text-xs font-black text-gray-900 dark:text-gray-100 tabular-nums mt-0.5">
                                      {workout.totalSets}
                                    </p>
                                  </div>
                                </div>

                                {/* Exercise summary */}
                                <div className="space-y-1.5">
                                  {workout.exercisesSummary.slice(0, 3).map((ex, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-300"
                                    >
                                      <span className="truncate pr-2 font-medium">
                                        {idx + 1}. {ex.name}
                                      </span>
                                      <span className="font-semibold tabular-nums shrink-0 font-mono text-[11px] bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded border border-blue-100/60 dark:border-blue-800">
                                        {ex.repsSummary || `${ex.setsCount} ser. ${ex.maxWeight > 0 ? `· ${ex.maxWeight}kg` : ''}`}
                                      </span>
                                    </div>
                                  ))}
                                  {workout.exercisesSummary.length > 3 && (
                                    <p className="text-[11px] text-gray-400 dark:text-gray-500 italic text-center pt-0.5">
                                      +{workout.exercisesSummary.length - 3} ejercicios más
                                    </p>
                                  )}
                                </div>
                              </CardContent>
                            </div>

                            {/* Actions: Repetir primario a ancho completo + resto en overflow */}
                            <div className="p-4 pt-0 space-y-2">
                              <Button
                                onClick={() => handleRepeatWorkout(workout.id, isFinished)}
                                title={isFinished ? 'Repetir entrenamiento' : 'Continuar / Finalizar entrenamiento'}
                                className={`w-full h-11 text-sm font-bold text-white rounded-xl gap-1.5 cursor-pointer ${
                                  isFinished
                                    ? 'bg-emerald-600 hover:bg-emerald-700'
                                    : 'bg-amber-600 hover:bg-amber-700'
                                }`}
                              >
                                <Play className="w-4 h-4 fill-current" />
                                {isFinished ? 'Repetir' : 'Continuar'}
                              </Button>
                              <div className="flex items-center gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-11 px-3 text-xs gap-1 text-gray-600 dark:text-gray-400 flex-1 rounded-xl cursor-pointer"
                                  onClick={() => setSelectedWorkout(workout)}
                                >
                                  <Layers className="w-3.5 h-3.5" />
                                  Detalles
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-11 px-3 text-xs gap-1 text-purple-700 flex-1 font-semibold rounded-xl cursor-pointer"
                                  onClick={() => openConvertToTemplate(workout)}
                                  title={isWorkoutSavedAsTemplate(workout) ? 'Ya guardado como plantilla' : 'Guardar como plantilla'}
                                >
                                  <Bookmark
                                    className="w-3.5 h-3.5 text-purple-600"
                                    fill={isWorkoutSavedAsTemplate(workout) ? 'currentColor' : 'none'}
                                  />
                                  Plantilla
                                </Button>
                                <RowActionsMenu
                                  onDetails={() => setSelectedWorkout(workout)}
                                  onTemplate={() => openConvertToTemplate(workout)}
                                  templateSaved={isWorkoutSavedAsTemplate(workout)}
                                  onEdit={() =>
                                    setEditingWorkout({
                                      id: workout.id,
                                      name: workout.name,
                                      notes: workout.notes || '',
                                    })
                                  }
                                  onDelete={() =>
                                    setDeletingItem({
                                      type: 'workout',
                                      id: workout.id,
                                      name: workout.name,
                                    })
                                  }
                                />
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
            <div className="bg-white dark:bg-gray-900 p-3 sm:p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                <span>
                  Mostrando <strong className="text-gray-900 dark:text-gray-100">{startIndex + 1}</strong> –{' '}
                  <strong className="text-gray-900 dark:text-gray-100">{endIndex}</strong> de{' '}
                  <strong className="text-gray-900 dark:text-gray-100">{totalItems}</strong>
                </span>
                <div className="flex items-center gap-1 border-l border-gray-200 dark:border-gray-700 pl-3">
                  <span className="text-gray-400 dark:text-gray-500">Ver:</span>
                  {[10, 20, 50].map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setPageSize(sz)}
                      className={`px-2 py-0.5 rounded-md font-bold text-xs transition-colors cursor-pointer ${
                        pageSize === sz
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
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
                        <span key={`ellipsis-${idx}`} className="px-1 text-xs text-gray-400 dark:text-gray-500 font-bold">
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
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
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
          <div className="bg-white dark:bg-gray-900 p-3 sm:p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
                <input
                  type="text"
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  placeholder="Buscar en mis plantillas por nombre o ejercicio..."
                  className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-800 hover:bg-white dark:hover:bg-gray-800 focus:bg-white dark:focus:bg-gray-800 dark:text-gray-100 shadow-2xs focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all"
                />
                {templateSearch && (
                  <button
                    onClick={() => setTemplateSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-0.5 rounded-full cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* View Switcher (Table vs Cards) para Plantillas */}
                <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleTemplateViewChange('table')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      templateViewMode === 'table'
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-xs'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                    }`}
                    title="Vista Tabla de plantillas"
                  >
                    <Table2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Tabla</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTemplateViewChange('cards')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      templateViewMode === 'cards'
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-xs'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                    }`}
                    title="Vista Tarjetas de plantillas"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Tarjetas</span>
                  </button>
                </div>

                <Link href="/workouts/log?mode=new-template">
                  <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-xl shadow-xs shrink-0">
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Crear Plantilla
                  </Button>
                </Link>
              </div>
            </div>

            {/* Template Count */}
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-1.5">
                <span>
                  Total: <strong className="text-gray-800 dark:text-gray-200 font-bold">{filteredTemplates.length}</strong> plantillas
                </span>
                {templateSearch && (
                  <>
                    <span>·</span>
                    <span className="text-purple-600 font-medium">Búsqueda aplicada</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Empty state de plantillas */}
          {filteredTemplates.length === 0 && (
            <Card className="border-dashed bg-gray-50/70 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700">
              <CardContent className="py-14 text-center space-y-4">
                <div className="w-14 h-14 bg-purple-50 dark:bg-purple-900/20 rounded-2xl flex items-center justify-center mx-auto text-purple-600 dark:text-purple-300">
                  <Bookmark className="w-7 h-7" />
                </div>
                <div className="max-w-sm mx-auto">
                  <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">No tienes plantillas guardadas</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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

          {/* 1. Vista Tabla de Plantillas */}
          {filteredTemplates.length > 0 && templateViewMode === 'table' && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/90 dark:border-gray-700 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50/80 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Plantilla</th>
                      <th className="py-3 px-3">Tipo</th>
                      <th className="py-3 px-3 text-center">Ejercicios</th>
                      <th className="py-3 px-3 text-center">Series Totales</th>
                      <th className="py-3 px-4 hidden lg:table-cell">Detalle de Ejercicios & Cargas</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredTemplates.map((template) => {
                      const style = getTypeStyle(template.typeName);
                      const TypeIcon = style.icon;

                      return (
                        <tr
                          key={`tpl-row-${template.id}`}
                          className="hover:bg-purple-50/30 dark:hover:bg-purple-900/10 transition-colors group"
                        >
                          {/* Nombre y Descripción (2 líneas + tooltip) */}
                          <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-gray-100 min-w-[150px] max-w-[240px]">
                            <div className="line-clamp-2 break-words leading-snug text-sm font-extrabold text-gray-900 dark:text-gray-100" title={template.name}>
                              {template.name}
                            </div>
                            {template.description && (
                              <p className="text-[11px] text-gray-500 dark:text-gray-400 font-normal italic truncate mt-0.5" title={template.description}>
                                {template.description}
                              </p>
                            )}
                          </td>

                          {/* Tipo */}
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${style.badge}`}
                            >
                              <TypeIcon className="w-2.5 h-2.5" />
                              {template.typeName}
                            </span>
                          </td>

                          {/* Conteo de Ejercicios */}
                          <td className="py-3.5 px-3 text-center whitespace-nowrap font-bold text-gray-800 dark:text-gray-200 tabular-nums">
                            {template.exercisesCount}
                          </td>

                          {/* Conteo de Series */}
                          <td className="py-3.5 px-3 text-center whitespace-nowrap font-semibold text-gray-600 dark:text-gray-400 tabular-nums">
                            <span className="bg-purple-50 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300 border border-purple-100 dark:border-purple-800 px-2 py-0.5 rounded-md">
                              {template.totalSetsCount || template.exercisesCount} series
                            </span>
                          </td>

                          {/* Detalle de ejercicios */}
                          <td className="py-3.5 px-4 hidden lg:table-cell max-w-[260px]">
                            <div
                              className="flex flex-wrap gap-1.5 cursor-pointer hover:bg-purple-50/30 dark:hover:bg-purple-900/10 rounded-lg p-1 -m-1 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExerciseDetail({
                                  workoutName: template.name,
                                  typeName: template.typeName,
                                  startTime: template.createdAt,
                                  exercises: template.exercises.map((ex) => ({
                                    name: ex.name,
                                    setsCount: ex.setsCount ?? 1,
                                    maxWeight: ex.targetWeight ?? 0,
                                    repsSummary: ex.formattedSummary,
                                  })),
                                });
                              }}
                              title="Ver detalle de ejercicios y cargas"
                            >
                              {template.exercises.slice(0, 5).map((ex, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 bg-gray-50 dark:bg-gray-800/50 text-gray-800 dark:text-gray-200 text-[11px] px-2 py-0.5 rounded-lg border border-gray-200/70 dark:border-gray-700 truncate max-w-[170px]"
                                  title={`${ex.name}: ${ex.formattedSummary || (ex.targetReps ? `${ex.targetReps} reps` : 'Libre')}`}
                                >
                                  <strong className="font-semibold text-gray-900 dark:text-gray-100 truncate">{ex.name}</strong>
                                  <span className="text-purple-700 dark:text-purple-300 font-mono text-[10px]">
                                    ({ex.formattedSummary || (ex.targetReps ? `${ex.targetReps} reps` : 'Libre')})
                                  </span>
                                </span>
                              ))}
                              {template.exercises.length > 5 && (
                                <span className="text-[10px] text-purple-400 dark:text-purple-300 font-semibold self-center">
                                  +{template.exercises.length - 5} más
                                </span>
                              )}
                              <ChevronRight className="w-3 h-3 text-gray-400 dark:text-gray-500 shrink-0 self-center ml-0.5" />
                            </div>
                          </td>

                          {/* Acciones */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                className="h-7 px-2.5 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold cursor-pointer shadow-2xs gap-1"
                                onClick={() => handleStartTemplate(template.id)}
                                title="Iniciar entrenamiento desde esta plantilla"
                              >
                                <Play className="w-3 h-3 fill-current" />
                                <span>Iniciar</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded-lg cursor-pointer font-medium"
                                onClick={() =>
                                  setEditingTemplate({
                                    id: template.id,
                                    name: template.name,
                                    description: template.description || '',
                                  })
                                }
                                title="Editar nombre y descripción"
                              >
                                <Pencil className="w-3.5 h-3.5 sm:mr-1" />
                                <span className="hidden sm:inline">Editar</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg cursor-pointer"
                                onClick={() =>
                                  setDeletingItem({
                                    type: 'template',
                                    id: template.id,
                                    name: template.name,
                                  })
                                }
                                title="Eliminar plantilla"
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

          {/* 2. Vista Tarjetas de Plantillas */}
          {filteredTemplates.length > 0 && templateViewMode === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTemplates.map((template) => {
                const style = getTypeStyle(template.typeName);
                const TypeIcon = style.icon;

                return (
                  <Card
                    key={`tpl-card-${template.id}`}
                    className="border-gray-200/90 dark:border-gray-700 shadow-2xs hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between overflow-hidden"
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
                              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                                {template.exercisesCount} ejercicio{template.exercisesCount !== 1 ? 's' : ''}
                                {template.totalSetsCount ? ` · ${template.totalSetsCount} series` : ''}
                              </span>
                            </div>
                            <CardTitle className="text-base font-bold text-gray-900 dark:text-gray-100 truncate">
                              {template.name}
                            </CardTitle>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setEditingTemplate({
                                  id: template.id,
                                  name: template.name,
                                  description: template.description || '',
                                })
                              }
                              className="h-7 w-7 p-0 text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded-lg cursor-pointer"
                              title="Editar plantilla"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
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
                              className="h-7 w-7 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg cursor-pointer"
                              title="Eliminar plantilla"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>

                        {template.description && (
                          <CardDescription className="text-xs text-gray-500 dark:text-gray-400 italic line-clamp-2 mt-1">
                            {template.description}
                          </CardDescription>
                        )}
                      </CardHeader>

                      <CardContent className="p-4 pt-0 space-y-2">
                        {/* Listado de ejercicios en la plantilla */}
                        <div className="bg-gray-50/80 dark:bg-gray-800/50 rounded-xl p-2.5 border border-gray-100 dark:border-gray-800 space-y-1.5 max-h-48 overflow-y-auto">
                          {template.exercises.map((ex, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-300"
                            >
                              <span className="truncate pr-2 font-medium">
                                {idx + 1}. {ex.name}
                              </span>
                              <span className="shrink-0 text-purple-700 dark:text-purple-300 font-mono text-[11px] font-semibold bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded-md border border-purple-100/60 dark:border-purple-800">
                                {ex.formattedSummary || (ex.targetReps ? `${ex.targetReps} reps` : 'Libre')}
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
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl gap-2 shadow-xs cursor-pointer"
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
          onClose={closeDetailModal}
          onRepeat={() =>
            handleRepeatWorkout(
              selectedWorkout.id,
              !!(selectedWorkout.totalTimeSeconds && selectedWorkout.totalTimeSeconds > 0)
            )
          }
          onConvertToTemplate={() => openConvertToTemplate(selectedWorkout)}
          onEdit={() =>
            setEditingWorkout({
              id: selectedWorkout.id,
              name: selectedWorkout.name,
              notes: selectedWorkout.notes || '',
            })
          }
          onDelete={() =>
            setDeletingItem({
              type: 'workout',
              id: selectedWorkout.id,
              name: selectedWorkout.name,
            })
          }
          onTimesSaved={(updates) => {
            const updateMap = new Map(updates.map((u) => [u.setId, u.durationSeconds]));
            const patchWorkout = (w: WorkoutHistoryItem): WorkoutHistoryItem => ({
              ...w,
              exercisesSummary: w.exercisesSummary.map((ex) => ({
                ...ex,
                sets: (ex.sets || []).map((s) =>
                  s.id != null && updateMap.has(s.id)
                    ? { ...s, durationSeconds: updateMap.get(s.id) ?? null }
                    : s
                ),
              })),
            });
            setWorkouts((prev) =>
              prev.map((w) => (w.id === selectedWorkout.id ? patchWorkout(w) : w))
            );
            setSelectedWorkout((prev) => (prev ? patchWorkout(prev) : prev));
          }}
        />
      )}

      {/* Modal para Convertir Entrenamiento en Plantilla */}
      {convertingWorkout && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => e.target === e.currentTarget && !isConverting && setConvertingWorkout(null)}
        >
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-5 shadow-2xl border border-gray-200 dark:border-gray-700 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-300 shrink-0">
                <Bookmark className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  Convertir en Plantilla
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Guarda la estructura de este entrenamiento como rutina reutilizable
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  Nombre de la plantilla <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={templateNameInput}
                  onChange={(e) => setTemplateNameInput(e.target.value)}
                  placeholder="Ej: Empuje Pesado, Full Body A..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-800 hover:bg-white dark:hover:bg-gray-800 focus:bg-white dark:focus:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium text-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  Descripción o notas (opcional)
                </label>
                <textarea
                  value={templateDescInput}
                  onChange={(e) => setTemplateDescInput(e.target.value)}
                  placeholder="Ej: Buena sesión de fuerza, descansos de 2 min..."
                  rows={2}
                  className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-800 hover:bg-white dark:hover:bg-gray-800 focus:bg-white dark:focus:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-gray-800 dark:text-gray-200 dark:placeholder-gray-500"
                />
              </div>

              {/* Resumen de ejercicios a incluir */}
              <div className="bg-purple-50/70 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-xl p-3 space-y-1.5">
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

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
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

      {/* Modal de detalles de ejercicios y cargas */}
      {exerciseDetail && (
        <ExerciseDetailModal
          workoutName={exerciseDetail.workoutName}
          typeName={exerciseDetail.typeName}
          startTime={exerciseDetail.startTime}
          exercises={exerciseDetail.exercises}
          onClose={() => setExerciseDetail(null)}
        />
      )}

      {/* Modal de confirmación de eliminación */}
      {deletingItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => e.target === e.currentTarget && setDeletingItem(null)}
        >
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-gray-200 dark:border-gray-700 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {deletingItem.type === 'template' ? 'Eliminar Plantilla' : 'Eliminar Entrenamiento'}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Podrás deshacerlo durante 30 segundos</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-400">
              ¿Estás seguro de que deseas eliminar{' '}
              <strong className="text-gray-900 dark:text-gray-100 font-semibold">"{deletingItem.name}"</strong>?
              {deletingItem.type === 'workout' && ' Se eliminarán todos los registros y series de esta sesión.'}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingItem(null)}
                className="h-11 px-4 text-xs rounded-xl cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmDelete}
                className="h-11 px-4 bg-red-600 hover:bg-red-700 text-white text-xs gap-1.5 rounded-xl shadow-xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Sí, eliminar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Editar Entrenamiento */}
      {editingWorkout && (
        <EditWorkoutModal
          workout={editingWorkout}
          onClose={() => setEditingWorkout(null)}
          onSave={handleConfirmEditWorkout}
          isSaving={isSavingWorkoutEdit}
        />
      )}

      {/* Modal para Editar Plantilla */}
      {editingTemplate && (
        <EditTemplateModal
          template={editingTemplate}
          onClose={() => setEditingTemplate(null)}
          onSave={handleConfirmEditTemplate}
          isSaving={isSavingTemplateEdit}
        />
      )}
    </div>
  );
}
