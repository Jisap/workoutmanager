'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ExerciseCombobox, type ExerciseOption } from '@/components/workout/exercise-combobox';
import { Plus, Trash2, Clock, Check, ChevronDown, ChevronUp, Pencil, RotateCcw, Bookmark, Sparkles, Loader2, Play, Save, Flame, Timer, Activity, TrendingUp, Layers, Zap } from 'lucide-react';
import { saveWorkout, saveAsTemplate as saveAsTemplateAction, createDirectTemplate } from '../actions';
import { CreateExerciseDialog, type Category } from '@/components/workout/create-exercise-dialog';
import { type ModalityConfig } from '@/lib/db/schema';
import { ModalityConfigPanel } from '@/components/workout/modality-config-panel';
import { formatModalitySummary } from '@/lib/modality-utils';
import { HyroxRaceBuilder, type HyroxGeneratedExercise } from '@/components/workout/hyrox-race-builder';

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

// Helpers para Tiempo (mm:ss <-> segundos) — usado en Hyrox/Cardio para los 1000m y estaciones
export function formatDurationInput(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null || isNaN(totalSeconds) || totalSeconds < 0) return '';
  const m = Math.floor(totalSeconds / 60);
  const s = Math.round(totalSeconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function parseDurationInput(value: string): number | null {
  const v = value.trim();
  if (!v) return null;
  // Formatos aceptados: "4:30", "04:30", "270" (segundos), "4.5" (minutos decimales)
  if (v.includes(':')) {
    const parts = v.split(':').map((p) => p.trim());
    if (parts.length !== 2) return null;
    const m = parseInt(parts[0], 10);
    const s = parseInt(parts[1], 10);
    if (isNaN(m) || isNaN(s) || m < 0 || s < 0 || s >= 60) return null;
    return m * 60 + s;
  }
  const num = parseFloat(v.replace(',', '.'));
  if (isNaN(num) || num < 0) return null;
  // Si es un número grande (>= 30) lo interpretamos como segundos, si no como minutos decimales
  // Ej: "270" -> 270s (4:30) · "4.5" -> 4.5min = 270s
  if (num >= 30) return Math.round(num);
  return Math.round(num * 60);
}

// Tipos locales para el estado
export type LocalSet = {
  id: string;
  repCount: number;
  weight: number | null;
  distance?: number | null;
  durationSeconds?: number | null;
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

export type AvailableExercise = {
  id: number;
  name: string;
  categoryId: number | null;
};

export type WorkoutTypeOption = {
  id: number;
  name: string;
};

interface WorkoutLoggerClientProps {
  availableExercises: AvailableExercise[];
  categories: Category[];
  workoutTypes?: WorkoutTypeOption[];
  mode: string;
  typeId?: string;
  initialExercisesState?: any[];
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
  const router = useRouter();

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

  // Estado para expandir/colapsar desglose individual por ejercicio
  const [expandedExercises, setExpandedExercises] = useState<Record<string, boolean>>({});

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

  // Al abrir el diálogo de finalizar en Hyrox, el total se calcula solo
  // sumando los tiempos introducidos tramo a tramo (editable después si quieres)
  useEffect(() => {
    if (isFinishDialogOpen && isHyroxPage && segmentTotalSeconds > 0) {
      setTotalTimeMinutes(String(Math.max(1, Math.round(segmentTotalSeconds / 60))));
    }
  }, [isFinishDialogOpen, isHyroxPage, segmentTotalSeconds]);

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
          rpe: lastSet ? lastSet.rpe : null,
          isRx: lastSet ? lastSet.isRx : true,
          isCompleted: false,
        }));
        return { ...ex, sets: [...ex.sets, ...added] };
      })
    );
  };

  // Actualizar un campo (reps, peso, distancia) en todas las series del ejercicio
  const updateAllSetsField = (
    exerciseId: string,
    field: 'repCount' | 'weight' | 'distance' | 'durationSeconds',
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

  // Nombres ocupados (minúsculas) para uniquificar en cliente sin roundtrip
  const takenNamesRef = useMemo(
    () => new Set(existingWorkoutNames.map((n) => n.toLowerCase())),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
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

  const handleDirectSave = async () => {
    if (exercises.length === 0) {
      alert('Añade al menos un ejercicio antes de guardar');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        workoutId: currentWorkoutId,
        typeId: parseInt(typeId || '1', 10),
        name: typeName,
        modality: requiresModality ? modality : null,
        modalityConfig: requiresModality && modality ? modalityConfig : null,
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
            rpe: s.rpe ?? null,
            isRx: s.isRx ?? true,
          })),
        })),
      };

      const result = await saveWorkout(payload);
      if (result.workoutId && !currentWorkoutId) {
        setCurrentWorkoutId(result.workoutId);
      }
      router.push('/workouts');
    } catch (error) {
      console.error(error);
      alert('Error al guardar el entrenamiento');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinish = async () => {
    setIsSaving(true);
    try {
      const payload = {
        workoutId: currentWorkoutId,
        typeId: parseInt(typeId || '1', 10),
        name: typeName,
        modality: requiresModality ? modality : null,
        modalityConfig: requiresModality && modality ? modalityConfig : null,
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
          modalityConfig: requiresModality && modality ? modalityConfig : null,
        });
      }

      router.push('/dashboard');
    } catch (error) {
      console.error(error);
      alert('Error al guardar el entrenamiento');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDirectTemplate = async (andStartWorkout: boolean = false) => {
    if (!directTemplateName.trim()) {
      alert('Por favor introduce un nombre para la plantilla');
      return;
    }
    if (exercises.length === 0) {
      alert('Añade al menos un ejercicio para guardar la plantilla');
      return;
    }

    setIsSavingTemplate(true);
    try {
      const templateExercisesPayload: {
        exerciseId: number;
        orderIndex: number;
        targetReps?: number | null;
        targetWeight?: number | null;
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
            });
          }
        } else {
          templateExercisesPayload.push({
            exerciseId: ex.exerciseId,
            orderIndex: orderCounter++,
            targetReps: null,
            targetWeight: null,
          });
        }
      }

      const res = await createDirectTemplate({
        name: directTemplateName.trim(),
        description: directTemplateDescription.trim() || undefined,
        typeId: directTemplateTypeId,
        modality: requiresModality ? modality : null,
        modalityConfig: requiresModality && modality ? modalityConfig : null,
        exercises: templateExercisesPayload,
      });

      setIsTemplateDialogOpen(false);

      if (andStartWorkout && res.templateId) {
        router.push(`/workouts/log?mode=template&templateId=${res.templateId}`);
      } else {
        router.push('/workouts/new');
      }
    } catch (error) {
      console.error(error);
      alert('Error al guardar la plantilla');
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

      {/* ─── SELECTOR DE MODALIDAD (CrossFit, Hyrox, Funcional, Cardio) ─── */}
      {requiresModality && (
        <div className="space-y-3">
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

          // En Hyrox mostramos siempre el campo Tiempo (1000m runs + estaciones),
          // en el resto solo cuando hay distancia
          const isHyroxContext =
            typeName.toLowerCase().includes('hyrox') ||
            currentTypeNameLower.includes('hyrox');
          const showTimeField =
            hasDistance ||
            isHyroxContext ||
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
                      setExercises((prev) =>
                        prev.map((e) =>
                          e.id === ex.id
                            ? { ...e, exerciseId: parseInt(val, 10), name: selected?.label || `Ejercicio ${val}` }
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

                      {/* Metros (m) si el ejercicio maneja distancia */}
                      {(hasDistance || primaryDistance != null) && (
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

                      {/* Reps */}
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

                      {/* Peso (Kg) */}
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
                    {hasDistance || primaryDistance != null ? (
                      <>
                        <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase border-b dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                          <div className="col-span-1 text-center">Serie</div>
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
                          <div className="col-span-1 text-center">Serie</div>
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
                          <div className="col-span-2 text-center">Serie</div>
                          <div className="col-span-4 text-center">Kg</div>
                          <div className="col-span-4 text-center">Reps</div>
                          <div className="col-span-2 text-center">✓</div>
                        </div>

                        {ex.sets.map((set, setIndex) => (
                          <div
                            key={set.id}
                            className={`grid grid-cols-12 gap-2 px-4 py-2 items-center border-b last:border-0 transition-colors ${
                              set.isCompleted ? 'bg-green-50/50 dark:bg-green-900/10' : 'hover:bg-gray-50/30 dark:hover:bg-gray-800/50'
                            }`}
                          >
                            <div className="col-span-2 flex items-center justify-center gap-1">
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

                            <div className="col-span-4">
                              <Input
                                type="number"
                                step="0.5"
                                placeholder="0"
                                className="text-center h-8 text-sm tabular-nums"
                                value={set.weight ?? ''}
                                onChange={(e) =>
                                  updateSet(ex.id, set.id, 'weight', e.target.value ? parseFloat(e.target.value) : null)
                                }
                              />
                            </div>

                            <div className="col-span-4">
                              <Input
                                type="number"
                                placeholder="0"
                                className="text-center h-8 text-sm tabular-nums"
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
                    )}

                    {/* Acciones de la vista detallada */}
                    <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50/70 dark:bg-gray-800/50 border-t dark:border-gray-700">
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
    </div>
  );
}
