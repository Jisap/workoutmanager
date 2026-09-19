import type { ModalityConfig } from './db/schema';
import { MODALITIES, isModality } from './db/schema';
import type { Modality } from './db/schema';

export { MODALITIES, isModality };
export type { Modality, ModalityConfig };

export function normalizeModality(value: string | null | undefined): Modality | null {
  return isModality(value) ? value : null;
}

// ─── Entidades compartidas cliente/servidor ───
export interface AvailableExercise {
  id: number;
  name: string;
  categoryId: number | null;
  categoryName?: string;
  // Tipo de la categoría ('Fuerza' | 'Cardio' | ...). Define el perfil de
  // métricas del ejercicio en el logger (cardio -> distancia/tiempo).
  categoryType?: string | null;
  sessionCount?: number;
}

export interface Category {
  id: number;
  name: string;
}

export interface WorkoutTypeOption {
  id: number;
  name: string;
}

// Serie tal como se persiste (sin id de UI ni flags locales)
export interface PersistedSetInput {
  repCount: number;
  weight: number | null;
  distance: number | null;
  durationSeconds: number | null;
  calories: number | null;
  rpe: number | null;
  isRx: boolean;
}

export interface PersistedExerciseInput {
  exerciseId: number;
  orderIndex: number;
  sets: PersistedSetInput[];
}

export interface SaveWorkoutInput {
  workoutId?: number | null;
  typeId: number;
  name: string;
  modality?: Modality | string | null;
  modalityConfig?: ModalityConfig | null;
  totalTimeSeconds: number;
  notes: string;
  exercises: PersistedExerciseInput[];
}

export interface TemplateSourceWorkoutSet {
  repCount: number | null;
  weight: number | null;
  distance: number | null;
  durationSeconds: number | null;
  calories: number | null;
}

export interface TemplateSourceWorkout {
  id: number;
  exercises: {
    exerciseId: number;
    exercise: { name: string };
    sets: TemplateSourceWorkoutSet[];
  }[];
}
