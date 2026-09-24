'use server';

import { auth } from '@clerk/nextjs/server';
import { and, asc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { bodyMeasurements } from '@/lib/db/schema';

export interface BodyMeasurementDTO {
  id: number;
  measuredAt: string;
  weightKg: number | null;
  heightCm: number | null;
  bodyFatPct: number | null;
  muscleMassKg: number | null;
  waistCm: number | null;
  chestCm: number | null;
  armCm: number | null;
  thighCm: number | null;
  hipCm: number | null;
  notes: string | null;
}

export interface LogMeasurementInput {
  measuredAt?: string;
  weightKg?: number | null;
  heightCm?: number | null;
  bodyFatPct?: number | null;
  muscleMassKg?: number | null;
  waistCm?: number | null;
  chestCm?: number | null;
  armCm?: number | null;
  thighCm?: number | null;
  hipCm?: number | null;
  notes?: string | null;
}

function toDTO(m: typeof bodyMeasurements.$inferSelect): BodyMeasurementDTO {
  return {
    id: m.id,
    measuredAt: m.measuredAt.toISOString(),
    weightKg: m.weightKg,
    heightCm: m.heightCm,
    bodyFatPct: m.bodyFatPct,
    muscleMassKg: m.muscleMassKg,
    waistCm: m.waistCm,
    chestCm: m.chestCm,
    armCm: m.armCm,
    thighCm: m.thighCm,
    hipCm: m.hipCm,
    notes: m.notes,
  };
}

export async function getBodyMeasurements(): Promise<BodyMeasurementDTO[]> {
  const { userId } = await auth();
  if (!userId) throw new Error('No autorizado');

  try {
    const rows = await db
      .select()
      .from(bodyMeasurements)
      .where(eq(bodyMeasurements.userId, userId))
      .orderBy(asc(bodyMeasurements.measuredAt));

    return rows.map(toDTO);
  } catch (e) {
    // Si la migración aún no se ha aplicado (tabla inexistente), no tumbar /progress
    console.error('getBodyMeasurements: la tabla body_measurements puede no existir. Ejecuta `npm run db:push`.', e);
    return [];
  }
}

const cleanNum = (v: number | null | undefined): number | null => {
  if (v == null || isNaN(v)) return null;
  return v;
};

export async function logBodyMeasurement(input: LogMeasurementInput) {
  const { userId } = await auth();
  if (!userId) throw new Error('No autorizado');

  const values = {
    weightKg: cleanNum(input.weightKg),
    heightCm: cleanNum(input.heightCm),
    bodyFatPct: cleanNum(input.bodyFatPct),
    muscleMassKg: cleanNum(input.muscleMassKg),
    waistCm: cleanNum(input.waistCm),
    chestCm: cleanNum(input.chestCm),
    armCm: cleanNum(input.armCm),
    thighCm: cleanNum(input.thighCm),
    hipCm: cleanNum(input.hipCm),
  };

  if (Object.values(values).every((v) => v == null)) {
    throw new Error('Introduce al menos una medición');
  }

  const [created] = await db
    .insert(bodyMeasurements)
    .values({
      userId,
      measuredAt: input.measuredAt ? new Date(input.measuredAt) : new Date(),
      ...values,
      notes: input.notes?.trim() || null,
    })
    .returning();

  revalidatePath('/progress');
  return { success: true, measurement: toDTO(created) };
}

export async function deleteBodyMeasurement(id: number) {
  const { userId } = await auth();
  if (!userId) throw new Error('No autorizado');

  await db
    .delete(bodyMeasurements)
    .where(and(eq(bodyMeasurements.id, id), eq(bodyMeasurements.userId, userId)));

  revalidatePath('/progress');
  return { success: true };
}

// Editar una medición existente (informe §5: antes solo borrar+recrear)
export async function updateBodyMeasurement(id: number, input: LogMeasurementInput) {
  const { userId } = await auth();
  if (!userId) throw new Error('No autorizado');
  if (!Number.isInteger(id) || id <= 0) throw new Error('Medición inválida');

  const values = {
    weightKg: cleanNum(input.weightKg),
    heightCm: cleanNum(input.heightCm),
    bodyFatPct: cleanNum(input.bodyFatPct),
    muscleMassKg: cleanNum(input.muscleMassKg),
    waistCm: cleanNum(input.waistCm),
    chestCm: cleanNum(input.chestCm),
    armCm: cleanNum(input.armCm),
    thighCm: cleanNum(input.thighCm),
    hipCm: cleanNum(input.hipCm),
  };

  if (Object.values(values).every((v) => v == null)) {
    throw new Error('Introduce al menos una medición');
  }

  const [updated] = await db
    .update(bodyMeasurements)
    .set({
      ...(input.measuredAt ? { measuredAt: new Date(input.measuredAt) } : {}),
      ...values,
      notes: input.notes !== undefined ? input.notes?.trim() || null : undefined,
    })
    .where(and(eq(bodyMeasurements.id, id), eq(bodyMeasurements.userId, userId)))
    .returning();

  if (!updated) throw new Error('Medición no encontrada');

  revalidatePath('/progress');
  return { success: true, measurement: toDTO(updated) };
}

export interface BodySummary {
  totalCount: number;
  latestWeight: number | null;
  latestWeightDate: string | null;
  delta30d: number | null;
  latestBodyFat: number | null;
  daysSinceLast: number | null;
}

// Resumen para el widget del dashboard: peso actual + cambio a 30 días
export async function getBodySummary(): Promise<BodySummary> {
  const rows = await getBodyMeasurements();
  const empty: BodySummary = {
    totalCount: 0,
    latestWeight: null,
    latestWeightDate: null,
    delta30d: null,
    latestBodyFat: null,
    daysSinceLast: null,
  };
  if (rows.length === 0) return empty;

  const weights = rows.filter((r) => r.weightKg != null);
  const latest = weights.length > 0 ? weights[weights.length - 1] : null;
  let delta30d: number | null = null;
  if (latest?.weightKg != null && weights.length > 1) {
    const cutoff = new Date().getTime() - 30 * 24 * 60 * 60 * 1000;
    const older = weights.filter((r) => new Date(r.measuredAt).getTime() <= cutoff);
    const ref = older.length > 0 ? older[older.length - 1] : weights[0];
    if (ref.id !== latest.id && ref.weightKg != null) {
      delta30d = Math.round((latest.weightKg - ref.weightKg) * 10) / 10;
    }
  }

  const fats = rows.filter((r) => r.bodyFatPct != null);
  const lastDate = new Date(rows[rows.length - 1].measuredAt).getTime();

  return {
    totalCount: rows.length,
    latestWeight: latest?.weightKg ?? null,
    latestWeightDate: latest?.measuredAt ?? null,
    delta30d,
    latestBodyFat: fats.length > 0 ? fats[fats.length - 1].bodyFatPct : null,
    daysSinceLast: Math.max(0, Math.round((Date.now() - lastDate) / (24 * 60 * 60 * 1000))),
  };
}
