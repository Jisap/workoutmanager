import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { workoutTypes, workoutTemplates, workouts } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Dumbbell } from 'lucide-react';
import { WorkoutQuickSelector } from './workout-quick-selector';

import { getAvailableExercises, getUserTemplates } from '../actions';

export default async function NewWorkoutPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  // 1. Obtener tipos de entrenamiento disponibles
  const types = await db.select().from(workoutTypes);

  // 2. Obtener plantillas del usuario con ejercicios formateados y ricos
  const templates = await getUserTemplates(userId);

  // 3. Obtener los últimos 15 entrenamientos realizados con ejercicios y sus series completas
  const recentWorkouts = await db.query.workouts.findMany({
    where: eq(workouts.userId, userId),
    orderBy: [desc(workouts.startTime)],
    limit: 15,
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

  // Serializar datos limpios y detallados para el componente cliente
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
    createdAt: t.createdAt,
    exercisesCount: t.exercisesCount,
    totalSetsCount: t.totalSetsCount,
    exercises: t.exercises.map((e, idx) => ({
      name: e.name,
      orderIndex: idx,
      targetReps: e.targetReps,
      targetWeight: e.targetWeight,
      targetDistance: null,
      timeCapSeconds: e.targetDurationSeconds,
      formattedSummary: e.formattedSummary,
    })),
  }));

  return (
    <div className="mx-auto w-full max-w-2xl lg:max-w-4xl xl:max-w-5xl space-y-6 pb-24">
      {/* Header con volver */}
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

      {/* Selector Rápido Combobox: Repetir Reciente o Cargar Plantilla */}
      {(serializedRecent.length > 0 || serializedTemplates.length > 0) && (
        <WorkoutQuickSelector
          recentWorkouts={serializedRecent}
          templates={serializedTemplates}
        />
      )}

      {/* Opción: Empezar desde cero (Entrenamiento Libre por Tipo) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Empezar Entrenamiento Libre
          </h2>
          <span className="text-xs text-gray-400 dark:text-gray-500">Elige una modalidad</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {types.map((type) => (
            <Link key={type.id} href={`/workouts/log?mode=free&typeId=${type.id}`}>
              <Card className="hover:border-blue-300 hover:shadow-xs hover:bg-gray-50/50 dark:hover:bg-gray-800 transition-all cursor-pointer h-full border-gray-200 dark:border-gray-700 group">
                <CardContent className="flex flex-col items-center text-center p-5 gap-2.5">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/30 group-hover:bg-blue-100 rounded-2xl text-blue-700 dark:text-blue-300 transition-colors">
                    <Dumbbell className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-gray-100 text-sm group-hover:text-blue-900 transition-colors">
                      {type.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                      {type.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
