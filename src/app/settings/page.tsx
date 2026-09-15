import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { Settings } from 'lucide-react';
import {
  getCustomExercises,
  getWorkoutTypes,
  getExerciseCategories,
  getUserStats,
} from './actions';
import { SettingsClient } from './settings-client';

export default async function SettingsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  // Obtener datos en paralelo: usuario de Clerk + datos de la BD
  const [user, customExercises, workoutTypes, categories, stats] = await Promise.all([
    currentUser(),
    getCustomExercises(userId),
    getWorkoutTypes(),
    getExerciseCategories(),
    getUserStats(userId),
  ]);

  const profile = {
    firstName: user?.firstName ?? null,
    lastName: user?.lastName ?? null,
    email: user?.emailAddresses?.[0]?.emailAddress ?? '',
    imageUrl: user?.imageUrl ?? '',
    totalWorkouts: stats.totalWorkouts,
    customExercises: stats.customExercises,
    memberSince: stats.memberSince,
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 dark:text-gray-100">
          <Settings className="w-6 h-6 text-blue-600" />
          Configuración
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Gestiona tu perfil, objetivos y preferencias de la aplicación
        </p>
      </div>

      {/* Client sections */}
      <SettingsClient
        profile={profile}
        customExercises={customExercises}
        workoutTypes={workoutTypes}
        categories={categories}
      />
    </div>
  );
}
