import { pgTable, serial, text, integer, timestamp, boolean, real } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. Tipos de Entrenamiento (Musculación, CrossFit, Hyrox, Cardio...)
export const workoutTypes = pgTable('workout_types', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
});

// 2. Categorías de Ejercicios (Pecho, Espalda, Gymnastics, Monostructural...)
export const exerciseCategories = pgTable('exercise_categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  type: text('type'), // Agrupación lógica (ej. 'Fuerza', 'Cardio')
});

// 3. Catálogo de Ejercicios
export const exercises = pgTable('exercises', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  categoryId: integer('category_id').references(() => exerciseCategories.id),
  isCustom: boolean('is_custom').default(false),
  userId: text('user_id'), // Solo si isCustom es true (Clerk ID)
});

// 4. Plantillas de Entrenamiento (Rutinas guardadas / WODs favoritos)
export const workoutTemplates = pgTable('workout_templates', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  typeId: integer('type_id').references(() => workoutTypes.id),
  userId: text('user_id').notNull(), // Clerk ID
  sourceWorkoutId: integer('source_workout_id'), // Para saber de qué entrenamiento real se copió
  description: text('description'),
  isPublic: boolean('is_public').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 5. Ejercicios dentro de una Plantilla
export const templateExercises = pgTable('template_exercises', {
  id: serial('id').primaryKey(),
  templateId: integer('template_id').references(() => workoutTemplates.id, { onDelete: 'cascade' }).notNull(),
  exerciseId: integer('exercise_id').references(() => exercises.id).notNull(),
  orderIndex: integer('order_index').notNull(),
  targetReps: integer('target_reps'),
  targetWeight: real('target_weight'),
  targetDistance: integer('target_distance'),
  timeCapSeconds: integer('time_cap_seconds'),
});

// 6. Entrenamientos Realizados (El log diario)
export const workouts = pgTable('workouts', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(), // Clerk ID
  templateId: integer('template_id').references(() => workoutTemplates.id),
  typeId: integer('type_id').references(() => workoutTypes.id).notNull(),
  name: text('name').notNull(),
  startTime: timestamp('start_time').defaultNow().notNull(),
  endTime: timestamp('end_time'),
  totalTimeSeconds: integer('total_time_seconds'),
  notes: text('notes'),
  isPersonal: boolean('is_personal').default(false),
});

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
});

// 8. Series Realizadas (El dato atómico)
export const sets = pgTable('sets', {
  id: serial('id').primaryKey(),
  workoutExerciseId: integer('workout_exercise_id').references(() => workoutExercises.id, { onDelete: 'cascade' }).notNull(),
  repCount: integer('rep_count'),
  weight: real('weight'),
  distance: integer('distance'),
  durationSeconds: integer('duration_seconds'),
  rpe: integer('rpe'),
  isRx: boolean('is_rx').default(true),
  notes: text('notes'),
});

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

// Añadir esta relación al final del archivo
export const setsRelations = relations(sets, ({ one }) => ({
  workoutExercise: one(workoutExercises, {
    fields: [sets.workoutExerciseId],
    references: [workoutExercises.id],
  }),
}));
