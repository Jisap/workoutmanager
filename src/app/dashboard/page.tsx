import { db } from '@/lib/db';
import { workouts } from '@/lib/db/schema';
import { eq, desc, and, isNull, count, or } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { TransitionLink as Link } from '@/components/layout/transition-link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dumbbell, TrendingUp, Plus, Activity, Scale, Play, RotateCcw } from 'lucide-react';
import { formatModalitySummary } from '@/lib/modality-utils';
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
  // Además se busca el borrador más reciente (sin finalizar) para el hero "Continuar".
  const [recentWorkouts, consistencyData, bodySummary, draftWorkouts, sessionsCount] = await Promise.all([
    db.query.workouts.findMany({
      where: eq(workouts.userId, userId),
      orderBy: desc(workouts.startTime),
      limit: 5,
      columns: {
        id: true,
        name: true,
        modality: true,
        modalityConfig: true,
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
    db.query.workouts.findMany({
      // Borradores = sin finalizar: NULL o 0 (igual que en el historial).
      // Se traen todos (los últimos 5): si hay varios hay que decirlo.
      where: and(
        eq(workouts.userId, userId),
        or(isNull(workouts.totalTimeSeconds), eq(workouts.totalTimeSeconds, 0))
      ),
      orderBy: desc(workouts.startTime),
      limit: 5,
      columns: { id: true, name: true, startTime: true },
    }),
    // Nº real de sesiones (informe §4: no confundir con días activos)
    db.select({ value: count() }).from(workouts).where(eq(workouts.userId, userId)),
  ]);
  const totalSessions = sessionsCount[0]?.value ?? 0;

  // Stats básicas (informe §4: sesiones ≠ días activos, no mezclarlos)
  const activeDays = consistencyData.totalWorkouts;

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
      : 'Sin finalizar · Continuar';
    // Volumen siempre en kg para unificar con historial/progreso (antes mezclaba t/kg).
    const volumeLabel = `${Math.round(totalVolume).toLocaleString('es-ES')} kg`;
    const exercisesPreview =
      exerciseNames.length > 2
        ? `${exerciseNames.slice(0, 2).join(' · ')} · +${exerciseNames.length - 2} más`
        : exerciseNames.join(' · ') || undefined;
    const isFinished = !!(workout.totalTimeSeconds && workout.totalTimeSeconds > 0);

    return {
      id: String(workout.id),
      title: workout.name,
      href: `/workouts?open=${workout.id}`,
      // Repetir en 1 clic desde la tarjeta (informe §4.2). Si es borrador, continuar.
      repeatHref: isFinished
        ? `/workouts/log?mode=repeat&workoutId=${workout.id}`
        : `/workouts/log?mode=resume&workoutId=${workout.id}`,
      typeLabel: workout.type?.name ?? 'Sin tipo',
      modalityLabel: workout.modality ? formatModalitySummary(workout.modality, workout.modalityConfig) : null,
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

      {/* Hero-action: Continuar borrador(es) o Empezar hoy (informe §4.1) */}
      {draftWorkouts.length > 0 ? (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardContent className="space-y-3 py-4">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wider dark:text-amber-300 flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" />
              {draftWorkouts.length === 1
                ? 'Tienes 1 entreno sin finalizar'
                : `Tienes ${draftWorkouts.length} entrenos sin finalizar`}
            </p>
            <div className="space-y-2">
              {draftWorkouts.map((draft) => (
                <div
                  key={draft.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-amber-200/70 dark:border-amber-800/60 bg-white/60 dark:bg-gray-900/40 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate dark:text-gray-100">
                      {draft.name}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      {new Date(draft.startTime).toLocaleDateString('es-ES', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </p>
                  </div>
                  <Link
                    href={`/workouts/log?mode=resume&workoutId=${draft.id}`}
                    className="shrink-0"
                  >
                    <Button className="bg-amber-600 hover:bg-amber-700 text-white min-h-[44px] w-full sm:w-auto">
                      <Play className="w-4 h-4 mr-1.5" />
                      Continuar
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <Link href="/workouts/new">
                <Button variant="outline" size="sm" className="h-9 text-xs rounded-xl">
                  O empezar otro
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-blue-200 bg-blue-50/60 dark:bg-blue-950/20 dark:border-blue-800">
          <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4">
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">¿Entrenas hoy?</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Repite tu última sesión en 1 toque o empieza un WOD vacío.</p>
            </div>
            <div className="flex gap-2 shrink-0">
              {recentWorkouts[0] ? (
                <Link href={`/workouts/log?mode=repeat&workoutId=${recentWorkouts[0].id}`}>
                  <Button variant="outline" className="min-h-[44px]">
                    <RotateCcw className="w-4 h-4 mr-1.5" />
                    Repetir último
                  </Button>
                </Link>
              ) : null}
              <Link href="/workouts/log?mode=free">
                <Button className="min-h-[44px]">
                  <Play className="w-4 h-4 mr-1.5" />
                  Empezar hoy
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sesiones</CardTitle>
            <Dumbbell className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold dark:text-gray-100">
              <CountUp to={totalSessions} duration={1500} />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{activeDays} {activeDays === 1 ? 'día activo' : 'días activos'}</p>
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
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2 flex-wrap">
                  <Link href="/progress?tab=corporal">
                    <Button variant="outline" size="sm" className="h-9 text-xs rounded-xl">
                      Ver evolución →
                    </Button>
                  </Link>
                  {bodySummary.daysSinceLast != null && bodySummary.daysSinceLast > 7 && (
                    <span className="font-semibold text-amber-600 dark:text-amber-400">· hace {bodySummary.daysSinceLast} días sin medirte</span>
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

      {/* Mapa de Actividad (sin KPIs: el dashboard ya muestra racha/frecuencia arriba) */}
      <div className="space-y-3">
        <ConsistencyHeatmap data={consistencyData} showKpis={false} />
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