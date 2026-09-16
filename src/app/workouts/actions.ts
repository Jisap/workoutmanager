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

export async function createCustomCategory(data: {
  name: string;
  type?: string;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error('No autorizado');

  const trimmedName = data.name.trim();
  if (!trimmedName) throw new Error('El nombre de la categoría no puede estar vacío');

  try {
    const [newCategory] = await db
      .insert(exerciseCategories)
      .values({
        name: trimmedName,
        type: data.type?.trim() || 'Fuerza',
        isCustom: true,
        userId,
      })
      .returning();

    revalidatePath('/settings');
    revalidatePath('/workouts');
    revalidatePath('/workouts/new');
    revalidatePath('/workouts/log');

    return { success: true, category: newCategory };
  } catch (error) {
    console.error('Error creando categoría:', error);
    throw new Error('No se pudo crear la categoría');
  }
}

export async function getAvailableCategories(userIdParam?: string) {
  let userId = userIdParam;
  if (!userId) {
    const authData = await auth();
    userId = authData.userId ?? undefined;
  }
  if (!userId) throw new Error('No autorizado');

  return db
    .select({
      id: exerciseCategories.id,
      name: exerciseCategories.name,
      type: exerciseCategories.type,
      isCustom: exerciseCategories.isCustom,
    })
    .from(exerciseCategories)
    .where(or(isNull(exerciseCategories.userId), eq(exerciseCategories.userId, userId)))
    .orderBy(asc(exerciseCategories.name));
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

  // 1. Obtener el workout con sus ejercicios y series
  const workout = await db.query.workouts.findFirst({
    where: eq(workouts.id, data.workoutId),
    with: {
      exercises: {
        with: {
          exercise: true,
          sets: true,
        },
        orderBy: (fields, { asc }) => asc(fields.orderIndex),
      },
      type: true,
    },
  });

  if (!workout) throw new Error('Entrenamiento no encontrado');

  // 2. Crear la plantilla
  const [newTemplate] = await db
    .insert(workoutTemplates)
    .values({
      userId,
      name: data.name,
      description: data.description || null,
      typeId: workout.typeId,
      sourceWorkoutId: workout.id,
    })
    .returning();

  // 3. Copiar los ejercicios a la plantilla (guardando cada serie para preservar repeticiones y pesos)
  if (workout.exercises.length > 0) {
    const rowsToInsert: any[] = [];
    let orderCounter = 0;

    for (const ex of workout.exercises) {
      if (ex.sets && ex.sets.length > 0) {
        for (const s of ex.sets) {
          rowsToInsert.push({
            templateId: newTemplate.id,
            exerciseId: ex.exerciseId,
            orderIndex: orderCounter++,
            targetReps: s.repCount || ex.targetReps || null,
            targetWeight: s.weight ? Number(s.weight) : (ex.targetWeight ? Number(ex.targetWeight) : null),
            targetDistance: s.distance || ex.targetDistance || null,
            timeCapSeconds: s.durationSeconds || ex.targetDurationSeconds || null,
          });
        }
      } else {
        rowsToInsert.push({
          templateId: newTemplate.id,
          exerciseId: ex.exerciseId,
          orderIndex: orderCounter++,
          targetReps: ex.targetReps || null,
          targetWeight: ex.targetWeight ? Number(ex.targetWeight) : null,
          targetDistance: ex.targetDistance || null,
          timeCapSeconds: ex.targetDurationSeconds || null,
        });
      }
    }

    await db.insert(templateExercises).values(rowsToInsert);
  }

  revalidatePath('/workouts');
  revalidatePath('/dashboard');
  revalidatePath('/workouts/new');

  // Formatear resumen para el cliente
  const formattedExercises = workout.exercises.map((e) => {
    const setsCount = e.sets?.length || 1;
    const firstSet = e.sets?.[0];
    const targetReps = e.targetReps ?? firstSet?.repCount ?? null;
    const targetWeight = e.targetWeight ?? (firstSet?.weight ? Number(firstSet.weight) : null);

    const parts: string[] = [];
    parts.push(setsCount > 1 ? `${setsCount} series` : '1 serie');
    if (targetReps) parts.push(`× ${targetReps} reps`);
    if (targetWeight) parts.push(`@ ${targetWeight}kg`);
    if (!targetReps && !targetWeight) parts.push(`(Libre)`);

    return {
      name: e.exercise.name,
      setsCount,
      targetReps,
      targetWeight,
      targetDurationSeconds: e.targetDurationSeconds ?? firstSet?.durationSeconds ?? null,
      formattedSummary: parts.join(' '),
    };
  });

  return {
    success: true,
    template: {
      id: newTemplate.id,
      name: newTemplate.name,
      typeName: workout.type?.name || 'General',
      typeId: newTemplate.typeId || 1,
      createdAt: newTemplate.createdAt,
      description: newTemplate.description,
      exercisesCount: formattedExercises.length,
      totalSetsCount: rowsCount(workout.exercises),
      exercises: formattedExercises,
    },
  };
}

function rowsCount(exercises: any[]) {
  return exercises.reduce((acc, e) => acc + (e.sets?.length || 1), 0);
}

// Crear plantilla directamente sin necesidad de haber guardado un workout
export async function createDirectTemplate(data: {
  name: string;
  description?: string;
  typeId: number;
  exercises: {
    exerciseId: number;
    orderIndex: number;
    targetReps?: number | null;
    targetWeight?: number | null;
    targetDurationSeconds?: number | null;
  }[];
}) {
  const { userId } = await auth();
  if (!userId) throw new Error('No autorizado');

  const [newTemplate] = await db
    .insert(workoutTemplates)
    .values({
      userId,
      name: data.name,
      description: data.description || null,
      typeId: data.typeId,
    })
    .returning();

  if (data.exercises.length > 0) {
    await db.insert(templateExercises).values(
      data.exercises.map((ex, idx) => ({
        templateId: newTemplate.id,
        exerciseId: ex.exerciseId,
        orderIndex: ex.orderIndex ?? idx,
        targetReps: ex.targetReps ?? null,
        targetWeight: ex.targetWeight ?? null,
        timeCapSeconds: ex.targetDurationSeconds ?? null,
      }))
    );
  }

  revalidatePath('/workouts');
  revalidatePath('/dashboard');
  revalidatePath('/workouts/new');

  return { success: true, templateId: newTemplate.id };
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
    totalReps: number;
    isBodyweight: boolean;
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
    // Permitir sets sin peso (bodyweight): solo necesitamos reps
    if (!row.reps) continue;

    const r = Number(row.reps);
    const w = row.weight !== null && row.weight !== undefined ? Number(row.weight) : 0;
    const hasWeight = w > 0;

    // Fórmula Epley para 1RM: w * (1 + r / 30). Para bodyweight est1RM = maxReps
    const est1RM = hasWeight
      ? (r === 1 ? w : Math.round(w * (1 + r / 30) * 10) / 10)
      : 0;

    if (!sessionsMap[row.workoutId]) {
      sessionsMap[row.workoutId] = {
        workoutId: row.workoutId,
        workoutName: row.workoutName,
        date: row.date,
        maxWeight: w,
        maxReps: r,
        estimated1RM: est1RM,
        totalVolume: hasWeight ? Math.round(w * r) : 0,
        totalReps: r,
        isBodyweight: !hasWeight,
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
      sess.totalReps += r;
      if (hasWeight) {
        sess.totalVolume += Math.round(w * r);
        sess.isBodyweight = false;
      }
      sess.sets.push({
        setNumber: sess.sets.length + 1,
        weight: w,
        reps: r,
        rpe: row.rpe ?? null,
        estimated1RM: est1RM,
      });

      if (r > sess.maxReps) sess.maxReps = r;
      if (w > sess.maxWeight) sess.maxWeight = w;
      if (est1RM > sess.estimated1RM) sess.estimated1RM = est1RM;
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

export async function getWorkoutHistory(userId: string, limit: number = 200) {
  const [history, userTemplates] = await Promise.all([
    db.query.workouts.findMany({
      where: eq(workouts.userId, userId),
      orderBy: [desc(workouts.startTime)],
      limit,
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
    }),
    db.query.workoutTemplates.findMany({
      where: eq(workoutTemplates.userId, userId),
      columns: { id: true, sourceWorkoutId: true },
    }),
  ]);

  const savedWorkoutIds = new Set(
    userTemplates
      .map((t) => t.sourceWorkoutId)
      .filter((id): id is number => id !== null && id !== undefined)
  );

  return history.map((w) => {
    let totalVolume = 0;
    let totalSets = 0;

    const exercisesSummary = w.exercises.map((ex) => {
      let exMaxWeight = 0;
      let exVolume = 0;
      let totalReps = 0;
      totalSets += ex.sets.length;

      const formattedSets = ex.sets.map((s, sIdx) => {
        const weight = s.weight ? Number(s.weight) : 0;
        const reps = s.repCount ? Number(s.repCount) : 0;
        if (weight > exMaxWeight) exMaxWeight = weight;
        exVolume += weight * reps;
        totalReps += reps;

        return {
          setNumber: sIdx + 1,
          weight: s.weight ? Number(s.weight) : null,
          repCount: s.repCount,
          rpe: s.rpe,
          distance: s.distance,
          durationSeconds: s.durationSeconds,
          formatted: weight > 0
            ? `${reps} reps @ ${weight}kg`
            : reps > 0
            ? `${reps} reps`
            : s.durationSeconds
            ? `${s.durationSeconds}s`
            : 'Completado',
        };
      });

      totalVolume += exVolume;

      // Resumen amigable del ejercicio (ej: "4 × 10 reps @ 80kg" o "3 ser. (10, 8, 6 reps)")
      const firstSetReps = formattedSets[0]?.repCount;
      const allSameReps = formattedSets.length > 0 && formattedSets.every((s) => s.repCount === firstSetReps);
      let repsSummary = '';
      if (formattedSets.length > 0) {
        if (allSameReps && firstSetReps) {
          repsSummary = `${formattedSets.length} × ${firstSetReps} reps${exMaxWeight > 0 ? ` @ ${exMaxWeight}kg` : ''}`;
        } else {
          const repsList = formattedSets.map((s) => s.repCount || 0).filter((r) => r > 0).join(', ');
          repsSummary = repsList
            ? `${formattedSets.length} ser. (${repsList} reps)${exMaxWeight > 0 ? ` · máx ${exMaxWeight}kg` : ''}`
            : `${formattedSets.length} series`;
        }
      }

      return {
        name: ex.exercise.name,
        setsCount: ex.sets.length,
        maxWeight: exMaxWeight,
        totalReps,
        repsSummary,
        sets: formattedSets,
      };
    });

    return {
      id: w.id,
      name: w.name,
      typeName: w.type?.name || 'General',
      typeId: w.typeId,
      templateId: w.templateId ?? null,
      savedAsTemplate: savedWorkoutIds.has(w.id),
      startTime: w.startTime,
      totalTimeSeconds: w.totalTimeSeconds,
      notes: w.notes,
      totalVolume,
      totalSets,
      exercisesSummary,
    };
  });
}

export async function getUserTemplates(userId: string) {
  const rawTemplates = await db.query.workoutTemplates.findMany({
    where: eq(workoutTemplates.userId, userId),
    orderBy: [desc(workoutTemplates.createdAt)],
    with: {
      type: true,
      exercises: {
        with: {
          exercise: true,
        },
        orderBy: (fields, { asc }) => asc(fields.orderIndex),
      },
    },
  });

  // Si hay plantillas con sourceWorkoutId, cargar los datos del entrenamiento original
  // como respaldo para recuperar todas las series, reps y pesos originales si la plantilla
  // solo tenía 1 registro por ejercicio
  const sourceWorkoutIds = rawTemplates
    .map((t) => t.sourceWorkoutId)
    .filter((id): id is number => id !== null && id !== undefined);

  const sourceWorkoutsMap = new Map<number, any>();
  if (sourceWorkoutIds.length > 0) {
    const sws = await db.query.workouts.findMany({
      where: or(...sourceWorkoutIds.map((id) => eq(workouts.id, id))),
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
    for (const sw of sws) {
      sourceWorkoutsMap.set(sw.id, sw);
    }
  }

  return rawTemplates.map((t) => {
    // Agrupar TODOS los rows del mismo exerciseId (sean o no consecutivos)
    // usando un Map para mantener el orden de primera aparición
    const exerciseMap = new Map<number, {
      exerciseId: number;
      name: string;
      allReps: (number | null)[];
      allWeights: (number | null)[];
      allDurations: (number | null)[];
    }>();

    const sw = t.sourceWorkoutId ? sourceWorkoutsMap.get(t.sourceWorkoutId) : null;
    const hasExplicitTemplateReps = t.exercises.some((te) => te.targetReps !== null || te.targetWeight !== null);

    // Si la plantilla fue creada desde un workout y no tiene reps/series explícitas en templateExercises,
    // usar las series reales del workout fuente
    if (sw && sw.exercises && sw.exercises.length > 0 && !hasExplicitTemplateReps) {
      for (const we of sw.exercises) {
        const repsList = we.sets.map((s: any) => s.repCount ?? null);
        const weightsList = we.sets.map((s: any) => s.weight ? Number(s.weight) : null);
        const durationsList = we.sets.map((s: any) => s.durationSeconds ?? null);

        exerciseMap.set(we.exerciseId, {
          exerciseId: we.exerciseId,
          name: we.exercise.name,
          allReps: repsList.length > 0 ? repsList : [null],
          allWeights: weightsList.length > 0 ? weightsList : [null],
          allDurations: durationsList.length > 0 ? durationsList : [null],
        });
      }
    } else {
      for (const te of t.exercises) {
        const existing = exerciseMap.get(te.exerciseId);
        if (existing) {
          existing.allReps.push(te.targetReps ?? null);
          existing.allWeights.push(te.targetWeight ? Number(te.targetWeight) : null);
          existing.allDurations.push(te.timeCapSeconds ?? null);
        } else {
          exerciseMap.set(te.exerciseId, {
            exerciseId: te.exerciseId,
            name: te.exercise.name,
            allReps: [te.targetReps ?? null],
            allWeights: [te.targetWeight ? Number(te.targetWeight) : null],
            allDurations: [te.timeCapSeconds ?? null],
          });
        }
      }
    }

    // Formatear resumen amigable para cada ejercicio (igual que el historial)
    let totalSetsCounter = 0;
    const formattedExercises = Array.from(exerciseMap.values()).map((g) => {
      const setsCount = g.allReps.length;
      totalSetsCounter += setsCount;
      const validReps = g.allReps.filter((r): r is number => r !== null && r > 0);
      const validWeights = g.allWeights.filter((w): w is number => w !== null && w > 0);
      const maxWeight = validWeights.length > 0 ? Math.max(...validWeights) : null;
      const firstReps = validReps[0] ?? null;
      const allSameReps = validReps.length > 0 && validReps.every((r) => r === firstReps);
      const firstDuration = g.allDurations.find((d) => d !== null) ?? null;

      let formattedSummary = '';
      if (validReps.length > 0) {
        if (allSameReps) {
          // "4 × 10 reps @ 80kg"
          formattedSummary = `${setsCount} × ${firstReps} reps${maxWeight ? ` @ ${maxWeight}kg` : ''}`;
        } else {
          // "3 ser. (10, 8, 6 reps) · máx 80kg"
          const repsList = validReps.join(', ');
          formattedSummary = `${setsCount} ser. (${repsList} reps)${maxWeight ? ` · máx ${maxWeight}kg` : ''}`;
        }
      } else if (firstDuration) {
        formattedSummary = `${setsCount > 1 ? `${setsCount} series` : '1 serie'} · ${firstDuration}s`;
      } else if (maxWeight) {
        formattedSummary = `${setsCount > 1 ? `${setsCount} series` : '1 serie'} @ ${maxWeight}kg`;
      } else {
        formattedSummary = `${setsCount > 1 ? `${setsCount} series` : '1 serie'} (Libre)`;
      }

      return {
        name: g.name,
        setsCount,
        targetReps: firstReps,
        targetWeight: maxWeight,
        targetDurationSeconds: firstDuration,
        formattedSummary,
      };
    });

    return {
      id: t.id,
      name: t.name,
      typeName: t.type?.name || 'General',
      typeId: t.typeId || 1,
      createdAt: t.createdAt,
      description: t.description || null,
      exercisesCount: formattedExercises.length,
      totalSetsCount: totalSetsCounter,
      exercises: formattedExercises,
    };
  });
}

export async function updateWorkout(data: {
  id: number;
  name: string;
  notes?: string | null;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error('No autorizado');

  const trimmedName = data.name.trim();
  if (!trimmedName) throw new Error('El nombre del entrenamiento no puede estar vacío');

  const [updated] = await db
    .update(workouts)
    .set({
      name: trimmedName,
      notes: data.notes !== undefined ? data.notes : undefined,
    })
    .where(and(eq(workouts.id, data.id), eq(workouts.userId, userId)))
    .returning();

  if (!updated) throw new Error('Entrenamiento no encontrado o no autorizado');

  revalidatePath('/workouts');
  revalidatePath('/dashboard');
  revalidatePath('/progress');
  revalidatePath('/workouts/new');

  return { success: true, workout: updated };
}

export async function updateWorkoutTemplate(data: {
  id: number;
  name: string;
  description?: string | null;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error('No autorizado');

  const trimmedName = data.name.trim();
  if (!trimmedName) throw new Error('El nombre de la plantilla no puede estar vacío');

  const [updated] = await db
    .update(workoutTemplates)
    .set({
      name: trimmedName,
      description: data.description !== undefined ? data.description : undefined,
    })
    .where(and(eq(workoutTemplates.id, data.id), eq(workoutTemplates.userId, userId)))
    .returning();

  if (!updated) throw new Error('Plantilla no encontrada o no autorizada');

  revalidatePath('/workouts');
  revalidatePath('/dashboard');
  revalidatePath('/workouts/new');

  return { success: true, template: updated };
}

export async function deleteWorkout(workoutId: number) {
  const { userId } = await auth();
  if (!userId) throw new Error('No autorizado');

  await db
    .delete(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.userId, userId)));

  revalidatePath('/workouts');
  revalidatePath('/dashboard');
  revalidatePath('/progress');
  revalidatePath('/workouts/new');

  return { success: true };
}

export async function deleteWorkoutTemplate(templateId: number) {
  const { userId } = await auth();
  if (!userId) throw new Error('No autorizado');

  await db
    .delete(workoutTemplates)
    .where(and(eq(workoutTemplates.id, templateId), eq(workoutTemplates.userId, userId)));

  revalidatePath('/workouts');
  revalidatePath('/dashboard');
  revalidatePath('/workouts/new');

  return { success: true };
}



