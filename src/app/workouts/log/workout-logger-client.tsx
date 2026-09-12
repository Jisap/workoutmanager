'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ExerciseCombobox, type ExerciseOption } from '@/components/workout/exercise-combobox';
import { Plus, Trash2, Clock } from 'lucide-react';
import { saveWorkout } from '../actions';
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

interface WorkoutLoggerClientProps {
  availableExercises: AvailableExercise[];
  categories: Category[];
  mode: string;
  typeId?: string;
}

export function WorkoutLoggerClient({
  availableExercises,
  categories,
  mode,
  typeId,
}: WorkoutLoggerClientProps) {
  const router = useRouter();

  const [availableExercisesList, setAvailableExercisesList] = useState<AvailableExercise[]>(availableExercises);
  const [typeName, setTypeName] = useState('Entrenamiento Libre');
  const [exercises, setExercises] = useState<LocalExercise[]>([]);
  const [isFinishDialogOpen, setIsFinishDialogOpen] = useState(false);
  const [totalTimeMinutes, setTotalTimeMinutes] = useState('45');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Estado para el modal de crear ejercicio
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [currentExerciseIdForNew, setCurrentExerciseIdForNew] = useState<string | null>(null);

  // Sincronizar lista si cambia la prop
  useEffect(() => {
    setAvailableExercisesList(availableExercises);
  }, [availableExercises]);

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

  const defaultExercise = availableExercisesList[0] || { id: 1, name: 'Ejercicio' };

  // Inicializar con un ejercicio si es modo libre
  useEffect(() => {
    if (mode === 'free' && exercises.length === 0) {
      setTypeName('Entrenamiento Libre');
      const initialEx: LocalExercise = {
        id: crypto.randomUUID(),
        exerciseId: defaultExercise.id,
        name: defaultExercise.name,
        sets: [{ id: crypto.randomUUID(), repCount: 0, weight: null, isCompleted: false }],
      };
      setExercises([initialEx]);
    }
  }, [mode, defaultExercise, exercises.length]);

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

      await saveWorkout(payload);
      router.push('/dashboard');
    } catch (error) {
      console.error(error);
      alert('Error al guardar el entrenamiento');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-32">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{typeName}</h1>
          <p className="text-sm text-gray-500">Registra tus series y repeticiones</p>
        </div>
        <Button onClick={() => setIsFinishDialogOpen(true)} className="bg-green-600 hover:bg-green-700">
          <Clock className="w-4 h-4 mr-2" />
          Finalizar
        </Button>
      </div>

      {/* Lista de Ejercicios */}
      <div className="space-y-4">
        {exercises.map((ex, exIndex) => (
          <Card key={ex.id} className="overflow-hidden">
            <CardHeader className="bg-gray-50 py-3 px-4 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-sm font-bold text-gray-500 w-6 shrink-0">{exIndex + 1}</span>
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
              <Button variant="ghost" size="icon" onClick={() => removeExercise(ex.id)} className="shrink-0">
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </CardHeader>

            <CardContent className="p-0">
              {/* Cabecera de columnas */}
              <div className="grid grid-cols-10 gap-2 px-4 py-2 text-xs font-medium text-gray-500 uppercase border-b">
                <div className="col-span-2 text-center">Serie</div>
                <div className="col-span-3 text-center">Kg</div>
                <div className="col-span-3 text-center">Reps</div>
                <div className="col-span-2 text-center">✓</div>
              </div>

              {/* Series */}
              {ex.sets.map((set, setIndex) => (
                <div
                  key={set.id}
                  className={`grid grid-cols-10 gap-2 px-4 py-3 items-center border-b last:border-0 ${
                    set.isCompleted ? 'bg-green-50/50' : ''
                  }`}
                >
                  <div className="col-span-2 text-center font-medium text-gray-500">{setIndex + 1}</div>

                  <div className="col-span-3">
                    <Input
                      type="number"
                      placeholder="0"
                      className="text-center h-9 tabular-nums"
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
                      className="text-center h-9 tabular-nums"
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
                      className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
                        set.isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400 hover:bg-gray-300'
                      }`}
                    >
                      ✓
                    </button>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="ghost"
                className="w-full rounded-none text-blue-600 hover:text-blue-700 hover:bg-blue-50 py-2 text-sm font-medium"
                onClick={() => addSet(ex.id)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Añadir Serie
              </Button>
            </CardContent>
          </Card>
        ))}

        <Button
          type="button"
          variant="outline"
          className="w-full border-dashed border-2 py-6 text-gray-500 hover:text-gray-700 hover:border-gray-400"
          onClick={addExercise}
        >
          <Plus className="w-5 h-5 mr-2" />
          Añadir Ejercicio
        </Button>
      </div>

      {/* Dialog de Finalización */}
      <Dialog open={isFinishDialogOpen} onOpenChange={setIsFinishDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizar Entrenamiento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
