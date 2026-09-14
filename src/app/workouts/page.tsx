import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getWorkoutHistory, getUserTemplates } from './actions';
import { Button } from '@/components/ui/button';
import { Dumbbell, History } from 'lucide-react';
import { WorkoutHistoryClient } from './workout-history-client';

export default async function WorkoutsHistoryPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const [history, templates] = await Promise.all([
    getWorkoutHistory(userId, 200),
    getUserTemplates(userId),
  ]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <History className="w-6 h-6 text-blue-600" />
            Entrenamientos & Rutinas
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {history.length} {history.length === 1 ? 'sesión registrada' : 'sesiones registradas'} · {templates.length} {templates.length === 1 ? 'plantilla' : 'plantillas'}
          </p>
        </div>
        <Link href="/workouts/new">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Dumbbell className="w-4 h-4 mr-2" />
            Nuevo
          </Button>
        </Link>
      </div>

      {/* Client component con Pestañas: Historial & Mis Plantillas */}
      <WorkoutHistoryClient history={history} templates={templates} />
    </div>
  );
}