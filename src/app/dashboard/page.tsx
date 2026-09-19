import { db } from '@/lib/db';
import { workouts, workoutTypes } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Dumbbell, TrendingUp, Plus, Activity, Scale } from 'lucide-react';
import { getConsistencyData } from '../workouts/actions';
import { getBodySummary } from '../progress/measurements-actions';
import { ConsistencyHeatmap } from '../progress/consitency-heatmap';

export default async function DashboardPage() {
    const { userId } = await auth();

    if (!userId) {
        redirect('/sign-in');
    }

    // Obtener últimos entrenamientos y datos de consistencia en paralelo
    const [recentWorkouts, consistencyData, bodySummary] = await Promise.all([
        db
            .select({
                id: workouts.id,
                name: workouts.name,
                startTime: workouts.startTime,
                totalTimeSeconds: workouts.totalTimeSeconds,
                typeName: workoutTypes.name,
            })
            .from(workouts)
            .leftJoin(workoutTypes, eq(workouts.typeId, workoutTypes.id))
            .where(eq(workouts.userId, userId))
            .orderBy(desc(workouts.startTime))
            .limit(5),
        getConsistencyData(userId),
        getBodySummary(),
    ]);

    // Stats básicas
    const totalWorkouts = consistencyData.totalWorkouts;

    return (
        <div className="space-y-6">
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
                        <div className="text-2xl font-bold dark:text-gray-100">{totalWorkouts}</div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Días activos registrados</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Racha Actual</CardTitle>
                        <Activity className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold dark:text-gray-100">{consistencyData.currentStreak} días</div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Récord: {consistencyData.longestStreak} días</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Frecuencia Semanal</CardTitle>
                        <TrendingUp className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold dark:text-gray-100">{consistencyData.avgPerWeek} días</div>
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
                                {bodySummary.latestWeight.toFixed(1)} kg
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
                <CardHeader>
                    <CardTitle>Entrenamientos Recientes</CardTitle>
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
                        <div className="space-y-3">
                            {recentWorkouts.map((workout) => (
                                <div
                                    key={workout.id}
                                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100/80 dark:hover:bg-gray-800 transition-colors"
                                >
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-gray-100">{workout.name}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{workout.typeName}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {workout.totalTimeSeconds
                                                ? `${Math.round(workout.totalTimeSeconds / 60)} min`
                                                : 'Sin tiempo'}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {new Date(workout.startTime).toLocaleDateString('es-ES')}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}