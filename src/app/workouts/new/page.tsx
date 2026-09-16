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

  // 3. Obtener los entrenamientos realizados con ejercicios y sus series completas
  const recentWorkouts = await db.query.workouts.findMany({
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

      {/* 1. SELECCIÓN DE RUTINAS Y PLANTILLAS PREVIAS (Para entrenar hoy) */}
      {(serializedRecent.length > 0 || serializedTemplates.length > 0) && (
        <WorkoutQuickSelector
          recentWorkouts={serializedRecent}
          templates={serializedTemplates}
        />
      )}

      {/* 2. PLANIFICAR Y DISEÑAR NUEVA RUTINA (Guardar para entrenar después) */}
      <div className="space-y-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/90 dark:border-gray-700 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-600"></span>
              Planificar y Crear Nueva Plantilla
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Diseña tu plantilla con ejercicios y series objetivo, y déjala guardada para cuando llegues al gimnasio.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          {types.map((type) => (
            <Link key={`plan-${type.id}`} href={`/workouts/log?mode=new-template&typeId=${type.id}`}>
              <Card className="hover:border-purple-300 hover:shadow-xs hover:bg-purple-50/30 dark:hover:bg-purple-950/20 transition-all cursor-pointer h-full border-gray-200 dark:border-gray-700 group">
                <CardContent className="flex items-center p-4 gap-3">
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/30 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/50 rounded-xl text-purple-700 dark:text-purple-300 transition-colors shrink-0">
                    <Dumbbell className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="font-bold text-gray-900 dark:text-gray-100 text-sm group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors truncate">
                        {type.name}
                      </p>
                      <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider shrink-0">
                        Diseñar
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                      {type.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* 3. ENTRENAMIENTO LIBRE EN DIRECTO (Sobre la marcha sin plantilla) */}
      <div className="space-y-3 bg-gray-50/70 dark:bg-gray-800/40 rounded-2xl border border-gray-200/70 dark:border-gray-700/60 p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Entrenamiento Libre en Directo
            </h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              Si ya estás en el gimnasio y prefieres registrar tu sesión sobre la marcha sin plantilla previa.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-1">
          {types.map((type) => (
            <Link key={`live-${type.id}`} href={`/workouts/log?mode=free&typeId=${type.id}`}>
              <div className="p-3 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-950/30 border border-gray-200 dark:border-gray-700 hover:border-blue-200 rounded-xl transition-all text-center cursor-pointer">
                <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{type.name}</p>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5 block">
                  En directo →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
