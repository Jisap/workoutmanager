import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
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
  const availableExercises = await getAvailableExercises();

  return (
    <WorkoutLoggerClient
      availableExercises={availableExercises}
      mode={params.mode || 'free'}
      typeId={params.typeId}
    />
  );
}