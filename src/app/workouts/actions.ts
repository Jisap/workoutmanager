'use server';

import { db } from '@/lib/db';
import { workoutTemplates, templateExercises, workouts, workoutExercises, sets, exercises } from '@/lib/db/schema';
import { auth } from '@clerk/nextjs/server';
import { eq, or, isNull, desc, asc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function saveWorkout(data: {
  typeId: number;
  name: string;
  totalTimeSeconds: number;
  notes: string;
  exercises: {
    exerciseId: number;
    orderIndex: number;
    sets: {
      repCount: number;
      weight: number | null;
      distance: number | null;
      durationSeconds: number | null;
      rpe: number | null;
      isRx: boolean;
    }[];
  }[];
}) {
  const { userId } = await auth();
  if (!userId) throw new Error('No autorizado');

  try {
    // 1. Crear el registro del entrenamiento
    const [newWorkout] = await db
      .insert(workouts)
      .values({
        userId,
        typeId: data.typeId,
        name: data.name,
        totalTimeSeconds: data.totalTimeSeconds,
        notes: data.notes,
        startTime: new Date(Date.now() - data.totalTimeSeconds * 1000), // Calculamos start time hacia atrás
        endTime: new Date(),
      })
      .returning();

    // 2. Insertar ejercicios y sus series
    for (const ex of data.exercises) {
      const [newWorkoutExercise] = await db
        .insert(workoutExercises)
        .values({
          workoutId: newWorkout.id,
          exerciseId: ex.exerciseId,
          orderIndex: ex.orderIndex,
        })
        .returning();

      if (ex.sets.length > 0) {
        await db.insert(sets).values(
          ex.sets.map((set) => ({
            workoutExerciseId: newWorkoutExercise.id,
            repCount: set.repCount,
            weight: set.weight,
            distance: set.distance,
            durationSeconds: set.durationSeconds,
            rpe: set.rpe,
            isRx: set.isRx,
          }))
        );
      }
    }

    revalidatePath('/dashboard');
    return { success: true, workoutId: newWorkout.id };
  } catch (error) {
    console.error('Error guardando entrenamiento:', error);
    throw new Error('No se pudo guardar el entrenamiento');
  }
}

export async function getAvailableExercises(userIdParam?: string) {
  let userId = userIdParam;
  if (!userId) {
    const authData = await auth();
    userId = authData.userId ?? undefined;
  }
  if (!userId) throw new Error('No autorizado');

  return await db
    .select({
      id: exercises.id,
      name: exercises.name,
      categoryId: exercises.categoryId,
    })
    .from(exercises)
    .where(or(isNull(exercises.userId), eq(exercises.userId, userId)))
    .orderBy(asc(exercises.name));
}

export async function createCustomExercise(data: {
  name: string;
  categoryId: number | null;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error('No autorizado');

  try {
    const [newExercise] = await db
      .insert(exercises)
      .values({
        name: data.name,
        categoryId: data.categoryId,
        isCustom: true,
        userId,
      })
      .returning();

    return { success: true, exercise: newExercise };
  } catch (error) {
    console.error('Error creando ejercicio:', error);
    throw new Error('No se pudo crear el ejercicio');
  }
}

// Obtener datos de una plantilla
export async function getTemplateData(templateId: number) {
  const template = await db.query.workoutTemplates.findFirst({
    where: eq(workoutTemplates.id, templateId),
    with: {
      exercises: {
        with: {
          exercise: true,
        },
        orderBy: (fields, { asc }) => asc(fields.orderIndex),
      },
    },
  });
  return template;
}

// Obtener datos del último entrenamiento para repetirlo
export async function getLastWorkoutData(userId: string) {
  const lastWorkout = await db.query.workouts.findFirst({
    where: eq(workouts.userId, userId),
    orderBy: [desc(workouts.startTime)],
    with: {
      exercises: {
        with: {
          exercise: true,
          sets: true,
        },
        orderBy: (fields, { asc }) => asc(fields.orderIndex),
      },
    },
  });
  return lastWorkout;
}

// Guardar como plantilla
export async function saveAsTemplate(data: {
  workoutId: number;
  name: string;
  description?: string;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error('No autorizado');

  // 1. Obtener el workout con sus ejercicios
  const workout = await db.query.workouts.findFirst({
    where: eq(workouts.id, data.workoutId),
    with: {
      exercises: {
        with: { exercise: true },
        orderBy: (fields, { asc }) => asc(fields.orderIndex),
      },
    },
  });

  if (!workout) throw new Error('Entrenamiento no encontrado');

  // 2. Crear la plantilla
  const [newTemplate] = await db
    .insert(workoutTemplates)
    .values({
      userId,
      name: data.name,
      description: data.description,
      typeId: workout.typeId,
      sourceWorkoutId: workout.id,
    })
    .returning();

  // 3. Copiar los ejercicios a la plantilla
  if (workout.exercises.length > 0) {
    await db.insert(templateExercises).values(
      workout.exercises.map((ex) => ({
        templateId: newTemplate.id,
        exerciseId: ex.exerciseId,
        orderIndex: ex.orderIndex,
        targetReps: ex.targetReps,
        targetWeight: ex.targetWeight,
        targetDistance: ex.targetDistance,
        timeCapSeconds: ex.targetDurationSeconds,
      }))
    );
  }

  return { success: true };
}

export async function getProgressData(userId: string) {
  const allWorkouts = await db.query.workouts.findMany({
    where: eq(workouts.userId, userId),
    orderBy: [desc(workouts.startTime)],
    with: {
      exercises: {
        with: {
          exercise: true,
          sets: true,
        },
      },
    },
  });

  // 2. Calcular Récords Personales (PRs)
  const prs: Record<string, { weight: number; reps: number; date: Date; exerciseName: string }> = {};

  // 3. Calcular volumen por semana (simplificado para las últimas semanas)
  const weeklyVolume: Record<string, number> = {};

  // Generar claves de las últimas 6 semanas (Lunes de cada semana)
  const last6Weeks: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1) - (i * 7)); // Lunes de la semana
    const key = d.toISOString().split('T')[0];
    last6Weeks.push(key);
    weeklyVolume[key] = 0; // Inicializar a 0
  }


  for (const workout of allWorkouts) {
    const workoutDate = new Date(workout.startTime);
    // Encontrar a qué semana de las últimas 6 pertenece
    const workoutMonday = new Date(workoutDate);
    workoutMonday.setDate(workoutDate.getDate() - (workoutDate.getDay() === 0 ? 6 : workoutDate.getDay() - 1));
    const weekKey = workoutMonday.toISOString().split('T')[0];

    if (last6Weeks.includes(weekKey)) {
      for (const ex of workout.exercises) {
        const exName = ex.exercise.name;

        for (const currentSet of ex.sets) {
          if (currentSet.weight && currentSet.repCount) {
            // A) Actualizar PR
            if (!prs[exName] || currentSet.weight > prs[exName].weight) {
              prs[exName] = {
                weight: currentSet.weight,
                reps: currentSet.repCount,
                date: workoutDate,
                exerciseName: exName,
              };
            }

            // B) Acumular volumen semanal
            weeklyVolume[weekKey] = (weeklyVolume[weekKey] || 0) + (currentSet.weight * currentSet.repCount);
          }
        }
      }
    }
  }

  // Formatear para la UI
  const formattedWeeklyVolume = last6Weeks.map((key) => {
    const date = new Date(key);
    return {
      label: date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
      volume: Math.round(weeklyVolume[key] || 0),
    };
  });

  const topPRs = Object.values(prs)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5);


  return {
    prs: topPRs,
    weeklyVolume: formattedWeeklyVolume,
    totalWorkouts: allWorkouts.length,
  };
}

