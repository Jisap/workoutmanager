// Helpers compartidos del historial de entrenamientos.
//
// Los usan tanto la vista principal (workout-history-client.tsx) como los
// modales diferidos (history-modals.tsx). Vivir en este módulo hoja evita
// ciclos de importación entre ambos (el import del tipo es solo de tipos y
// se borra al compilar).
import { Activity, BarChart2, Dumbbell, Flame, Heart, Zap } from 'lucide-react';
import { formatDurationInput, parseDurationInput } from '@/lib/duration';
import type { WorkoutHistoryItem } from './workout-history-client';

export function getTypeStyle(typeName: string): {
  badge: string;
  icon: React.ElementType;
  bar: string;
} {
  const lower = typeName.toLowerCase();
  if (lower.includes('muscu') || lower.includes('fuerza') || lower.includes('gym') || lower.includes('pierna') || lower.includes('leg'))
    return { badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800', icon: Dumbbell, bar: 'bg-blue-500' };
  if (lower.includes('crossfit') || lower.includes('wod') || lower.includes('funcional'))
    return { badge: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800', icon: Zap, bar: 'bg-orange-500' };
  if (lower.includes('cardio') || lower.includes('correr') || lower.includes('run'))
    return { badge: 'bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-300 border-pink-200 dark:border-pink-800', icon: Heart, bar: 'bg-pink-500' };
  if (lower.includes('hyrox') || lower.includes('hybrid'))
    return { badge: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800', icon: Flame, bar: 'bg-purple-500' };
  if (lower.includes('yoga') || lower.includes('stretch') || lower.includes('movilidad'))
    return { badge: 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800', icon: Activity, bar: 'bg-teal-500' };
  return { badge: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700', icon: BarChart2, bar: 'bg-gray-400' };
}

export function isWorkoutSavedAsTemplate(workout: WorkoutHistoryItem): boolean {
  return !!workout.savedAsTemplate || workout.templateId != null;
}

// En el historial el vacío se muestra como '—' (el logger usa '' para inputs).
export function formatMMSS(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null) return '—';
  return formatDurationInput(totalSeconds) || '—';
}

export const parseMMSS = parseDurationInput;

export function isRunExerciseName(name: string): boolean {
  const n = name.toLowerCase();
  return (
    n.includes('run') ||
    n.includes('correr') ||
    n.includes('carrera') ||
    n.includes('running') ||
    n.includes('1000m')
  );
}

export type ExerciseDetailItem = {
  name: string;
  setsCount: number;
  maxWeight: number;
  sets?: {
    setNumber: number;
    weight: number | null;
    repCount: number | null;
    distance?: number | null;
    durationSeconds?: number | null;
    calories?: number | null;
  }[];
  repsSummary?: string;
};
