'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTransitionNavigate } from '@/components/layout/route-transition';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ExerciseCombobox, type ExerciseOption } from '@/components/workout/exercise-combobox';
import { Plus, Trash2, Clock, Check, ChevronDown, ChevronUp, Pencil, RotateCcw, Bookmark, Sparkles, Loader2, Play, Save, Flame, Timer, Activity, TrendingUp, Layers, Zap, Trophy } from 'lucide-react';
import { saveWorkout, saveAsTemplate as saveAsTemplateAction, createDirectTemplate, getLastSetForExercise } from '../actions';
import { CreateExerciseDialog, type Category } from '@/components/workout/create-exercise-dialog';
import { type ModalityConfig } from '@/lib/db/schema';
import { ModalityConfigPanel } from '@/components/workout/modality-config-panel';
import { formatModalitySummary, getModalitySeriesStructure, calculateModalityEstimatedDuration } from '@/lib/modality-utils';
import { HyroxRaceBuilder, type HyroxGeneratedExercise } from '@/components/workout/hyrox-race-builder';
import { CrossfitWodPicker, type WodApplyPayload } from '@/components/workout/crossfit-wod-picker';
import { OFFICIAL_WODS } from '@/lib/wods-catalog';
import { notify } from '@/lib/notify';

export const MODALITY_OPTIONS = [
  { id: 'For Time', label: 'For Time', icon: Timer, desc: 'Completar todo el trabajo en el menor tiempo' },
  { id: 'AMRAP', label: 'AMRAP', icon: Flame, desc: 'Máximas rondas / reps en tiempo límite' },
  { id: 'EMOM', label: 'EMOM', icon: Clock, desc: 'Cada minuto al minuto' },
  { id: 'AFAP', label: 'AFAP', icon: Zap, desc: 'A máxima velocidad posible' },
  { id: 'TABATA', label: 'TABATA', icon: Activity, desc: '8 rondas: 20s trabajo / 10s descanso' },
  { id: 'HIIT', label: 'HIIT / Intervalos', icon: RotateCcw, desc: 'Entrenamiento interválico de alta intensidad' },
  { id: 'Chipper', label: 'Chipper', icon: Layers, desc: 'Secuencia larga a completar una vez' },
  { id: 'Ladder', label: 'Ladder / Escalera', icon: TrendingUp, desc: 'Escalada progresiva de repeticiones' },
];

// Helpers para Tiempo (mm:ss <-> segundos) — implementación única en `@/lib/duration`.
// Se reexportan aquí para no romper imports existentes.
import { formatDurationInput, parseDurationInput } from '@/lib/duration';
export { formatDurationInput, parseDurationInput };

// ─── Detección de ejercicios de comba ───
// La comba (saltos simples, dobles, triples...) no encaja en fuerza ni en
// cardio puro: se cuantifica por saltos (reps) y/o por tiempo, sin distancia
// ni carga. Se detecta por nombre para cubrir también ejercicios personalizados.
const ROPE_INCLUDE = [
  'comba',
  'doble',
  'double',
  'triple',
  'single under',
  'single-under',
  'jump rope',
  'skipping',
];
// 'Rope Climb / Subida de cuerda' es trepa (fuerza), no comba.
const ROPE_EXCLUDE = ['climb', 'subida', 'trepa'];

export function isRopeExerciseName(name: string): boolean {
  const n = (name || '').toLowerCase();
  if (!n) return false;
  if (ROPE_EXCLUDE.some((k) => n.includes(k))) return false;
  if (n.includes('cuerda')) return true;
  return ROPE_INCLUDE.some((k) => n.includes(k));
}

// Tipos locales para el estado
export type LocalSet = {
  id: string;
  repCount: number;
  weight: number | null;
  distance?: number | null;
  durationSeconds?: number | null;
  calories?: number | null;
  rpe?: number | null;
  isRx?: boolean;
  isCompleted: boolean;
};

export type LocalExercise = {
  id: string;
  exerciseId: number;
  name: string;
  sets: LocalSet[];
};

import type { AvailableExercise, WorkoutTypeOption } from '@/lib/types';
// Reexport para no romper `hyrox-race-builder` / `crossfit-wod-picker`, que
// importan estos tipos desde aquí.
export type { AvailableExercise, WorkoutTypeOption };

interface WorkoutLoggerClientProps {
  availableExercises: AvailableExercise[];
  categories: Category[];
  workoutTypes?: WorkoutTypeOption[];
  mode: string;
  typeId?: string;
  initialExercisesState?: LocalExercise[];
  initialName?: string;
  initialNotes?: string;
  initialModality?: string | null;
  initialModalityConfig?: ModalityConfig | null;
  workoutId?: number | null;
  // Nombres ya usados (para uniquificar en cliente, p. ej. al aplicar plantilla Hyrox)
  existingWorkoutNames?: string[];
}

export function WorkoutLoggerClient({
  availableExercises,
  categories,
  workoutTypes = [],
  mode,
  typeId,
  initialExercisesState = [],
  initialName = 'Entrenamiento Libre',
  initialNotes = '',
  initialModality = null,
  initialModalityConfig = null,
  workoutId = null,
  existingWorkoutNames = [],
}: WorkoutLoggerClientProps) {
  const navigate = useTransitionNavigate();

  // Comprobar si el tipo de entrenamiento actual requiere modalidad (CrossFit, Hyrox, Funcional, Cardio...)
  const currentSelectedType = workoutTypes.find((t) => t.id.toString() === typeId) || null;
  const currentTypeNameLower = (currentSelectedType?.name || initialName || '').toLowerCase();
  const requiresModality =
    currentTypeNameLower.includes('crossfit') ||
    currentTypeNameLower.includes('hyrox') ||
    currentTypeNameLower.includes('funcional') ||
    currentTypeNameLower.includes('cardio') ||
    currentTypeNameLower.includes('running') ||
    currentTypeNameLower.includes('endurance') ||
    currentTypeNameLower.includes('wod');

  const [availableExercisesList, setAvailableExercisesList] = useState<AvailableExercise[]>(availableExercises);
  const [typeName, setTypeName] = useState(initialName);
  const [modality, setModality] = useState<string | null>(
    initialModality || (requiresModality ? 'For Time' : null)
  );
  const [modalityConfig, setModalityConfig] = useState<ModalityConfig>(() => {
    if (initialModalityConfig) return initialModalityConfig;
    return {
      timeCapMinutes: 20,
      intervalMinutes: 1,
      totalMinutes: 12,
      workSeconds: 20,
      restSeconds: 10,
      rounds: 8,
      sets: 1,
      restBetweenSetsSeconds: 60,
      repScheme: '21-15-9',
    };
  });

  const handleSelectModality = (newModality: string) => {
    setModality(newModality);
    setModalityConfig((prev) => {
      switch (newModality) {
        case 'AMRAP':
          return { ...prev, timeCapMinutes: prev.timeCapMinutes || 15 };
        case 'For Time':
        case 'AFAP':
        case 'Chipper':
          return { ...prev, timeCapMinutes: prev.timeCapMinutes || 20 };
        case 'EMOM':
          return { ...prev, intervalMinutes: prev.intervalMinutes || 1, totalMinutes: prev.totalMinutes || 12 };
        case 'TABATA':
          return {
            ...prev,
            workSeconds: prev.workSeconds ?? 20,
            restSeconds: prev.restSeconds ?? 10,
            rounds: prev.rounds ?? 8,
            sets: prev.sets ?? 1,
          };
        case 'HIIT':
          return {
            ...prev,
            workSeconds: prev.workSeconds ?? 40,
            restSeconds: prev.restSeconds ?? 20,
            rounds: prev.rounds ?? 5,
            sets: prev.sets ?? 3,
            restBetweenSetsSeconds: prev.restBetweenSetsSeconds ?? 60,
          };
        case 'Ladder':
          return {
            ...prev,
            repScheme: prev.repScheme || '21-15-9',
            timeCapMinutes: prev.timeCapMinutes || 15,
          };
        default:
          return prev;
      }
    });
  };

  const [isEditingName, setIsEditingName] = useState(false);
  const [exercises, setExercises] = useState<LocalExercise[]>([]);
  const [isFinishDialogOpen, setIsFinishDialogOpen] = useState(false);
  const [totalTimeMinutes, setTotalTimeMinutes] = useState('45');
  // Score para AMRAP/EMOM: rondas completas + reps extra (se guarda en modalityConfig)
  const [scoreRounds, setScoreRounds] = useState('');
  const [scoreReps, setScoreReps] = useState('');
  const [notes, setNotes] = useState(initialNotes);
  const [currentWorkoutId, setCurrentWorkoutId] = useState<number | null>(workoutId);
  const [isSaving, setIsSaving] = useState(false);

  // Estado para modal dedicado a Guardar como Plantilla Directa
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [directTemplateName, setDirectTemplateName] = useState('');
  const [directTemplateDescription, setDirectTemplateDescription] = useState('');
  const [directTemplateTypeId, setDirectTemplateTypeId] = useState<number>(parseInt(typeId || '1', 10));
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // Estado para el modal de crear ejercicio
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [currentExerciseIdForNew, setCurrentExerciseIdForNew] = useState<string | null>(null);

  // Guardar como plantilla (secundario al finalizar entrenamiento)
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState(initialName);

  // Sincronizar initialName si cambia
  useEffect(() => {
    setTypeName(initialName);
    setTemplateName(initialName);
    const cleanName = initialName.replace(/\s*·\s*\d{1,2}\s+[a-záéíóú]+/gi, '').trim();
    setDirectTemplateName(cleanName || 'Mi Plantilla');
  }, [initialName]);

  // Sincronizar lista de ejercicios disponibles
  useEffect(() => {
    setAvailableExercisesList(availableExercises);
  }, [availableExercises]);

  const defaultExercise = availableExercisesList[0] || { id: 1, name: 'Ejercicio' };

  // Inicializar ejercicios según el modo
  useEffect(() => {
    if (initialExercisesState && initialExercisesState.length > 0) {
      setExercises(initialExercisesState);
    } else if (mode === 'free' && exercises.length === 0) {
      const initialEx: LocalExercise = {
        id: crypto.randomUUID(),
        exerciseId: defaultExercise.id,
        name: defaultExercise.name,
        sets: [{ id: crypto.randomUUID(), repCount: 0, weight: null, isCompleted: false }],
      };
      setExercises([initialEx]);
    }
  }, [mode, initialExercisesState, defaultExercise, exercises.length]);

  // Mapa categoryId -> nombre para las agrupaciones del Combobox
  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories]
  );

  // Opciones para ExerciseCombobox con nombre de categoría incluido
  const exerciseOptions = useMemo<ExerciseOption[]>(
    () =>
      availableExercisesList.map((ex) => ({
        value: ex.id.toString(),
        label: ex.name,
        categoryId: ex.categoryId,
        categoryName: ex.categoryId ? categoryMap.get(ex.categoryId) : undefined,
      })),
    [availableExercisesList, categoryMap]
  );

  // ─── Perfil de métricas por ejercicio ───
  // Los ejercicios de categoría Cardio (Running, Cycling, Rowing, Monostructural...)
  // se registran con Distancia + Tiempo y SIN Reps/Kg. El resto usa fuerza
  // (Reps + Kg) con los matices existentes de distancia/tiempo por nombre.
  const categoryTypeByExerciseId = useMemo(
    () =>
      new Map(
        availableExercisesList.map((a) => [a.id, (a.categoryType || 'Fuerza').toLowerCase()])
      ),
    [availableExercisesList]
  );
  const isCardioProfile = (exerciseId: number) =>
    categoryTypeByExerciseId.get(exerciseId) === 'cardio';



  const addExercise = () => {
    const newEx: LocalExercise = {
      id: crypto.randomUUID(),
      exerciseId: defaultExercise.id,
      name: defaultExercise.name,
      sets: [{ id: crypto.randomUUID(), repCount: 0, weight: null, isCompleted: false }],
    };
    setExercises((prev) => [...prev, newEx]);
  };

  const handleExerciseCreated = (newExercise: AvailableExercise) => {
    // Añadimos el nuevo ejercicio a la lista disponible
    setAvailableExercisesList((prev) => [...prev, newExercise]);

    // Si se creó desde un ejercicio existente en la lista, lo seleccionamos
    if (currentExerciseIdForNew) {
      setExercises((prev) =>
        prev.map((e) =>
          e.id === currentExerciseIdForNew
            ? { ...e, exerciseId: newExercise.id, name: newExercise.name }
            : e
        )
      );
      setCurrentExerciseIdForNew(null);
    }
  };

  // Vista unificada Hyrox: una sola tabla de carrera (Tiempo + ✓) en lugar de
  // 16 tarjetas genéricas con Series/Metros/Reps/Kg redundantes.
  const [hyroxUnified, setHyroxUnified] = useState(true);
  const [hyroxShowCargas, setHyroxShowCargas] = useState(false);
  // Generador plegable: si ya hay tramos cargados (editar/reanudar) empieza colapsado
  const [showHyroxBuilder, setShowHyroxBuilder] = useState(
    () => (initialExercisesState?.length ?? 0) === 0
  );
  // Catálogo de WODs oficiales: mismo comportamiento plegable
  const [showWodPicker, setShowWodPicker] = useState(
    () => (initialExercisesState?.length ?? 0) === 0
  );

  // Estado para expandir/colapsar desglose individual por ejercicio
  const [expandedExercises, setExpandedExercises] = useState<Record<string, boolean>>({});

  // Última marca por exerciseId para el hint "Último: ..." (1 toque para rellenar).
  // Se carga bajo demanda al seleccionar/cambiar de ejercicio, no al abrir la página.
  // Es el conjunto completo de la última sesión (N series), no solo 1 serie.
  type LastMarkSet = {
    repCount: number | null;
    weight: number | null;
    distance: number | null;
    durationSeconds: number | null;
    calories: number | null;
    rpe: number | null;
  };
  const [lastMarks, setLastMarks] = useState<Record<number, LastMarkSet[] | null>>({});
  const [lastMarksLoading, setLastMarksLoading] = useState<Record<number, boolean>>({});

  const ensureLastMark = (exerciseId: number) => {
    if (!Number.isInteger(exerciseId) || exerciseId <= 0) return;
    if (exerciseId in lastMarks || lastMarksLoading[exerciseId]) return;
    setLastMarksLoading((prev) => ({ ...prev, [exerciseId]: true }));
    getLastSetForExercise(exerciseId)
      .then((mark) => setLastMarks((prev) => ({ ...prev, [exerciseId]: (mark as LastMarkSet[] | null) ?? null })))
      .catch(() => setLastMarks((prev) => ({ ...prev, [exerciseId]: null })))
      .finally(() => setLastMarksLoading((prev) => ({ ...prev, [exerciseId]: false })));
  };

  // Precargar última marca de los ejercicios visibles (solo lo no cacheado).
  useEffect(() => {
    for (const ex of exercises) ensureLastMark(ex.exerciseId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercises.map((e) => e.exerciseId).join(',')]);

  const formatSingleSetLabel = (m: LastMarkSet): string => {
    const parts: string[] = [];
    if (m.weight != null) parts.push(`${m.weight}kg`);
    if (m.repCount != null && m.repCount !== 0) parts.push(`× ${m.repCount}`);
    if (m.distance != null) parts.push(`${m.distance}m`);
    if (m.durationSeconds != null) parts.push(formatDurationInput(m.durationSeconds));
    if (m.calories != null) parts.push(`${m.calories}kcal`);
    return parts.join(' ') || '—';
  };

  const formatLastMarkLabel = (marks: LastMarkSet[]): string => {
    if (marks.length === 0) return '—';
    if (marks.length === 1) return formatSingleSetLabel(marks[0]);
    const first = formatSingleSetLabel(marks[0]);
    const allEqual = marks.every((m) => formatSingleSetLabel(m) === first);
    if (allEqual) return `${marks.length}× ${first}`;
    return `${marks.length} series · ${first}…`;
  };

  const applyLastMark = (localId: string, marks: LastMarkSet[]) => {
    // Restaura el conjunto completo como punto de partida editable:
    // repetir tal cual, añadir o quitar series después. RPE en fresco (null).
    if (marks.length === 0) return;
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== localId) return ex;
        return {
          ...ex,
          sets: marks.map((m) => ({
            id: crypto.randomUUID(),
            repCount: m.repCount ?? 0,
            weight: m.weight ?? null,
            distance: m.distance ?? null,
            durationSeconds: m.durationSeconds ?? null,
            calories: m.calories ?? null,
            rpe: null,
            isRx: true,
            isCompleted: false,
          })),
        };
      })
    );
  };

  const toggleExpand = (exerciseId: string) => {
    setExpandedExercises((prev) => ({ ...prev, [exerciseId]: !prev[exerciseId] }));
  };

  const toggleExpandAll = () => {
    const allExpanded = exercises.every((ex) => expandedExercises[ex.id]);
    const nextState: Record<string, boolean> = {};
    exercises.forEach((ex) => {
      nextState[ex.id] = !allExpanded;
    });
    setExpandedExercises(nextState);
  };

  // Detección de carrera Hyrox (para vista unificada: una tabla en vez de 16 tarjetas)
  const isHyroxPage =
    typeName.toLowerCase().includes('hyrox') ||
    currentTypeNameLower.includes('hyrox');
  const isHyroxRaceLike = isHyroxPage && exercises.length >= 1;
  const useHyroxUnified = isHyroxRaceLike && hyroxUnified;

  // Contexto CrossFit/Funcional (excluye Hyrox, que tiene su propio generador).
  // Se usa para el catálogo de WODs y para sugerir el nombre del benchmark al finalizar:
  // con el nombre por defecto ("CrossFit · 18 sept") el entreno jamás se agruparía en Progreso.
  const isCrossfitPickerContext =
    !isHyroxPage &&
    (currentTypeNameLower.includes('crossfit') ||
      currentTypeNameLower.includes('funcional') ||
      currentTypeNameLower.includes('wod') ||
      typeName.toLowerCase().includes('crossfit') ||
      typeName.toLowerCase().includes('funcional'));

  const hyroxProgress = useMemo(() => {
    if (!isHyroxRaceLike) return { done: 0, total: 0, totalSeconds: 0 };
    let done = 0;
    let totalSeconds = 0;
    for (const ex of exercises) {
      for (const s of ex.sets) {
        if (s.isCompleted) done++;
        if (s.durationSeconds) totalSeconds += s.durationSeconds;
      }
    }
    const total = exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
    return { done, total, totalSeconds };
  }, [exercises, isHyroxRaceLike]);

  const cleanHyroxName = (name: string) => name.replace(/^\d+\.\s*/, '').trim();
  const isRunRow = (name: string) => {
    const n = name.toLowerCase();
    return n.includes('run') || n.includes('correr') || n.includes('carrera') || n.includes('running');
  };
  const hyroxMetaLabel = (ex: LocalExercise) => {
    const s = ex.sets[0];
    if (!s) return '';
    const parts: string[] = [];
    if (s.distance) parts.push(`${s.distance}m`);
    if (s.repCount) parts.push(`${s.repCount} reps`);
    if (s.weight) parts.push(`@${s.weight}kg`);
    return parts.join(' · ');
  };
  const toggleAllHyroxCompleted = () => {
    setExercises((prev) => {
      const allDone = prev.every((ex) => ex.sets.every((s) => s.isCompleted));
      return prev.map((ex) => ({
        ...ex,
        sets: ex.sets.map((s) => ({ ...s, isCompleted: !allDone })),
      }));
    });
  };

  // Suma de tiempos de todos los tramos (para el total automático en Hyrox)
  const segmentTotalSeconds = useMemo(() => {
    let total = 0;
    for (const ex of exercises) {
      for (const s of ex.sets) {
        if (s.durationSeconds) total += s.durationSeconds;
      }
    }
    return total;
  }, [exercises]);

  // Al abrir el diálogo de finalizar, el total se sugiere solo:
  // 1) Hyrox: suma de tramos; 2) resto: duración estimada de la modalidad
  // (EMOM 12' → 12 min, TABATA/HIIT → protocolo, For Time → cap). Editable después.
  const modalityEstimatedSeconds =
    requiresModality && modality ? calculateModalityEstimatedDuration(modality, modalityConfig) : null;
  useEffect(() => {
    if (!isFinishDialogOpen) return;
    if (isHyroxPage && segmentTotalSeconds > 0) {
      setTotalTimeMinutes(String(Math.max(1, Math.round(segmentTotalSeconds / 60))));
    } else if (modalityEstimatedSeconds && modalityEstimatedSeconds > 0) {
      setTotalTimeMinutes(String(Math.max(1, Math.round(modalityEstimatedSeconds / 60))));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFinishDialogOpen]);

  // Ajustar número total de series desde la vista rápida
  const setSetsCount = (exerciseId: string, count: number) => {
    const targetCount = Math.max(1, Math.min(50, count));
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        const currentLength = ex.sets.length;
        if (targetCount === currentLength) return ex;
        if (targetCount < currentLength) {
          return { ...ex, sets: ex.sets.slice(0, targetCount) };
        }
        const lastSet = ex.sets[ex.sets.length - 1];
        const added: LocalSet[] = Array.from({ length: targetCount - currentLength }, () => ({
          id: crypto.randomUUID(),
          repCount: lastSet ? lastSet.repCount : 0,
          weight: lastSet ? lastSet.weight : null,
          distance: lastSet ? lastSet.distance : null,
          durationSeconds: lastSet ? lastSet.durationSeconds : null,
          calories: lastSet ? lastSet.calories : null,
          rpe: lastSet ? lastSet.rpe : null,
          isRx: lastSet ? lastSet.isRx : true,
          isCompleted: false,
        }));
        return { ...ex, sets: [...ex.sets, ...added] };
      })
    );
  };

  // Generar estructura desde modalityConfig (EMOM/TABATA/HIIT/Ladder).
  // Crece siempre; al repartir (EMOM alterno / TABATA compartido) también
  // recorta, pero solo series vacías del final. Si hay datos, no se borra:
  // se avisa para ajustar a mano con el input Series.
  const [emomMode, setEmomMode] = useState<'shared' | 'alternate'>(
    () => initialModalityConfig?.emomMode ?? 'shared'
  );
  const [tabataMode, setTabataMode] = useState<'perExercise' | 'shared'>(
    () => initialModalityConfig?.tabataMode ?? 'perExercise'
  );
  const withEmomMode = (cfg: ModalityConfig): ModalityConfig => {
    let out = cfg;
    if (modality === 'EMOM') out = { ...out, emomMode };
    if (modality === 'TABATA') out = { ...out, tabataMode };
    return out;
  };
  const isEmptySet = (s: LocalSet): boolean =>
    !s.isCompleted &&
    (s.repCount ?? 0) === 0 &&
    (s.weight ?? null) === null &&
    (s.distance ?? null) === null &&
    (s.durationSeconds ?? null) === null &&
    (s.calories ?? null) === null &&
    (s.rpe ?? null) === null;
  const applyModalityStructure = () => {
    const structure = getModalitySeriesStructure(modality, modalityConfig);
    if (!structure || exercises.length === 0) return;
    const reps = structure.reps;
    let blockedShrink = 0;
    setExercises((prev) => {
      const numEx = prev.length;
      return prev.map((ex, exIndex) => {
        let targetCount = Math.max(1, Math.min(50, structure.count));
        if (modality === 'EMOM' && emomMode === 'alternate' && numEx > 1) {
          const total = structure.count;
          const base = Math.floor(total / numEx);
          const remainder = total % numEx;
          targetCount = Math.max(1, base + (exIndex < remainder ? 1 : 0));
        }
        if (modality === 'TABATA' && tabataMode === 'shared' && numEx > 1) {
          const total = structure.count;
          const base = Math.floor(total / numEx);
          const remainder = total % numEx;
          targetCount = Math.max(1, base + (exIndex < remainder ? 1 : 0));
        }
        const grown: LocalSet[] = [...ex.sets];
        if (grown.length < targetCount) {
          const lastSet = grown[grown.length - 1];
          for (let i = grown.length; i < targetCount; i++) {
            grown.push({
              id: crypto.randomUUID(),
              repCount: reps ? reps[i] ?? lastSet?.repCount ?? 0 : lastSet?.repCount ?? 0,
              weight: lastSet?.weight ?? null,
              distance: lastSet?.distance ?? null,
              durationSeconds: lastSet?.durationSeconds ?? null,
              calories: lastSet?.calories ?? null,
              rpe: null,
              isRx: lastSet?.isRx ?? true,
              isCompleted: false,
            });
          }
        } else if (grown.length > targetCount) {
          // Recorte seguro: solo series vacías del final (caso típico: se generó
          // con 1 ejercicio y luego se añadió otro en modo compartido).
          while (grown.length > targetCount && isEmptySet(grown[grown.length - 1])) {
            grown.pop();
          }
          if (grown.length > targetCount) blockedShrink += 1;
        }
        // Ladder: fijar reps del esquema en las series solapadas (resetea ✓ si cambia).
        const updated = reps
          ? grown.map((s, i) => {
              if (i >= reps.length) return s;
              if (s.repCount === reps[i]) return s;
              return { ...s, repCount: reps[i], isCompleted: false };
            })
          : grown;
        return { ...ex, sets: updated };
      });
    });
    if (blockedShrink > 0) {
      notify.warning(
        'Revisa las series',
        `${blockedShrink} ejercicio(s) tienen datos y no se recortaron solos: ajusta el nº en Series`
      );
    } else {
      notify.success('Estructura aplicada', structure.label);
    }
  };

  // Actualizar un campo (reps, peso, distancia, calorías, RPE...) en todas las series del ejercicio
  const updateAllSetsField = (
    exerciseId: string,
    field: 'repCount' | 'weight' | 'distance' | 'durationSeconds' | 'calories' | 'rpe',
    value: number | null
  ) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s) => ({ ...s, [field]: value })),
        };
      })
    );
  };

  // Alternar completado de todas las series de un ejercicio
  const toggleAllSetsCompleted = (exerciseId: string) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        const allDone = ex.sets.every((s) => s.isCompleted);
        return {
          ...ex,
          sets: ex.sets.map((s) => ({ ...s, isCompleted: !allDone })),
        };
      })
    );
  };

  // Eliminar una serie específica en la vista detallada
  const removeSet = (exerciseId: string, setId: string) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        if (ex.sets.length <= 1) return ex;
        return {
          ...ex,
          sets: ex.sets.filter((s) => s.id !== setId),
        };
      })
    );
  };

  const addSet = (exerciseId: string) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id === exerciseId) {
          const lastSet = ex.sets[ex.sets.length - 1];
          const newSet: LocalSet = {
            id: crypto.randomUUID(),
            repCount: lastSet ? lastSet.repCount : 0,
            weight: lastSet ? lastSet.weight : null,
            distance: lastSet ? lastSet.distance : null,
            durationSeconds: lastSet ? lastSet.durationSeconds : null,
            calories: lastSet ? lastSet.calories : null,
            rpe: lastSet ? lastSet.rpe : null,
            isRx: lastSet ? lastSet.isRx : true,
            isCompleted: false,
          };
          return { ...ex, sets: [...ex.sets, newSet] };
        }
        return ex;
      })
    );
  };

  const updateSet = (exerciseId: string, setId: string, field: keyof LocalSet, value: number | boolean | null) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id === exerciseId) {
          return {
            ...ex,
            sets: ex.sets.map((s) => (s.id === setId ? { ...s, [field]: value } : s)),
          };
        }
        return ex;
      })
    );
  };

  const removeExercise = (exerciseId: string) => {
    setExercises((prev) => prev.filter((ex) => ex.id !== exerciseId));
  };

  // Nombres ocupados (minúsculas) para uniquificar en cliente sin roundtrip.
  // Se resincroniza si la prop cambia (antes se congelaba con deps `[]`).
  const takenNamesRef = useMemo(
    () => new Set(existingWorkoutNames.map((n) => n.toLowerCase())),
    [existingWorkoutNames]
  );
  const makeUniqueClientName = (base: string): string => {
    const clean = base.trim() || 'Entrenamiento';
    if (!takenNamesRef.has(clean.toLowerCase())) {
      takenNamesRef.add(clean.toLowerCase());
      return clean;
    }
    let n = 2;
    while (takenNamesRef.has(`${clean.toLowerCase()} (${n})`)) n++;
    const unique = `${clean} (${n})`;
    takenNamesRef.add(unique.toLowerCase());
    return unique;
  };

  // Aplicar preset generado desde HyroxRaceBuilder.
  // El título del preset sobrescribe el nombre: se uniquifica aquí porque la
  // comprobación de page.tsx ya no aplica una vez cargada la página.
  const handleApplyHyroxPreset = (newTitle: string, generatedExercises: HyroxGeneratedExercise[]) => {
    const uniqueTitle = currentWorkoutId ? newTitle : makeUniqueClientName(newTitle);
    setTypeName(uniqueTitle);
    setTemplateName(uniqueTitle);
    setDirectTemplateName(uniqueTitle);
    setExercises(generatedExercises);
  };

  // WOD pendiente de confirmación (sustituiría los ejercicios actuales)
  const [pendingWod, setPendingWod] = useState<WodApplyPayload | null>(null);

  // Aplicar WOD oficial desde el catálogo: nombre + modalidad + ejercicios precargados.
  // Desde aquí el usuario puede entrenarlo directamente o guardarlo como plantilla
  // con el flujo existente ("Guardar como plantilla"), cubriendo ambos casos.
  const applyWodPayload = (payload: WodApplyPayload) => {
    const uniqueTitle = currentWorkoutId ? payload.title : makeUniqueClientName(payload.title);
    setTypeName(uniqueTitle);
    setTemplateName(uniqueTitle);
    setDirectTemplateName(uniqueTitle);
    setModality(payload.modality);
    setModalityConfig(payload.modalityConfig);
    if (payload.modality === 'EMOM') setEmomMode(payload.modalityConfig?.emomMode ?? 'shared');
    if (payload.modality === 'TABATA') setTabataMode(payload.modalityConfig?.tabataMode ?? 'perExercise');
    setExercises(payload.exercises);
    setShowWodPicker(false);
    setPendingWod(null);
  };

  const handleApplyWod = (payload: WodApplyPayload) => {
    if (exercises.length > 0) {
      setPendingWod(payload);
      return;
    }
    applyWodPayload(payload);
  };

  const handleDirectSave = async () => {
    if (exercises.length === 0) {
      notify.warning('Sin ejercicios', 'Añade al menos un ejercicio antes de guardar');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        workoutId: currentWorkoutId,
        typeId: parseInt(typeId || '1', 10),
        name: typeName,
        modality: requiresModality ? modality : null,
        modalityConfig: requiresModality && modality ? withEmomMode(modalityConfig) : null,
        totalTimeSeconds: 0, // 0 = Guardado sin finalizar / En progreso
        notes,
        exercises: exercises.map((ex, index) => ({
          exerciseId: ex.exerciseId,
          orderIndex: index,
          sets: ex.sets.map((s) => ({
            repCount: s.repCount,
            weight: s.weight,
            distance: s.distance ?? null,
            durationSeconds: s.durationSeconds ?? null,
            calories: s.calories ?? null,
            rpe: s.rpe ?? null,
            isRx: s.isRx ?? true,
          })),
        })),
      };

      const result = await saveWorkout(payload);
      if (result.workoutId && !currentWorkoutId) {
        setCurrentWorkoutId(result.workoutId);
      }
      // El toast sobrevive a la navegación (el Toaster vive en el layout raíz)
      notify.success('Entrenamiento guardado', `"${typeName}"`);
      navigate('/workouts');
    } catch (error) {
      console.error(error);
      notify.errorFrom(error, 'Error al guardar el entrenamiento');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinish = async () => {
    setIsSaving(true);
    try {
      // Score AMRAP/EMOM (rondas + reps): solo se adjunta al finalizar, nunca a plantillas
      const parsedRounds = parseInt(scoreRounds, 10);
      const parsedReps = parseInt(scoreReps, 10);
      const finishConfig =
        requiresModality && modality && (modality === 'AMRAP' || modality === 'EMOM')
          ? withEmomMode({
              ...modalityConfig,
              ...(!isNaN(parsedRounds) && parsedRounds >= 0 ? { scoreRounds: parsedRounds } : {}),
              ...(!isNaN(parsedReps) && parsedReps >= 0 ? { scoreReps: parsedReps } : {}),
            })
          : requiresModality && modality
            ? withEmomMode(modalityConfig)
            : null;
      const payload = {
        workoutId: currentWorkoutId,
        typeId: parseInt(typeId || '1', 10),
        name: typeName,
        modality: requiresModality ? modality : null,
        modalityConfig: finishConfig,
        totalTimeSeconds: (parseInt(totalTimeMinutes, 10) || 0) * 60,
        notes,
        exercises: exercises.map((ex, index) => ({
          exerciseId: ex.exerciseId,
          orderIndex: index,
          sets: ex.sets.map((s) => ({
            repCount: s.repCount,
            weight: s.weight,
            distance: s.distance ?? null,
            durationSeconds: s.durationSeconds ?? null,
            calories: s.calories ?? null,
            rpe: s.rpe ?? null,
            isRx: s.isRx ?? true,
          })),
        })),
      };

      const result = await saveWorkout(payload);

      if (saveAsTemplate && result.workoutId) {
        await saveAsTemplateAction({
          workoutId: result.workoutId,
          name: templateName,
          modality: requiresModality ? modality : null,
          modalityConfig: requiresModality && modality ? withEmomMode(modalityConfig) : null,
        });
      }

      notify.success('Sesión finalizada', `"${typeName}" · ¡buen trabajo!`);
      navigate('/dashboard');
    } catch (error) {
      console.error(error);
      notify.errorFrom(error, 'Error al guardar el entrenamiento');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDirectTemplate = async (andStartWorkout: boolean = false) => {
    if (!directTemplateName.trim()) {
      notify.warning('Falta el nombre', 'Introduce un nombre para la plantilla');
      return;
    }
    if (exercises.length === 0) {
      notify.warning('Sin ejercicios', 'Añade al menos un ejercicio para guardar la plantilla');
      return;
    }

    setIsSavingTemplate(true);
    try {
      const templateExercisesPayload: {
        exerciseId: number;
        orderIndex: number;
        targetReps?: number | null;
        targetWeight?: number | null;
        targetDistance?: number | null;
        targetCalories?: number | null;
        targetDurationSeconds?: number | null;
      }[] = [];

      let orderCounter = 0;
      for (const ex of exercises) {
        if (ex.sets && ex.sets.length > 0) {
          for (const s of ex.sets) {
            templateExercisesPayload.push({
              exerciseId: ex.exerciseId,
              orderIndex: orderCounter++,
              targetReps: s.repCount || null,
              targetWeight: s.weight || null,
              targetDistance: s.distance ?? null,
              targetCalories: s.calories ?? null,
              targetDurationSeconds: s.durationSeconds ?? null,
            });
          }
        } else {
          templateExercisesPayload.push({
            exerciseId: ex.exerciseId,
            orderIndex: orderCounter++,
            targetReps: null,
            targetWeight: null,
            targetDistance: null,
            targetCalories: null,
            targetDurationSeconds: null,
          });
        }
      }

      const res = await createDirectTemplate({
        name: directTemplateName.trim(),
        description: directTemplateDescription.trim() || undefined,
        typeId: directTemplateTypeId,
        modality: requiresModality ? modality : null,
        modalityConfig: requiresModality && modality ? withEmomMode(modalityConfig) : null,
        exercises: templateExercisesPayload,
      });

      setIsTemplateDialogOpen(false);
      notify.success('Plantilla guardada', `"${directTemplateName.trim()}"`);

      if (andStartWorkout && res.templateId) {
        navigate(`/workouts/log?mode=template&templateId=${res.templateId}`);
      } else {
        navigate('/workouts/new');
      }
    } catch (error) {
      console.error(error);
      notify.errorFrom(error, 'Error al guardar la plantilla');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl lg:max-w-4xl xl:max-w-5xl space-y-6 pb-32">
      {/* Barra superior con título y controles */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="space-y-1 min-w-0 flex-1">
          {isEditingName ? (
            <div className="flex items-center gap-2 max-w-md">
              <Input
                value={typeName}
                onChange={(e) => {
                  setTypeName(e.target.value);
                  setTemplateName(e.target.value);
                }}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setIsEditingName(false);
                }}
                onBlur={() => setIsEditingName(false)}
                className="text-lg font-bold h-9 bg-white dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
                placeholder="Nombre del entrenamiento"
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setIsEditingName(false)}
                className="h-9 px-2 text-emerald-600 hover:bg-emerald-50 shrink-0"
              >
                <Check className="w-4 h-4 mr-1" />
                <span className="text-xs">Listo</span>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap group">
              <h1
                onClick={() => setIsEditingName(true)}
                className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 transition-colors"
                title="Haz clic para editar el nombre"
              >
                {typeName}
              </h1>
              <button
                type="button"
                onClick={() => setIsEditingName(true)}
                className="p-1 rounded-lg text-gray-400 dark:text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer"
                title="Editar nombre del entrenamiento"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {mode === 'new-template'
                ? 'Configura los ejercicios y cargas objetivo de la plantilla'
                : 'Registra tus series y repeticiones'}
            </p>
            {requiresModality && modality && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                <Flame className="w-2.5 h-2.5" />
                {formatModalitySummary(modality, modalityConfig)}
              </span>
            )}
            {currentWorkoutId && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <Save className="w-2.5 h-2.5" />
                Borrador Guardado
              </span>
            )}
            {mode === 'repeat' && !currentWorkoutId && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                <RotateCcw className="w-2.5 h-2.5" />
                Repetición
              </span>
            )}
            {mode === 'new-template' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                <Bookmark className="w-2.5 h-2.5" />
                Nueva Plantilla
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {exercises.length > 0 && !useHyroxUnified && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleExpandAll}
              className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              {exercises.every((ex) => expandedExercises[ex.id]) ? 'Compactar todo' : 'Desglosar todo'}
            </Button>
          )}

          {/* MODO PLANIFICACIÓN: Botones para Plantillas */}
          {mode === 'new-template' ? (
            <>
              <Button
                type="button"
                onClick={() => {
                  const cleanName = typeName.replace(/\s*·\s*\d{1,2}\s+[a-záéíóú]+/gi, '').trim();
                  setDirectTemplateName(cleanName || 'Mi Plantilla');
                  setIsTemplateDialogOpen(true);
                }}
                disabled={isSavingTemplate || exercises.length === 0}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-xs text-xs cursor-pointer gap-1.5"
              >
                <Bookmark className="w-4 h-4" />
                <span>Guardar Plantilla</span>
              </Button>

              <Button
                type="button"
                onClick={() => {
                  const cleanName = typeName.replace(/\s*·\s*\d{1,2}\s+[a-záéíóú]+/gi, '').trim();
                  setDirectTemplateName(cleanName || 'Mi Plantilla');
                  handleSaveDirectTemplate(true);
                }}
                disabled={isSavingTemplate || exercises.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer gap-1.5 shadow-xs"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Guardar e Iniciar</span>
              </Button>
            </>
          ) : (
            <>
              {/* MODO ENTRENAMIENTO EN VIVO: Guardar Entrenamiento vs Finalizar Sesión */}
              <Button
                type="button"
                onClick={handleDirectSave}
                disabled={isSaving || exercises.length === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer gap-1.5 shadow-xs"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Guardar Entrenamiento</span>
                  </>
                )}
              </Button>

              <Button
                type="button"
                onClick={() => setIsFinishDialogOpen(true)}
                disabled={isSaving || exercises.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer gap-1.5 shadow-xs"
              >
                <Clock className="w-4 h-4" />
                <span>Finalizar Sesión</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ─── PASO 1 · PUNTO DE PARTIDA (opcional: biblioteca Hyrox / WODs) ─── */}
      {/* Antes partía en dos la configuración: ahora va primero y colapsado si ya hay ejercicios */}
      {((currentTypeNameLower.includes('hyrox') || typeName.toLowerCase().includes('hyrox')) ||
        isCrossfitPickerContext) && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <span className="w-5 h-5 rounded-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[11px] font-black flex items-center justify-center shrink-0">
              1
            </span>
            <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
              Punto de partida
            </h3>
            <span className="text-[11px] text-gray-400 font-medium">opcional · carga una base o empieza de cero</span>
          </div>

          {/* ─── GENERADOR OFICIAL HYROX (plegable para no duplicar la vista de carrera) ─── */}
          {(currentTypeNameLower.includes('hyrox') || typeName.toLowerCase().includes('hyrox')) && (
            <div className="space-y-2">
              {exercises.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowHyroxBuilder((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl border border-purple-200 dark:border-purple-800/60 bg-purple-50/60 dark:bg-purple-950/20 text-xs font-bold text-purple-900 dark:text-purple-200 hover:bg-purple-100 dark:hover:bg-purple-950/40 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    {showHyroxBuilder ? 'Ocultar generador de carrera Hyrox' : `Generador Hyrox (${exercises.length} tramos cargados)`}
                  </span>
                  <span className="text-purple-500">{showHyroxBuilder ? '▲' : '▼'}</span>
                </button>
              )}
              {(showHyroxBuilder || exercises.length === 0) && (
                <HyroxRaceBuilder
                  availableExercises={availableExercisesList}
                  onApplyPreset={(title, generated) => {
                    handleApplyHyroxPreset(title, generated);
                    setShowHyroxBuilder(false);
                    setHyroxUnified(true);
                  }}
                />
              )}
            </div>
          )}

          {/* ─── CATÁLOGO DE WODs OFICIALES (CrossFit / Funcional) ─── */}
          {isCrossfitPickerContext && (
            <div className="space-y-2">
              {exercises.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowWodPicker((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl border border-orange-200 dark:border-orange-800/60 bg-orange-50/60 dark:bg-orange-950/20 text-xs font-bold text-orange-900 dark:text-orange-200 hover:bg-orange-100 dark:hover:bg-orange-950/40 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Trophy className="w-3.5 h-3.5 text-orange-500" />
                    {showWodPicker ? 'Ocultar catálogo de WODs oficiales' : `WODs oficiales (${exercises.length} ejercicios cargados)`}
                  </span>
                  <span className="text-orange-500">{showWodPicker ? '▲' : '▼'}</span>
                </button>
              )}
              {(showWodPicker || exercises.length === 0) && (
                <CrossfitWodPicker
                  availableExercises={availableExercisesList}
                  onApplyWod={handleApplyWod}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── PASO 2 · MODALIDAD (CrossFit, Hyrox, Funcional, Cardio) ─── */}
      {requiresModality && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <span className="w-5 h-5 rounded-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[11px] font-black flex items-center justify-center shrink-0">
              2
            </span>
            <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
              Modalidad de la Sesión / WOD
            </h3>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-orange-200/80 dark:border-orange-900/40 p-3.5 sm:p-4 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
                <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  Modalidad de la Sesión / WOD
                </h3>
              </div>
              <span className="text-[11px] text-gray-400 font-medium">
                Selecciona el formato para las métricas y rankings
              </span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              {MODALITY_OPTIONS.map((m) => {
                const Icon = m.icon;
                const isSelected = modality === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSelectModality(m.id)}
                    title={m.desc}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
                      isSelected
                        ? 'bg-orange-500 text-white border-orange-600 shadow-xs'
                        : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-orange-50 dark:hover:bg-orange-950/20 hover:text-orange-600'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Panel de Inputs y Tiempos de Ejecución Personalizados */}
          {modality && (
            <ModalityConfigPanel
              modality={modality}
              config={modalityConfig}
              onChange={setModalityConfig}
            />
          )}
        </div>
      )}

      {/* Banner de Modo Planificación */}
      {mode === 'new-template' && (
        <div className="p-3.5 bg-purple-50/80 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 rounded-2xl flex items-center justify-between gap-3 text-xs text-purple-900 dark:text-purple-200">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
            <span>
              <strong>Modo Planificación:</strong> Diseña tus ejercicios y series objetivo. Pulsa <strong>"Guardar Plantilla"</strong> para tenerla lista cuando vayas al gimnasio.
            </span>
          </div>
        </div>
      )}

      {/* ─── PASO 3 · EJERCICIOS (aquí vive Generar estructura, en contexto) ─── */}
      <div className="flex items-center gap-2 px-1">
        <span className="w-5 h-5 rounded-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[11px] font-black flex items-center justify-center shrink-0">
          3
        </span>
        <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
          Ejercicios
        </h3>
        <span className="text-[11px] text-gray-400 font-medium">
          {exercises.length} cargado{exercises.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Generar estructura integrada en la configuración de ejercicios */}
      {(() => {
        const structure =
          requiresModality && modality && (modality === 'EMOM' || modality === 'TABATA' || modality === 'HIIT' || modality === 'Ladder')
            ? getModalitySeriesStructure(modality, modalityConfig)
            : null;
        if (!structure || exercises.length === 0 || useHyroxUnified) return null;
        const isEmomMulti = modality === 'EMOM' && exercises.length > 1;
        const isTabataMulti = modality === 'TABATA' && exercises.length > 1;
        const emomDetail = isEmomMulti
          ? emomMode === 'shared'
            ? `${structure.count} min compartidos · ambos cada minuto (${structure.count}+${structure.count})`
            : `${structure.count} min alternos (${Math.ceil(structure.count / exercises.length)}+${Math.floor(structure.count / exercises.length)})`
          : isTabataMulti
            ? tabataMode === 'shared'
              ? `${structure.count} rondas compartidas · rotando`
              : `${structure.count} rondas c/u · secuencial`
            : structure.label;
        const generateDetail = `Generar estructura: ${emomDetail}`;
        return (
          <div className="space-y-2">
            {isEmomMulti && (
              <div className="px-4 py-2 rounded-2xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-[11px] text-blue-900 dark:text-blue-200">
                Minuto compartido: Min N = {exercises.map((e) => e.name).join(' + ')} juntos. Lo que sobre del minuto se descansa. No son dos EMOMs: el total sigue siendo {structure.count}&apos;.
              </div>
            )}
            {isTabataMulti && (
              <div className="px-4 py-2 rounded-2xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-[11px] text-blue-900 dark:text-blue-200">
                {tabataMode === 'shared'
                  ? `Rondas compartidas: R N rota entre ${exercises.map((e) => e.name).join(' y ')} (20s on / 10s off). Un solo Tabata.`
                  : `Un Tabata completo por ejercicio, en secuencia: ${structure.count} rondas cada uno.`}
              </div>
            )}
            {isEmomMulti && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setEmomMode('shared')}
                  className={`flex-1 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer ${
                    emomMode === 'shared'
                      ? 'bg-orange-500 text-white border-orange-600'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  Ambos cada minuto
                </button>
                <button
                  type="button"
                  onClick={() => setEmomMode('alternate')}
                  className={`flex-1 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer ${
                    emomMode === 'alternate'
                      ? 'bg-orange-500 text-white border-orange-600'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  Alternos impar/par
                </button>
              </div>
            )}
            {isTabataMulti && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setTabataMode('perExercise')}
                  className={`flex-1 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer ${
                    tabataMode === 'perExercise'
                      ? 'bg-orange-500 text-white border-orange-600'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  Cada uno su Tabata
                </button>
                <button
                  type="button"
                  onClick={() => setTabataMode('shared')}
                  className={`flex-1 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer ${
                    tabataMode === 'shared'
                      ? 'bg-orange-500 text-white border-orange-600'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  Rondas compartidas
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={applyModalityStructure}
              title="Crea las series que faltan y recorta las vacías al repartir. Nunca borra series con datos."
              className="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-2xl border border-orange-200 dark:border-orange-800/60 bg-orange-50/60 dark:bg-orange-950/20 text-xs font-bold text-orange-900 dark:text-orange-200 hover:bg-orange-100 dark:hover:bg-orange-950/40 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2 min-w-0">
                <Layers className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <span className="truncate">{generateDetail}</span>
              </span>
              <span className="shrink-0 text-orange-500">→ {exercises.length} ej.</span>
            </button>
          </div>
        );
      })()}

      {/* Lista de Ejercicios — en Hyrox se unifica en una sola tabla de carrera */}
      <div className="space-y-4">
        {useHyroxUnified && (
          <Card className="w-full overflow-hidden border border-purple-200 dark:border-purple-800/60 shadow-sm">
            <CardHeader className="bg-purple-50/80 dark:bg-purple-950/30 py-3 px-4 flex flex-row items-center justify-between gap-2 border-b border-purple-100 dark:border-purple-800/40">
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-purple-900 dark:text-purple-200 uppercase tracking-wider">
                  Carrera Hyrox · {exercises.length} tramos
                </p>
                <p className="text-[11px] text-purple-700/70 dark:text-purple-300/70 font-medium tabular-nums">
                  {hyroxProgress.done}/{hyroxProgress.total} completados
                  {hyroxProgress.totalSeconds > 0 ? ` · ⏱ ${formatDurationInput(hyroxProgress.totalSeconds)} acumulado` : ''}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setHyroxShowCargas((v) => !v)}
                  className="h-8 px-2.5 rounded-lg text-[11px] font-bold text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 border border-purple-200 dark:border-purple-800 transition-colors cursor-pointer"
                  title="Mostrar/ocultar distancia, carga y reps (fijos por división)"
                >
                  {hyroxShowCargas ? 'Ocultar cargas' : 'Editar cargas'}
                </button>
                <button
                  type="button"
                  onClick={toggleAllHyroxCompleted}
                  className="h-8 px-2.5 rounded-lg text-[11px] font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-colors cursor-pointer"
                >
                  {hyroxProgress.done === hyroxProgress.total && hyroxProgress.total > 0 ? 'Desmarcar' : 'Todo hecho'}
                </button>
                <button
                  type="button"
                  onClick={() => setHyroxUnified(false)}
                  className="h-8 px-2.5 rounded-lg text-[11px] font-medium text-gray-500 dark:text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer"
                  title="Volver a las tarjetas por ejercicio"
                >
                  Vista tarjetas
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-2 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/50">
                <div className="col-span-1 text-center">#</div>
                <div className="col-span-5">Tramo / estación</div>
                <div className="col-span-3 text-center">Tiempo (m:ss)</div>
                <div className="col-span-2 text-center">Meta</div>
                <div className="col-span-1 text-center">✓</div>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {exercises.map((ex, exIndex) => {
                  const set = ex.sets[0];
                  const done = ex.sets.length > 0 && ex.sets.every((s) => s.isCompleted);
                  const run = isRunRow(ex.name);
                  return (
                    <div
                      key={ex.id}
                      className={`grid grid-cols-12 gap-2 px-3 sm:px-4 py-2 items-center transition-colors ${
                        done ? 'bg-green-50/60 dark:bg-green-900/10' : 'hover:bg-purple-50/40 dark:hover:bg-purple-950/10'
                      }`}
                    >
                      <div className="col-span-2 sm:col-span-1 flex items-center justify-center">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${
                          done ? 'bg-green-500 text-white' : run ? 'bg-pink-100 dark:bg-pink-950/50 text-pink-700 dark:text-pink-300' : 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300'
                        }`}>
                          {exIndex + 1}
                        </span>
                      </div>
                      <div className="col-span-10 sm:col-span-5 min-w-0">
                        <p className="font-bold text-xs text-gray-900 dark:text-gray-100 truncate">
                          {run ? '🏃 ' : '🏋️ '}{cleanHyroxName(ex.name)}
                        </p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-mono truncate">
                          {hyroxMetaLabel(ex) || '—'}
                        </p>
                        {hyroxShowCargas && set && (
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <label className="text-[10px] text-gray-400 font-semibold">Dist(m)</label>
                            <input
                              type="number"
                              value={set.distance ?? ''}
                              onChange={(e) => updateSet(ex.id, set.id, 'distance', e.target.value ? parseInt(e.target.value, 10) : null)}
                              className="w-16 h-7 text-center text-xs tabular-nums rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            />
                            <label className="text-[10px] text-gray-400 font-semibold">Kg</label>
                            <input
                              type="number"
                              step="0.5"
                              value={set.weight ?? ''}
                              onChange={(e) => updateSet(ex.id, set.id, 'weight', e.target.value ? parseFloat(e.target.value) : null)}
                              className="w-16 h-7 text-center text-xs tabular-nums rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            />
                            <label className="text-[10px] text-gray-400 font-semibold">Reps</label>
                            <input
                              type="number"
                              value={set.repCount || ''}
                              onChange={(e) => updateSet(ex.id, set.id, 'repCount', e.target.value ? parseInt(e.target.value, 10) : 0)}
                              className="w-14 h-7 text-center text-xs tabular-nums rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            />
                          </div>
                        )}
                      </div>
                      <div className="col-span-8 sm:col-span-3 col-start-3 sm:col-start-auto">
                        <Input
                          type="text"
                          inputMode="numeric"
                          placeholder="m:ss"
                          value={formatDurationInput(set?.durationSeconds)}
                          onChange={(e) => {
                            if (!set) return;
                            if (e.target.value.trim() === '') {
                              updateSet(ex.id, set.id, 'durationSeconds', null);
                            } else {
                              const val = parseDurationInput(e.target.value);
                              if (val !== null) updateSet(ex.id, set.id, 'durationSeconds', val);
                            }
                          }}
                          className="text-center h-9 text-sm tabular-nums font-mono font-bold border-purple-200 bg-purple-50/50 dark:bg-purple-950/20"
                        />
                      </div>
                      <div className="col-span-2 text-center text-[10px] font-mono font-bold text-gray-500 dark:text-gray-400 tabular-nums">
                        {hyroxMetaLabel(ex) || '—'}
                      </div>
                      <div className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => toggleAllSetsCompleted(ex.id)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                            done ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                          }`}
                          title={done ? 'Desmarcar tramo' : 'Marcar tramo hecho'}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeExercise(ex.id)}
                          className="w-8 h-8 rounded-lg hidden sm:flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
                          title="Eliminar tramo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
        {!useHyroxUnified && (
        <div className="grid grid-cols-1 gap-4 items-start">
        {exercises.map((ex, exIndex) => {
          const isExpanded = !!expandedExercises[ex.id];
          const allCompleted = ex.sets.length > 0 && ex.sets.every((s) => s.isCompleted);
          const completedCount = ex.sets.filter((s) => s.isCompleted).length;
          const primaryReps = ex.sets[0]?.repCount ?? 0;
          const primaryWeight = ex.sets[0]?.weight;
          const primaryDistance = ex.sets[0]?.distance;
          const primaryDuration = ex.sets[0]?.durationSeconds ?? null;
          const primaryCalories = ex.sets[0]?.calories;
          const primaryRpe = ex.sets[0]?.rpe ?? null;

          const hasDistance =
            ex.sets.some((s) => s.distance != null) ||
            ex.name.toLowerCase().includes('run') ||
            ex.name.toLowerCase().includes('skierg') ||
            ex.name.toLowerCase().includes('ski erg') ||
            ex.name.toLowerCase().includes('sled') ||
            ex.name.toLowerCase().includes('trineo') ||
            ex.name.toLowerCase().includes('carry') ||
            ex.name.toLowerCase().includes('burpee broad') ||
            ex.name.toLowerCase().includes('remo') ||
            ex.name.toLowerCase().includes('row');

          // Perfil comba: prioridad sobre cardio (una "Comba" en categoría
          // Cardio sigue siendo comba: saltos + tiempo, sin distancia ni carga).
          const isRope = isRopeExerciseName(ex.name);
          const isCardio = !isRope && isCardioProfile(ex.exerciseId);

          // En Hyrox mostramos siempre el campo Tiempo (1000m runs + estaciones),
          // en el resto solo cuando hay distancia (o el ejercicio es de cardio/comba)
          const isHyroxContext =
            typeName.toLowerCase().includes('hyrox') ||
            currentTypeNameLower.includes('hyrox');
          const showTimeField =
            hasDistance ||
            isHyroxContext ||
            isCardio ||
            isRope ||
            ex.sets.some((s) => s.durationSeconds != null);

          return (
            <Card key={ex.id} className="w-full overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm transition-all">
              <CardHeader className="bg-gray-50/80 dark:bg-gray-800/60 py-2.5 px-4 flex flex-row items-center justify-between gap-2 border-b dark:border-gray-700">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 w-5 shrink-0 text-center">{exIndex + 1}</span>
                  <ExerciseCombobox
                    options={exerciseOptions}
                    value={ex.exerciseId.toString()}
                    onChange={(val) => {
                      const selected = exerciseOptions.find((o) => o.value === val);
                      const newExerciseId = parseInt(val, 10);
                      const newName = selected?.label || `Ejercicio ${val}`;
                      ensureLastMark(newExerciseId);
                      const newIsRope = isRopeExerciseName(newName);
                      const newIsCardio = !newIsRope && isCardioProfile(newExerciseId);
                      setExercises((prev) =>
                        prev.map((e) =>
                          e.id === ex.id
                            ? {
                                ...e,
                                exerciseId: newExerciseId,
                                name: newName,
                                // Al cambiar de perfil se limpian los campos que
                                // quedan ocultos para no persistir datos invisibles.
                                sets: newIsRope
                                  ? e.sets.map((s) => ({ ...s, weight: null, distance: null }))
                                  : newIsCardio
                                  ? e.sets.map((s) => ({ ...s, repCount: 0, weight: null }))
                                  : e.sets,
                              }
                            : e
                        )
                      );
                    }}
                    onCreateNew={() => {
                      setCurrentExerciseIdForNew(ex.id);
                      setIsCreateDialogOpen(true);
                    }}
                    className="flex-1 min-w-0 truncate"
                  />
                  {hasDistance && primaryDistance != null && (
                    <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shrink-0">
                      {primaryDistance}m
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpand(ex.id)}
                    className="h-8 px-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-1"
                    title={isExpanded ? 'Vista compacta / rápida' : 'Desglosar series individuales'}
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5 text-blue-600" />
                        <span className="hidden sm:inline">Compactar</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                        <span className="hidden sm:inline">Desglosar</span>
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeExercise(ex.id)}
                    className="h-8 w-8 text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>

              {/* Hint última marca: restaura el conjunto para repetir/añadir/quitar */}
              {(() => {
                const marks = lastMarks[ex.exerciseId];
                if (!marks || marks.length === 0) return null;
                const sameLength = ex.sets.length === marks.length;
                const alreadyApplied =
                  sameLength &&
                  ex.sets.every((s, i) => {
                    const m = marks[i];
                    return (
                      (m.weight ?? null) === (s.weight ?? null) &&
                      (m.repCount ?? 0) === (s.repCount ?? 0) &&
                      (m.distance ?? null) === (s.distance ?? null) &&
                      (m.durationSeconds ?? null) === (s.durationSeconds ?? null) &&
                      (m.calories ?? null) === (s.calories ?? null)
                    );
                  });
                if (alreadyApplied) return null;
                return (
                  <div className="px-4 py-2 flex items-center justify-between gap-2 bg-blue-50/70 dark:bg-blue-950/20 border-b border-blue-100 dark:border-blue-900/40">
                    <span className="text-[11px] font-medium text-blue-900 dark:text-blue-200 tabular-nums truncate">
                      Último: {formatLastMarkLabel(marks)}
                    </span>
                    <button
                      type="button"
                      onClick={() => applyLastMark(ex.id, marks)}
                      className="shrink-0 h-7 px-2.5 rounded-lg text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-white dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors cursor-pointer"
                    >
                      {`Usar (${marks.length})`}
                    </button>
                  </div>
                );
              })()}

              <CardContent className="p-0">
                {!isExpanded ? (
                  /* VISTA COMPACTA / RÁPIDA (CrossFit, WODs, Hyrox, Fuerza rápida) */
                  <div className="p-3 bg-white dark:bg-gray-900 flex flex-wrap items-end justify-between gap-3">
                    <div className="flex items-end gap-2 flex-1 min-w-[260px] flex-wrap sm:flex-nowrap">
                      {/* Series / Rondas */}
                      <div className="flex flex-col min-w-[65px] max-w-[80px]">
                        <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                          Series
                        </span>
                        <Input
                          type="number"
                          min="1"
                          max="50"
                          value={ex.sets.length}
                          onChange={(e) => {
                            const count = parseInt(e.target.value, 10);
                            if (!isNaN(count)) setSetsCount(ex.id, count);
                          }}
                          className="h-9 text-center font-bold text-sm tabular-nums bg-gray-50/50 dark:bg-gray-800/50 dark:text-gray-100 dark:border-gray-700"
                        />
                      </div>

                      {/* Metros (m) si el ejercicio maneja distancia o es de cardio (nunca comba) */}
                      {(hasDistance || primaryDistance != null || isCardio) && !isRope && (
                        <div className="flex flex-col flex-1 min-w-[75px]">
                          <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                            Metros (m)
                          </span>
                          <Input
                            type="number"
                            placeholder="0 m"
                            value={primaryDistance ?? ''}
                            onChange={(e) => {
                              const val = e.target.value ? parseInt(e.target.value, 10) : null;
                              updateAllSetsField(ex.id, 'distance', val);
                            }}
                            className="h-9 text-center font-bold text-sm tabular-nums bg-gray-50/50 dark:bg-gray-800/50 dark:text-gray-100 dark:border-gray-700"
                          />
                        </div>
                      )}

                      {/* Tiempo (m:ss) para Hyrox/Cardio — ej. 1000m runs y estaciones */}
                      {showTimeField && (
                        <div className="flex flex-col flex-1 min-w-[80px]">
                          <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                            Tiempo (m:ss)
                          </span>
                          <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="4:30"
                            value={formatDurationInput(primaryDuration)}
                            onChange={(e) => {
                              const val = parseDurationInput(e.target.value);
                              // Permitir borrado (cadena vacía -> null); si el formato es inválido no actualizamos
                              if (e.target.value.trim() === '' || val !== null) {
                                updateAllSetsField(ex.id, 'durationSeconds', val);
                              }
                            }}
                            className="h-9 text-center font-bold text-sm tabular-nums font-mono bg-purple-50/50 dark:bg-purple-950/20 dark:text-gray-100 dark:border-gray-700 border-purple-200"
                          />
                        </div>
                      )}

                      {/* Kcal (opcional, cardio y comba: bike, run...) */}
                      {(isCardio || isRope) && (
                        <div className="flex flex-col flex-1 min-w-[70px]">
                          <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                            Kcal
                          </span>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="0"
                            value={primaryCalories ?? ''}
                            onChange={(e) => {
                              const val = e.target.value ? parseFloat(e.target.value) : null;
                              updateAllSetsField(ex.id, 'calories', val);
                            }}
                            className="h-9 text-center font-bold text-sm tabular-nums bg-orange-50/50 dark:bg-orange-950/20 dark:text-gray-100 dark:border-gray-700 border-orange-200"
                          />
                        </div>
                      )}

                      {/* Reps (fuerza/mixto y comba; en cardio puro no tiene sentido) */}
                      {!isCardio && (
                        <div className="flex flex-col flex-1 min-w-[65px]">
                          <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                            Reps
                          </span>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={primaryReps || ''}
                            onChange={(e) => {
                              const reps = parseInt(e.target.value, 10) || 0;
                              updateAllSetsField(ex.id, 'repCount', reps);
                            }}
                            className="h-9 text-center font-bold text-sm tabular-nums bg-gray-50/50 dark:bg-gray-800/50 dark:text-gray-100 dark:border-gray-700"
                          />
                        </div>
                      )}

                      {/* Peso (Kg) (fuerza/mixto; ni cardio ni comba usan carga) */}
                      {!isCardio && !isRope && (
                        <div className="flex flex-col flex-1 min-w-[70px]">
                          <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                            Kg
                          </span>
                          <Input
                            type="number"
                            step="0.5"
                            placeholder="0"
                            value={primaryWeight ?? ''}
                            onChange={(e) => {
                              const val = e.target.value ? parseFloat(e.target.value) : null;
                              updateAllSetsField(ex.id, 'weight', val);
                            }}
                            className="h-9 text-center font-bold text-sm tabular-nums bg-gray-50/50 dark:bg-gray-800/50 dark:text-gray-100 dark:border-gray-700"
                          />
                        </div>
                      )}

                      {/* RPE (1-10, opcional — aplica a todas las series) */}
                      {!isRope && (
                        <div className="flex flex-col flex-1 min-w-[60px] max-w-[80px]">
                          <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                            RPE
                          </span>
                          <Input
                            type="number"
                            min="1"
                            max="10"
                            step="1"
                            placeholder="–"
                            title="Esfuerzo percibido 1-10 (opcional)"
                            value={primaryRpe ?? ''}
                            onChange={(e) => {
                              if (e.target.value.trim() === '') {
                                updateAllSetsField(ex.id, 'rpe', null);
                                return;
                              }
                              const val = parseInt(e.target.value, 10);
                              if (!isNaN(val)) updateAllSetsField(ex.id, 'rpe', Math.max(1, Math.min(10, val)));
                            }}
                            className="h-9 text-center font-bold text-sm tabular-nums bg-amber-50/50 dark:bg-amber-950/20 dark:text-gray-100 dark:border-gray-700 border-amber-200"
                          />
                        </div>
                      )}
                    </div>

                    {/* Botón rápido de completado */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleAllSetsCompleted(ex.id)}
                        className={`h-9 px-3.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
                          allCompleted
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : completedCount > 0
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/40 border border-amber-300 dark:border-amber-800'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <Check className={`w-4 h-4 ${allCompleted ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
                        <span>
                          {allCompleted
                            ? 'Completado'
                            : completedCount > 0
                            ? `${completedCount}/${ex.sets.length} hechas`
                            : 'Marcar hecho'}
                        </span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* VISTA DETALLADA (Serie a Serie) */
                  <div>
                    {isRope ? (
                      <>
                        <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase border-b dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                          <div className="col-span-1 text-center">{modality === 'EMOM' ? 'Min' : modality === 'TABATA' ? 'Ronda' : 'Serie'}</div>
                          <div className="col-span-3 text-center">Saltos</div>
                          <div className="col-span-4 text-center">Tiempo (m:ss)</div>
                          <div className="col-span-2 text-center">Kcal</div>
                          <div className="col-span-2 text-center">✓</div>
                        </div>

                        {ex.sets.map((set, setIndex) => (
                          <div
                            key={set.id}
                            className={`grid grid-cols-12 gap-2 px-4 py-2 items-center border-b last:border-0 transition-colors ${
                              set.isCompleted ? 'bg-green-50/50 dark:bg-green-900/10' : 'hover:bg-gray-50/30 dark:hover:bg-gray-800/50'
                            }`}
                          >
                            <div className="col-span-1 flex items-center justify-center gap-1">
                              <span className="font-semibold text-xs text-gray-600 dark:text-gray-400">{setIndex + 1}</span>
                              {ex.sets.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeSet(ex.id, set.id)}
                                  className="text-gray-300 hover:text-red-500 p-0.5 transition-colors cursor-pointer"
                                  title="Eliminar serie"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>

                            <div className="col-span-3">
                              <Input
                                type="number"
                                min="0"
                                placeholder="0"
                                className="text-center h-8 text-sm tabular-nums px-1"
                                value={set.repCount || ''}
                                onChange={(e) =>
                                  updateSet(ex.id, set.id, 'repCount', e.target.value ? parseInt(e.target.value, 10) : 0)
                                }
                              />
                            </div>

                            <div className="col-span-4">
                              <Input
                                type="text"
                                inputMode="numeric"
                                placeholder="1:00"
                                className="text-center h-8 text-sm tabular-nums font-mono px-1 border-purple-200 bg-purple-50/50 dark:bg-purple-950/20"
                                value={formatDurationInput(set.durationSeconds)}
                                onChange={(e) => {
                                  if (e.target.value.trim() === '') {
                                    updateSet(ex.id, set.id, 'durationSeconds', null);
                                  } else {
                                    const val = parseDurationInput(e.target.value);
                                    if (val !== null) updateSet(ex.id, set.id, 'durationSeconds', val);
                                  }
                                }}
                              />
                            </div>

                            <div className="col-span-2">
                              <Input
                                type="number"
                                min="0"
                                step="1"
                                placeholder="0"
                                className="text-center h-8 text-sm tabular-nums px-1 border-orange-200 bg-orange-50/50 dark:bg-orange-950/20"
                                value={set.calories ?? ''}
                                onChange={(e) =>
                                  updateSet(ex.id, set.id, 'calories', e.target.value ? parseFloat(e.target.value) : null)
                                }
                              />
                            </div>

                            <div className="col-span-2 flex justify-center">
                              <button
                                type="button"
                                onClick={() => updateSet(ex.id, set.id, 'isCompleted', !set.isCompleted)}
                                className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                                  set.isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                }`}
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </>
                    ) : isCardio ? (
                      <>
                        <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase border-b dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                          <div className="col-span-1 text-center">{modality === 'EMOM' ? 'Min' : modality === 'TABATA' ? 'Ronda' : 'Serie'}</div>
                          <div className="col-span-3 text-center">Dist. (m)</div>
                          <div className="col-span-4 text-center">Tiempo (m:ss)</div>
                          <div className="col-span-2 text-center">Kcal</div>
                          <div className="col-span-2 text-center">✓</div>
                        </div>

                        {ex.sets.map((set, setIndex) => (
                          <div
                            key={set.id}
                            className={`grid grid-cols-12 gap-2 px-4 py-2 items-center border-b last:border-0 transition-colors ${
                              set.isCompleted ? 'bg-green-50/50 dark:bg-green-900/10' : 'hover:bg-gray-50/30 dark:hover:bg-gray-800/50'
                            }`}
                          >
                            <div className="col-span-1 flex items-center justify-center gap-1">
                              <span className="font-semibold text-xs text-gray-600 dark:text-gray-400">{setIndex + 1}</span>
                              {ex.sets.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeSet(ex.id, set.id)}
                                  className="text-gray-300 hover:text-red-500 p-0.5 transition-colors cursor-pointer"
                                  title="Eliminar serie"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>

                            <div className="col-span-3">
                              <Input
                                type="number"
                                placeholder="0 m"
                                className="text-center h-8 text-sm tabular-nums px-1"
                                value={set.distance ?? ''}
                                onChange={(e) =>
                                  updateSet(ex.id, set.id, 'distance', e.target.value ? parseInt(e.target.value, 10) : null)
                                }
                              />
                            </div>

                            <div className="col-span-4">
                              <Input
                                type="text"
                                inputMode="numeric"
                                placeholder="4:30"
                                className="text-center h-8 text-sm tabular-nums font-mono px-1 border-purple-200 bg-purple-50/50 dark:bg-purple-950/20"
                                value={formatDurationInput(set.durationSeconds)}
                                onChange={(e) => {
                                  if (e.target.value.trim() === '') {
                                    updateSet(ex.id, set.id, 'durationSeconds', null);
                                  } else {
                                    const val = parseDurationInput(e.target.value);
                                    if (val !== null) updateSet(ex.id, set.id, 'durationSeconds', val);
                                  }
                                }}
                              />
                            </div>

                            <div className="col-span-2">
                              <Input
                                type="number"
                                min="0"
                                step="1"
                                placeholder="0"
                                className="text-center h-8 text-sm tabular-nums px-1 border-orange-200 bg-orange-50/50 dark:bg-orange-950/20"
                                value={set.calories ?? ''}
                                onChange={(e) =>
                                  updateSet(ex.id, set.id, 'calories', e.target.value ? parseFloat(e.target.value) : null)
                                }
                              />
                            </div>

                            <div className="col-span-2 flex justify-center">
                              <button
                                type="button"
                                onClick={() => updateSet(ex.id, set.id, 'isCompleted', !set.isCompleted)}
                                className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                                  set.isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                }`}
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </>
                    ) : hasDistance || primaryDistance != null ? (
                      <>
                        <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase border-b dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                          <div className="col-span-1 text-center">{modality === 'EMOM' ? 'Min' : modality === 'TABATA' ? 'Ronda' : 'Serie'}</div>
                          <div className="col-span-2 text-center">Metros</div>
                          <div className="col-span-3 text-center">Tiempo (m:ss)</div>
                          <div className="col-span-2 text-center">Kg</div>
                          <div className="col-span-2 text-center">Reps</div>
                          <div className="col-span-2 text-center">✓</div>
                        </div>

                        {ex.sets.map((set, setIndex) => (
                          <div
                            key={set.id}
                            className={`grid grid-cols-12 gap-2 px-4 py-2 items-center border-b last:border-0 transition-colors ${
                              set.isCompleted ? 'bg-green-50/50 dark:bg-green-900/10' : 'hover:bg-gray-50/30 dark:hover:bg-gray-800/50'
                            }`}
                          >
                            <div className="col-span-1 flex items-center justify-center gap-1">
                              <span className="font-semibold text-xs text-gray-600 dark:text-gray-400">{setIndex + 1}</span>
                              {ex.sets.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeSet(ex.id, set.id)}
                                  className="text-gray-300 hover:text-red-500 p-0.5 transition-colors cursor-pointer"
                                  title="Eliminar serie"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>

                            <div className="col-span-2">
                              <Input
                                type="number"
                                placeholder="0 m"
                                className="text-center h-8 text-sm tabular-nums px-1"
                                value={set.distance ?? ''}
                                onChange={(e) =>
                                  updateSet(ex.id, set.id, 'distance', e.target.value ? parseInt(e.target.value, 10) : null)
                                }
                              />
                            </div>

                            <div className="col-span-3">
                              <Input
                                type="text"
                                inputMode="numeric"
                                placeholder="4:30"
                                className="text-center h-8 text-sm tabular-nums font-mono px-1 border-purple-200 bg-purple-50/50 dark:bg-purple-950/20"
                                value={formatDurationInput(set.durationSeconds)}
                                onChange={(e) => {
                                  if (e.target.value.trim() === '') {
                                    updateSet(ex.id, set.id, 'durationSeconds', null);
                                  } else {
                                    const val = parseDurationInput(e.target.value);
                                    if (val !== null) updateSet(ex.id, set.id, 'durationSeconds', val);
                                  }
                                }}
                              />
                            </div>

                            <div className="col-span-2">
                              <Input
                                type="number"
                                step="0.5"
                                placeholder="0"
                                className="text-center h-8 text-sm tabular-nums px-1"
                                value={set.weight ?? ''}
                                onChange={(e) =>
                                  updateSet(ex.id, set.id, 'weight', e.target.value ? parseFloat(e.target.value) : null)
                                }
                              />
                            </div>

                            <div className="col-span-2">
                              <Input
                                type="number"
                                placeholder="0"
                                className="text-center h-8 text-sm tabular-nums px-1"
                                value={set.repCount || ''}
                                onChange={(e) =>
                                  updateSet(ex.id, set.id, 'repCount', e.target.value ? parseInt(e.target.value, 10) : 0)
                                }
                              />
                            </div>

                            <div className="col-span-2 flex justify-center">
                              <button
                                type="button"
                                onClick={() => updateSet(ex.id, set.id, 'isCompleted', !set.isCompleted)}
                                className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                                  set.isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                }`}
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </>
                    ) : showTimeField ? (
                      <>
                        <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase border-b dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                          <div className="col-span-1 text-center">{modality === 'EMOM' ? 'Min' : modality === 'TABATA' ? 'Ronda' : 'Serie'}</div>
                          <div className="col-span-2 text-center">Kg</div>
                          <div className="col-span-2 text-center">Reps</div>
                          <div className="col-span-5 text-center">Tiempo (m:ss)</div>
                          <div className="col-span-2 text-center">✓</div>
                        </div>

                        {ex.sets.map((set, setIndex) => (
                          <div
                            key={set.id}
                            className={`grid grid-cols-12 gap-2 px-4 py-2 items-center border-b last:border-0 transition-colors ${
                              set.isCompleted ? 'bg-green-50/50 dark:bg-green-900/10' : 'hover:bg-gray-50/30 dark:hover:bg-gray-800/50'
                            }`}
                          >
                            <div className="col-span-1 flex items-center justify-center gap-1">
                              <span className="font-semibold text-xs text-gray-600 dark:text-gray-400">{setIndex + 1}</span>
                              {ex.sets.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeSet(ex.id, set.id)}
                                  className="text-gray-300 hover:text-red-500 p-0.5 transition-colors cursor-pointer"
                                  title="Eliminar serie"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>

                            <div className="col-span-2">
                              <Input
                                type="number"
                                step="0.5"
                                placeholder="0"
                                className="text-center h-8 text-sm tabular-nums px-1"
                                value={set.weight ?? ''}
                                onChange={(e) =>
                                  updateSet(ex.id, set.id, 'weight', e.target.value ? parseFloat(e.target.value) : null)
                                }
                              />
                            </div>

                            <div className="col-span-2">
                              <Input
                                type="number"
                                placeholder="0"
                                className="text-center h-8 text-sm tabular-nums px-1"
                                value={set.repCount || ''}
                                onChange={(e) =>
                                  updateSet(ex.id, set.id, 'repCount', e.target.value ? parseInt(e.target.value, 10) : 0)
                                }
                              />
                            </div>

                            <div className="col-span-5">
                              <Input
                                type="text"
                                inputMode="numeric"
                                placeholder="4:30"
                                className="text-center h-8 text-sm tabular-nums font-mono px-1 border-purple-200 bg-purple-50/50 dark:bg-purple-950/20"
                                value={formatDurationInput(set.durationSeconds)}
                                onChange={(e) => {
                                  if (e.target.value.trim() === '') {
                                    updateSet(ex.id, set.id, 'durationSeconds', null);
                                  } else {
                                    const val = parseDurationInput(e.target.value);
                                    if (val !== null) updateSet(ex.id, set.id, 'durationSeconds', val);
                                  }
                                }}
                              />
                            </div>

                            <div className="col-span-2 flex justify-center">
                              <button
                                type="button"
                                onClick={() => updateSet(ex.id, set.id, 'isCompleted', !set.isCompleted)}
                                className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                                  set.isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                }`}
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </>
                    ) : (
                      <>
                        <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase border-b dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                          <div className="col-span-1 text-center">{modality === 'EMOM' ? 'Min' : modality === 'TABATA' ? 'Ronda' : 'Serie'}</div>
                          <div className="col-span-3 text-center">Kg</div>
                          <div className="col-span-3 text-center">Reps</div>
                          <div className="col-span-3 text-center">RPE</div>
                          <div className="col-span-2 text-center">✓</div>
                        </div>

                        {ex.sets.map((set, setIndex) => (
                          <div
                            key={set.id}
                            className={`grid grid-cols-12 gap-2 px-4 py-2 items-center border-b last:border-0 transition-colors ${
                              set.isCompleted ? 'bg-green-50/50 dark:bg-green-900/10' : 'hover:bg-gray-50/30 dark:hover:bg-gray-800/50'
                            }`}
                          >
                            <div className="col-span-1 flex items-center justify-center gap-1">
                              <span className="font-semibold text-xs text-gray-600 dark:text-gray-400">{setIndex + 1}</span>
                              {ex.sets.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeSet(ex.id, set.id)}
                                  className="text-gray-300 hover:text-red-500 p-0.5 transition-colors cursor-pointer"
                                  title="Eliminar serie"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>

                            <div className="col-span-3">
                              <Input
                                type="number"
                                step="0.5"
                                placeholder="0"
                                className="text-center h-8 text-sm tabular-nums px-1"
                                value={set.weight ?? ''}
                                onChange={(e) =>
                                  updateSet(ex.id, set.id, 'weight', e.target.value ? parseFloat(e.target.value) : null)
                                }
                              />
                            </div>

                            <div className="col-span-3">
                              <Input
                                type="number"
                                placeholder="0"
                                className="text-center h-8 text-sm tabular-nums px-1"
                                value={set.repCount || ''}
                                onChange={(e) =>
                                  updateSet(ex.id, set.id, 'repCount', e.target.value ? parseInt(e.target.value, 10) : 0)
                                }
                              />
                            </div>

                            <div className="col-span-3">
                              <Input
                                type="number"
                                min="1"
                                max="10"
                                step="1"
                                placeholder="–"
                                title="RPE 1-10 (opcional)"
                                className="text-center h-8 text-sm tabular-nums px-1 border-amber-200 bg-amber-50/50 dark:bg-amber-950/20"
                                value={set.rpe ?? ''}
                                onChange={(e) => {
                                  if (e.target.value.trim() === '') {
                                    updateSet(ex.id, set.id, 'rpe', null);
                                  } else {
                                    const val = parseInt(e.target.value, 10);
                                    if (!isNaN(val)) updateSet(ex.id, set.id, 'rpe', Math.max(1, Math.min(10, val)));
                                  }
                                }}
                              />
                            </div>

                            <div className="col-span-2 flex justify-center">
                              <button
                                type="button"
                                onClick={() => updateSet(ex.id, set.id, 'isCompleted', !set.isCompleted)}
                                className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                                  set.isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                }`}
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </>
                    )}

                    {/* Acciones de la vista detallada */}
                    <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-gray-50/70 dark:bg-gray-800/50 border-t dark:border-gray-700 flex-wrap">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-xs h-8"
                        onClick={() => addSet(ex.id)}
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Añadir serie
                      </Button>

                      {/* RPE masivo para perfiles sin columna RPE (cardio, comba, distancia, tiempo).
                          En fuerza ya hay RPE por serie; esto lo complementa. */}
                      <div className="flex items-center gap-1.5">
                        <label htmlFor={`rpe-all-${ex.id}`} className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          RPE todas
                        </label>
                        <Input
                          id={`rpe-all-${ex.id}`}
                          type="number"
                          min="1"
                          max="10"
                          step="1"
                          placeholder="–"
                          title="Aplicar RPE 1-10 a todas las series (opcional)"
                          value={primaryRpe ?? ''}
                          onChange={(e) => {
                            if (e.target.value.trim() === '') {
                              updateAllSetsField(ex.id, 'rpe', null);
                              return;
                            }
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val)) updateAllSetsField(ex.id, 'rpe', Math.max(1, Math.min(10, val)));
                          }}
                          className="w-16 h-8 text-center text-sm tabular-nums px-1 border-amber-200 bg-amber-50/50 dark:bg-amber-950/20"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleAllSetsCompleted(ex.id)}
                        className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 underline cursor-pointer"
                      >
                        {allCompleted ? 'Desmarcar todas' : 'Marcar todas hechas'}
                      </button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        </div>
        )}

        {isHyroxRaceLike && !useHyroxUnified && (
          <button
            type="button"
            onClick={() => setHyroxUnified(true)}
            className="w-full px-4 py-2.5 rounded-2xl border border-purple-200 dark:border-purple-800/60 bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition-colors cursor-pointer"
          >
            Volver a vista unificada de carrera (recomendada)
          </button>
        )}

        <Button
          type="button"
          variant="outline"
          className="w-full border-dashed border-2 py-6 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-400 dark:hover:border-gray-500"
          onClick={addExercise}
        >
          <Plus className="w-5 h-5 mr-2" />
          Añadir Ejercicio
        </Button>

        {/* Barra de acciones al final de la página */}
        <div className="bg-gray-50/90 dark:bg-gray-800/50 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center sm:text-left">
            <span>{exercises.length} ejercicio{exercises.length !== 1 ? 's' : ''} configurado{exercises.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            {mode === 'new-template' ? (
              <>
                <Button
                  type="button"
                  onClick={() => {
                    const cleanName = typeName.replace(/\s*·\s*\d{1,2}\s+[a-záéíóú]+/gi, '').trim();
                    setDirectTemplateName(cleanName || 'Mi Plantilla');
                    setIsTemplateDialogOpen(true);
                  }}
                  disabled={isSavingTemplate || exercises.length === 0}
                  className="flex-1 sm:flex-initial bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold gap-1.5 cursor-pointer"
                >
                  <Bookmark className="w-4 h-4" />
                  Guardar Plantilla
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    const cleanName = typeName.replace(/\s*·\s*\d{1,2}\s+[a-záéíóú]+/gi, '').trim();
                    setDirectTemplateName(cleanName || 'Mi Plantilla');
                    handleSaveDirectTemplate(true);
                  }}
                  disabled={isSavingTemplate || exercises.length === 0}
                  className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Guardar e Iniciar
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  onClick={handleDirectSave}
                  disabled={isSaving || exercises.length === 0}
                  className="flex-1 sm:flex-initial bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold gap-1.5 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Guardar Entrenamiento</span>
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={() => setIsFinishDialogOpen(true)}
                  disabled={isSaving || exercises.length === 0}
                  className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 cursor-pointer"
                >
                  <Clock className="w-4 h-4" />
                  <span>Finalizar Sesión</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Dialog de Finalización */}
      <Dialog open={isFinishDialogOpen} onOpenChange={setIsFinishDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizar Entrenamiento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre de la sesión</Label>
              <Input
                value={typeName}
                onChange={(e) => {
                  setTypeName(e.target.value);
                  setTemplateName(e.target.value);
                }}
                placeholder="Nombre del entrenamiento"
              />
              {/* Atajo de nombre: si es un benchmark conocido, usar su nombre oficial
                  hace que se agrupe en Progreso (el nombre por defecto con fecha no agrupa) */}
              {isCrossfitPickerContext && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    ¿Es un benchmark conocido? Toca su nombre para agruparlo en Progreso:
                  </p>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-0.5">
                    {OFFICIAL_WODS.map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => {
                          setTypeName(w.name);
                          setTemplateName(w.name);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                          typeName.trim().toLowerCase() === w.name.toLowerCase()
                            ? 'bg-orange-500 text-white border-orange-600 shadow-xs'
                            : 'bg-orange-50 dark:bg-orange-950/30 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800/50 hover:bg-orange-100 dark:hover:bg-orange-950/50'
                        }`}
                      >
                        {w.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Tiempo total (minutos)</Label>
                {isHyroxPage && segmentTotalSeconds > 0 && (
                  <button
                    type="button"
                    onClick={() => setTotalTimeMinutes(String(Math.max(1, Math.round(segmentTotalSeconds / 60))))}
                    className="text-[11px] font-bold text-purple-700 dark:text-purple-300 hover:underline cursor-pointer"
                    title="Recalcular sumando los tiempos de los tramos"
                  >
                    ⏱ Auto: {formatDurationInput(segmentTotalSeconds)} — recalcular
                  </button>
                )}
                {!(isHyroxPage && segmentTotalSeconds > 0) &&
                  requiresModality &&
                  modality &&
                  modalityEstimatedSeconds &&
                  modalityEstimatedSeconds > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setTotalTimeMinutes(String(Math.max(1, Math.round(modalityEstimatedSeconds / 60))))
                      }
                      className="text-[11px] font-bold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer"
                      title="Usar la duración de la modalidad (editable)"
                    >
                      ⏱ Sugerido {formatModalitySummary(modality, modalityConfig)} — aplicar
                    </button>
                  )}
              </div>
              <Input
                type="number"
                value={totalTimeMinutes}
                onChange={(e) => setTotalTimeMinutes(e.target.value)}
                className="tabular-nums"
              />
              {isHyroxPage && segmentTotalSeconds > 0 && (
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Calculado automáticamente desde la suma de tus tramos. Puedes ajustarlo manualmente si incluye transiciones u otros tiempos.
                </p>
              )}
            </div>
            {/* Score para AMRAP/EMOM: rondas + reps extra (para comparar progreso) */}
            {requiresModality && (modality === 'AMRAP' || modality === 'EMOM') && (
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-orange-50/70 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/50">
                <div className="space-y-1.5">
                  <Label>Rondas completas</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Ej: 8"
                    value={scoreRounds}
                    onChange={(e) => setScoreRounds(e.target.value)}
                    className="tabular-nums text-center font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Reps extra</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Ej: 12"
                    value={scoreReps}
                    onChange={(e) => setScoreReps(e.target.value)}
                    className="tabular-nums text-center font-bold"
                  />
                </div>
                <p className="col-span-2 text-[11px] text-gray-500 dark:text-gray-400">
                  Tu marca (p. ej. 8+12) se usará en Progreso para comparar intentos de este {modality}.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Notas / Sensaciones</Label>
              <Textarea
                placeholder="Ej: Me sentí fuerte, subí peso en la última serie..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* Guardar como plantilla */}
            <div className="space-y-2 border-t pt-4">
              <Label>Nombre para guardar (opcional)</Label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Ej: Push Day A, WOD Fran..."
              />
              <div className="flex items-center space-x-2 mt-2">
                <input
                  type="checkbox"
                  id="saveTemplate"
                  checked={saveAsTemplate}
                  onChange={(e) => setSaveAsTemplate(e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600 h-4 w-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <Label htmlFor="saveTemplate" className="text-sm cursor-pointer font-normal text-gray-700 dark:text-gray-300">
                  Guardar como plantilla reutilizable
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFinishDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleFinish} disabled={isSaving}>
              {isSaving ? 'Guardando...' : 'Finalizar y Guardar Sesión'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para Guardar como Plantilla Directa */}
      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                <Bookmark className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-gray-900 dark:text-gray-100">Guardar como Plantilla</DialogTitle>
                <DialogDescription className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Guarda esta configuración en tu catálogo de plantillas para reutilizarla cuando quieras.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="direct-template-name" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Nombre de la plantilla <span className="text-red-500">*</span>
              </Label>
              <Input
                id="direct-template-name"
                value={directTemplateName}
                onChange={(e) => setDirectTemplateName(e.target.value)}
                placeholder="Ej: Empuje / Push Day, Full Body A..."
                className="font-medium text-sm"
              />
            </div>

            {workoutTypes.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="direct-template-type" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Tipo de entrenamiento
                </Label>
                <select
                  id="direct-template-type"
                  value={directTemplateTypeId}
                  onChange={(e) => setDirectTemplateTypeId(parseInt(e.target.value, 10))}
                  className="w-full h-9 px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-gray-800 dark:text-gray-200 font-medium"
                >
                  {workoutTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="direct-template-desc" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Descripción o notas (opcional)
              </Label>
              <Textarea
                id="direct-template-desc"
                placeholder="Ej: Enfocado en hipertrofia, descanso 90s entre series..."
                value={directTemplateDescription}
                onChange={(e) => setDirectTemplateDescription(e.target.value)}
                rows={2}
                className="text-xs"
              />
            </div>

            <div className="bg-purple-50/70 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-purple-950">
                  Ejercicios incluidos ({exercises.length})
                </span>
                <span className="text-[10px] text-purple-700 font-medium">Objetivos de series y cargas</span>
              </div>
              <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                {exercises.map((ex, idx) => (
                  <div key={ex.id} className="text-xs text-purple-900 flex items-center justify-between">
                    <span className="truncate pr-2 font-medium">
                      {idx + 1}. {ex.name}
                    </span>
                    <span className="text-purple-600 shrink-0 font-mono text-[11px]">
                      {ex.sets.length} {ex.sets.length === 1 ? 'serie' : 'series'}
                      {ex.sets[0]?.repCount ? ` · ${ex.sets[0].repCount} reps` : ''}
                      {ex.sets[0]?.weight ? ` @ ${ex.sets[0].weight}kg` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-1.5 flex-wrap">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsTemplateDialogOpen(false)}
              disabled={isSavingTemplate}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => handleSaveDirectTemplate(false)}
              disabled={isSavingTemplate || exercises.length === 0}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs gap-1.5"
            >
              {isSavingTemplate ? (
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
            <Button
              type="button"
              onClick={() => handleSaveDirectTemplate(true)}
              disabled={isSavingTemplate || exercises.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Guardar e Iniciar Ahora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para crear nuevo ejercicio */}
      <CreateExerciseDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        categories={categories}
        onExerciseCreated={handleExerciseCreated}
      />

      {/* Confirmación al cargar un WOD con ejercicios ya presentes */}
      <Dialog open={pendingWod !== null} onOpenChange={(open) => { if (!open) setPendingWod(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900 dark:text-gray-100">
              Sustituir ejercicios actuales
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Cargar "{pendingWod?.title}" sustituirá los {exercises.length} {exercises.length === 1 ? 'ejercicio actual' : 'ejercicios actuales'}. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-1.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingWod(null)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => { if (pendingWod) applyWodPayload(pendingWod); }}
              className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold"
            >
              Cargar WOD
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
