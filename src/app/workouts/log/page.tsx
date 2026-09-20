import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { exerciseCategories, workoutTypes, workouts } from '@/lib/db/schema';
import { asc, eq } from 'drizzle-orm';
import { WorkoutLoggerClient } from './workout-logger-client';
import { PageReady } from '@/components/layout/route-transition';
import { getTemplateData, getLastWorkoutData, getWorkoutData, getAvailableExercises, getAvailableCategories } from '../actions';

export default async function WorkoutLogPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; typeId?: string; templateId?: string; workoutId?: string; modality?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const params = await searchParams;
  const mode = params.mode || 'free';
  const typeId = params.typeId;
  const templateId = params.templateId ? parseInt(params.templateId, 10) : null;
  const workoutId = params.workoutId ? parseInt(params.workoutId, 10) : null;

  // Cargar datos en paralelo
  const [availableExercises, categories, allWorkoutTypes, existingNames] = await Promise.all([
    getAvailableExercises(userId),
    getAvailableCategories(userId),
    db.select().from(workoutTypes).orderBy(asc(workoutTypes.name)),
    db.select({ name: workouts.name }).from(workouts).where(eq(workouts.userId, userId)),
  ]);

  // Nombres por defecto únicos: "Categoría · fecha" (+ contador si ya existe).
  // Evita que todos los entrenos se llamen igual ("Hyrox", "Entrenamiento Libre"...).
  const takenNames = new Set(existingNames.map((r) => r.name.toLowerCase()));
  const makeUniqueName = (base: string): string => {
    const clean = base.trim() || 'Entrenamiento';
    if (!takenNames.has(clean.toLowerCase())) {
      takenNames.add(clean.toLowerCase());
      return clean;
    }
    let n = 2;
    while (takenNames.has(`${clean.toLowerCase()} (${n})`)) n++;
    const unique = `${clean} (${n})`;
    takenNames.add(unique.toLowerCase());
    return unique;
  };
  const todayStr = new Date().toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
  });

  let initialExercisesState: any[] = [];
  let workoutName = mode === 'new-template' ? 'Nueva Plantilla' : 'Entrenamiento Libre';
  let currentTypeId = typeId ? parseInt(typeId, 10) : 1;
  let activeWorkoutId: number | null = null;
  let initialNotes = '';
  let initialModality: string | null = params.modality || null;
  let initialModalityConfig: any = null;

  // Obtener el nombre del tipo de entrenamiento
  if ((mode === 'free' || mode === 'new-template') && typeId) {
    const workoutType = allWorkoutTypes.find((t) => t.id === parseInt(typeId, 10));
    if (workoutType) {
      workoutName =
        mode === 'new-template'
          ? makeUniqueName(`Plantilla - ${workoutType.name} · ${todayStr}`)
          : makeUniqueName(`${workoutType.name} · ${todayStr}`);
    }
  } else if (mode === 'free') {
    const fallbackType = allWorkoutTypes.find((t) => t.id === currentTypeId);
    workoutName = makeUniqueName(`${fallbackType?.name || 'Entrenamiento Libre'} · ${todayStr}`);
  }

  if (mode === 'template' && templateId) {
    const template = await getTemplateData(templateId, userId);
    if (template) {
      workoutName = makeUniqueName(`${template.name} · ${todayStr}`);
      currentTypeId = template.typeId || 1;
      initialModality = template.modality || initialModality;
      initialModalityConfig = template.modalityConfig || null;

      const groupedExercises: { exerciseId: number; name: string; sets: any[] }[] = [];
      for (const ex of template.exercises) {
        const last = groupedExercises[groupedExercises.length - 1];
        if (last && last.exerciseId === ex.exerciseId) {
          last.sets.push({
            id: crypto.randomUUID(),
            repCount: ex.targetReps || 0,
            weight: ex.targetWeight,
            distance: ex.targetDistance ?? null,
            durationSeconds: ex.targetDurationSeconds ?? null,
            calories: ex.targetCalories ?? null,
            rpe: null,
            isRx: true,
            isCompleted: false,
          });
        } else {
          groupedExercises.push({
            exerciseId: ex.exerciseId,
            name: ex.exercise.name,
            sets: [
              {
                id: crypto.randomUUID(),
                repCount: ex.targetReps || 0,
                weight: ex.targetWeight,
                distance: ex.targetDistance ?? null,
                durationSeconds: ex.targetDurationSeconds ?? null,
                calories: ex.targetCalories ?? null,
                rpe: null,
                isRx: true,
                isCompleted: false,
              },
            ],
          });
        }
      }

      initialExercisesState = groupedExercises.map((g) => ({
        id: crypto.randomUUID(),
        exerciseId: g.exerciseId,
        name: g.name,
        sets: g.sets,
      }));
    }
  } else if (mode === 'repeat' || mode === 'resume' || mode === 'edit') {
    const targetWorkout = workoutId
      ? await getWorkoutData(workoutId, userId)
      : await getLastWorkoutData(userId);

    if (targetWorkout) {
      const isDraftWorkout =
        !targetWorkout.totalTimeSeconds || targetWorkout.totalTimeSeconds === 0;

      initialModality = targetWorkout.modality || initialModality;
      initialModalityConfig = targetWorkout.modalityConfig || null;

      // Si es un entrenamiento guardado sin finalizar o venimos explícitamente a reanudar/editar
      if (isDraftWorkout || mode === 'resume' || mode === 'edit') {
        activeWorkoutId = targetWorkout.id;
        workoutName = targetWorkout.name;
        initialNotes = targetWorkout.notes || '';
      } else {
        // Limpiar sufijos anteriores tipo (Copia), (Repetición) o fechas previas para obtener el nombre base
        const cleanBaseName =
          targetWorkout.name
            .replace(/\s*\(Copia\)+/gi, '')
            .replace(/\s*\(Repetici[oó]n\)+/gi, '')
            .replace(/\s*·\s*\d{1,2}\s+[a-záéíóú]+/gi, '')
            .trim() || 'Entrenamiento';

        workoutName = makeUniqueName(`${cleanBaseName} · ${todayStr}`);
      }

      currentTypeId = targetWorkout.typeId;
      initialExercisesState = targetWorkout.exercises.map((ex: any) => ({
        id: crypto.randomUUID(),
        exerciseId: ex.exerciseId,
        name: ex.exercise.name,
        sets: ex.sets.map((s: any) => ({
          id: crypto.randomUUID(),
          repCount: s.repCount || 0,
          weight: s.weight,
          distance: s.distance ?? null,
          durationSeconds: s.durationSeconds ?? null,
          calories: s.calories ?? null,
          rpe: s.rpe ?? null,
          isRx: s.isRx ?? true,
          isCompleted: false,
        })),
      }));
    }
  }

  return (
    <>
      <PageReady />
      <WorkoutLoggerClient
      availableExercises={availableExercises}
      categories={categories}
      workoutTypes={allWorkoutTypes}
      mode={mode}
      typeId={currentTypeId.toString()}
      initialExercisesState={initialExercisesState}
      initialName={workoutName}
      initialNotes={initialNotes}
      initialModality={initialModality}
      initialModalityConfig={initialModalityConfig}
      workoutId={activeWorkoutId}
      existingWorkoutNames={existingNames.map((r) => r.name)}
      />
    </>
  );
}