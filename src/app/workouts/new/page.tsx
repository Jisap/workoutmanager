import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { TransitionLink as Link } from '@/components/layout/transition-link';
import { db } from '@/lib/db';
import { workoutTypes, workouts } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { WorkoutQuickSelector } from './workout-quick-selector';
import { StartFreshSection } from './start-fresh-section';
import { NewWorkoutOnboarding } from './new-workout-onboarding';
import { PageReady } from '@/components/layout/route-transition';

import { getUserTemplates } from '../actions';

export default async function NewWorkoutPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const [types, recentWorkouts] = await Promise.all([
    db.select().from(workoutTypes),
    db.query.workouts.findMany({
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
    }),
  ]);

  const templates = await getUserTemplates(userId, recentWorkouts);

  const serializedRecent = recentWorkouts.map((w) => {
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
          calories: s.calories,
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

    return {
      id: w.id,
      name: w.name,
      notes: w.notes,
      modality: w.modality || null,
      modalityConfig: w.modalityConfig || null,
      startTime: w.startTime,
      totalTimeSeconds: w.totalTimeSeconds,
      typeId: w.typeId,
      typeName: w.type?.name,
      totalVolume,
      totalSetsCount,
      exercises,
    };
  });

  const serializedTemplates = templates.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    typeId: t.typeId,
    typeName: t.typeName,
    modality: t.modality || null,
    modalityConfig: t.modalityConfig || null,
    createdAt: t.createdAt,
    exercisesCount: t.exercisesCount,
    totalSetsCount: t.totalSetsCount,
    exercises: t.exercises.map((e, idx) => ({
      name: e.name,
      orderIndex: idx,
      targetReps: e.targetReps,
      targetWeight: e.targetWeight,
      targetDistance: e.targetDistance ?? null,
      targetCalories: e.targetCalories ?? null,
      timeCapSeconds: e.targetDurationSeconds,
      formattedSummary: e.formattedSummary,
    })),
  }));

  const hasData = serializedRecent.length > 0 || serializedTemplates.length > 0;
  const typesForClient = types.map((t) => ({ id: t.id, name: t.name, description: t.description }));

  return (
    <div className="mx-auto w-full max-w-2xl lg:max-w-4xl xl:max-w-5xl space-y-6 pb-24">
      <PageReady />
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Nuevo Entrenamiento</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">¿Qué vas a entrenar hoy?</p>
        </div>
      </div>

      {!hasData ? (
        <NewWorkoutOnboarding types={typesForClient} />
      ) : (
        <>
          {/* Camino 1: repetir algo que ya hiciste */}
          <WorkoutQuickSelector
            recentWorkouts={serializedRecent}
            templates={serializedTemplates}
          />

          {/* Camino 2: empezar de cero (vacío, plantilla o WOD dentro del logger) */}
          <StartFreshSection types={typesForClient} />
        </>
      )}
    </div>
  );
}
