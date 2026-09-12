import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { exerciseCategories } from '@/lib/db/schema';
import { asc } from 'drizzle-orm';
import { getAvailableExercises } from '../actions';
import { WorkoutLoggerClient } from './workout-logger-client';

export default async function WorkoutLoggerPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; typeId?: string; templateId?: string; workoutId?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const params = await searchParams;

  const [availableExercises, categories] = await Promise.all([
    getAvailableExercises(),
    db
      .select({
        id: exerciseCategories.id,
        name: exerciseCategories.name,
      })
      .from(exerciseCategories)
      .orderBy(asc(exerciseCategories.name)),
  ]);

  return (
    <WorkoutLoggerClient
      availableExercises={availableExercises}
      categories={categories}
      mode={params.mode || 'free'}
      typeId={params.typeId}
    />
  );
}