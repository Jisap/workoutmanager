import 'dotenv/config';
import { config } from 'dotenv';

config({ path: '.env.local' });
config({ path: '.env' });

import { db } from './index';
import { workoutTypes, exerciseCategories, exercises } from './schema';

async function seed() {
    console.log('🌱 Sembrando base de datos...');

    // 1. Tipos de Entrenamiento
    const insertedTypes = await db.insert(workoutTypes).values([
        { name: 'Musculación', description: 'Hipertrofia y fuerza tradicional' },
        { name: 'CrossFit', description: 'WODs, gimnasia y levantamiento olímpico' },
        { name: 'Hyrox', description: 'Carreras mixtas y estaciones funcionales' },
        { name: 'Cardio / Endurance', description: 'Running, cycling, remo continuo' },
        { name: 'Funcional', description: 'Movimientos corporales y kettlebells' },
        { name: 'Powerlifting', description: 'Sentadilla, Press Banca, Peso Muerto' },
    ]).onConflictDoNothing({ target: workoutTypes.name }).returning();
    console.log(`✅ Tipos de entrenamiento procesados (nuevos: ${insertedTypes.length}).`);

    // 2. Categorías de Ejercicios
    const insertedCategories = await db.insert(exerciseCategories).values([
        { name: 'Pecho', type: 'Fuerza' },
        { name: 'Espalda', type: 'Fuerza' },
        { name: 'Piernas', type: 'Fuerza' },
        { name: 'Hombros', type: 'Fuerza' },
        { name: 'Brazos', type: 'Fuerza' },
        { name: 'Core', type: 'Fuerza' },
        { name: 'Gymnastics', type: 'CrossFit' },
        { name: 'Weightlifting', type: 'CrossFit' },
        { name: 'Monostructural', type: 'Cardio' },
    ]).onConflictDoNothing({ target: exerciseCategories.name }).returning();
    console.log(`✅ Categorías procesadas (nuevas: ${insertedCategories.length}).`);

    // 3. Obtener categorías para asociar ejercicios
    const allCategories = await db.select().from(exerciseCategories);
    const pechoId = allCategories.find(c => c.name === 'Pecho')?.id;
    const piernaId = allCategories.find(c => c.name === 'Piernas')?.id;
    const monoId = allCategories.find(c => c.name === 'Monostructural')?.id;
    const gymId = allCategories.find(c => c.name === 'Gymnastics')?.id;

    const existingExercises = await db.select().from(exercises);
    if (existingExercises.length === 0) {
        await db.insert(exercises).values([
            { name: 'Press de Banca con Barra', categoryId: pechoId, isCustom: false },
            { name: 'Sentadilla Trasera', categoryId: piernaId, isCustom: false },
            { name: 'Peso Muerto', categoryId: piernaId, isCustom: false },
            { name: 'Running (1000m)', categoryId: monoId, isCustom: false },
            { name: 'Remo (500m)', categoryId: monoId, isCustom: false },
            { name: 'Dominadas (Pull-ups)', categoryId: gymId, isCustom: false },
            { name: 'Toes to Bar', categoryId: gymId, isCustom: false },
        ]);
        console.log('✅ Ejercicios base creados.');
    } else {
        console.log(`ℹ️ Ejercicios ya presentes en la base de datos (${existingExercises.length} registros).`);
    }

    console.log('🎉 ¡Sembrado completado con éxito!');
}

seed().catch((e) => {
    console.error('Error sembrando la DB:', e);
    process.exit(1);
});