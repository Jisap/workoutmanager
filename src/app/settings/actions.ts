'use server';

import { db } from '@/lib/db';
import { exercises, exerciseCategories, workoutTypes, workouts, workoutExercises } from '@/lib/db/schema';
import { auth } from '@clerk/nextjs/server';
import { eq, and, isNotNull, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

/** Obtener todos los ejercicios personalizados del usuario con su categoría y estadísticas de uso */
export async function getCustomExercises(userId: string) {
  const customExercises = await db
    .select({
      id: exercises.id,
      name: exercises.name,
      categoryId: exercises.categoryId,
      categoryName: exerciseCategories.name,
    })
    .from(exercises)
    .leftJoin(exerciseCategories, eq(exercises.categoryId, exerciseCategories.id))
    .where(and(eq(exercises.isCustom, true), eq(exercises.userId, userId)));

  // Para cada ejercicio, contar cuántas veces se ha usado
  const usageCounts = await db
    .select({
      exerciseId: workoutExercises.exerciseId,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(workoutExercises)
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(eq(workouts.userId, userId))
    .groupBy(workoutExercises.exerciseId);

  const usageMap = new Map<number, number>();
  for (const u of usageCounts) usageMap.set(u.exerciseId, u.count);

  return customExercises.map((ex) => ({
    ...ex,
    categoryName: ex.categoryName ?? 'Sin categoría',
    usageCount: usageMap.get(ex.id) ?? 0,
  }));
}

/** Renombrar un ejercicio personalizado del usuario */
export async function renameCustomExercise(exerciseId: number, newName: string) {
  const { userId } = await auth();
  if (!userId) throw new Error('No autorizado');

  // Verificar que el ejercicio pertenece al usuario
  const [ex] = await db
    .select()
    .from(exercises)
    .where(and(eq(exercises.id, exerciseId), eq(exercises.userId, userId), eq(exercises.isCustom, true)));

  if (!ex) throw new Error('Ejercicio no encontrado o sin permiso');

  await db.update(exercises).set({ name: newName.trim() }).where(eq(exercises.id, exerciseId));

  revalidatePath('/settings');
  revalidatePath('/workouts');
  return { success: true };
}

/** Eliminar un ejercicio personalizado del usuario */
export async function deleteCustomExercise(exerciseId: number) {
  const { userId } = await auth();
  if (!userId) throw new Error('No autorizado');

  // Verificar propiedad
  const [ex] = await db
    .select()
    .from(exercises)
    .where(and(eq(exercises.id, exerciseId), eq(exercises.userId, userId), eq(exercises.isCustom, true)));

  if (!ex) throw new Error('Ejercicio no encontrado o sin permiso');

  await db.delete(exercises).where(eq(exercises.id, exerciseId));

  revalidatePath('/settings');
  revalidatePath('/workouts');
  return { success: true };
}

/** Obtener todos los tipos de entrenamiento disponibles */
export async function getWorkoutTypes() {
  return db.select().from(workoutTypes).orderBy(workoutTypes.name);
}

/** Obtener todas las categorías de ejercicios */
export async function getExerciseCategories() {
  return db.select().from(exerciseCategories).orderBy(exerciseCategories.name);
}

/** Estadísticas globales del usuario para el resumen de perfil */
export async function getUserStats(userId: string) {
  const [workoutCount] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(workouts)
    .where(eq(workouts.userId, userId));

  const [customExerciseCount] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(exercises)
    .where(and(eq(exercises.isCustom, true), eq(exercises.userId, userId)));

  // Primer entrenamiento registrado
  const [firstWorkout] = await db
    .select({ startTime: workouts.startTime })
    .from(workouts)
    .where(eq(workouts.userId, userId))
    .orderBy(workouts.startTime)
    .limit(1);

  return {
    totalWorkouts: workoutCount?.count ?? 0,
    customExercises: customExerciseCount?.count ?? 0,
    memberSince: firstWorkout?.startTime ?? null,
  };
}
