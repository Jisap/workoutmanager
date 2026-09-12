import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { workoutTypes, workoutTemplates, workouts } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Dumbbell, Copy, Clock } from 'lucide-react';

export default async function NewWorkoutPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  // 1. Obtener tipos de entrenamiento disponibles
  const types = await db.select().from(workoutTypes);

  // 2. Obtener plantillas del usuario
  const templates = await db
    .select()
    .from(workoutTemplates)
    .where(eq(workoutTemplates.userId, userId))
    .orderBy(desc(workoutTemplates.createdAt))
    .limit(5);

  // 3. Obtener el último entrenamiento realizado (para "Repetir")
  const lastWorkout = await db
    .select()
    .from(workouts)
    .where(eq(workouts.userId, userId))
    .orderBy(desc(workouts.startTime))
    .limit(1)
    .then((res) => res[0] || null);

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24">
      {/* Header con volver */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nuevo Entrenamiento</h1>
          <p className="text-sm text-gray-500">¿Qué vas a entrenar hoy?</p>
        </div>
      </div>

      {/* Opción A: Repetir último (Si existe) */}
      {lastWorkout && (
        <Link href={`/workouts/log?mode=repeat&workoutId=${lastWorkout.id}`}>
          <Card className="hover:bg-gray-50 transition-colors border-blue-200 bg-blue-50/50 cursor-pointer">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                <Clock className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Repetir último entrenamiento</p>
                <p className="text-sm text-gray-600">{lastWorkout.name}</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Opción B: Plantillas Guardadas */}
      {templates.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Mis Rutinas Guardadas
          </h2>
          <div className="grid gap-3">
            {templates.map((template) => (
              <Link key={template.id} href={`/workouts/log?mode=template&templateId=${template.id}`}>
                <Card className="hover:bg-gray-50 transition-colors cursor-pointer">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="p-3 bg-purple-100 rounded-full text-purple-600">
                      <Copy className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{template.name}</p>
                      <p className="text-sm text-gray-600">
                        {template.description || 'Rutina personalizada'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Opción C: Empezar desde cero (Entrenamiento Libre) */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          Entrenamiento Libre
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {types.map((type) => (
            <Link key={type.id} href={`/workouts/log?mode=free&typeId=${type.id}`}>
              <Card className="hover:bg-gray-50 transition-colors cursor-pointer h-full">
                <CardContent className="flex flex-col items-center text-center p-6 gap-3">
                  <div className="p-3 bg-gray-100 rounded-full text-gray-700">
                    <Dumbbell className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{type.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{type.description}</p>
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
