CREATE INDEX "body_measurements_user_id_idx" ON "body_measurements" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "body_measurements_user_id_measured_at_idx" ON "body_measurements" USING btree ("user_id","measured_at");--> statement-breakpoint
CREATE INDEX "exercise_categories_user_id_idx" ON "exercise_categories" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "exercises_user_id_idx" ON "exercises" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "exercises_category_id_idx" ON "exercises" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "sets_workout_exercise_id_idx" ON "sets" USING btree ("workout_exercise_id");--> statement-breakpoint
CREATE INDEX "template_exercises_template_id_idx" ON "template_exercises" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "workout_exercises_workout_id_idx" ON "workout_exercises" USING btree ("workout_id");--> statement-breakpoint
CREATE INDEX "workout_exercises_exercise_id_idx" ON "workout_exercises" USING btree ("exercise_id");--> statement-breakpoint
CREATE INDEX "workout_templates_user_id_idx" ON "workout_templates" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "workout_templates_source_workout_id_idx" ON "workout_templates" USING btree ("source_workout_id");--> statement-breakpoint
CREATE INDEX "workouts_user_id_idx" ON "workouts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "workouts_user_id_start_time_idx" ON "workouts" USING btree ("user_id","start_time");--> statement-breakpoint
CREATE INDEX "workouts_type_id_idx" ON "workouts" USING btree ("type_id");