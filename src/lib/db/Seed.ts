import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

import { db } from './index';
import { workoutTypes, exerciseCategories, exercises } from './schema';
import { eq, isNull } from 'drizzle-orm';

async function seed() {
    console.log('🌱 Sembrando base de datos con catálogo completo...');

    // 1. Tipos de Entrenamiento
    const types = await db.insert(workoutTypes).values([
        { name: 'Musculación', description: 'Hipertrofia y fuerza tradicional' },
        { name: 'CrossFit', description: 'WODs, gimnasia y levantamiento olímpico' },
        { name: 'Hyrox', description: 'Carreras mixtas y estaciones funcionales' },
        { name: 'Cardio / Endurance', description: 'Running, cycling, remo continuo' },
        { name: 'Funcional', description: 'Movimientos corporales y kettlebells' },
        { name: 'Powerlifting', description: 'Sentadilla, Press Banca, Peso Muerto' },
        { name: 'Calistenia', description: 'Ejercicios con peso corporal' },
    ]).onConflictDoNothing().returning();
    console.log(`✅ ${types.length} tipos de entrenamiento procesados.`);

    // 2. Categorías de Ejercicios (idempotente: solo crea las globales que faltan;
    // un simple onConflictDoNothing no basta porque `name` no tiene constraint único
    // y cada ejecución duplicaría las categorías)
    const seedCategories = [
        // Fuerza / Musculación
        { name: 'Pecho', type: 'Fuerza' },
        { name: 'Espalda', type: 'Fuerza' },
        { name: 'Piernas', type: 'Fuerza' },
        { name: 'Gluteos', type: 'Fuerza' },
        { name: 'Hombros', type: 'Fuerza' },
        { name: 'Brazos', type: 'Fuerza' },
        { name: 'Core', type: 'Fuerza' },

        // CrossFit / Funcional
        { name: 'Gymnastics', type: 'CrossFit' },
        { name: 'Weightlifting', type: 'CrossFit' },
        { name: 'Dumbbell', type: 'CrossFit' },
        { name: 'Monostructural', type: 'Cardio' },
        { name: 'Kettlebell', type: 'Funcional' },
        { name: 'Strongman', type: 'Funcional' },

        // Cardio
        { name: 'Running', type: 'Cardio' },
        { name: 'Cycling', type: 'Cardio' },
        { name: 'Rowing', type: 'Cardio' },
    ];
    const existingGlobalCategories = await db.select().from(exerciseCategories).where(isNull(exerciseCategories.userId));
    const missingCategories = seedCategories.filter(sc => !existingGlobalCategories.some(ec => ec.name === sc.name));
    if (missingCategories.length > 0) {
        await db.insert(exerciseCategories).values(missingCategories);
        console.log(`✅ ${missingCategories.length} categorías nuevas creadas.`);
    }
    // Sincronizar el `type` si el seed lo cambió (solo globales; las del usuario no se tocan)
    for (const sc of seedCategories) {
        const current = existingGlobalCategories.find(ec => ec.name === sc.name);
        if (current && (current.type ?? null) !== sc.type) {
            await db.update(exerciseCategories).set({ type: sc.type }).where(eq(exerciseCategories.id, current.id));
            console.log(`🔄 Categoría '${sc.name}': type '${current.type}' -> '${sc.type}'.`);
        }
    }

    // Obtener TODAS las categorías de la base de datos (tanto nuevas como existentes)
    const allCategories = await db.select().from(exerciseCategories);
    console.log(`✅ ${allCategories.length} categorías cargadas.`);

    // Helper para obtener IDs
    const getId = (name: string) => allCategories.find(c => c.name === name)?.id;

    // 3. Catálogo Completo de Ejercicios
    const allExercises = [
        // === PECHO ===
        { name: 'Press de Banca con Barra', categoryId: getId('Pecho') },
        { name: 'Press de Banca con Mancuernas', categoryId: getId('Pecho') },
        { name: 'Press Inclinado con Barra', categoryId: getId('Pecho') },
        { name: 'Press Inclinado con Mancuernas', categoryId: getId('Pecho') },
        { name: 'Aperturas con Mancuernas', categoryId: getId('Pecho') },
        { name: 'Fondos en Paralelas', categoryId: getId('Pecho') },
        { name: 'Press de Pecho en Máquina', categoryId: getId('Pecho') },
        { name: 'Crossover en Polea', categoryId: getId('Pecho') },
        { name: 'Press Declinado con Barra', categoryId: getId('Pecho') },
        { name: 'Press con Agarre Estrecho', categoryId: getId('Pecho') },

        // === ESPALDA ===
        { name: 'Dominadas (Pull-ups)', categoryId: getId('Espalda') },
        { name: 'Dominadas con Lastre', categoryId: getId('Espalda') },
        { name: 'Jalón al Pecho', categoryId: getId('Espalda') },
        { name: 'Remo con Barra', categoryId: getId('Espalda') },
        { name: 'Remo con Mancuerna', categoryId: getId('Espalda') },
        { name: 'Remo en Polea Baja', categoryId: getId('Espalda') },
        { name: 'Peso Muerto', categoryId: getId('Espalda') },
        { name: 'Peso Muerto Sumo', categoryId: getId('Espalda') },
        { name: 'Peso Muerto con Trap Bar', categoryId: getId('Espalda') },
        { name: 'Pull-overs', categoryId: getId('Espalda') },
        { name: 'Remo T-Bar', categoryId: getId('Espalda') },
        { name: 'Dominadas Supinas', categoryId: getId('Espalda') },

        // === PIERNAS ===
        { name: 'Sentadilla Trasera', categoryId: getId('Piernas') },
        { name: 'Sentadilla Frontal', categoryId: getId('Piernas') },
        { name: 'Prensa de Piernas', categoryId: getId('Piernas') },
        { name: 'Zancadas', categoryId: getId('Piernas') },
        { name: 'Peso Muerto Rumano', categoryId: getId('Piernas') },
        { name: 'Curl Femoral', categoryId: getId('Piernas') },
        { name: 'Extensión de Cuádriceps', categoryId: getId('Piernas') },
        { name: 'Elevación de Gemelos', categoryId: getId('Piernas') },
        { name: 'Hip Thrust', categoryId: getId('Piernas') },
        { name: 'Bulgarian Split Squat', categoryId: getId('Piernas') },
        { name: 'Sentadilla Búlgara', categoryId: getId('Piernas') },
        { name: 'Sentadilla Cosaca', categoryId: getId('Piernas') },
        { name: 'Sentadilla Hack', categoryId: getId('Piernas') },
        { name: 'Sentadilla Overhead con Mancuerna', categoryId: getId('Piernas') },

        // === HOMBROS ===
        { name: 'Press Militar con Barra', categoryId: getId('Hombros') },
        { name: 'Press Militar con Mancuernas', categoryId: getId('Hombros') },
        { name: 'Press de Hombros en Máquina', categoryId: getId('Hombros') },
        { name: 'Elevaciones Laterales', categoryId: getId('Hombros') },
        { name: 'Elevaciones Frontales', categoryId: getId('Hombros') },
        { name: 'Pájaros (Rear Delt Fly)', categoryId: getId('Hombros') },
        { name: 'Face Pull', categoryId: getId('Hombros') },
        { name: 'Push Press con Mancuernas', categoryId: getId('Hombros') },
        { name: 'Press Arnold', categoryId: getId('Hombros') },

        // === BRAZOS ===
        { name: 'Curl de Bíceps con Barra', categoryId: getId('Brazos') },
        { name: 'Curl de Bíceps con Mancuernas', categoryId: getId('Brazos') },
        { name: 'Curl Martillo', categoryId: getId('Brazos') },
        { name: 'Press Francés', categoryId: getId('Brazos') },
        { name: 'Extensiones de Tríceps en Polea', categoryId: getId('Brazos') },
        { name: 'Fondos en Banco', categoryId: getId('Brazos') },
        { name: 'Curl Concentrado con Mancuerna', categoryId: getId('Brazos') },
        { name: 'Curl de Bíceps en Banco Scott', categoryId: getId('Brazos') },
        { name: 'Patada de Tríceps con Mancuerna', categoryId: getId('Brazos') },

        // === CORE ===
        { name: 'Crunch en Máquina', categoryId: getId('Core') },
        { name: 'Plancha', categoryId: getId('Core') },
        { name: 'Plancha Lateral', categoryId: getId('Core') },
        { name: 'Russian Twist', categoryId: getId('Core') },
        { name: 'Elevación de Piernas Colgado', categoryId: getId('Core') },
        { name: 'Elevación de Rodillas Colgado', categoryId: getId('Core') },
        { name: 'Hollow Rocks', categoryId: getId('Core') },
        { name: 'Superman Hold', categoryId: getId('Core') },
        { name: 'Ab Wheel Rollout', categoryId: getId('Core') },

        // === GYMNASTICS (CrossFit) ===
        { name: 'Toes to Bar', categoryId: getId('Gymnastics') },
        { name: 'Kipping Pull-ups', categoryId: getId('Gymnastics') },
        { name: 'Strict Pull-ups', categoryId: getId('Gymnastics') },
        { name: 'Jumping Pull-ups', categoryId: getId('Gymnastics') },
        { name: 'Chest to Bar Pull-ups', categoryId: getId('Gymnastics') },
        { name: 'Muscle-ups', categoryId: getId('Gymnastics') },
        { name: 'Bar Muscle-ups', categoryId: getId('Gymnastics') },
        { name: 'Ring Muscle-ups', categoryId: getId('Gymnastics') },
        { name: 'Handstand Push-ups', categoryId: getId('Gymnastics') },
        { name: 'Handstand Walk', categoryId: getId('Gymnastics') },
        { name: 'Handstand Hold', categoryId: getId('Gymnastics') },
        { name: 'Pistol Squats', categoryId: getId('Gymnastics') },
        { name: 'Box Jumps', categoryId: getId('Gymnastics') },
        { name: 'Box Jump Over', categoryId: getId('Gymnastics') },
        { name: 'Box Step-ups', categoryId: getId('Gymnastics') },
        { name: 'Burpees', categoryId: getId('Gymnastics') },
        { name: 'Double-unders', categoryId: getId('Gymnastics') },
        { name: 'Triple-unders', categoryId: getId('Gymnastics') },
        { name: 'Saltos Simples de Comba', categoryId: getId('Gymnastics') },
        { name: 'Push-ups (Flexiones)', categoryId: getId('Gymnastics') },
        { name: 'Flexiones con Palmada', categoryId: getId('Gymnastics') },
        { name: 'Flexiones Diamante', categoryId: getId('Gymnastics') },
        { name: 'Flexiones Pike', categoryId: getId('Gymnastics') },
        { name: 'Air Squats (Sentadilla al aire)', categoryId: getId('Gymnastics') },
        { name: 'Sit-ups (Abdominales)', categoryId: getId('Gymnastics') },
        { name: 'Abdominales en AbMat', categoryId: getId('Gymnastics') },
        { name: 'Knees to Elbows', categoryId: getId('Gymnastics') },
        { name: 'V-ups', categoryId: getId('Gymnastics') },
        { name: 'Ring Dips (Fondos en anillas)', categoryId: getId('Gymnastics') },
        { name: 'Ring Dips con Lastre', categoryId: getId('Gymnastics') },
        { name: 'Rope Climb (Subida de cuerda)', categoryId: getId('Gymnastics') },
        { name: 'Legless Rope Climb', categoryId: getId('Gymnastics') },
        { name: 'GHD Sit-ups', categoryId: getId('Gymnastics') },
        { name: 'GHD Back Extension', categoryId: getId('Gymnastics') },
        { name: 'Hiperextensiones (Back Extension)', categoryId: getId('Gymnastics') },
        { name: 'L-Sit', categoryId: getId('Gymnastics') },
        { name: 'Front Lever', categoryId: getId('Gymnastics') },
        { name: 'Back Lever', categoryId: getId('Gymnastics') },
        // NOTA: no se añaden variantes 'Burpee X' (Burpee Broad Jump, Box Jump Over...):
        // los WODs resuelven 'burpee' en singular y cualquier 'Burpee ...' ordenaría
        // antes que 'Burpees' y robaría el mapeo (Kalsu, Filthy Fifty).

        // === WEIGHTLIFTING (CrossFit) ===
        { name: 'Snatch', categoryId: getId('Weightlifting') },
        { name: 'Clean and Jerk', categoryId: getId('Weightlifting') },
        { name: 'Power Clean', categoryId: getId('Weightlifting') },
        { name: 'Power Snatch', categoryId: getId('Weightlifting') },
        { name: 'Thrusters', categoryId: getId('Weightlifting') },
        { name: 'Wall Balls', categoryId: getId('Weightlifting') },
        { name: 'Cluster', categoryId: getId('Weightlifting') },
        { name: 'Push Jerk', categoryId: getId('Weightlifting') },
        { name: 'Split Jerk', categoryId: getId('Weightlifting') },
        { name: 'Push Press', categoryId: getId('Weightlifting') },
        { name: 'Hang Power Clean', categoryId: getId('Weightlifting') },
        { name: 'Squat Clean', categoryId: getId('Weightlifting') },
        { name: 'Cargada Colgada (Hang Clean)', categoryId: getId('Weightlifting') },
        { name: 'Power Clean desde Bloques', categoryId: getId('Weightlifting') },
        { name: 'Overhead Squat', categoryId: getId('Weightlifting') },
        { name: 'Snatch Balance', categoryId: getId('Weightlifting') },
        { name: 'Muscle Snatch', categoryId: getId('Weightlifting') },
        { name: 'Snatch Pull (Tirón de Arrancada)', categoryId: getId('Weightlifting') },
        { name: 'Clean Pull (Tirón de Cargada)', categoryId: getId('Weightlifting') },
        { name: 'Arrancada Colgada (Hang Snatch)', categoryId: getId('Weightlifting') },
        { name: 'Sumo Deadlift High Pull', categoryId: getId('Weightlifting') },
        // NOTA: no 'Hang Power Snatch' ni variantes con 'Thruster' en singular:
        // contienen la primera query de Isabel/Randy ('power snatch') y Fran
        // ('thruster') y ordenarían antes que el objetivo actual.

        // === DUMBBELL (CrossFit) ===
        { name: 'Dumbbell Snatch', categoryId: getId('Dumbbell') },
        { name: 'Dumbbell Clean', categoryId: getId('Dumbbell') },
        { name: 'Dos Tiempos con Mancuernas', categoryId: getId('Dumbbell') },
        { name: 'Thrusters con Mancuernas', categoryId: getId('Dumbbell') },
        { name: 'Devil Press', categoryId: getId('Dumbbell') },
        { name: 'Dumbbell Box Step-up', categoryId: getId('Dumbbell') },
        { name: 'Zancadas con Mancuernas', categoryId: getId('Dumbbell') },
        { name: 'Sentadilla Goblet con Mancuerna', categoryId: getId('Dumbbell') },
        { name: 'Arrancada con Mancuerna', categoryId: getId('Dumbbell') },

        // === MONOSTRUCTURAL (Cardio) ===
        { name: 'Running (1000m)', categoryId: getId('Monostructural') },
        { name: 'Running (400m)', categoryId: getId('Monostructural') },
        { name: 'Running (200m)', categoryId: getId('Monostructural') },
        { name: 'Running (100m)', categoryId: getId('Monostructural') },
        { name: 'Running (800m)', categoryId: getId('Monostructural') },
        { name: 'Running (1600m)', categoryId: getId('Monostructural') },
        { name: 'Running (5000m)', categoryId: getId('Monostructural') },
        { name: 'Running en Cinta', categoryId: getId('Monostructural') },
        { name: 'Shuttle Run', categoryId: getId('Monostructural') },
        { name: 'Remo (500m)', categoryId: getId('Monostructural') },
        { name: 'Remo (1000m)', categoryId: getId('Monostructural') },
        { name: 'Remo (2000m)', categoryId: getId('Monostructural') },
        { name: 'Remo (5000m)', categoryId: getId('Monostructural') },
        { name: 'Remo (Calorías)', categoryId: getId('Monostructural') },
        { name: 'SkiErg (500m)', categoryId: getId('Monostructural') },
        { name: 'SkiErg (1000m)', categoryId: getId('Monostructural') },
        { name: 'SkiErg (2000m)', categoryId: getId('Monostructural') },
        { name: 'Bike (Calorías)', categoryId: getId('Monostructural') },
        { name: 'Assault Bike (Calorías)', categoryId: getId('Monostructural') },
        { name: 'Echo Bike (Calorías)', categoryId: getId('Monostructural') },

        // === KETTLEBELL ===
        { name: 'Kettlebell Swing', categoryId: getId('Kettlebell') },
        { name: 'Kettlebell Swing Americano', categoryId: getId('Kettlebell') },
        { name: 'Kettlebell Goblet Squat', categoryId: getId('Kettlebell') },
        { name: 'Kettlebell Front Squat', categoryId: getId('Kettlebell') },
        { name: 'Turkish Get-up', categoryId: getId('Kettlebell') },
        { name: 'Kettlebell Snatch', categoryId: getId('Kettlebell') },
        { name: 'Kettlebell Clean', categoryId: getId('Kettlebell') },
        { name: 'Kettlebell Clean and Jerk', categoryId: getId('Kettlebell') },
        { name: 'Kettlebell Strict Press', categoryId: getId('Kettlebell') },
        { name: 'Kettlebell Deadlift', categoryId: getId('Kettlebell') },

        // === STRONGMAN ===
        { name: 'Farmer Carry', categoryId: getId('Strongman') },
        { name: 'Sandbag Lunges', categoryId: getId('Strongman') },
        { name: 'Sandbag Carry', categoryId: getId('Strongman') },
        { name: 'Sandbag Clean', categoryId: getId('Strongman') },
        { name: 'Sandbag Over Shoulder', categoryId: getId('Strongman') },
        { name: 'Sandbag Squat', categoryId: getId('Strongman') },
        { name: 'Sled Push', categoryId: getId('Strongman') },
        { name: 'Sled Pull', categoryId: getId('Strongman') },
        { name: 'Yoke Carry (Yugo)', categoryId: getId('Strongman') },
        { name: 'Tire Flip (Volteo de Neumático)', categoryId: getId('Strongman') },
        { name: 'Atlas Stones', categoryId: getId('Strongman') },

        // === GLÚTEOS (estaba vacía: sin ejercicios su volumen nunca se registraba) ===
        { name: 'Puente de Glúteos', categoryId: getId('Gluteos') },
        { name: 'Hip Thrust a una Pierna', categoryId: getId('Gluteos') },
        { name: 'Patada de Glúteo en Polea', categoryId: getId('Gluteos') },
        { name: 'Abducción de Cadera en Máquina', categoryId: getId('Gluteos') },
    ];

    // 3. Catálogo Completo de Ejercicios
    // Obtenemos los ejercicios globales existentes
    const existingExercises = await db.select().from(exercises).where(isNull(exercises.userId));

    let createdCount = 0;
    let updatedCount = 0;
    let removedDuplicatesCount = 0;

    const toCreate: { name: string; categoryId: number | undefined; isCustom: boolean; userId: null }[] = [];
    for (const ex of allExercises) {
        const matches = existingExercises.filter(e => e.name === ex.name);

        if (matches.length === 0) {
            // No existe -> se acumula para un único insert por lotes
            toCreate.push({
                name: ex.name,
                categoryId: ex.categoryId,
                isCustom: false,
                userId: null,
            });
            createdCount++;
        } else {
            // Ya existe -> actualizar categoryId del primero si hace falta
            const primary = matches[0];
            if (primary.categoryId !== ex.categoryId) {
                await db.update(exercises)
                    .set({ categoryId: ex.categoryId })
                    .where(eq(exercises.id, primary.id));
                updatedCount++;
            }

            // Si hay duplicados (más de 1 con el mismo nombre), eliminar los sobrantes
            if (matches.length > 1) {
                const duplicateIds = matches.slice(1).map(m => m.id);
                for (const dupId of duplicateIds) {
                    try {
                        await db.delete(exercises).where(eq(exercises.id, dupId));
                        removedDuplicatesCount++;
                    } catch {
                        // Si está referenciado por alguna tabla, no se puede borrar directamente
                    }
                }
            }
        }
    }

    // Un único round-trip para todas las creaciones (antes: 1 insert por ejercicio).
    if (toCreate.length > 0) {
        await db.insert(exercises).values(toCreate);
    }

    console.log(`✅ Ejercicios: ${createdCount} creados, ${updatedCount} actualizados, ${removedDuplicatesCount} duplicados eliminados.`);
    console.log('🎉 ¡Sembrado y limpieza completados con éxito!');
}

seed().catch((e) => {
    console.error('Error sembrando la DB:', e);
    process.exit(1);
});