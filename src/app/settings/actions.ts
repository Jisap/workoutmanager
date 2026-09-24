'use server';

import { db } from '@/lib/db';
import { exercises, exerciseCategories, workoutTypes, workouts, workoutExercises } from '@/lib/db/schema';
import { auth } from '@clerk/nextjs/server';
import { eq, and, isNotNull, sql, or, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

/** Obtener todos los ejercicios personalizados del usuario con su categoría y estadísticas de uso */
export async function getCustomExercises(userId: string) {
  // Las dos consultas son independientes: se lanzan en paralelo.
  const [customExercises, usageCounts] = await Promise.all([
    db
      .select({
        id: exercises.id,
        name: exercises.name,
        categoryId: exercises.categoryId,
        categoryName: exerciseCategories.name,
      })
      .from(exercises)
      .leftJoin(exerciseCategories, eq(exercises.categoryId, exerciseCategories.id))
      .where(and(eq(exercises.isCustom, true), eq(exercises.userId, userId))),

    // Para cada ejercicio, contar cuántas veces se ha usado
    db
      .select({
        exerciseId: workoutExercises.exerciseId,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(workoutExercises)
      .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
      .where(eq(workouts.userId, userId))
      .groupBy(workoutExercises.exerciseId),
  ]);

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

/** Obtener todas las categorías de ejercicios (Globales + Personalizadas del usuario) con conteo de ejercicios */
export async function getExerciseCategories(userIdParam?: string) {
  const { userId: authedUserId } = await auth();
  if (userIdParam && userIdParam !== authedUserId) throw new Error('No autorizado');
  const userId = userIdParam ?? authedUserId;

  // Lista y conteo son independientes: se lanzan en paralelo.
  const [categoryList, exerciseCounts] = await Promise.all([
    db
      .select({
        id: exerciseCategories.id,
        name: exerciseCategories.name,
        type: exerciseCategories.type,
        isCustom: exerciseCategories.isCustom,
        userId: exerciseCategories.userId,
      })
      .from(exerciseCategories)
      .where(userId ? or(isNull(exerciseCategories.userId), eq(exerciseCategories.userId, userId)) : isNull(exerciseCategories.userId))
      .orderBy(exerciseCategories.isCustom, exerciseCategories.name),

    // Conteo de ejercicios en cada categoría (globales + del usuario)
    db
      .select({
        categoryId: exercises.categoryId,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(exercises)
      .where(userId ? or(isNull(exercises.userId), eq(exercises.userId, userId)) : isNull(exercises.userId))
      .groupBy(exercises.categoryId),
  ]);

  const countMap = new Map<number, number>();
  for (const c of exerciseCounts) {
    if (c.categoryId !== null) {
      countMap.set(c.categoryId, c.count);
    }
  }

  return categoryList.map((cat) => ({
    id: cat.id,
    name: cat.name,
    type: cat.type ?? 'General',
    isCustom: !!cat.isCustom,
    exerciseCount: countMap.get(cat.id) ?? 0,
  }));
}

/** Crear una nueva categoría personalizada para el usuario */
export async function createExerciseCategory(data: { name: string; type?: string }) {
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

    return {
      success: true,
      category: {
        id: newCategory.id,
        name: newCategory.name,
        type: newCategory.type ?? 'General',
        isCustom: true,
        exerciseCount: 0,
      },
    };
  } catch (error) {
    console.error('Error creando categoría:', error);
    throw new Error('No se pudo crear la categoría');
  }
}

/** Renombrar una categoría personalizada */
export async function renameExerciseCategory(categoryId: number, newName: string) {
  const { userId } = await auth();
  if (!userId) throw new Error('No autorizado');

  const trimmedName = newName.trim();
  if (!trimmedName) throw new Error('El nombre no puede estar vacío');

  // Verificar que la categoría pertenece al usuario y es personalizada
  const [cat] = await db
    .select()
    .from(exerciseCategories)
    .where(and(eq(exerciseCategories.id, categoryId), eq(exerciseCategories.userId, userId), eq(exerciseCategories.isCustom, true)));

  if (!cat) throw new Error('Categoría no encontrada o no se puede modificar (categoría del sistema)');

  await db
    .update(exerciseCategories)
    .set({ name: trimmedName })
    .where(eq(exerciseCategories.id, categoryId));

  revalidatePath('/settings');
  revalidatePath('/workouts');
  revalidatePath('/workouts/new');
  revalidatePath('/workouts/log');

  return { success: true };
}

/** Eliminar una categoría personalizada.
 *  `reassignToId`: categoría destino para sus ejercicios (null/undefined = sin categoría).
 */
export async function deleteExerciseCategory(categoryId: number, reassignToId?: number | null) {
  const { userId } = await auth();
  if (!userId) throw new Error('No autorizado');

  // Verificar que la categoría pertenece al usuario y es personalizada
  const [cat] = await db
    .select()
    .from(exerciseCategories)
    .where(and(eq(exerciseCategories.id, categoryId), eq(exerciseCategories.userId, userId), eq(exerciseCategories.isCustom, true)));

  if (!cat) throw new Error('Categoría no encontrada o no se puede eliminar (categoría del sistema)');

  // Destino de reasignación (opcional): debe existir y no ser la propia.
  // Vale cualquier categoría visible (sistema o propia); si no, sin categoría.
  let targetId: number | null = null;
  if (reassignToId != null && Number.isInteger(reassignToId) && reassignToId !== categoryId) {
    const [target] = await db
      .select({ id: exerciseCategories.id })
      .from(exerciseCategories)
      .where(
        and(
          eq(exerciseCategories.id, reassignToId),
          or(isNull(exerciseCategories.userId), eq(exerciseCategories.userId, userId))
        )
      );
    if (target) targetId = target.id;
  }

  // Mover sus ejercicios al destino (o desvincularlos)
  await db
    .update(exercises)
    .set({ categoryId: targetId })
    .where(eq(exercises.categoryId, categoryId));

  // Eliminar la categoría
  await db
    .delete(exerciseCategories)
    .where(eq(exerciseCategories.id, categoryId));

  revalidatePath('/settings');
  revalidatePath('/workouts');
  revalidatePath('/workouts/new');
  revalidatePath('/workouts/log');

  return { success: true };
}

/** Estadísticas globales del usuario para el resumen de perfil */
export async function getUserStats(userId: string) {
  // Las tres consultas son independientes: se lanzan en paralelo.
  const [[workoutCount], [customExerciseCount], [firstWorkout]] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(workouts)
      .where(eq(workouts.userId, userId)),

    db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(exercises)
      .where(and(eq(exercises.isCustom, true), eq(exercises.userId, userId))),

    // Primer entrenamiento registrado
    db
      .select({ startTime: workouts.startTime })
      .from(workouts)
      .where(eq(workouts.userId, userId))
      .orderBy(workouts.startTime)
      .limit(1),
  ]);

  return {
    totalWorkouts: workoutCount?.count ?? 0,
    customExercises: customExerciseCount?.count ?? 0,
    memberSince: firstWorkout?.startTime ?? null,
  };
}
