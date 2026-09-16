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
import { Plus, Trash2, Clock, Check, ChevronDown, ChevronUp, Pencil, RotateCcw, Bookmark, Sparkles, Loader2, Play } from 'lucide-react';
import { saveWorkout, saveAsTemplate as saveAsTemplateAction, createDirectTemplate } from '../actions';
import { CreateExerciseDialog, type Category } from '@/components/workout/create-exercise-dialog';

// Tipos locales para el estado
type LocalSet = {
  id: string;
  repCount: number;
  weight: number | null;
  isCompleted: boolean;
};

type LocalExercise = {
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
  initialExercisesState?: any[]; // <-- NUEVO
  initialName?: string;          // <-- NUEVO
}

export function WorkoutLoggerClient({
  availableExercises,
  categories,
  workoutTypes = [],
  mode,
  typeId,
  initialExercisesState = [],
  initialName = 'Entrenamiento Libre',
}: WorkoutLoggerClientProps) {
  const router = useRouter();

  const [availableExercisesList, setAvailableExercisesList] = useState<AvailableExercise[]>(availableExercises);
  const [typeName, setTypeName] = useState(initialName);
  const [isEditingName, setIsEditingName] = useState(false);
  const [exercises, setExercises] = useState<LocalExercise[]>([]);
  const [isFinishDialogOpen, setIsFinishDialogOpen] = useState(false);
  const [totalTimeMinutes, setTotalTimeMinutes] = useState('45');
  const [notes, setNotes] = useState('');
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
          isCompleted: false,
        }));
        return { ...ex, sets: [...ex.sets, ...added] };
      })
    );
  };

  // Actualizar un campo (reps o peso) en todas las series del ejercicio
  const updateAllSetsField = (exerciseId: string, field: 'repCount' | 'weight', value: number | null) => {
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

  const handleFinish = async () => {
    setIsSaving(true);
    try {
      const payload = {
        typeId: parseInt(typeId || '1', 10),
        name: typeName,
        totalTimeSeconds: (parseInt(totalTimeMinutes, 10) || 0) * 60,
        notes,
        exercises: exercises.map((ex, index) => ({
          exerciseId: ex.exerciseId,
          orderIndex: index,
          sets: ex.sets.map((s) => ({
            repCount: s.repCount,
            weight: s.weight,
            distance: null,
            durationSeconds: null,
            rpe: null,
            isRx: true,
          })),
        })),
      };

      const result = await saveWorkout(payload);

      if (saveAsTemplate && result.workoutId) {
        await saveAsTemplateAction({
          workoutId: result.workoutId,
          name: templateName,
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
            {mode === 'repeat' && (
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
          {exercises.length > 0 && (
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

          {/* Botón Guardar Plantilla */}
          <Button
            type="button"
            onClick={() => {
              const cleanName = typeName.replace(/\s*·\s*\d{1,2}\s+[a-záéíóú]+/gi, '').trim();
              setDirectTemplateName(cleanName || 'Mi Plantilla');
              setIsTemplateDialogOpen(true);
            }}
            className={`${
              mode === 'new-template'
                ? 'bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-sm'
                : 'bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 font-semibold'
            } text-xs cursor-pointer gap-1.5`}
          >
            <Bookmark className="w-4 h-4" />
            <span>Guardar Plantilla</span>
          </Button>

          {mode === 'new-template' && (
            <Button
              type="button"
              onClick={() => {
                const cleanName = typeName.replace(/\s*·\s*\d{1,2}\s+[a-záéíóú]+/gi, '').trim();
                setDirectTemplateName(cleanName || 'Mi Plantilla');
                handleSaveDirectTemplate(true);
              }}
              disabled={isSavingTemplate || exercises.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer gap-1.5 shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Guardar e Iniciar</span>
            </Button>
          )}

          {mode !== 'new-template' && (
            <Button onClick={() => setIsFinishDialogOpen(true)} className="bg-green-600 hover:bg-green-700 text-xs font-semibold cursor-pointer">
              <Clock className="w-4 h-4 mr-1.5" />
              Finalizar Sesión
            </Button>
          )}
        </div>
      </div>

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

      {/* Lista de Ejercicios */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 items-start">
        {exercises.map((ex, exIndex) => {
          const isExpanded = !!expandedExercises[ex.id];
          const allCompleted = ex.sets.length > 0 && ex.sets.every((s) => s.isCompleted);
          const completedCount = ex.sets.filter((s) => s.isCompleted).length;
          const primaryReps = ex.sets[0]?.repCount ?? 0;
          const primaryWeight = ex.sets[0]?.weight;

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
                  /* VISTA COMPACTA / RÁPIDA (CrossFit, WODs, Fuerza rápida) */
                  <div className="p-3 bg-white dark:bg-gray-900 flex flex-wrap items-end justify-between gap-3">
                    <div className="flex items-end gap-2 flex-1 min-w-[260px]">
                      {/* Series / Rondas */}
                      <div className="flex flex-col flex-1 max-w-[100px]">
                        <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                          Series / Rondas
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

                      <span className="text-gray-400 dark:text-gray-500 font-bold self-end pb-2">×</span>

                      {/* Reps */}
                      <div className="flex flex-col flex-1 min-w-[70px]">
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

                      <span className="text-gray-400 dark:text-gray-500 font-bold self-end pb-2">@</span>

                      {/* Peso (Kg) */}
                      <div className="flex flex-col flex-1 min-w-[75px]">
                        <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                          Kg (opc.)
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
                    {/* Cabecera de columnas */}
                    <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase border-b dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                      <div className="col-span-2 text-center">Serie</div>
                      <div className="col-span-4 text-center">Kg</div>
                      <div className="col-span-4 text-center">Reps</div>
                      <div className="col-span-2 text-center">✓</div>
                    </div>

                    {/* Series individuales */}
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

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              onClick={() => {
                const cleanName = typeName.replace(/\s*·\s*\d{1,2}\s+[a-záéíóú]+/gi, '').trim();
                setDirectTemplateName(cleanName || 'Mi Plantilla');
                setIsTemplateDialogOpen(true);
              }}
              className="flex-1 sm:flex-initial bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-300 text-xs font-semibold"
            >
              <Bookmark className="w-4 h-4 mr-1.5 text-purple-600" />
              Guardar Plantilla
            </Button>

            {mode !== 'new-template' && (
              <Button
                type="button"
                onClick={() => setIsFinishDialogOpen(true)}
                className="flex-1 sm:flex-initial bg-green-600 hover:bg-green-700 text-white text-xs font-semibold"
              >
                <Clock className="w-4 h-4 mr-1.5" />
                Finalizar Sesión
              </Button>
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
              <Label>Tiempo total (minutos)</Label>
              <Input
                type="number"
                value={totalTimeMinutes}
                onChange={(e) => setTotalTimeMinutes(e.target.value)}
                className="tabular-nums"
              />
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
              {isSaving ? 'Guardando...' : 'Guardar Entrenamiento'}
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
