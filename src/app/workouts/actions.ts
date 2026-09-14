'use server';

import { db } from '@/lib/db';
import { workoutTemplates, templateExercises, workouts, workoutExercises, sets, exercises, exerciseCategories } from '@/lib/db/schema';
import { auth } from '@clerk/nextjs/server';
import { eq, or, isNull, desc, asc, and, sql } from 'drizzle-orm';
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

  const [exerciseList, userExerciseStats] = await Promise.all([
    db
      .select({
        id: exercises.id,
        name: exercises.name,
        categoryId: exercises.categoryId,
        categoryName: exerciseCategories.name,
      })
      .from(exercises)
      .leftJoin(exerciseCategories, eq(exercises.categoryId, exerciseCategories.id))
      .where(or(isNull(exercises.userId), eq(exercises.userId, userId)))
      .orderBy(asc(exercises.name)),
    db
      .select({
        exerciseId: workoutExercises.exerciseId,
        count: sql<number>`count(distinct ${workouts.id})`.mapWith(Number),
      })
      .from(workoutExercises)
      .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
      .where(eq(workouts.userId, userId))
      .groupBy(workoutExercises.exerciseId),
  ]);

  const statsMap = new Map<number, number>();
  for (const s of userExerciseStats) {
    statsMap.set(s.exerciseId, s.count);
  }

  return exerciseList.map((ex) => ({
    ...ex,
    categoryName: ex.categoryName ?? 'General',
    sessionCount: statsMap.get(ex.id) ?? 0,
  }));
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

// Obtener datos de un entrenamiento específico para repetirlo
export async function getWorkoutData(workoutId: number) {
  const workout = await db.query.workouts.findFirst({
    where: eq(workouts.id, workoutId),
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
  return workout;
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

export async function getExerciseProgress(userId: string, exerciseId: number) {
  // Obtener todas las series de ese ejercicio para este usuario
  const exerciseSets = await db
    .select({
      date: workouts.startTime,
      workoutId: workouts.id,
      workoutName: workouts.name,
      weight: sets.weight,
      reps: sets.repCount,
      rpe: sets.rpe,
    })
    .from(sets)
    .innerJoin(workoutExercises, eq(sets.workoutExerciseId, workoutExercises.id))
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(
      and(
        eq(workouts.userId, userId),
        eq(workoutExercises.exerciseId, exerciseId)
      )
    )
    .orderBy(asc(workouts.startTime));

  interface ProgressSession {
    workoutId: number;
    workoutName: string;
    date: Date;
    maxWeight: number;
    maxReps: number;
    estimated1RM: number;
    totalVolume: number;
    sets: {
      setNumber: number;
      weight: number;
      reps: number;
      rpe: number | null;
      estimated1RM: number;
    }[];
  }

  const sessionsMap: Record<number, ProgressSession> = {};

  for (const row of exerciseSets) {
    if (row.weight === null || row.weight === undefined || !row.reps) continue;

    const w = Number(row.weight);
    const r = Number(row.reps);
    // Fórmula Epley para 1RM: w * (1 + r / 30)
    const est1RM = r === 1 ? w : Math.round(w * (1 + r / 30) * 10) / 10;

    if (!sessionsMap[row.workoutId]) {
      sessionsMap[row.workoutId] = {
        workoutId: row.workoutId,
        workoutName: row.workoutName,
        date: row.date,
        maxWeight: w,
        maxReps: r,
        estimated1RM: est1RM,
        totalVolume: Math.round(w * r),
        sets: [
          {
            setNumber: 1,
            weight: w,
            reps: r,
            rpe: row.rpe ?? null,
            estimated1RM: est1RM,
          },
        ],
      };
    } else {
      const sess = sessionsMap[row.workoutId];
      sess.totalVolume += Math.round(w * r);
      sess.sets.push({
        setNumber: sess.sets.length + 1,
        weight: w,
        reps: r,
        rpe: row.rpe ?? null,
        estimated1RM: est1RM,
      });

      if (w > sess.maxWeight) {
        sess.maxWeight = w;
        sess.maxReps = r;
      }
      if (est1RM > sess.estimated1RM) {
        sess.estimated1RM = est1RM;
      }
    }
  }

  // Convertir a array ordenado por fecha
  return Object.values(sessionsMap).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export async function getConsistencyData(userId: string) {
  const allWorkouts = await db.query.workouts.findMany({
    where: eq(workouts.userId, userId),
    orderBy: [desc(workouts.startTime)],
    with: {
      type: true,
      exercises: {
        with: {
          exercise: true,
          sets: true,
        },
        orderBy: (fields, { asc }) => asc(fields.orderIndex),
      },
    },
  });

  // 1. Mapa de calor: contar entrenamientos por día (formato "YYYY-MM-DD")
  const dailyCounts: Record<string, number> = {};
  const workoutsByDate: Record<string, any[]> = {};
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Ordenar fechas únicas para calcular rachas
  const uniqueDates = [...new Set(allWorkouts.map(w => {
    const d = new Date(w.startTime);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }))].sort((a, b) => a - b);

  // Calcular rachas
  for (let i = 0; i < uniqueDates.length; i++) {
    const currentDate = new Date(uniqueDates[i]);
    const prevDate = i > 0 ? new Date(uniqueDates[i - 1]) : null;

    if (prevDate) {
      const diffDays = Math.round((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        tempStreak++;
      } else {
        if (tempStreak > longestStreak) longestStreak = tempStreak;
        tempStreak = 1;
      }
    } else {
      tempStreak = 1;
    }
  }
  if (tempStreak > longestStreak) longestStreak = tempStreak;

  // Calcular racha actual (si el último entrenamiento fue hoy o ayer)
  if (uniqueDates.length > 0) {
    const lastWorkoutDate = new Date(uniqueDates[uniqueDates.length - 1]);
    const diffFromToday = Math.round((today.getTime() - lastWorkoutDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffFromToday <= 1) {
      currentStreak = tempStreak;
    }
  }

  // Llenar dailyCounts y workoutsByDate para el heatmap interactivo
  for (const w of allWorkouts) {
    const dateKey = new Date(w.startTime).toISOString().split('T')[0];
    dailyCounts[dateKey] = (dailyCounts[dateKey] || 0) + 1;

    let totalVolume = 0;
    let totalSetsCount = 0;

    const exercises = w.exercises.map((e) => {
      totalSetsCount += e.sets.length;
      let exMaxWeight = 0;
      let exVolume = 0;

      const sets = e.sets.map((s, idx) => {
        const weight = s.weight ? Number(s.weight) : 0;
        const reps = s.repCount ? Number(s.repCount) : 0;
        if (weight > exMaxWeight) exMaxWeight = weight;
        exVolume += weight * reps;

        return {
          setNumber: idx + 1,
          weight: s.weight,
          repCount: s.repCount,
          rpe: s.rpe,
          distance: s.distance,
          durationSeconds: s.durationSeconds,
        };
      });

      totalVolume += exVolume;

      return {
        name: e.exercise.name,
        orderIndex: e.orderIndex,
        sets,
        maxWeight: exMaxWeight,
        volume: exVolume,
      };
    });

    if (!workoutsByDate[dateKey]) {
      workoutsByDate[dateKey] = [];
    }

    workoutsByDate[dateKey].push({
      id: w.id,
      name: w.name,
      notes: w.notes,
      startTime: w.startTime,
      totalTimeSeconds: w.totalTimeSeconds,
      typeId: w.typeId,
      typeName: w.type?.name ?? 'General',
      totalVolume,
      totalSetsCount,
      exercises,
    });
  }

  // Calcular promedio semanal
  const avgPerWeek = (uniqueDates.length / Math.max(1, (uniqueDates.length > 0 ?
    Math.ceil((new Date(uniqueDates[uniqueDates.length - 1]).getTime() - new Date(uniqueDates[0]).getTime()) / (1000 * 60 * 60 * 24 * 7)) : 1))).toFixed(1);

  return {
    dailyCounts,
    workoutsByDate,
    currentStreak,
    longestStreak,
    totalWorkouts: uniqueDates.length,
    avgPerWeek: parseFloat(avgPerWeek),
  };
}


