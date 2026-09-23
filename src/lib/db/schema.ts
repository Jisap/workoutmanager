import { pgTable, serial, text, integer, timestamp, boolean, real, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// ─── Modalidades soportadas (única fuente de verdad a nivel DB) ───
export const MODALITIES = [
  'For Time',
  'AMRAP',
  'EMOM',
  'AFAP',
  'TABATA',
  'HIIT',
  'Chipper',
  'Ladder',
] as const;

export type Modality = (typeof MODALITIES)[number];

export function isModality(value: unknown): value is Modality {
  return typeof value === 'string' && (MODALITIES as readonly string[]).includes(value);
}

export interface ModalityConfig {
  timeCapMinutes?: number;
  timeCapSeconds?: number;
  // EMOM
  intervalMinutes?: number; // 1 = Every 1 min (EMOM), 2 = Every 2 min (E2MOM), etc.
  totalMinutes?: number;
  // EMOM con varios ejercicios: shared = todos cada minuto (Min N juntos),
  // alternate = impar/par repartidos.
  emomMode?: 'shared' | 'alternate';
  // TABATA & HIIT
  workSeconds?: number;
  restSeconds?: number;
  rounds?: number;
  sets?: number;
  restBetweenSetsSeconds?: number;
  // Ladder
  repScheme?: string; // e.g. "21-15-9" or "10 to 1"
  // Score de AMRAP/EMOM (rondas completas + reps extra de la última ronda)
  scoreRounds?: number;
  scoreReps?: number;
  notes?: string;
}

// 1. Tipos de Entrenamiento (Musculación, CrossFit, Hyrox, Cardio...)
export const workoutTypes = pgTable('workout_types', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
});

// 2. Categorías de Ejercicios (Pecho, Espalda, Gymnastics, Monostructural...)
export const exerciseCategories = pgTable('exercise_categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type'), // Agrupación lógica (ej. 'Fuerza', 'Cardio', 'Funcional')
  isCustom: boolean('is_custom').default(false),
  userId: text('user_id'), // Solo si isCustom es true (Clerk ID)
}, (t) => [
  index('exercise_categories_user_id_idx').on(t.userId),
]);

// 3. Catálogo de Ejercicios
export const exercises = pgTable('exercises', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  categoryId: integer('category_id').references(() => exerciseCategories.id),
  isCustom: boolean('is_custom').default(false),
  userId: text('user_id'), // Solo si isCustom es true (Clerk ID)
}, (t) => [
  index('exercises_user_id_idx').on(t.userId),
  index('exercises_category_id_idx').on(t.categoryId),
]);

// 4. Plantillas de Entrenamiento (Rutinas guardadas / WODs favoritos)
export const workoutTemplates = pgTable('workout_templates', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  typeId: integer('type_id').references(() => workoutTypes.id),
  userId: text('user_id').notNull(), // Clerk ID
  sourceWorkoutId: integer('source_workout_id'), // Para saber de qué entrenamiento real se copió
  description: text('description'),
  modality: text('modality'), // AMRAP, For Time, EMOM, AFAP, TABATA, HIIT / Intervalos, Chipper, Ladder...
  modalityConfig: jsonb('modality_config').$type<ModalityConfig>(),
  isPublic: boolean('is_public').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('workout_templates_user_id_idx').on(t.userId),
  index('workout_templates_source_workout_id_idx').on(t.sourceWorkoutId),
]);

// 5. Ejercicios dentro de una Plantilla
// NOTA: la propiedad TS se llama `targetDurationSeconds` para unificar el
// vocabulario con `workoutExercises.targetDurationSeconds`. La columna SQL
// sigue siendo `time_cap_seconds` (sin migración necesaria).
export const templateExercises = pgTable('template_exercises', {
  id: serial('id').primaryKey(),
  templateId: integer('template_id').references(() => workoutTemplates.id, { onDelete: 'cascade' }).notNull(),
  exerciseId: integer('exercise_id').references(() => exercises.id).notNull(),
  orderIndex: integer('order_index').notNull(),
  targetReps: integer('target_reps'),
  targetWeight: real('target_weight'),
  targetDistance: integer('target_distance'),
  targetCalories: real('target_calories'),
  targetDurationSeconds: integer('time_cap_seconds'),
}, (t) => [
  index('template_exercises_template_id_idx').on(t.templateId),
]);

// 6. Entrenamientos Realizados (El log diario)
export const workouts = pgTable('workouts', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(), // Clerk ID
  templateId: integer('template_id').references(() => workoutTemplates.id),
  typeId: integer('type_id').references(() => workoutTypes.id).notNull(),
  name: text('name').notNull(),
  modality: text('modality'), // AMRAP, For Time, EMOM, AFAP, TABATA, HIIT / Intervalos, Chipper, Ladder...
  modalityConfig: jsonb('modality_config').$type<ModalityConfig>(),
  startTime: timestamp('start_time').defaultNow().notNull(),
  endTime: timestamp('end_time'),
  totalTimeSeconds: integer('total_time_seconds'),
  notes: text('notes'),
  isPersonal: boolean('is_personal').default(false),
}, (t) => [
  index('workouts_user_id_idx').on(t.userId),
  index('workouts_user_id_start_time_idx').on(t.userId, t.startTime),
  index('workouts_type_id_idx').on(t.typeId),
  // Unicidad de nombre por usuario (insensible a mayúsculas).
  // El código además uniquifica en app; este índice es la garantía final
  // frente a carreras entre pestañas/dispositivos.
  uniqueIndex('workouts_user_id_lower_name_uniq').on(t.userId, sql`lower(${t.name})`),
]);

// 7. Ejercicios dentro de un Entrenamiento Realizado
export const workoutExercises = pgTable('workout_exercises', {
  id: serial('id').primaryKey(),
  workoutId: integer('workout_id').references(() => workouts.id, { onDelete: 'cascade' }).notNull(),
  exerciseId: integer('exercise_id').references(() => exercises.id).notNull(),
  orderIndex: integer('order_index').notNull(),
  targetReps: integer('target_reps'),
  targetWeight: real('target_weight'),
  targetDistance: integer('target_distance'),
  targetDurationSeconds: integer('target_duration_seconds'),
}, (t) => [
  index('workout_exercises_workout_id_idx').on(t.workoutId),
  index('workout_exercises_exercise_id_idx').on(t.exerciseId),
]);

// 8. Series Realizadas (El dato atómico)
export const sets = pgTable('sets', {
  id: serial('id').primaryKey(),
  workoutExerciseId: integer('workout_exercise_id').references(() => workoutExercises.id, { onDelete: 'cascade' }).notNull(),
  repCount: integer('rep_count'),
  weight: real('weight'),
  distance: integer('distance'),
  durationSeconds: integer('duration_seconds'),
  calories: real('calories'),
  rpe: integer('rpe'),
  isRx: boolean('is_rx').default(true),
  notes: text('notes'),
}, (t) => [
  index('sets_workout_exercise_id_idx').on(t.workoutExerciseId),
]);

// 9. Mediciones Corporales (seguimiento voluntario: peso, composición y perímetros)
export const bodyMeasurements = pgTable('body_measurements', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(), // Clerk ID
  measuredAt: timestamp('measured_at').defaultNow().notNull(),
  weightKg: real('weight_kg'),
  heightCm: real('height_cm'),
  bodyFatPct: real('body_fat_pct'),
  muscleMassKg: real('muscle_mass_kg'),
  waistCm: real('waist_cm'),
  chestCm: real('chest_cm'),
  armCm: real('arm_cm'),
  thighCm: real('thigh_cm'),
  hipCm: real('hip_cm'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('body_measurements_user_id_idx').on(t.userId),
  index('body_measurements_user_id_measured_at_idx').on(t.userId, t.measuredAt),
]);

// --- RELACIONES (Para que Drizzle pueda hacer joins fácilmente) ---
export const workoutsRelations = relations(workouts, ({ one, many }) => ({
  type: one(workoutTypes, { fields: [workouts.typeId], references: [workoutTypes.id] }),
  template: one(workoutTemplates, { fields: [workouts.templateId], references: [workoutTemplates.id] }),
  exercises: many(workoutExercises),
}));

export const workoutExercisesRelations = relations(workoutExercises, ({ one, many }) => ({
  workout: one(workouts, { fields: [workoutExercises.workoutId], references: [workouts.id] }),
  exercise: one(exercises, { fields: [workoutExercises.exerciseId], references: [exercises.id] }),
  sets: many(sets),
}));

export const workoutTemplatesRelations = relations(workoutTemplates, ({ one, many }) => ({
  type: one(workoutTypes, { fields: [workoutTemplates.typeId], references: [workoutTypes.id] }),
  exercises: many(templateExercises),
}));

export const templateExercisesRelations = relations(templateExercises, ({ one }) => ({
  template: one(workoutTemplates, { fields: [templateExercises.templateId], references: [workoutTemplates.id] }),
  exercise: one(exercises, { fields: [templateExercises.exerciseId], references: [exercises.id] }),
}));

export const exercisesRelations = relations(exercises, ({ one }) => ({
  category: one(exerciseCategories, { fields: [exercises.categoryId], references: [exerciseCategories.id] }),
}));

export const exerciseCategoriesRelations = relations(exerciseCategories, ({ many }) => ({
  exercises: many(exercises),
}));

export const setsRelations = relations(sets, ({ one }) => ({
  workoutExercise: one(workoutExercises, {
    fields: [sets.workoutExerciseId],
    references: [workoutExercises.id],
  }),
}));
