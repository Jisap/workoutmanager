'use server';

import { db } from '@/lib/db';
import { workoutTemplates, templateExercises, workouts, workoutExercises, sets, exercises, exerciseCategories, type ModalityConfig } from '@/lib/db/schema';
import { auth } from '@clerk/nextjs/server';
import { eq, or, isNull, desc, asc, and, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function saveWorkout(data: {
  workoutId?: number | null;
  typeId: number;
  name: string;
  modality?: string | null;
  modalityConfig?: ModalityConfig | null;
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
    let targetWorkoutId: number;

    if (data.workoutId) {
      // 1a. Verificar pertenencia y actualizar entrenamiento existente
      const [existing] = await db
        .select({ id: workouts.id, startTime: workouts.startTime })
        .from(workouts)
        .where(and(eq(workouts.id, data.workoutId), eq(workouts.userId, userId)));

      if (!existing) {
        throw new Error('Entrenamiento no encontrado o no autorizado');
      }

      await db
        .update(workouts)
        .set({
          typeId: data.typeId,
          name: data.name,
          modality: data.modality !== undefined ? data.modality : undefined,
          modalityConfig: data.modalityConfig !== undefined ? data.modalityConfig : undefined,
          totalTimeSeconds: data.totalTimeSeconds,
          notes: data.notes,
          startTime:
            data.totalTimeSeconds > 0
              ? new Date(Date.now() - data.totalTimeSeconds * 1000)
              : existing.startTime,
          endTime: new Date(),
        })
        .where(eq(workouts.id, data.workoutId));

      targetWorkoutId = data.workoutId;

      // Eliminar ejercicios previos (las series se eliminan por CASCADE)
      await db
        .delete(workoutExercises)
        .where(eq(workoutExercises.workoutId, targetWorkoutId));
    } else {
      // 1b. Crear nuevo registro de entrenamiento.
      // Garantía de nombre único: si ya existe otro entreno con el mismo nombre,
      // se sufija con (2), (3)... para que cada sesión sea identificable.
      let finalName = data.name.trim() || 'Entrenamiento';
      const sameName = await db
        .select({ id: workouts.id, name: workouts.name })
        .from(workouts)
        .where(eq(workouts.userId, userId));
      const taken = new Set(sameName.map((r) => r.name.toLowerCase()));
      if (taken.has(finalName.toLowerCase())) {
        let n = 2;
        while (taken.has(`${finalName.toLowerCase()} (${n})`)) n++;
        finalName = `${finalName} (${n})`;
      }

      const [newWorkout] = await db
        .insert(workouts)
        .values({
          userId,
          typeId: data.typeId,
          name: finalName,
          modality: data.modality || null,
          modalityConfig: data.modalityConfig || null,
          totalTimeSeconds: data.totalTimeSeconds,
          notes: data.notes,
          startTime: new Date(Date.now() - data.totalTimeSeconds * 1000), // Calculamos start time hacia atrás
          endTime: new Date(),
        })
        .returning();

      targetWorkoutId = newWorkout.id;
    }

    // 2. Insertar ejercicios y sus series
    for (const ex of data.exercises) {
      const [newWorkoutExercise] = await db
        .insert(workoutExercises)
        .values({
          workoutId: targetWorkoutId,
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

    revalidatePath('/workouts');
    revalidatePath('/dashboard');
    revalidatePath('/progress');
    revalidatePath('/workouts/new');
    return { success: true, workoutId: targetWorkoutId };
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
  modality?: string | null;
  modalityConfig?: ModalityConfig | null;
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
      modality: data.modality !== undefined ? data.modality : (workout.modality || null),
      modalityConfig: data.modalityConfig !== undefined ? data.modalityConfig : (workout.modalityConfig || null),
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
  modality?: string | null;
  modalityConfig?: ModalityConfig | null;
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
      modality: data.modality || null,
      modalityConfig: data.modalityConfig || null,
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
      totalTimeSeconds: workouts.totalTimeSeconds,
      weight: sets.weight,
      reps: sets.repCount,
      rpe: sets.rpe,
      distance: sets.distance,
      durationSeconds: sets.durationSeconds,
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
    totalDistance: number;
    totalDurationSeconds: number;
    maxDistance: number;
    isBodyweight: boolean;
    isDraft: boolean;
    avgRpe: number | null;
    sets: {
      setNumber: number;
      weight: number;
      reps: number;
      rpe: number | null;
      estimated1RM: number;
      distance: number | null;
      durationSeconds: number | null;
    }[];
  }

  const sessionsMap: Record<number, ProgressSession> = {};
  // Acumuladores de RPE por sesión (se promedian al final)
  const rpeAcc: Record<number, { sum: number; count: number }> = {};

  for (const row of exerciseSets) {
    // Incluir series de fuerza (reps), cardio (distancia/tiempo) y carries (peso+distancia).
    // Antes se exigían reps y el cardio puro (remo, run, SkiErg) desaparecía de las estadísticas.
    const r = row.reps ? Number(row.reps) : 0;
    const w = row.weight !== null && row.weight !== undefined ? Number(row.weight) : 0;
    const dist = row.distance !== null && row.distance !== undefined ? Number(row.distance) : 0;
    const dur = row.durationSeconds !== null && row.durationSeconds !== undefined ? Number(row.durationSeconds) : 0;
    if (r <= 0 && w <= 0 && dist <= 0 && dur <= 0) continue;

    const hasWeight = w > 0;

    // Fórmula Epley para 1RM: w * (1 + r / 30). Solo con peso Y reps (no para carries por metros).
    const est1RM = hasWeight && r > 0
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
        totalVolume: hasWeight && r > 0 ? Math.round(w * r) : 0,
        totalReps: r,
        totalDistance: dist,
        totalDurationSeconds: dur,
        maxDistance: dist,
        isBodyweight: !hasWeight,
        // Borrador = guardado sin finalizar (tiempo 0): contamina la curva si se incluye
        isDraft: !row.totalTimeSeconds || row.totalTimeSeconds <= 0,
        avgRpe: null,
        sets: [
          {
            setNumber: 1,
            weight: w,
            reps: r,
            rpe: row.rpe ?? null,
            estimated1RM: est1RM,
            distance: dist > 0 ? dist : null,
            durationSeconds: dur > 0 ? dur : null,
          },
        ],
      };
      if (row.rpe != null && row.rpe > 0) {
        rpeAcc[row.workoutId] = { sum: row.rpe, count: 1 };
      }
    } else {
      const sess = sessionsMap[row.workoutId];
      sess.totalReps += r;
      sess.totalDistance += dist;
      sess.totalDurationSeconds += dur;
      if (dist > sess.maxDistance) sess.maxDistance = dist;
      if (row.rpe != null && row.rpe > 0) {
        const acc = rpeAcc[row.workoutId] || { sum: 0, count: 0 };
        acc.sum += row.rpe;
        acc.count += 1;
        rpeAcc[row.workoutId] = acc;
      }
      if (hasWeight && r > 0) {
        sess.totalVolume += Math.round(w * r);
        sess.isBodyweight = false;
      }
      sess.sets.push({
        setNumber: sess.sets.length + 1,
        weight: w,
        reps: r,
        rpe: row.rpe ?? null,
        estimated1RM: est1RM,
        distance: dist > 0 ? dist : null,
        durationSeconds: dur > 0 ? dur : null,
      });

      if (r > sess.maxReps) sess.maxReps = r;
      if (w > sess.maxWeight) sess.maxWeight = w;
      if (est1RM > sess.estimated1RM) sess.estimated1RM = est1RM;
    }
  }

  // Convertir a array ordenado por fecha (con RPE medio por sesión)
  for (const [wid, sess] of Object.entries(sessionsMap)) {
    const acc = rpeAcc[Number(wid)];
    if (acc && acc.count > 0) {
      sess.avgRpe = Math.round((acc.sum / acc.count) * 10) / 10;
    }
  }
  return Object.values(sessionsMap).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// Variedad para cliente: progreso de un ejercicio del usuario autenticado.
// Se usa desde el comparador A vs B sin exponer userIds en el cliente.
export async function getExerciseProgressForCurrentUser(exerciseId: number) {
  const { userId } = await auth();
  if (!userId) throw new Error('No autorizado');
  return getExerciseProgress(userId, exerciseId);
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
      modality: w.modality || null,
      modalityConfig: w.modalityConfig || null,
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
          id: s.id,
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
      modality: w.modality || null,
      modalityConfig: w.modalityConfig || null,
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
      modality: t.modality || null,
      modalityConfig: t.modalityConfig || null,
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

// Actualizar tiempos (y opcionalmente distancia) de series individuales.
// Usado para corregir los 1000m de cada run / estación Hyrox tras finalizar el entrenamiento.
export async function updateWorkoutSetTimes(data: {
  workoutId: number;
  updates: {
    setId: number;
    durationSeconds: number | null;
    distance?: number | null;
  }[];
}) {
  const { userId } = await auth();
  if (!userId) throw new Error('No autorizado');

  // Verificar pertenencia del workout
  const [owned] = await db
    .select({ id: workouts.id })
    .from(workouts)
    .where(and(eq(workouts.id, data.workoutId), eq(workouts.userId, userId)));
  if (!owned) throw new Error('Entrenamiento no encontrado o no autorizado');

  // Verificar que los sets pertenecen a este workout (vía workoutExercises)
  const ownedSets = await db
    .select({ setId: sets.id })
    .from(sets)
    .innerJoin(workoutExercises, eq(sets.workoutExerciseId, workoutExercises.id))
    .where(eq(workoutExercises.workoutId, data.workoutId));
  const ownedSetIds = new Set(ownedSets.map((r) => r.setId));

  let updatedCount = 0;
  for (const u of data.updates) {
    if (!ownedSetIds.has(u.setId)) continue;
    if (u.durationSeconds != null && (isNaN(u.durationSeconds) || u.durationSeconds < 0)) continue;
    if (u.durationSeconds != null && u.durationSeconds > 5 * 3600) continue; // cordura: máx 5h por tramo
    await db
      .update(sets)
      .set({
        durationSeconds: u.durationSeconds,
        ...(u.distance !== undefined ? { distance: u.distance } : {}),
      })
      .where(eq(sets.id, u.setId));
    updatedCount++;
  }

  revalidatePath('/workouts');
  revalidatePath('/dashboard');
  revalidatePath('/progress');

  return { success: true, updatedCount };
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

// ==========================================
// ANALÍTICA AVANZADA Y ESTADÍSTICAS GLOBALES
// ==========================================
export async function getAdvancedProgressData(userId: string) {
  const [allWorkouts, allCategories] = await Promise.all([
    db.query.workouts.findMany({
      where: eq(workouts.userId, userId),
      orderBy: [desc(workouts.startTime)],
      with: {
        type: true,
        exercises: {
          with: {
            exercise: {
              with: {
                category: true,
              },
            },
            sets: true,
          },
          orderBy: (fields, { asc }) => asc(fields.orderIndex),
        },
      },
    }),
    db.select().from(exerciseCategories),
  ]);

  const categoryNameMap = new Map<number, string>(
    allCategories.map((c) => [c.id, c.name])
  );

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // 1. ESTADÍSTICAS GENERALES
  const totalWorkoutsCount = allWorkouts.length;
  let thisMonthCount = 0;
  let thisYearCount = 0;
  let totalTimeSecondsAll = 0;
  let totalVolumeAll = 0;

  // Días de la semana: 0=Dom, 1=Lun, ..., 6=Sáb
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const dayShorts = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  // Reordenar para empezar en Lunes: 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb, 0=Dom
  const dayCountsByIndex = [0, 0, 0, 0, 0, 0, 0];

  const uniqueDateTimes: number[] = [];

  for (const w of allWorkouts) {
    const d = new Date(w.startTime);
    if (d.getFullYear() === currentYear) {
      thisYearCount++;
      if (d.getMonth() === currentMonth) {
        thisMonthCount++;
      }
    }

    if (w.totalTimeSeconds) {
      totalTimeSecondsAll += w.totalTimeSeconds;
    }

    // Registrar día de la semana
    const dayIndex = d.getDay();
    dayCountsByIndex[dayIndex] = (dayCountsByIndex[dayIndex] || 0) + 1;

    // Registrar fecha única normalizada para racha
    const normalized = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    if (!uniqueDateTimes.includes(normalized)) {
      uniqueDateTimes.push(normalized);
    }
  }

  // Ordenar fechas para racha
  uniqueDateTimes.sort((a, b) => a - b);
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  const todayNormalized = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  for (let i = 0; i < uniqueDateTimes.length; i++) {
    const current = uniqueDateTimes[i];
    const prev = i > 0 ? uniqueDateTimes[i - 1] : null;

    if (prev) {
      const diffDays = Math.round((current - prev) / (1000 * 60 * 60 * 24));
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

  if (uniqueDateTimes.length > 0) {
    const lastDate = uniqueDateTimes[uniqueDateTimes.length - 1];
    const diffFromToday = Math.round((todayNormalized - lastDate) / (1000 * 60 * 60 * 24));
    if (diffFromToday <= 1) {
      currentStreak = tempStreak;
    }
  }

  // Formatear distribución semanal empezando en Lunes (1 a 6, luego 0)
  const mondayToSundayIndices = [1, 2, 3, 4, 5, 6, 0];
  const maxDayCount = Math.max(...dayCountsByIndex, 1);
  const weeklyDistribution = mondayToSundayIndices.map((idx) => ({
    day: dayNames[idx],
    short: dayShorts[idx],
    count: dayCountsByIndex[idx],
    percentage: Math.round((dayCountsByIndex[idx] / maxDayCount) * 100),
  }));

  // 2. RECUPERACIÓN INTELIGENTE Y TIEMPO DE DESCANSO
  const lastWorkout = allWorkouts[0] || null;
  let recoveryData = {
    status: 'ready' as 'ready' | 'almost_ready' | 'recovering',
    message: 'Listo para entrenar',
    hoursSince: 999,
    targetRestHours: 24,
    remainingHours: 0,
    percentage: 100,
    lastWorkoutName: lastWorkout?.name || null,
    lastWorkoutTypeName: lastWorkout?.type?.name || null,
    lastWorkoutDate: lastWorkout?.startTime || null,
  };

  if (lastWorkout) {
    const lastTime = new Date(lastWorkout.startTime).getTime();
    const hoursSince = Math.max(0, Math.floor((now.getTime() - lastTime) / (1000 * 60 * 60)));

    // Calcular volumen de la última sesión
    let lastVolume = 0;
    let maxRpe = 0;
    for (const ex of lastWorkout.exercises) {
      for (const s of ex.sets) {
        const w = s.weight ? Number(s.weight) : 0;
        const r = s.repCount ? Number(s.repCount) : 0;
        lastVolume += w * r;
        if (s.rpe && s.rpe > maxRpe) maxRpe = s.rpe;
      }
    }

    let targetRestHours = 24;
    if (lastVolume > 8000 || maxRpe >= 9) {
      targetRestHours = 48;
    } else if (lastVolume > 4000 || maxRpe >= 8) {
      targetRestHours = 36;
    }

    const remainingHours = Math.max(0, targetRestHours - hoursSince);
    const percentage = Math.min(100, Math.round((hoursSince / targetRestHours) * 100));

    let status: 'ready' | 'almost_ready' | 'recovering' = 'ready';
    let message = 'Completamente recuperado y listo para dar el 100%';
    if (remainingHours > 16) {
      status = 'recovering';
      message = `Fase de recuperación activa (${remainingHours}h sugeridas)`;
    } else if (remainingHours > 0) {
      status = 'almost_ready';
      message = `Casi listo (${remainingHours}h para recuperación óptima)`;
    }

    recoveryData = {
      status,
      message,
      hoursSince,
      targetRestHours,
      remainingHours,
      percentage,
      lastWorkoutName: lastWorkout.name,
      lastWorkoutTypeName: lastWorkout.type?.name || 'Entrenamiento',
      lastWorkoutDate: lastWorkout.startTime,
    };
  }

  // 3. ANALÍTICA DE MUSCULACIÓN (Por Grupo Muscular)
  const muscleGroupsMap: Record<
    string,
    { volume: number; sets: number; exercisesMap: Record<string, { volume: number; sets: number; maxWeight: number }> }
  > = {
    Pecho: { volume: 0, sets: 0, exercisesMap: {} },
    Espalda: { volume: 0, sets: 0, exercisesMap: {} },
    Piernas: { volume: 0, sets: 0, exercisesMap: {} },
    Gluteos: { volume: 0, sets: 0, exercisesMap: {} },
    Hombros: { volume: 0, sets: 0, exercisesMap: {} },
    Brazos: { volume: 0, sets: 0, exercisesMap: {} },
    Core: { volume: 0, sets: 0, exercisesMap: {} },
    Otros: { volume: 0, sets: 0, exercisesMap: {} },
  };

  let totalMusculacionVolume = 0;
  let totalMusculacionSets = 0;

  // 4. ANALÍTICA DE POWERLIFTING (Big 3: Sentadilla, Press Banca, Peso Muerto)
  const big3Data = {
    squat: {
      name: 'Sentadilla (Squat)',
      maxWeightReal: 0,
      estimated1RM: 0,
      estimated3RM: 0,
      estimated5RM: 0,
      totalSets: 0,
      history: [] as { date: string; weight: number; reps: number; estimated1RM: number; workoutName: string }[],
    },
    bench: {
      name: 'Press de Banca (Bench Press)',
      maxWeightReal: 0,
      estimated1RM: 0,
      estimated3RM: 0,
      estimated5RM: 0,
      totalSets: 0,
      history: [] as { date: string; weight: number; reps: number; estimated1RM: number; workoutName: string }[],
    },
    deadlift: {
      name: 'Peso Muerto (Deadlift)',
      maxWeightReal: 0,
      estimated1RM: 0,
      estimated3RM: 0,
      estimated5RM: 0,
      totalSets: 0,
      history: [] as { date: string; weight: number; reps: number; estimated1RM: number; workoutName: string }[],
    },
  };

  // 4b. HALTEROFILIA / LEVANTAMIENTOS OLÍMPICOS (CrossFit)
  const olympicData = {
    snatch: {
      name: 'Snatch (Arrancada)',
      maxWeightReal: 0,
      estimated1RM: 0,
      totalSets: 0,
      history: [] as { date: string; weight: number; reps: number; estimated1RM: number; workoutName: string }[],
    },
    cleanAndJerk: {
      name: 'Clean & Jerk (Dos Tiempos)',
      maxWeightReal: 0,
      estimated1RM: 0,
      totalSets: 0,
      history: [] as { date: string; weight: number; reps: number; estimated1RM: number; workoutName: string }[],
    },
  };

  // 5. CROSSFIT & WODs
  const crossfitWodsList: {
    id: number;
    name: string;
    date: string;
    modality: string | null;
    modalityConfig: ModalityConfig | null;
    totalTimeMinutes: number;
    totalTimeSeconds: number | null;
    exercisesCount: number;
    isRx: boolean;
    notes: string | null;
  }[] = [];

  // Benchmarks y WODs agrupados por nombre.
  // IMPORTANTE: el logger uniquifica nombres ("Fran · 12 ene", "Fran (2)"), así que
  // aquí se normaliza antes de agrupar; si no, cada repetición quedaría como
  // intento único y los benchmarks oficiales jamás se detectarían.
  const normalizeWorkoutName = (raw: string): string =>
    raw
      .replace(/\s*\(Copia\)+/gi, '')
      .replace(/\s*\(Repetici[oó]n\)+/gi, '')
      // Etiqueta de división del catálogo de WODs ("Fran · RX · 12 ene" → "Fran").
      // Solo si es un segmento final (seguido de "·" o fin), para no tocar nombres propios.
      .replace(/\s*·\s*RX(\s+W)?(?=\s*·|\s*$)/gi, '')
      .replace(/\s*·\s*\d{1,2}\s+[a-záéíóú]+/gi, '')
      .replace(/\s*\(\d+\)\s*$/g, '')
      .replace(/\s+/g, ' ')
      .trim() || 'Entrenamiento';

  const benchmarksMap: Record<
    string,
    {
      name: string;
      workoutType: string;
      attempts: number;
      bestTimeSeconds: number | null;
      bestRxTimeSeconds: number | null;
      bestScaledTimeSeconds: number | null;
      bestScoreRounds: number | null;
      bestScoreReps: number | null;
      isRx: boolean;
      history: {
        workoutId: number;
        date: string;
        timeSeconds: number | null;
        timeMinutes: number;
        isRx: boolean;
        notes: string | null;
        workoutType: string;
        scoreRounds: number | null;
        scoreReps: number | null;
      }[];
    }
  > = {};

  // Récords monostructurales (Remo, SkiErg, Running, Bike)
  const cardioPBsMap: Record<
    string,
    {
      discipline: string;
      distance: number;
      bestTimeSeconds: number;
      pace: string;
      date: string;
      workoutName: string;
    }
  > = {};

  let rxWodsCount = 0;
  let scaledWodsCount = 0;
  let wodsWithCapCount = 0;
  let wodsFinishedUnderCapCount = 0;

  // 6. HYROX & CARDIO ANALYTICS
  let totalCardioMinutes = 0;
  let totalCardioSessions = 0;
  let totalHyroxRunSeconds = 0;
  let totalHyroxStationsSeconds = 0;

  type HyroxStationKey =
    | 'skierg'
    | 'sledPush'
    | 'sledPull'
    | 'burpeeBroadJump'
    | 'rowing'
    | 'farmersCarry'
    | 'sandbagLunges'
    | 'wallBalls';

  const hyroxStationsMap: Record<
    HyroxStationKey,
    {
      id: HyroxStationKey;
      stationNumber: number;
      name: string;
      officialStandard: string;
      category: 'cardio' | 'power' | 'endurance';
      bestTimeSeconds: number | null;
      bestPace: string | null;
      bestWeightKg: number | null;
      bestReps: number | null;
      bestDistanceM: number | null;
      totalSets: number;
      lastDate: string | null;
      history: {
        workoutId: number;
        date: string;
        timeSeconds: number | null;
        distance: number | null;
        weight: number | null;
        reps: number | null;
        workoutName: string;
      }[];
    }
  > = {
    skierg: {
      id: 'skierg',
      stationNumber: 1,
      name: '1. SkiErg',
      officialStandard: '1000 m',
      category: 'cardio',
      bestTimeSeconds: null,
      bestPace: null,
      bestWeightKg: null,
      bestReps: null,
      bestDistanceM: null,
      totalSets: 0,
      lastDate: null,
      history: [],
    },
    sledPush: {
      id: 'sledPush',
      stationNumber: 2,
      name: '2. Sled Push',
      officialStandard: '50 m (102-152 kg)',
      category: 'power',
      bestTimeSeconds: null,
      bestPace: null,
      bestWeightKg: null,
      bestReps: null,
      bestDistanceM: null,
      totalSets: 0,
      lastDate: null,
      history: [],
    },
    sledPull: {
      id: 'sledPull',
      stationNumber: 3,
      name: '3. Sled Pull',
      officialStandard: '50 m (78-103 kg)',
      category: 'power',
      bestTimeSeconds: null,
      bestPace: null,
      bestWeightKg: null,
      bestReps: null,
      bestDistanceM: null,
      totalSets: 0,
      lastDate: null,
      history: [],
    },
    burpeeBroadJump: {
      id: 'burpeeBroadJump',
      stationNumber: 4,
      name: '4. Burpee Broad Jumps',
      officialStandard: '80 m',
      category: 'endurance',
      bestTimeSeconds: null,
      bestPace: null,
      bestWeightKg: null,
      bestReps: null,
      bestDistanceM: null,
      totalSets: 0,
      lastDate: null,
      history: [],
    },
    rowing: {
      id: 'rowing',
      stationNumber: 5,
      name: '5. Remo (Rowing)',
      officialStandard: '1000 m',
      category: 'cardio',
      bestTimeSeconds: null,
      bestPace: null,
      bestWeightKg: null,
      bestReps: null,
      bestDistanceM: null,
      totalSets: 0,
      lastDate: null,
      history: [],
    },
    farmersCarry: {
      id: 'farmersCarry',
      stationNumber: 6,
      name: '6. Farmers Carry',
      officialStandard: '200 m (2×16-24 kg)',
      category: 'power',
      bestTimeSeconds: null,
      bestPace: null,
      bestWeightKg: null,
      bestReps: null,
      bestDistanceM: null,
      totalSets: 0,
      lastDate: null,
      history: [],
    },
    sandbagLunges: {
      id: 'sandbagLunges',
      stationNumber: 7,
      name: '7. Sandbag Lunges',
      officialStandard: '100 m (10-20 kg)',
      category: 'endurance',
      bestTimeSeconds: null,
      bestPace: null,
      bestWeightKg: null,
      bestReps: null,
      bestDistanceM: null,
      totalSets: 0,
      lastDate: null,
      history: [],
    },
    wallBalls: {
      id: 'wallBalls',
      stationNumber: 8,
      name: '8. Wall Balls',
      officialStandard: '75-100 reps (4-6 kg)',
      category: 'endurance',
      bestTimeSeconds: null,
      bestPace: null,
      bestWeightKg: null,
      bestReps: null,
      bestDistanceM: null,
      totalSets: 0,
      lastDate: null,
      history: [],
    },
  };

  const hyroxEventsMap: Record<
    string,
    {
      name: string;
      attempts: number;
      bestTimeSeconds: number | null;
      history: {
        date: string;
        timeSeconds: number | null;
        timeMinutes: number;
        notes: string | null;
      }[];
    }
  > = {};

  const hyroxSessionsList: {
    id: number;
    name: string;
    date: string;
    modality: string | null;
    modalityConfig: ModalityConfig | null;
    totalTimeMinutes: number;
    totalTimeSeconds: number | null;
    notes: string | null;
    // Splits de la sesión en orden de carrera (para la vista "esta sesión" y el comparador A vs B)
    segments: {
      name: string;
      orderIndex: number;
      distance: number | null;
      durationSeconds: number | null;
      weight: number | null;
      reps: number | null;
    }[];
  }[] = [];

  // Conteo de modalidades separado: CrossFit/Funcional vs Hyrox/Cardio
  // (antes se mezclaban ambos en un único objeto y la distribución salía combinada)
  const crossfitModalityCounts: Record<string, number> = {};
  const hyroxModalityCounts: Record<string, number> = {};

  // Serie histórica de runs cronometrados (para el gráfico de evolución 1000m).
  // Se calcula en tiempo de lectura, así que los tiempos guardados aparecen sin migración.
  const hyroxRunsList: {
    workoutId: number;
    date: string;
    timeSeconds: number;
    distance: number | null;
    workoutName: string;
  }[] = [];

  // Procesar entrenamientos en orden cronológico (del más antiguo al más reciente) para las gráficas
  const chronologicalWorkouts = [...allWorkouts].reverse();

  for (const w of chronologicalWorkouts) {
    const isCrossfitOrFuncional =
      w.type?.name?.toLowerCase().includes('crossfit') ||
      w.type?.name?.toLowerCase().includes('funcional');
    const isHyroxOrCardio =
      w.type?.name?.toLowerCase().includes('hyrox') ||
      w.type?.name?.toLowerCase().includes('cardio') ||
      w.type?.name?.toLowerCase().includes('running') ||
      w.type?.name?.toLowerCase().includes('endurance') ||
      w.name?.toLowerCase().includes('hyrox');

    if (isCrossfitOrFuncional && w.modality) {
      crossfitModalityCounts[w.modality] = (crossfitModalityCounts[w.modality] || 0) + 1;
    }
    if (isHyroxOrCardio && w.modality) {
      hyroxModalityCounts[w.modality] = (hyroxModalityCounts[w.modality] || 0) + 1;
    }

    // Comprobar si las series del WOD fueron Rx
    let wodIsRx = true;
    for (const we of w.exercises) {
      for (const s of we.sets) {
        if (s.isRx === false) wodIsRx = false;
      }
    }

    if (isCrossfitOrFuncional) {
      if (wodIsRx) rxWodsCount++;
      else scaledWodsCount++;

      // Comprobar time cap si existe en la configuración de la modalidad
      const capMins = w.modalityConfig?.timeCapMinutes || (w.modalityConfig as any)?.timeCap;
      if (capMins && typeof capMins === 'number' && capMins > 0) {
        wodsWithCapCount++;
        const totalSecs = w.totalTimeSeconds || (w.totalTimeSeconds ? w.totalTimeSeconds : 0);
        if (totalSecs > 0 && totalSecs <= capMins * 60) {
          wodsFinishedUnderCapCount++;
        }
      }

      const totalMins = w.totalTimeSeconds ? Math.round(w.totalTimeSeconds / 60) : 0;
      crossfitWodsList.push({
        id: w.id,
        name: w.name,
        date: new Date(w.startTime).toISOString(),
        modality: w.modality || null,
        modalityConfig: w.modalityConfig || null,
        totalTimeMinutes: totalMins,
        totalTimeSeconds: w.totalTimeSeconds || null,
        exercisesCount: w.exercises.length,
        isRx: wodIsRx,
        notes: w.notes || null,
      });

      // Agrupar Benchmarks y WODs repetidos (nombre normalizado: sin fecha ni contadores)
      const cleanName = normalizeWorkoutName(w.name);
      const currentWorkoutType = w.type?.name || (isCrossfitOrFuncional ? 'CrossFit / Funcional' : 'WOD');
      if (!benchmarksMap[cleanName]) {
        benchmarksMap[cleanName] = {
          name: cleanName,
          workoutType: currentWorkoutType,
          attempts: 0,
          bestTimeSeconds: null,
          bestRxTimeSeconds: null,
          bestScaledTimeSeconds: null,
          bestScoreRounds: null,
          bestScoreReps: null,
          isRx: wodIsRx,
          history: [],
        };
      }
      const bObj = benchmarksMap[cleanName];
      bObj.attempts++;
      if (
        w.totalTimeSeconds &&
        w.totalTimeSeconds > 0 &&
        (bObj.bestTimeSeconds === null || w.totalTimeSeconds < bObj.bestTimeSeconds)
      ) {
        bObj.bestTimeSeconds = w.totalTimeSeconds;
        bObj.isRx = wodIsRx;
      }
      // Mejor marca separada Rx / Scaled (no mezclar peras con manzanas)
      if (w.totalTimeSeconds && w.totalTimeSeconds > 0) {
        if (wodIsRx && (bObj.bestRxTimeSeconds === null || w.totalTimeSeconds < bObj.bestRxTimeSeconds)) {
          bObj.bestRxTimeSeconds = w.totalTimeSeconds;
        }
        if (!wodIsRx && (bObj.bestScaledTimeSeconds === null || w.totalTimeSeconds < bObj.bestScaledTimeSeconds)) {
          bObj.bestScaledTimeSeconds = w.totalTimeSeconds;
        }
      }
      // Score de AMRAP/EMOM (rondas + reps extra), guardado en modalityConfig por el logger
      const wodCfg = (w.modalityConfig as Record<string, unknown> | null) || null;
      const scoreRounds = typeof wodCfg?.scoreRounds === 'number' ? (wodCfg.scoreRounds as number) : null;
      const scoreReps = typeof wodCfg?.scoreReps === 'number' ? (wodCfg.scoreReps as number) : null;
      if (scoreRounds !== null) {
        const curR = bObj.bestScoreRounds ?? -1;
        const curE = bObj.bestScoreReps ?? -1;
        if (scoreRounds > curR || (scoreRounds === curR && (scoreReps ?? 0) > curE)) {
          bObj.bestScoreRounds = scoreRounds;
          bObj.bestScoreReps = scoreReps;
        }
      }
      bObj.history.push({
        workoutId: w.id,
        date: new Date(w.startTime).toISOString(),
        timeSeconds: w.totalTimeSeconds || null,
        timeMinutes: totalMins,
        isRx: wodIsRx,
        notes: w.notes || null,
        workoutType: currentWorkoutType,
        scoreRounds,
        scoreReps,
      });
    }

    if (isHyroxOrCardio) {
      totalCardioSessions++;
      const mins = w.totalTimeSeconds ? Math.round(w.totalTimeSeconds / 60) : 0;
      totalCardioMinutes += mins;
      // Splits ordenados por orden de carrera para la vista por sesión y comparador
      const orderedExercises = [...w.exercises].sort(
        (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)
      );
      hyroxSessionsList.push({
        id: w.id,
        name: w.name,
        date: new Date(w.startTime).toISOString(),
        modality: w.modality || null,
        modalityConfig: w.modalityConfig || null,
        totalTimeMinutes: mins,
        totalTimeSeconds: w.totalTimeSeconds || null,
        notes: w.notes || null,
        segments: orderedExercises.flatMap((we) =>
          (we.sets || []).map((s: any) => ({
            name: we.exercise?.name || 'Tramo',
            orderIndex: we.orderIndex ?? 0,
            distance: s.distance ?? null,
            durationSeconds: s.durationSeconds ?? null,
            weight: s.weight ? Number(s.weight) : null,
            reps: s.repCount ?? null,
          }))
        ),
      });
    }

    // Identificar Simuladores y Carreras Hyrox
    const isHyroxWorkout =
      w.type?.name?.toLowerCase().includes('hyrox') ||
      w.name?.toLowerCase().includes('hyrox') ||
      w.name?.toLowerCase().includes('simulador') ||
      w.name?.toLowerCase().includes('simulacro');

    if (isHyroxWorkout) {
      const cleanName = normalizeWorkoutName(w.name);
      if (!hyroxEventsMap[cleanName]) {
        hyroxEventsMap[cleanName] = {
          name: cleanName,
          attempts: 0,
          bestTimeSeconds: null,
          history: [],
        };
      }
      const ev = hyroxEventsMap[cleanName];
      ev.attempts++;
      if (
        w.totalTimeSeconds &&
        w.totalTimeSeconds > 0 &&
        (ev.bestTimeSeconds === null || w.totalTimeSeconds < ev.bestTimeSeconds)
      ) {
        ev.bestTimeSeconds = w.totalTimeSeconds;
      }
      ev.history.push({
        date: new Date(w.startTime).toISOString(),
        timeSeconds: w.totalTimeSeconds || null,
        timeMinutes: w.totalTimeSeconds ? Math.round(w.totalTimeSeconds / 60) : 0,
        notes: w.notes || null,
      });
    }

    for (const we of w.exercises) {
      const exName = we.exercise.name;
      const exLower = exName.toLowerCase();
      const catName = we.exercise.category?.name || categoryNameMap.get(we.exercise.categoryId || 0) || 'Otros';

      let targetGroup = 'Otros';
      if (catName.includes('Pecho')) targetGroup = 'Pecho';
      else if (catName.includes('Espalda')) targetGroup = 'Espalda';
      else if (catName.includes('Pierna')) targetGroup = 'Piernas';
      else if (catName.includes('Gluteo') || catName.includes('Glúteo')) targetGroup = 'Gluteos';
      else if (catName.includes('Hombro')) targetGroup = 'Hombros';
      else if (catName.includes('Brazo') || catName.includes('Bíceps') || catName.includes('Tríceps')) targetGroup = 'Brazos';
      else if (catName.includes('Core') || catName.includes('Abdomen')) targetGroup = 'Core';

      // Identificación para Big 3 de Powerlifting
      let big3Category: 'squat' | 'bench' | 'deadlift' | null = null;
      if (
        (exLower.includes('sentadilla') || exLower.includes('squat')) &&
        !exLower.includes('búlgara') &&
        !exLower.includes('bulgarian') &&
        !exLower.includes('pistol')
      ) {
        big3Category = 'squat';
      } else if (
        (exLower.includes('press de banca') || exLower.includes('bench press')) &&
        !exLower.includes('mancuerna')
      ) {
        big3Category = 'bench';
      } else if (
        (exLower.includes('peso muerto') || exLower.includes('deadlift')) &&
        !exLower.includes('rumano') &&
        !exLower.includes('mancuerna')
      ) {
        big3Category = 'deadlift';
      }

      // Identificación para Halterofilia / Levantamiento Olímpico
      let olympicCategory: 'snatch' | 'cleanAndJerk' | null = null;
      if (
        (exLower.includes('snatch') || exLower.includes('arrancada')) &&
        !exLower.includes('mancuerna') &&
        !exLower.includes('dumbbell') &&
        !exLower.includes('kettlebell')
      ) {
        olympicCategory = 'snatch';
      } else if (
        (exLower.includes('clean & jerk') ||
          exLower.includes('clean and jerk') ||
          exLower.includes('dos tiempos') ||
          exLower.includes('cargada y envión') ||
          exLower.includes('power clean') ||
          exLower.includes('squat clean') ||
          exLower.includes('clean') ||
          exLower.includes('jerk') ||
          exLower.includes('push jerk') ||
          exLower.includes('split jerk')) &&
        !exLower.includes('mancuerna') &&
        !exLower.includes('dumbbell') &&
        !exLower.includes('kettlebell')
      ) {
        olympicCategory = 'cleanAndJerk';
      }

      // Nombre normalizado (minúsculas + sin tildes) para que "Balón medicinal",
      // "tracción", etc. se reconozcan igual que sus variantes sin acento.
      const exNorm = exLower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      // Identificación para Cardio / Ergómetros PBs
      let cardioDiscipline: string | null = null;
      const isRunning = exNorm.includes('correr') || exNorm.includes('carrera') || exNorm.includes('run') || exNorm.includes('running');
      if (exNorm.includes('remo') || exNorm.includes('row') || exNorm.includes('rower')) cardioDiscipline = 'Remo';
      else if (exNorm.includes('skierg') || exNorm.includes('ski erg') || (exNorm.includes('ski') && !exNorm.includes('skin'))) cardioDiscipline = 'SkiErg';
      else if (isRunning) cardioDiscipline = 'Running';
      else if (exNorm.includes('bike') || exNorm.includes('bicicleta') || exNorm.includes('echo bike') || exNorm.includes('assault bike')) cardioDiscipline = 'Bike';

      // Identificación para las 8 Estaciones oficiales de Hyrox
      // (usa el nombre normalizado para ser insensible a tildes y mayúsculas)
      const inHyroxContext = isHyroxOrCardio || isHyroxWorkout;
      let hyroxStationKey: HyroxStationKey | null = null;
      if (exNorm.includes('skierg') || exNorm.includes('ski erg') || (exNorm.includes('ski') && !exNorm.includes('skin'))) {
        hyroxStationKey = 'skierg';
      } else if (exNorm.includes('sled push') || exNorm.includes('empuje de trineo') || exNorm.includes('trineo empuje') || (exNorm.includes('trineo') && exNorm.includes('empuj'))) {
        hyroxStationKey = 'sledPush';
      } else if (exNorm.includes('sled pull') || exNorm.includes('arrastre de trineo') || exNorm.includes('trineo traccion') || (exNorm.includes('trineo') && exNorm.includes('jalar'))) {
        hyroxStationKey = 'sledPull';
      } else if (exNorm.includes('burpee broad jump') || (exNorm.includes('burpee') && exNorm.includes('salto')) || exNorm.includes('burpee broad') || exNorm.includes('burpees broad') || (inHyroxContext && exNorm.includes('burpee'))) {
        hyroxStationKey = 'burpeeBroadJump';
      } else if (exNorm.includes('remo') || exNorm.includes('row') || exNorm.includes('rower') || exNorm.includes('rowing')) {
        hyroxStationKey = 'rowing';
      } else if (exNorm.includes('farmers carry') || exNorm.includes('farmer carry') || exNorm.includes('paseo del granjero') || exNorm.includes('farmers walk') || exNorm.includes('granjero') || (inHyroxContext && exNorm.includes('carry'))) {
        hyroxStationKey = 'farmersCarry';
      } else if (exNorm.includes('sandbag lunges') || exNorm.includes('zancadas saco') || exNorm.includes('lunges saco') || exNorm.includes('sandbag lunge') || (exNorm.includes('zancadas') && exNorm.includes('saco')) || (inHyroxContext && (exNorm.includes('zancada') || exNorm.includes('lunge') || exNorm.includes('sandbag')))) {
        hyroxStationKey = 'sandbagLunges';
      } else if (exNorm.includes('wall ball') || exNorm.includes('wallball') || exNorm.includes('balon medicinal')) {
        hyroxStationKey = 'wallBalls';
      }

      for (const s of we.sets) {
        const wVal = s.weight ? Number(s.weight) : 0;
        const rVal = s.repCount ? Number(s.repCount) : 0;
        const distVal = s.distance ? Number(s.distance) : 0;
        const durVal = s.durationSeconds ? Number(s.durationSeconds) : 0;

        // Distribución de tiempo Running vs Estaciones en sesiones Hyrox / Híbridas
        if (isHyroxOrCardio || isHyroxWorkout) {
          if (isRunning && durVal > 0) {
            totalHyroxRunSeconds += durVal;
            hyroxRunsList.push({
              workoutId: w.id,
              date: new Date(w.startTime).toISOString(),
              timeSeconds: durVal,
              distance: distVal > 0 ? distVal : null,
              workoutName: w.name,
            });
          } else if (hyroxStationKey && durVal > 0) {
            totalHyroxStationsSeconds += durVal;
          }
        }

        // PBs de Cardio
        if (cardioDiscipline && distVal > 0 && durVal > 0) {
          const pbKey = `${cardioDiscipline}_${distVal}`;
          let paceStr = '';
          if (cardioDiscipline === 'Remo' || cardioDiscipline === 'SkiErg') {
            const pace500 = (durVal / distVal) * 500;
            const pMin = Math.floor(pace500 / 60);
            const pSec = Math.round(pace500 % 60);
            paceStr = `${pMin}:${String(pSec).padStart(2, '0')} /500m`;
          } else if (cardioDiscipline === 'Running') {
            const paceKm = (durVal / distVal) * 1000;
            const pMin = Math.floor(paceKm / 60);
            const pSec = Math.round(paceKm % 60);
            paceStr = `${pMin}:${String(pSec).padStart(2, '0')} /km`;
          }

          if (!cardioPBsMap[pbKey] || durVal < cardioPBsMap[pbKey].bestTimeSeconds) {
            cardioPBsMap[pbKey] = {
              discipline: cardioDiscipline,
              distance: distVal,
              bestTimeSeconds: durVal,
              pace: paceStr,
              date: new Date(w.startTime).toISOString(),
              workoutName: w.name,
            };
          }
        }

        // Registrar rendimiento en las 8 Estaciones Hyrox
        if (hyroxStationKey) {
          const st = hyroxStationsMap[hyroxStationKey];
          st.totalSets++;
          st.lastDate = new Date(w.startTime).toISOString();

          if (wVal > 0 && (st.bestWeightKg === null || wVal > st.bestWeightKg)) {
            st.bestWeightKg = wVal;
          }
          if (rVal > 0 && (st.bestReps === null || rVal > st.bestReps)) {
            st.bestReps = rVal;
          }
          if (distVal > 0 && (st.bestDistanceM === null || distVal > st.bestDistanceM)) {
            st.bestDistanceM = distVal;
          }
          if (durVal > 0 && (st.bestTimeSeconds === null || durVal < st.bestTimeSeconds)) {
            st.bestTimeSeconds = durVal;
            if (distVal > 0) {
              if (hyroxStationKey === 'rowing' || hyroxStationKey === 'skierg') {
                const p500 = (durVal / distVal) * 500;
                const pMin = Math.floor(p500 / 60);
                const pSec = Math.round(p500 % 60);
                st.bestPace = `${pMin}:${String(pSec).padStart(2, '0')} /500m`;
              }
            }
          }
          st.history.push({
            workoutId: w.id,
            date: new Date(w.startTime).toISOString(),
            timeSeconds: durVal > 0 ? durVal : null,
            distance: distVal > 0 ? distVal : null,
            weight: wVal > 0 ? wVal : null,
            reps: rVal > 0 ? rVal : null,
            workoutName: w.name,
          });
        }

        if (rVal <= 0) continue;

        const vol = wVal * rVal;
        totalVolumeAll += vol;
        totalMusculacionVolume += vol;
        totalMusculacionSets += 1;

        // Añadir a grupo muscular
        if (muscleGroupsMap[targetGroup]) {
          muscleGroupsMap[targetGroup].volume += vol;
          muscleGroupsMap[targetGroup].sets += 1;
          if (!muscleGroupsMap[targetGroup].exercisesMap[exName]) {
            muscleGroupsMap[targetGroup].exercisesMap[exName] = { volume: 0, sets: 0, maxWeight: 0 };
          }
          const exObj = muscleGroupsMap[targetGroup].exercisesMap[exName];
          exObj.volume += vol;
          exObj.sets += 1;
          if (wVal > exObj.maxWeight) exObj.maxWeight = wVal;
        }

        // Añadir a Big 3 si aplica
        if (big3Category && wVal > 0) {
          const est1RM = rVal === 1 ? wVal : Math.round(wVal * (1 + rVal / 30) * 10) / 10;
          const target = big3Data[big3Category];
          target.totalSets += 1;
          if (wVal > target.maxWeightReal) target.maxWeightReal = wVal;
          if (est1RM > target.estimated1RM) {
            target.estimated1RM = est1RM;
            target.estimated3RM = Math.round((est1RM / 1.08) * 10) / 10;
            target.estimated5RM = Math.round((est1RM / 1.15) * 10) / 10;
          }

          target.history.push({
            date: new Date(w.startTime).toISOString(),
            weight: wVal,
            reps: rVal,
            estimated1RM: est1RM,
            workoutName: w.name,
          });
        }

        // Añadir a Levantamientos Olímpicos si aplica
        if (olympicCategory && wVal > 0) {
          const est1RM = rVal === 1 ? wVal : Math.round(wVal * (1 + rVal / 30) * 10) / 10;
          const target = olympicData[olympicCategory];
          target.totalSets += 1;
          if (wVal > target.maxWeightReal) target.maxWeightReal = wVal;
          if (est1RM > target.estimated1RM) target.estimated1RM = est1RM;
          target.history.push({
            date: new Date(w.startTime).toISOString(),
            weight: wVal,
            reps: rVal,
            estimated1RM: est1RM,
            workoutName: w.name,
          });
        }
      }
    }
  }

  // Formatear datos de grupos musculares
  const muscleGroupsList = Object.entries(muscleGroupsMap)
    .filter(([_, data]) => data.sets > 0)
    .map(([name, data]) => {
      const topExList = Object.entries(data.exercisesMap)
        .map(([exName, stats]) => ({
          name: exName,
          volume: stats.volume,
          sets: stats.sets,
          maxWeight: stats.maxWeight,
        }))
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 3);

      return {
        name,
        volume: data.volume,
        sets: data.sets,
        percentage: totalMusculacionVolume > 0 ? Math.round((data.volume / totalMusculacionVolume) * 100) : 0,
        topExercises: topExList,
      };
    })
    .sort((a, b) => b.volume - a.volume);

  // Balance Push / Pull / Legs
  const pushVol =
    (muscleGroupsMap['Pecho']?.volume || 0) +
    (muscleGroupsMap['Hombros']?.volume || 0);
  const pullVol = muscleGroupsMap['Espalda']?.volume || 0;
  const legsVol =
    (muscleGroupsMap['Piernas']?.volume || 0) +
    (muscleGroupsMap['Gluteos']?.volume || 0);
  const coreVol = muscleGroupsMap['Core']?.volume || 0;
  const pplTotal = Math.max(pushVol + pullVol + legsVol + coreVol, 1);

  const pushPullLegsBalance = {
    push: { volume: pushVol, percentage: Math.round((pushVol / pplTotal) * 100) },
    pull: { volume: pullVol, percentage: Math.round((pullVol / pplTotal) * 100) },
    legs: { volume: legsVol, percentage: Math.round((legsVol / pplTotal) * 100) },
    core: { volume: coreVol, percentage: Math.round((coreVol / pplTotal) * 100) },
  };

  // 3b. ESTADÍSTICAS AVANZADAS DE MUSCULACIÓN
  // NOTA: se incluyen TODOS los entrenos con trabajo de fuerza (peso x reps en
  // grupos Pecho/Espalda/Piernas/Gluteos/Hombros/Brazos/Core), sin filtrar por
  // tipo de entreno. Filtrar solo por tipo 'Musculación' dejaba fuera entrenos
  // de Powerlifting/Funcional/etc. y el timeline se quedaba con 1 solo punto.

  // Helper: obtener semana (lunes) de una fecha
  const getWeekKey = (date: Date): string => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
  };

  // Helper: obtener nombre del mes para label de semana
  const getWeekLabel = (weekKey: string): string => {
    const [y, m, d] = weekKey.split('-').map(Number);
    const monday = new Date(y, m - 1, d);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    if (monday.getMonth() === sunday.getMonth()) {
      return `${monday.getDate()}-${sunday.getDate()} ${monthNames[monday.getMonth()]}`;
    }
    return `${monday.getDate()} ${monthNames[monday.getMonth()]}-${sunday.getDate()} ${monthNames[sunday.getMonth()]}`;
  };

  // Helper: mapear nombre de ejercicio a grupo muscular
  const mapExerciseToGroup = (catName: string): string => {
    if (catName.includes('Pecho')) return 'Pecho';
    if (catName.includes('Espalda')) return 'Espalda';
    if (catName.includes('Pierna')) return 'Piernas';
    if (catName.includes('Gluteo') || catName.includes('Glúteo')) return 'Gluteos';
    if (catName.includes('Hombro')) return 'Hombros';
    if (catName.includes('Brazo') || catName.includes('Bíceps') || catName.includes('Tríceps')) return 'Brazos';
    if (catName.includes('Core') || catName.includes('Abdomen')) return 'Core';
    return 'Otros';
  };

  // Estructuras de datos para métricas avanzadas
  const weeklyVolumeByGroup: Record<string, Record<string, number>> = {}; // weekKey -> groupName -> volume
  const weeklyFrequencyByGroup: Record<string, Record<string, number>> = {}; // weekKey -> groupName -> sessionCount
  const repZoneCounts = { fuerza: 0, hipertrofia: 0, resistencia: 0 };
  let totalIntensityWeighted = 0;
  let intensityVolumeSum = 0;
  let totalIntensitySets = 0;
  let totalWeightSum = 0;
  let totalRepsForWeighted = 0;
  let setsWithRpe = 0;
  let rpeSum = 0;
  let nearFailureSets = 0; // RPE >= 8
  let totalMusculacionSessionVolume = 0;
  let totalMusculacionSessionMinutes = 0;
  let musculacionOnlySets = 0;
  const asymmetryData: Record<string, { dumbbell: { volume: number; sets: number }; barbell: { volume: number; sets: number } }> = {};

  // Listas de semana ordenadas
  const allWeekKeys = new Set<string>();

  // Timeline por sesión (para mostrar evolución aunque todo caiga en 1 semana)
  const sessionVolumeList: {
    date: string;
    label: string;
    workoutName: string;
    total: number;
    groups: Record<string, number>;
  }[] = [];

  for (const w of chronologicalWorkouts) {
    const weekKey = getWeekKey(new Date(w.startTime));

    const groupsTrainedThisSession = new Set<string>();
    let sessionVolume = 0;
    const sessionGroups: Record<string, number> = {};

    for (const we of w.exercises) {
      const catName = we.exercise.category?.name || categoryNameMap.get(we.exercise.categoryId || 0) || 'Otros';
      const groupName = mapExerciseToGroup(catName);
      const exLower = we.exercise.name.toLowerCase();

      // Detectar si es mancuerna o barra
      const isDumbbell = exLower.includes('mancuerna') || exLower.includes('dumbbell');
      const isBarbell = exLower.includes('barra') || exLower.includes('barbell') ||
        (!isDumbbell && (
          exLower.includes('press de banca') || exLower.includes('bench press') ||
          exLower.includes('sentadilla') || exLower.includes('squat') ||
          exLower.includes('peso muerto') || exLower.includes('deadlift') ||
          exLower.includes('remo con barra') || exLower.includes('press militar')
        ));

      if (!asymmetryData[groupName]) {
        asymmetryData[groupName] = { dumbbell: { volume: 0, sets: 0 }, barbell: { volume: 0, sets: 0 } };
      }

      for (const s of we.sets) {
        const wVal = s.weight ? Number(s.weight) : 0;
        const rVal = s.repCount ? Number(s.repCount) : 0;
        if (rVal <= 0) continue;

        const vol = wVal * rVal;
        sessionVolume += vol;
        musculacionOnlySets++;

        // Volumen semanal/por sesión por grupo (solo grupos principales de fuerza)
        if (groupName !== 'Otros') {
          if (!weeklyVolumeByGroup[weekKey]) weeklyVolumeByGroup[weekKey] = {};
          weeklyVolumeByGroup[weekKey][groupName] = (weeklyVolumeByGroup[weekKey][groupName] || 0) + vol;
          sessionGroups[groupName] = (sessionGroups[groupName] || 0) + vol;
          groupsTrainedThisSession.add(groupName);
        }

        // Zonas de repeticiones
        if (rVal < 6) repZoneCounts.fuerza++;
        else if (rVal <= 12) repZoneCounts.hipertrofia++;
        else repZoneCounts.resistencia++;

        // Intensidad relativa (% 1RM estimado en la serie)
        if (wVal > 0 && rVal > 0) {
          const est1RM = rVal === 1 ? wVal : Math.round(wVal * (1 + rVal / 30) * 10) / 10;
          const intensityPct = (wVal / est1RM) * 100;
          totalIntensityWeighted += intensityPct * vol;
          intensityVolumeSum += vol;
          totalIntensitySets++;
          totalWeightSum += wVal * rVal;
          totalRepsForWeighted += rVal;
        }

        // RPE / RIR
        if (s.rpe && s.rpe > 0) {
          setsWithRpe++;
          rpeSum += s.rpe;
          if (s.rpe >= 8) nearFailureSets++;
        }

        // Asimetrías
        if (isDumbbell) {
          asymmetryData[groupName].dumbbell.volume += vol;
          asymmetryData[groupName].dumbbell.sets++;
        } else if (isBarbell) {
          asymmetryData[groupName].barbell.volume += vol;
          asymmetryData[groupName].barbell.sets++;
        }
      }
    }

    // Solo cuentan sesiones con trabajo real de fuerza en grupos principales.
    // Así las sesiones puras de cardio no crean semanas vacías ni puntos fantasma.
    if (groupsTrainedThisSession.size > 0) {
      allWeekKeys.add(weekKey);

      // Frecuencia semanal por grupo
      if (!weeklyFrequencyByGroup[weekKey]) weeklyFrequencyByGroup[weekKey] = {};
      for (const g of groupsTrainedThisSession) {
        weeklyFrequencyByGroup[weekKey][g] = (weeklyFrequencyByGroup[weekKey][g] || 0) + 1;
      }

      // Timeline por sesión (últimas sesiones con fuerza, en orden cronológico)
      const sessionTotal = Object.values(sessionGroups).reduce((a, b) => a + b, 0);
      const sessionDate = new Date(w.startTime);
      sessionVolumeList.push({
        date: sessionDate.toISOString(),
        label: sessionDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
        workoutName: w.name,
        total: sessionTotal,
        groups: { ...sessionGroups },
      });
    }

    // Densidad (solo sesiones con fuerza)
    if (groupsTrainedThisSession.size > 0) {
      totalMusculacionSessionVolume += sessionVolume;
      if (w.totalTimeSeconds && w.totalTimeSeconds > 0) {
        totalMusculacionSessionMinutes += w.totalTimeSeconds / 60;
      }
    }
  }

  // Ordenar semanas cronológicamente, rellenar huecos con ceros y tomar las últimas 12.
  // Sin relleno, los huecos (semanas sin entrenar) se ocultan y la "evolución" engaña.
  const addDays = (weekKey: string, days: number): string => {
    const [y, m, d] = weekKey.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + days);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  };
  const allSortedWeeks = Array.from(allWeekKeys).sort();
  const last12Raw = allSortedWeeks.slice(-12);
  const sortedWeekKeys: string[] = [];
  if (last12Raw.length > 0) {
    let cursor = last12Raw[0];
    const last = last12Raw[last12Raw.length - 1];
    // Seguridad: como máximo 12 entradas aunque haya huecos grandes
    while (cursor <= last && sortedWeekKeys.length < 12) {
      sortedWeekKeys.push(cursor);
      if (cursor === last) break;
      cursor = addDays(cursor, 7);
    }
    // Si el rango con huecos supera 12 semanas, quedarse con las 12 más recientes
    while (sortedWeekKeys.length > 12) sortedWeekKeys.shift();
  }
  const groupNames = ['Pecho', 'Espalda', 'Piernas', 'Gluteos', 'Hombros', 'Brazos', 'Core'];

  // Últimas 15 sesiones con fuerza (para ver evolución aunque todo caiga en 1 semana)
  const sessionVolumeTimeline = sessionVolumeList.slice(-15).map((s) => ({
    week: s.date,
    label: s.label,
    workoutName: s.workoutName,
    total: s.total,
    ...Object.fromEntries(groupNames.map((g) => [g, s.groups[g] || 0])),
  }));

  const weeklyVolumeTimeline = sortedWeekKeys.map((wk) => ({
    week: wk,
    label: getWeekLabel(wk),
    ...Object.fromEntries(groupNames.map((g) => [g, weeklyVolumeByGroup[wk]?.[g] || 0])),
  }));

  const weeklyFrequencyTimeline = sortedWeekKeys.map((wk) => ({
    week: wk,
    label: getWeekLabel(wk),
    ...Object.fromEntries(groupNames.map((g) => [g, weeklyFrequencyByGroup[wk]?.[g] || 0])),
  }));

  // Frecuencia semanal media por grupo
  const groupFrequencyAvg: Record<string, number> = {};
  for (const g of groupNames) {
    const totalSessions = sortedWeekKeys.reduce((acc, wk) => acc + (weeklyFrequencyByGroup[wk]?.[g] || 0), 0);
    groupFrequencyAvg[g] = sortedWeekKeys.length > 0 ? Math.round((totalSessions / sortedWeekKeys.length) * 10) / 10 : 0;
  }

  // Totales de zonas de reps
  const totalRepSets = repZoneCounts.fuerza + repZoneCounts.hipertrofia + repZoneCounts.resistencia;
  const repZones = {
    fuerza: { count: repZoneCounts.fuerza, percentage: totalRepSets > 0 ? Math.round((repZoneCounts.fuerza / totalRepSets) * 100) : 0 },
    hipertrofia: { count: repZoneCounts.hipertrofia, percentage: totalRepSets > 0 ? Math.round((repZoneCounts.hipertrofia / totalRepSets) * 100) : 0 },
    resistencia: { count: repZoneCounts.resistencia, percentage: totalRepSets > 0 ? Math.round((repZoneCounts.resistencia / totalRepSets) * 100) : 0 },
  };

  // Intensidad relativa media ponderada por volumen (sin duplicar porcentaje)
  const avgRelativeIntensity = intensityVolumeSum > 0 ? Math.round(totalIntensityWeighted / intensityVolumeSum) : 0;
  const avgWeightedWeight = totalRepsForWeighted > 0 ? Math.round((totalWeightSum / totalRepsForWeighted) * 10) / 10 : 0;

  // RPE / RIR
  const avgRpe: number | null = setsWithRpe > 0 ? Math.round((rpeSum / setsWithRpe) * 10) / 10 : null;
  const avgRir: number | null = setsWithRpe > 0 ? Math.max(0, Math.round((10 - rpeSum / setsWithRpe) * 10) / 10) : null;
  const nearFailurePct = setsWithRpe > 0 ? Math.round((nearFailureSets / setsWithRpe) * 100) : 0;

  // Densidad (volumen por minuto de sesión)
  const density = totalMusculacionSessionMinutes > 0
    ? Math.round(totalMusculacionSessionVolume / totalMusculacionSessionMinutes)
    : 0;

  // Detección de deload/meseta (comparar últimas 4 semanas)
  const last4Weeks = sortedWeekKeys.slice(-4);
  let deloadAlert: { type: 'deload' | 'plateau' | 'fatigue' | null; message: string } = { type: null, message: '' };
  if (last4Weeks.length >= 3) {
    const weekVolumes = last4Weeks.map((wk) => {
      const vol = Object.values(weeklyVolumeByGroup[wk] || {}).reduce((a, b) => a + b, 0);
      return vol;
    });
    const recentAvg = (weekVolumes[weekVolumes.length - 1] + weekVolumes[weekVolumes.length - 2]) / 2;
    const olderAvg = (weekVolumes[0] + (weekVolumes[1] || weekVolumes[0])) / 2;
    const volumeChange = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;

    if (volumeChange < -30) {
      deloadAlert = { type: 'deload', message: `Volumen reducido ${Math.abs(Math.round(volumeChange))}% en las últimas semanas — posible semana de deload.` };
    } else if (volumeChange > 30 && avgRpe !== null && avgRpe >= 8) {
      deloadAlert = { type: 'fatigue', message: `Volumen subió ${Math.round(volumeChange)}% con RPE medio ${avgRpe} — posible acumulación de fatiga.` };
    } else if (Math.abs(volumeChange) < 10 && last4Weeks.length >= 4) {
      deloadAlert = { type: 'plateau', message: `Volumen estable (~${Math.round(volumeChange)}%) en 4 semanas — considera periodizar para evitar meseta.` };
    }
  }

  // Asimetrías (grupos con trabajo de mancuerna o barra)
  const asymmetryList = Object.entries(asymmetryData)
    .filter(([, data]) => data.dumbbell.sets > 0 && data.barbell.sets > 0)
    .map(([group, data]) => {
      const totalVol = data.dumbbell.volume + data.barbell.volume;
      const dumbbellPct = totalVol > 0 ? Math.round((data.dumbbell.volume / totalVol) * 100) : 0;
      const barbellPct = totalVol > 0 ? 100 - dumbbellPct : 0;
      return {
        group,
        dumbbellVolume: data.dumbbell.volume,
        dumbbellSets: data.dumbbell.sets,
        barbellVolume: data.barbell.volume,
        barbellSets: data.barbell.sets,
        dumbbellPct,
        barbellPct,
        ratio: data.barbell.volume > 0 ? Math.round((data.dumbbell.volume / data.barbell.volume) * 100) : 100,
      };
    });

  const musculacionAvanzado = {
    weeklyVolumeTimeline,
    weeklyFrequencyTimeline,
    sessionVolumeTimeline,
    groupFrequencyAvg,
    repZones,
    avgRelativeIntensity,
    avgWeightedWeight,
    avgRpe,
    avgRir,
    nearFailureSets,
    nearFailurePct,
    hasRpeData: setsWithRpe > 0,
    density,
    deloadAlert,
    asymmetryList,
  };

  // SBD Total & Proporciones
  const squatEst = big3Data.squat.estimated1RM;
  const benchEst = big3Data.bench.estimated1RM;
  const deadliftEst = big3Data.deadlift.estimated1RM;
  const sbdTotal = squatEst + benchEst + deadliftEst;
  const sbdRealTotal =
    big3Data.squat.maxWeightReal +
    big3Data.bench.maxWeightReal +
    big3Data.deadlift.maxWeightReal;

  const squatPct = sbdTotal > 0 ? Math.round((squatEst / sbdTotal) * 100) : 0;
  const benchPct = sbdTotal > 0 ? Math.round((benchEst / sbdTotal) * 100) : 0;
  const deadliftPct = sbdTotal > 0 ? Math.round((deadliftEst / sbdTotal) * 100) : 0;

  let balanceStatus = 'Equilibrado';
  let balanceMessage = 'Proporción armónica en los 3 movimientos según estándares anatómicos de fuerza.';
  let balanceType: 'balanced' | 'lagging_bench' | 'lagging_squat' | 'lagging_deadlift' | 'dominant' = 'balanced';

  if (sbdTotal > 0) {
    if (benchPct > 0 && benchPct < 20) {
      balanceStatus = 'Press de Banca rezagado';
      balanceMessage = `El Press de Banca representa el ${benchPct}% del total SBD (estándar óptimo: ~25%). Considera aumentar la frecuencia o volumen de empuje.`;
      balanceType = 'lagging_bench';
    } else if (squatPct > 0 && squatPct < 28) {
      balanceStatus = 'Sentadilla rezagada';
      balanceMessage = `La Sentadilla representa el ${squatPct}% del total SBD (estándar óptimo: ~35%). Mayor volumen o frecuencia de pierna recomendado.`;
      balanceType = 'lagging_squat';
    } else if (deadliftPct > 0 && deadliftPct < 32) {
      balanceStatus = 'Peso Muerto rezagado';
      balanceMessage = `El Peso Muerto representa el ${deadliftPct}% del total SBD (estándar óptimo: ~40%). Recomendado priorizar tracción pesada y cadena posterior.`;
      balanceType = 'lagging_deadlift';
    } else if (benchPct > 32 || squatPct > 44 || deadliftPct > 50) {
      balanceStatus = 'Especialización marcada';
      balanceMessage = 'Existe una marcada dominancia en uno de los tres movimientos respecto a la media de powerlifting.';
      balanceType = 'dominant';
    }
  }

  // Evolución temporal consolidada para gráficas (mejor marca de cada día)
  const getDailyBestHistory = (history: typeof big3Data.squat.history) => {
    const dailyMap: Record<string, { date: string; weight: number; reps: number; estimated1RM: number; workoutName: string }> = {};
    for (const h of history) {
      const dayKey = h.date.split('T')[0];
      if (!dailyMap[dayKey] || h.estimated1RM > dailyMap[dayKey].estimated1RM) {
        dailyMap[dayKey] = h;
      }
    }
    return Object.values(dailyMap).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const squatDailyHistory = getDailyBestHistory(big3Data.squat.history);
  const benchDailyHistory = getDailyBestHistory(big3Data.bench.history);
  const deadliftDailyHistory = getDailyBestHistory(big3Data.deadlift.history);


  const snatchDailyHistory = getDailyBestHistory(olympicData.snatch.history);
  const cleanAndJerkDailyHistory = getDailyBestHistory(olympicData.cleanAndJerk.history);

  // Lista de Benchmarks oficiales de CrossFit (The Girls, Heroes, etc.)
  const officialBenchmarks = new Set([
    'fran', 'cindy', 'murph', 'grace', 'helen', 'isabel', 'diane', 'dt',
    'annie', 'karen', 'fight gone bad', 'jackie', 'nancy', 'eva', 'kelly',
    'lynne', 'mary', 'chelsea', 'amanda', 'angie', 'barbara', 'elizabeth',
    'filthy fifty', 'the seven', 'kalsu', 'clovis', 'badger', 'nate',
    'lumberjack 20', 'bull', 'joshie', 'jason', 'michael', 'daniel',
    'tommy v', 'holbrook', 'gwen', 'hope', 'garrett', 'hansen', 'randy', 'loredo',
    'jt'
  ]);

  // Benchmarks formateados con deltas de mejora (solo oficiales o con 2+ intentos)
  const benchmarksList = Object.values(benchmarksMap)
    .filter((b) => {
      const norm = b.name.toLowerCase().trim();
      return officialBenchmarks.has(norm) || b.attempts >= 2;
    })
    .map((b) => {
      const norm = b.name.toLowerCase().trim();
      const isOfficial = officialBenchmarks.has(norm);
      const sortedH = b.history.sort((x, y) => new Date(x.date).getTime() - new Date(y.date).getTime());
      const firstTime = sortedH[0]?.timeSeconds;
      const lastTime = sortedH[sortedH.length - 1]?.timeSeconds;
      const deltaSeconds = firstTime && lastTime && sortedH.length > 1 ? firstTime - lastTime : null;
      return {
        name: b.name,
        workoutType: b.workoutType || 'CrossFit',
        attempts: b.attempts,
        isOfficial,
        bestTimeSeconds: b.bestTimeSeconds,
        bestRxTimeSeconds: b.bestRxTimeSeconds,
        bestScaledTimeSeconds: b.bestScaledTimeSeconds,
        bestScoreRounds: b.bestScoreRounds,
        bestScoreReps: b.bestScoreReps,
        isRx: b.isRx,
        deltaSeconds,
        history: sortedH,
      };
    })
    .sort((a, b) => (b.isOfficial ? 1 : 0) - (a.isOfficial ? 1 : 0) || b.attempts - a.attempts);

  // Lista de eventos y simuladores Hyrox formateados con deltas
  const hyroxEventsList = Object.values(hyroxEventsMap)
    .map((ev) => {
      const sortedH = ev.history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const firstTime = sortedH[0]?.timeSeconds;
      const lastTime = sortedH[sortedH.length - 1]?.timeSeconds;
      const deltaSeconds = firstTime && lastTime && sortedH.length > 1 ? firstTime - lastTime : null;
      return {
        name: ev.name,
        attempts: ev.attempts,
        bestTimeSeconds: ev.bestTimeSeconds,
        deltaSeconds,
        history: sortedH,
      };
    })
    .sort((a, b) => b.attempts - a.attempts);

  // Balance Hyrox: Running vs Estaciones Funcionales
  const totalHyroxTime = totalHyroxRunSeconds + totalHyroxStationsSeconds;
  const hyroxBalance = {
    totalRunSeconds: totalHyroxRunSeconds,
    totalStationsSeconds: totalHyroxStationsSeconds,
    runPercentage: totalHyroxTime > 0 ? Math.round((totalHyroxRunSeconds / totalHyroxTime) * 100) : 50,
    stationsPercentage: totalHyroxTime > 0 ? Math.round((totalHyroxStationsSeconds / totalHyroxTime) * 100) : 50,
    hasSplitData: totalHyroxTime > 0,
  };

  // Lista de PBs de cardio/ergómetros
  const cardioPBsList = Object.values(cardioPBsMap).sort(
    (a, b) => a.discipline.localeCompare(b.discipline) || a.distance - b.distance
  );

  const totalCrossfitCount = crossfitWodsList.length;
  const rxPercentage =
    rxWodsCount + scaledWodsCount > 0
      ? Math.round((rxWodsCount / (rxWodsCount + scaledWodsCount)) * 100)
      : 0;

  const capSuccessRate =
    wodsWithCapCount > 0
      ? Math.round((wodsFinishedUnderCapCount / wodsWithCapCount) * 100)
      : 0;

  return {
    general: {
      totalWorkouts: totalWorkoutsCount,
      thisMonthCount,
      thisYearCount,
      totalHours: Math.round((totalTimeSecondsAll / 3600) * 10) / 10,
      totalVolumeKg: totalVolumeAll,
      currentStreak,
      longestStreak,
      weeklyDistribution,
      recovery: recoveryData,
    },
    musculacion: {
      totalVolume: totalMusculacionVolume,
      totalSets: totalMusculacionSets,
      muscleGroups: muscleGroupsList,
      pushPullLegsBalance,
      avanzado: musculacionAvanzado,
    },
    powerlifting: {
      squat: { ...big3Data.squat, dailyHistory: squatDailyHistory },
      bench: { ...big3Data.bench, dailyHistory: benchDailyHistory },
      deadlift: { ...big3Data.deadlift, dailyHistory: deadliftDailyHistory },
      sbdTotal,
      sbdRealTotal,
      proportions: {
        squatPct,
        benchPct,
        deadliftPct,
        idealRatios: { squat: 35, bench: 25, deadlift: 40 },
        balanceStatus,
        balanceMessage,
        balanceType,
      },
    },
    crossfit: {
      totalWods: totalCrossfitCount,
      wods: crossfitWodsList.slice(-12).reverse(),
      rxStats: {
        rxWodsCount,
        scaledWodsCount,
        totalWods: totalCrossfitCount,
        rxPercentage,
      },
      timeCapStats: {
        wodsWithCap: wodsWithCapCount,
        finishedUnderCap: wodsFinishedUnderCapCount,
        capSuccessRate,
      },
      olympic: {
        snatch: { ...olympicData.snatch, dailyHistory: snatchDailyHistory },
        cleanAndJerk: { ...olympicData.cleanAndJerk, dailyHistory: cleanAndJerkDailyHistory },
        totalOlympic: olympicData.snatch.estimated1RM + olympicData.cleanAndJerk.estimated1RM,
      },
      benchmarks: benchmarksList,
      cardioPBs: cardioPBsList,
      modalityBreakdown: Object.entries(crossfitModalityCounts).map(([modality, count]) => ({
        modality,
        count,
        percentage:
          crossfitWodsList.length > 0
            ? Math.round((count / crossfitWodsList.length) * 100)
            : 0,
      })),
      fastestForTime: crossfitWodsList
        .filter(
          (w) =>
            (w.modality?.toLowerCase().includes('time') || w.modality?.toLowerCase().includes('afap')) &&
            w.totalTimeSeconds &&
            w.totalTimeSeconds > 0
        )
        .sort((a, b) => (a.totalTimeSeconds || 0) - (b.totalTimeSeconds || 0))
        .slice(0, 5),
    },
    hyroxCardio: {
      totalMinutes: totalCardioMinutes,
      totalSessions: totalCardioSessions,
      sessions: hyroxSessionsList.slice(-12).reverse(),
      cardioPBs: cardioPBsList,
      stations: Object.values(hyroxStationsMap),
      events: hyroxEventsList,
      balance: hyroxBalance,
      runs: hyroxRunsList,
      modalityBreakdown: Object.entries(hyroxModalityCounts).map(([modality, count]) => ({
        modality,
        count,
        percentage:
          hyroxSessionsList.length > 0
            ? Math.round((count / hyroxSessionsList.length) * 100)
            : 0,
      })),
    },
  };
}



