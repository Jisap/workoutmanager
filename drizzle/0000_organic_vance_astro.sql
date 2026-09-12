CREATE TABLE "exercise_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text,
	CONSTRAINT "exercise_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "exercises" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category_id" integer,
	"is_custom" boolean DEFAULT false,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "sets" (
	"id" serial PRIMARY KEY NOT NULL,
	"workout_exercise_id" integer NOT NULL,
	"rep_count" integer,
	"weight" real,
	"distance" integer,
	"duration_seconds" integer,
	"rpe" integer,
	"is_rx" boolean DEFAULT true,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "template_exercises" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer NOT NULL,
	"exercise_id" integer NOT NULL,
	"order_index" integer NOT NULL,
	"target_reps" integer,
	"target_weight" real,
	"target_distance" integer,
	"time_cap_seconds" integer
);
--> statement-breakpoint
CREATE TABLE "workout_exercises" (
	"id" serial PRIMARY KEY NOT NULL,
	"workout_id" integer NOT NULL,
	"exercise_id" integer NOT NULL,
	"order_index" integer NOT NULL,
	"target_reps" integer,
	"target_weight" real,
	"target_distance" integer,
	"target_duration_seconds" integer
);
--> statement-breakpoint
CREATE TABLE "workout_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type_id" integer,
	"user_id" text NOT NULL,
	"source_workout_id" integer,
	"description" text,
	"is_public" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	CONSTRAINT "workout_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "workouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"template_id" integer,
	"type_id" integer NOT NULL,
	"name" text NOT NULL,
	"start_time" timestamp DEFAULT now() NOT NULL,
	"end_time" timestamp,
	"total_time_seconds" integer,
	"notes" text,
	"is_personal" boolean DEFAULT false
);
--> statement-breakpoint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_category_id_exercise_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."exercise_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sets" ADD CONSTRAINT "sets_workout_exercise_id_workout_exercises_id_fk" FOREIGN KEY ("workout_exercise_id") REFERENCES "public"."workout_exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_exercises" ADD CONSTRAINT "template_exercises_template_id_workout_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."workout_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_exercises" ADD CONSTRAINT "template_exercises_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_workout_id_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_templates" ADD CONSTRAINT "workout_templates_type_id_workout_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."workout_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_template_id_workout_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."workout_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_type_id_workout_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."workout_types"("id") ON DELETE no action ON UPDATE no action;