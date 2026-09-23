import { describe, it, expect } from 'vitest';
import { parseRepScheme, getModalitySeriesStructure, formatModalitySummary } from './modality-utils';

describe('parseRepScheme', () => {
  it('21-15-9 → [21,15,9]', () => {
    expect(parseRepScheme('21-15-9')).toEqual([21, 15, 9]);
  });

  it('rangos con texto 1 a 10 y 10 a 1', () => {
    expect(parseRepScheme('1 a 10')).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(parseRepScheme('10 a 1')).toEqual([10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
    expect(parseRepScheme('1 to 5')).toEqual([1, 2, 3, 4, 5]);
  });

  it('secuencia larga con guiones', () => {
    expect(parseRepScheme('1-2-3-4-5-6-7-8-9-10')).toHaveLength(10);
  });

  it('vacío o sin números → null', () => {
    expect(parseRepScheme('')).toBeNull();
    expect(parseRepScheme(null)).toBeNull();
    expect(parseRepScheme('sin numeros')).toBeNull();
  });
});

describe('getModalitySeriesStructure', () => {
  it('EMOM 12 total / 1 intervalo → 12', () => {
    expect(getModalitySeriesStructure('EMOM', { totalMinutes: 12, intervalMinutes: 1 })?.count).toBe(12);
  });

  it('EMOM 16 total / 2 intervalo → 8', () => {
    expect(getModalitySeriesStructure('EMOM', { totalMinutes: 16, intervalMinutes: 2 })?.count).toBe(8);
  });

  it('TABATA 8r x2 bloques → 16', () => {
    expect(getModalitySeriesStructure('TABATA', { rounds: 8, sets: 2 })?.count).toBe(16);
  });

  it('HIIT 5r x3 bloques → 15', () => {
    expect(getModalitySeriesStructure('HIIT', { rounds: 5, sets: 3 })?.count).toBe(15);
  });

  it('Ladder 21-15-9 → 3 con reps', () => {
    expect(getModalitySeriesStructure('Ladder', { repScheme: '21-15-9' })).toMatchObject({
      count: 3,
      reps: [21, 15, 9],
    });
  });

  it('Ladder inválido → null', () => {
    expect(getModalitySeriesStructure('Ladder', { repScheme: 'sin numeros' })).toBeNull();
  });

  it('For Time → null (sin estructura)', () => {
    expect(getModalitySeriesStructure('For Time', { timeCapMinutes: 20 })).toBeNull();
  });
});

describe('formatModalitySummary EMOM', () => {
  it('sin modo → EMOM 12\u0027', () => {
    expect(formatModalitySummary('EMOM', { totalMinutes: 12, intervalMinutes: 1 })).toBe('EMOM 12\u0027');
  });

  it('shared → ambos, alternate → alternos', () => {
    expect(formatModalitySummary('EMOM', { totalMinutes: 12, intervalMinutes: 1, emomMode: 'shared' })).toBe(
      'EMOM 12\u0027 · ambos'
    );
    expect(formatModalitySummary('EMOM', { totalMinutes: 12, intervalMinutes: 1, emomMode: 'alternate' })).toBe(
      'EMOM 12\u0027 · alternos'
    );
  });
});

describe('formatModalitySummary TABATA', () => {
  it('sin modo → base', () => {
    expect(formatModalitySummary('TABATA', { workSeconds: 20, restSeconds: 10, rounds: 8, sets: 1 })).toBe(
      'TABATA 8r (20/10s)'
    );
  });

  it('perExercise → c/u, shared → rotando', () => {
    expect(
      formatModalitySummary('TABATA', { workSeconds: 20, restSeconds: 10, rounds: 8, sets: 1, tabataMode: 'perExercise' })
    ).toBe('TABATA 8r (20/10s) · c/u');
    expect(
      formatModalitySummary('TABATA', { workSeconds: 20, restSeconds: 10, rounds: 8, sets: 1, tabataMode: 'shared' })
    ).toBe('TABATA 8r (20/10s) · rotando');
  });
});

describe('formatModalitySummary HIIT', () => {
  it('sin modo → base', () => {
    expect(formatModalitySummary('HIIT', { workSeconds: 40, restSeconds: 20, rounds: 5, sets: 3 })).toBe(
      'HIIT 3×5r (40/20s)'
    );
  });

  it('circuit → circuito, sequential → secuencial', () => {
    expect(
      formatModalitySummary('HIIT', { workSeconds: 40, restSeconds: 20, rounds: 5, sets: 3, hiitMode: 'circuit' })
    ).toBe('HIIT 3×5r (40/20s) · circuito');
    expect(
      formatModalitySummary('HIIT', { workSeconds: 40, restSeconds: 20, rounds: 5, sets: 3, hiitMode: 'sequential' })
    ).toBe('HIIT 3×5r (40/20s) · secuencial');
  });
});
