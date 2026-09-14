import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { exerciseCategories, workoutTypes } from '@/lib/db/schema';
import { asc, eq } from 'drizzle-orm';
import { WorkoutLoggerClient } from './workout-logger-client';
import { getTemplateData, getLastWorkoutData, getWorkoutData, getAvailableExercises } from '../actions';

export default async function WorkoutLogPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; typeId?: string; templateId?: string; workoutId?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const params = await searchParams;
  const mode = params.mode || 'free';
  const typeId = params.typeId;
  const templateId = params.templateId ? parseInt(params.templateId, 10) : null;
  const workoutId = params.workoutId ? parseInt(params.workoutId, 10) : null;

  // Cargar datos en paralelo
  const [availableExercises, categories] = await Promise.all([
    getAvailableExercises(userId),
    db.select().from(exerciseCategories).orderBy(asc(exerciseCategories.name)),
  ]);

  let initialExercisesState: any[] = [];
  let workoutName = 'Entrenamiento Libre';
  let currentTypeId = typeId ? parseInt(typeId, 10) : 1;

  // Obtener el nombre del tipo de entrenamiento
  if (mode === 'free' && typeId) {
    const workoutType = await db.query.workoutTypes.findFirst({
      where: eq(workoutTypes.id, parseInt(typeId, 10)),
    });
    if (workoutType) {
      workoutName = workoutType.name;
    }
  }

  if (mode === 'template' && templateId) {
    const template = await getTemplateData(templateId);
    if (template) {
      workoutName = template.name;
      currentTypeId = template.typeId || 1;
      initialExercisesState = template.exercises.map((ex: any, idx: number) => ({
        id: crypto.randomUUID(),
        exerciseId: ex.exerciseId,
        name: ex.exercise.name,
        sets: [{ id: crypto.randomUUID(), repCount: ex.targetReps || 0, weight: ex.targetWeight, isCompleted: false }],
      }));
    }
  } else if (mode === 'repeat') {
    const targetWorkout = workoutId
      ? await getWorkoutData(workoutId)
      : await getLastWorkoutData(userId);

    if (targetWorkout) {
      workoutName = `${targetWorkout.name} (Copia)`;
      currentTypeId = targetWorkout.typeId;
      initialExercisesState = targetWorkout.exercises.map((ex: any) => ({
        id: crypto.randomUUID(),
        exerciseId: ex.exerciseId,
        name: ex.exercise.name,
        sets: ex.sets.map((s: any) => ({
          id: crypto.randomUUID(),
          repCount: s.repCount || 0,
          weight: s.weight,
          isCompleted: false,
        })),
      }));
    }
  }

  return (
    <WorkoutLoggerClient
      availableExercises={availableExercises}
      categories={categories}
      mode={mode}
      typeId={currentTypeId.toString()}
      initialExercisesState={initialExercisesState}
      initialName={workoutName}
    />
  );
}