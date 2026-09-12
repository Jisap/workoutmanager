import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getProgressData, getExerciseProgress, getAvailableExercises } from '../workouts/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, TrendingUp, Calendar, Dumbbell, LineChart } from 'lucide-react';
import { ExerciseProgressChart } from './exercise-progress-chart';
import { getConsistencyData } from '../workouts/actions';
import { ConsistencyHeatmap } from './consitency-heatmap';


export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ exerciseId?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const resolvedParams = await searchParams;

  // Cargar datos en paralelo
  const [progressData, availableExercises, consistencyData] = await Promise.all([
    getProgressData(userId),
    getAvailableExercises(userId),
    getConsistencyData(userId), // <-- NUEVO
  ]);

  // Si no hay ejercicio especificado en la URL, seleccionar el primero disponible
  const selectedExerciseId = resolvedParams.exerciseId
    ? parseInt(resolvedParams.exerciseId, 10)
    : (availableExercises[0]?.id ?? null);

  // Cargar progresión del ejercicio seleccionado
  const exerciseProgress = selectedExerciseId
    ? await getExerciseProgress(userId, selectedExerciseId)
    : null;

  const selectedExercise = availableExercises.find((ex) => ex.id === selectedExerciseId);
  const maxVolume = Math.max(...progressData.weeklyVolume.map((w) => w.volume), 1);



  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-24">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tu Progreso</h1>
        <p className="text-gray-600 mt-1">
          Has completado <span className="font-semibold text-gray-900">{progressData.totalWorkouts}</span> entrenamientos en total.
        </p>
      </div>

      {/* Sección 1: Récords Personales (PRs) */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <h2 className="text-lg font-semibold text-gray-900">Récords Personales (Top 5)</h2>
        </div>

        {progressData.prs.length === 0 ? (
          <Card className="bg-gray-50 border-dashed">
            <CardContent className="py-8 text-center text-gray-500">
              Aún no hay récords registrados. ¡A darle duro!
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {progressData.prs.map((pr, index) => (
              <Card key={index} className="border-l-4 border-l-yellow-400">
                <CardContent className="p-4">
                  <p className="text-sm font-medium text-gray-500 truncate">{pr.exerciseName}</p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-gray-900 tabular-nums">{pr.weight} kg</span>
                    <span className="text-sm text-gray-600">x {pr.reps} reps</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(pr.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Sección 2: Volumen Semanal */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Volumen Semanal (kg)</h2>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-end justify-between gap-2 h-48 mt-4">
              {progressData.weeklyVolume.map((week, i) => {
                const heightPercentage = (week.volume / maxVolume) * 100;
                return (
                  <div key={i} className="flex flex-col items-center gap-2 flex-1 group">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs rounded px-2 py-1 mb-1 whitespace-nowrap">
                      {week.volume} kg
                    </div>
                    <div className="w-full bg-gray-100 rounded-t-md relative h-32 flex items-end overflow-hidden">
                      <div
                        className="w-full bg-blue-600 rounded-t-md transition-all duration-700 ease-out group-hover:bg-blue-500"
                        style={{ height: `${Math.max(heightPercentage, 4)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-500">{week.label}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Sección 3: Progresión por Ejercicio (Analítica Avanzada) */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <LineChart className="w-5 h-5 text-purple-600" />
          <h2 className="text-lg font-semibold text-gray-900">Progresión por Ejercicio</h2>
        </div>

        <ExerciseProgressChart
          availableExercises={availableExercises}
          selectedExerciseId={selectedExerciseId}
          data={exerciseProgress}
        />
      </section>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-green-600" />
          <h2 className="text-lg font-semibold text-gray-900">Consistencia y Actividad</h2>
        </div>
        <ConsistencyHeatmap data={consistencyData} />
      </section>

      {/* Sección 4: Consistencia */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-green-600" />
          <h2 className="text-lg font-semibold text-gray-900">Consistencia</h2>
        </div>
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-full text-green-600">
              <Dumbbell className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">¡Sigue así!</p>
              <p className="text-sm text-gray-600">
                La consistencia es la clave. Intenta mantener al menos 3 entrenamientos por semana.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}