import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getWorkoutHistory } from './actions';
import { Button } from '@/components/ui/button';
import { Dumbbell, History } from 'lucide-react';
import { WorkoutHistoryClient } from './workout-history-client';

export default async function WorkoutsHistoryPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const history = await getWorkoutHistory(userId, 200);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <History className="w-6 h-6 text-blue-600" />
            Historial de Entrenamientos
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {history.length} {history.length === 1 ? 'entrenamiento registrado' : 'entrenamientos registrados'}
          </p>
        </div>
        <Link href="/workouts/new">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Dumbbell className="w-4 h-4 mr-2" />
            Nuevo
          </Button>
        </Link>
      </div>

      {/* Client component: search, filter, grouped list, modal */}
      <WorkoutHistoryClient history={history} />
    </div>
  );
}