import { db } from '@/lib/db';
import { workouts, workoutTypes } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Dumbbell, TrendingUp, Plus } from 'lucide-react';

export default async function DashboardPage() {
    const { userId } = await auth();

    if (!userId) {
        return <div>No autenticado</div>;
    }

    // Obtener últimos entrenamientos
    const recentWorkouts = await db
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
        .limit(5);

    // Stats básicas
    const totalWorkouts = recentWorkouts.length;
    const totalTime = recentWorkouts.reduce((acc, w) => acc + (w.totalTimeSeconds || 0), 0);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
                    <p className="text-gray-600 mt-1">Bienvenido de vuelta a tu entrenamiento</p>
                </div>
                <Link href="/workouts/new">
                    <Button className="flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Nuevo Entrenamiento
                    </Button>
                </Link>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Entrenamientos Recientes</CardTitle>
                        <Dumbbell className="w-4 h-4 text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalWorkouts}</div>
                        <p className="text-xs text-gray-500 mt-1">Últimos 5 sesiones</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Tiempo Total</CardTitle>
                        <Calendar className="w-4 h-4 text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{Math.round(totalTime / 60)} min</div>
                        <p className="text-xs text-gray-500 mt-1">En las últimas sesiones</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Progreso</CardTitle>
                        <TrendingUp className="w-4 h-4 text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">+12%</div>
                        <p className="text-xs text-gray-500 mt-1">vs mes anterior</p>
                    </CardContent>
                </Card>
            </div>

            {/* Últimos Entrenamientos */}
            <Card>
                <CardHeader>
                    <CardTitle>Entrenamientos Recientes</CardTitle>
                </CardHeader>
                <CardContent>
                    {recentWorkouts.length === 0 ? (
                        <div className="text-center py-8 space-y-3">
                            <p className="text-gray-500">
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
                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                >
                                    <div>
                                        <p className="font-medium text-gray-900">{workout.name}</p>
                                        <p className="text-sm text-gray-500">{workout.typeName}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-gray-900">
                                            {workout.totalTimeSeconds
                                                ? `${Math.round(workout.totalTimeSeconds / 60)} min`
                                                : 'Sin tiempo'}
                                        </p>
                                        <p className="text-xs text-gray-500">
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