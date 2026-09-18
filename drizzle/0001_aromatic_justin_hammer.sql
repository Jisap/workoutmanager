CREATE TABLE "body_measurements" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"measured_at" timestamp DEFAULT now() NOT NULL,
	"weight_kg" real,
	"height_cm" real,
	"body_fat_pct" real,
	"muscle_mass_kg" real,
	"waist_cm" real,
	"chest_cm" real,
	"arm_cm" real,
	"thigh_cm" real,
	"hip_cm" real,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "exercise_categories" DROP CONSTRAINT "exercise_categories_name_unique";--> statement-breakpoint
ALTER TABLE "exercise_categories" ADD COLUMN "is_custom" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "exercise_categories" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "workout_templates" ADD COLUMN "modality" text;--> statement-breakpoint
ALTER TABLE "workout_templates" ADD COLUMN "modality_config" jsonb;--> statement-breakpoint
ALTER TABLE "workouts" ADD COLUMN "modality" text;--> statement-breakpoint
ALTER TABLE "workouts" ADD COLUMN "modality_config" jsonb;