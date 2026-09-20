import { describe, expect, it } from 'vitest';
import {
  formatWorkoutDate,
  formatWorkoutDuration,
  formatWorkoutMarkdown,
  formatWorkoutText,
  formatWorkoutVolume,
  workoutShareFilename,
  type ShareableWorkout,
} from './share-workout';

function baseWorkout(overrides: Partial<ShareableWorkout> = {}): ShareableWorkout {
  return {
    name: 'Torso Hipertrofia',
    typeName: 'Musculación',
    modality: null,
    modalityConfig: null,
    startTime: new Date(2026, 8, 20, 18, 30),
    totalTimeSeconds: 3600,
    notes: null,
    totalVolume: 2500,
    totalSets: 12,
    exercisesSummary: [
      { name: 'Press banca', setsCount: 4, maxWeight: 80, repsSummary: '4x8' },
      { name: 'Remo', setsCount: 3, maxWeight: 60, repsSummary: '3x10' },
    ],
    ...overrides,
  };
}

describe('formatWorkoutDuration', () => {
  it('null -> em dash', () => {
    expect(formatWorkoutDuration(null)).toBe('—');
  });

  it('convierte segundos a minutos redondeados', () => {
    expect(formatWorkoutDuration(3600)).toBe('60 min');
    expect(formatWorkoutDuration(90)).toBe('2 min');
  });
});

describe('formatWorkoutVolume', () => {
  it('0 o negativo -> 0 kg', () => {
    expect(formatWorkoutVolume(0)).toBe('0 kg');
    expect(formatWorkoutVolume(-5)).toBe('0 kg');
  });

  it('< 1000 -> kg redondeados', () => {
    expect(formatWorkoutVolume(850.4)).toBe('850 kg');
  });

  it('>= 1000 -> toneladas con 1 decimal', () => {
    expect(formatWorkoutVolume(2500)).toBe('2.5 t');
  });
});

describe('formatWorkoutDate', () => {
  it('incluye año y mes en español', () => {
    const out = formatWorkoutDate(new Date(2026, 8, 20));
    expect(out).toContain('2026');
  });
});

describe('formatWorkoutText', () => {
  it('respeta estructura base con ejercicios', () => {
    const out = formatWorkoutText(baseWorkout());
    expect(out).toContain('💪 Torso Hipertrofia');
    expect(out).toContain('Musculación');
    expect(out).toContain('• Press banca — 4x8');
    expect(out).toContain('12 series');
  });

  it('singulariza serie cuando totalSets=1', () => {
    const out = formatWorkoutText(baseWorkout({ totalSets: 1 }));
    expect(out).toContain('1 serie');
    expect(out).not.toContain('1 series');
  });

  it('añade modalidad y notas solo si existen', () => {
    const withExtras = formatWorkoutText(
      baseWorkout({ modality: 'AMRAP', notes: 'Buena sesión' })
    );
    expect(withExtras).toContain('AMRAP');
    expect(withExtras).toContain('📝 Buena sesión');

    const withoutExtras = formatWorkoutText(baseWorkout());
    expect(withoutExtras).not.toContain('📝');
  });

  it('sin ejercicios no mete viñetas', () => {
    const out = formatWorkoutText(baseWorkout({ exercisesSummary: [] }));
    expect(out).not.toContain('•');
  });
});

describe('formatWorkoutMarkdown', () => {
  it('genera título, KPIs y lista de ejercicios', () => {
    const out = formatWorkoutMarkdown(baseWorkout());
    expect(out).toContain('# Torso Hipertrofia');
    expect(out).toContain('## Ejercicios');
    expect(out).toContain('**Press banca** — 4x8');
    expect(out).toContain('Compartido desde Workout Manager');
  });

  it('detalla sets cuando existen y cita notas', () => {
    const out = formatWorkoutMarkdown(
      baseWorkout({
        notes: 'Durísima',
        exercisesSummary: [
          {
            name: 'Sentadilla',
            setsCount: 2,
            maxWeight: 100,
            sets: [
              { setNumber: 1, weight: 100, repCount: 5, formatted: '5x100kg' },
              { setNumber: 2, weight: 100, repCount: 5, formatted: '5x100kg' },
            ],
          },
        ],
      })
    );
    expect(out).toContain('5x100kg · 5x100kg');
    expect(out).toContain('> Durísima');
  });
});

describe('workoutShareFilename', () => {
  it('slugifica nombre y añade fecha YYYYMMDD', () => {
    const out = workoutShareFilename(baseWorkout(), 'md');
    expect(out).toBe('torso-hipertrofia-20260920.md');
  });

  it('nombre vacío -> fallback entreno', () => {
    const out = workoutShareFilename(baseWorkout({ name: '---' }), 'png');
    expect(out).toBe('entreno-20260920.png');
  });
});
