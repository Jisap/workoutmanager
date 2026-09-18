import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import {
  getProgressData,
  getExerciseProgress,
  getAvailableExercises,
  getConsistencyData,
  getAdvancedProgressData,
} from '../workouts/actions';
import { ProgressClient } from './progress-client';
import { getBodyMeasurements } from './measurements-actions';
import { LineChart } from 'lucide-react';

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ exerciseId?: string; tab?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const resolvedParams = await searchParams;

  // Pestaña inicial por URL (?tab=corporal) para deep-links desde el dashboard
  const validTabs = ['general', 'musculacion', 'powerlifting', 'crossfit', 'exercise', 'corporal'] as const;
  const initialTab = validTabs.includes(resolvedParams.tab as (typeof validTabs)[number])
    ? (resolvedParams.tab as (typeof validTabs)[number])
    : 'general';

  // Cargar datos en paralelo para máxima velocidad
  const [advancedData, progressData, availableExercises, consistencyData, bodyMeasurements] = await Promise.all([
    getAdvancedProgressData(userId),
    getProgressData(userId),
    getAvailableExercises(userId),
    getConsistencyData(userId),
    getBodyMeasurements(),
  ]);

  // Si no hay ejercicio especificado en la URL, seleccionar el primero disponible
  const selectedExerciseId = resolvedParams.exerciseId
    ? parseInt(resolvedParams.exerciseId, 10)
    : (availableExercises[0]?.id ?? null);

  // Cargar progresión del ejercicio seleccionado
  const exerciseProgress = selectedExerciseId
    ? await getExerciseProgress(userId, selectedExerciseId)
    : null;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24">
      {/* Header de la Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <LineChart className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Progreso & Analítica
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Métricas globales de consistencia, volumen por grupo muscular y evolución de fuerza en tus levantamientos.
          </p>
        </div>
      </div>

      {/* Componente interactivo con navegación por modalidades */}
      <ProgressClient
        advancedData={advancedData}
        progressData={progressData}
        availableExercises={availableExercises}
        selectedExerciseId={selectedExerciseId}
        exerciseProgress={exerciseProgress}
        consistencyData={consistencyData}
        bodyMeasurements={bodyMeasurements}
        initialTab={initialTab}
      />
    </div>
  );
}