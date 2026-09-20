import { db } from '@/lib/db';
import { workouts } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { TransitionLink as Link } from '@/components/layout/transition-link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dumbbell, TrendingUp, Plus, Activity, Scale } from 'lucide-react';
import { getConsistencyData } from '../workouts/actions';
import { getBodySummary } from '../progress/measurements-actions';
import { ConsistencyHeatmap } from '../progress/consitency-heatmap';
import { CountUp } from '@/components/reactbits/count-up';
import { AnimatedList } from '@/components/reactbits/animated-list';
import { PageReady } from '@/components/layout/route-transition';

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  // Últimos entrenamientos con detalle (ejercicios + series para stats) y
  // datos de consistencia en paralelo. Solo 5 sesiones: coste acotado.
  const [recentWorkouts, consistencyData, bodySummary] = await Promise.all([
    db.query.workouts.findMany({
      where: eq(workouts.userId, userId),
      orderBy: desc(workouts.startTime),
      limit: 5,
      columns: {
        id: true,
        name: true,
        modality: true,
        startTime: true,
        totalTimeSeconds: true,
      },
      with: {
        type: { columns: { name: true } },
        exercises: {
          columns: { id: true },
          with: {
            exercise: { columns: { name: true } },
            sets: { columns: { weight: true, repCount: true } },
          },
        },
      },
    }),
    getConsistencyData(userId),
    getBodySummary(),
  ]);

  // Stats básicas
  const totalWorkouts = consistencyData.totalWorkouts;

  const recentItems = recentWorkouts.map((workout) => {
    const exercisesCount = workout.exercises.length;
    let setsCount = 0;
    let totalVolume = 0;
    const exerciseNames: string[] = [];
    for (const we of workout.exercises) {
      setsCount += we.sets.length;
      if (we.exercise?.name) exerciseNames.push(we.exercise.name);
      for (const s of we.sets) {
        const w = s.weight != null ? Number(s.weight) : 0;
        const r = s.repCount ?? 0;
        totalVolume += w * r;
      }
    }

    const dateLabel = new Date(workout.startTime).toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
    const durationLabel = workout.totalTimeSeconds
      ? `${Math.round(workout.totalTimeSeconds / 60)} min`
      : 'Sin tiempo';
    const volumeLabel =
      totalVolume >= 1000
        ? `${(totalVolume / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} t`
        : `${Math.round(totalVolume).toLocaleString('es-ES')} kg`;
    const exercisesPreview =
      exerciseNames.length > 2
        ? `${exerciseNames.slice(0, 2).join(' · ')} · +${exerciseNames.length - 2} más`
        : exerciseNames.join(' · ') || undefined;

    return {
      id: String(workout.id),
      title: workout.name,
      href: `/workouts?open=${workout.id}`,
      typeLabel: workout.type?.name ?? 'Sin tipo',
      modalityLabel: workout.modality,
      dateLabel,
      durationLabel,
      exercisesCount,
      setsCount,
      volumeLabel,
      exercisesPreview,
    };
  });

    return (
        <div className="space-y-6">
            <PageReady />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Bienvenido de vuelta a tu entrenamiento</p>
        </div>
        <Link href="/workouts/new">
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Nuevo Entrenamiento
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Entrenamientos Totales</CardTitle>
            <Dumbbell className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold dark:text-gray-100">
              <CountUp to={totalWorkouts} duration={1500} />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Días activos registrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Racha Actual</CardTitle>
            <Activity className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold dark:text-gray-100">
              <CountUp to={consistencyData.currentStreak} duration={1300} /> días
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Récord: {consistencyData.longestStreak} días</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Frecuencia Semanal</CardTitle>
            <TrendingUp className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold dark:text-gray-100">
              <CountUp to={consistencyData.avgPerWeek} duration={1300} /> días
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Promedio por semana</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Peso Corporal</CardTitle>
            <Scale className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          </CardHeader>
          <CardContent>
            {bodySummary.latestWeight != null ? (
              <>
                <div className="text-2xl font-bold dark:text-gray-100">
                  <CountUp to={bodySummary.latestWeight} duration={1800} delay={300} /> kg
                  {bodySummary.delta30d != null && bodySummary.delta30d !== 0 && (
                    <span className={`ml-2 text-sm font-bold ${bodySummary.delta30d > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {bodySummary.delta30d > 0 ? `+${bodySummary.delta30d}` : bodySummary.delta30d} kg
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <Link href="/progress?tab=corporal" className="text-sky-600 dark:text-sky-400 font-semibold hover:underline">
                    Ver evolución →
                  </Link>
                  {bodySummary.daysSinceLast != null && bodySummary.daysSinceLast > 7 && (
                    <span> · hace {bodySummary.daysSinceLast} días sin medirte</span>
                  )}
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold dark:text-gray-100">—</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <Link href="/progress?tab=corporal" className="text-sky-600 dark:text-sky-400 font-semibold hover:underline">
                    Registrar primera medición →
                  </Link>
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mapa de Actividad Interactivo */}
      <div className="space-y-3">
        <ConsistencyHeatmap data={consistencyData} />
      </div>

      {/* Últimos Entrenamientos */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div>
            <CardTitle>Entrenamientos Recientes</CardTitle>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Tus últimas {recentWorkouts.length} {recentWorkouts.length === 1 ? 'sesión' : 'sesiones'} de un vistazo
            </p>
          </div>
          <Link
            href="/workouts"
            className="shrink-0 text-xs font-semibold text-sky-600 hover:underline dark:text-sky-400"
          >
            Ver historial →
          </Link>
        </CardHeader>
        <CardContent>
          {recentWorkouts.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <p className="text-gray-500 dark:text-gray-400">
                Aún no has registrado ningún entrenamiento. ¡Empieza ahora!
              </p>
              <Link href="/workouts/new">
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Crear mi primer entrenamiento
                </Button>
              </Link>
            </div>
          ) : (
            <AnimatedList
              items={recentItems}
              delay={120}
              className="space-y-3"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}