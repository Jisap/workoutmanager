import { describe, it, expect } from 'vitest';
import {
  calculateModalityEstimatedDuration,
  parseRepScheme,
  getModalitySeriesStructure,
  formatModalitySummary,
} from './modality-utils';

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

describe('formatModalitySummary resto de modalidades', () => {
  it('null → null, sin config → modalidad tal cual', () => {
    expect(formatModalitySummary(null, null)).toBeNull();
    expect(formatModalitySummary('EMOM', null)).toBe('EMOM');
  });

  it('AMRAP / For Time / AFAP / Chipper con y sin cap', () => {
    expect(formatModalitySummary('AMRAP', { timeCapMinutes: 20 })).toBe("AMRAP 20'");
    expect(formatModalitySummary('AMRAP', {})).toBe('AMRAP');
    expect(formatModalitySummary('For Time', { timeCapMinutes: 10 })).toBe('For Time (Cap 10\')');
    expect(formatModalitySummary('For Time', {})).toBe('For Time');
    expect(formatModalitySummary('AFAP', { timeCapMinutes: 12 })).toBe("AFAP (Cap 12')");
    expect(formatModalitySummary('Chipper', { timeCapMinutes: 30 })).toBe("Chipper (Cap 30')");
  });

  it('EMOM E2MOM cuando intervalMinutes > 1', () => {
    expect(formatModalitySummary('EMOM', { totalMinutes: 16, intervalMinutes: 2 })).toBe("E2MOM 16'");
  });

  it('Ladder con esquema y cap', () => {
    expect(formatModalitySummary('Ladder', { repScheme: '21-15-9', timeCapMinutes: 15 })).toBe(
      "Ladder (21-15-9) · Cap 15'"
    );
    expect(formatModalitySummary('Ladder', {})).toBe('Ladder');
  });

  it('modalidad desconocida → se devuelve tal cual', () => {
    expect(formatModalitySummary('Strength', { timeCapMinutes: 10 })).toBe('Strength');
  });
});

describe('parseRepScheme bordes', () => {
  it('separadores coma / punto-coma / espacio', () => {
    expect(parseRepScheme('21, 15, 9')).toEqual([21, 15, 9]);
    expect(parseRepScheme('21;15;9')).toEqual([21, 15, 9]);
    expect(parseRepScheme('21 15 9')).toEqual([21, 15, 9]);
  });

  it('rangos con "hasta" y "al"', () => {
    expect(parseRepScheme('1 hasta 3')).toEqual([1, 2, 3]);
    expect(parseRepScheme('1 al 3')).toEqual([1, 2, 3]);
  });

  it('rango descendente "10 a 1"', () => {
    expect(parseRepScheme('10 a 1')).toEqual([10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
  });

  it('más de 30 valores → null', () => {
    const scheme = Array.from({ length: 31 }, (_, i) => i + 1).join('-');
    expect(parseRepScheme(scheme)).toBeNull();
  });

  it('números fuera de rango se filtran; si no queda ninguno → null', () => {
    expect(parseRepScheme('0')).toBeNull();
    expect(parseRepScheme('5000')).toBeNull();
    expect(parseRepScheme('5-0-3')).toEqual([5, 3]);
  });

  it('rango gigante (>30) → null', () => {
    expect(parseRepScheme('1 a 31')).toBeNull();
  });
});

describe('getModalitySeriesStructure bordes', () => {
  it('null en modalidad o config → null', () => {
    expect(getModalitySeriesStructure(null, {})).toBeNull();
    expect(getModalitySeriesStructure('EMOM', null)).toBeNull();
  });

  it('EMOM E2MOM genera prefijo correcto', () => {
    expect(getModalitySeriesStructure('EMOM', { totalMinutes: 16, intervalMinutes: 2 })?.label).toContain('E2MOM');
  });

  it('TABATA/HIIT recortan a 60 series como máximo', () => {
    expect(getModalitySeriesStructure('TABATA', { rounds: 30, sets: 10 })?.count).toBe(60);
    expect(getModalitySeriesStructure('HIIT', { rounds: 30, sets: 10 })?.count).toBe(60);
  });

  it('modalidad sin estructura → null', () => {
    expect(getModalitySeriesStructure('Strength', {})).toBeNull();
    expect(getModalitySeriesStructure('AMRAP', { timeCapMinutes: 20 })).toBeNull();
  });
});

describe('calculateModalityEstimatedDuration', () => {
  it('null sin modalidad o config', () => {
    expect(calculateModalityEstimatedDuration(null, null)).toBeNull();
    expect(calculateModalityEstimatedDuration('EMOM', null)).toBeNull();
  });

  it('AMRAP/For Time/AFAP/Chipper/Ladder = cap en segundos', () => {
    expect(calculateModalityEstimatedDuration('AMRAP', { timeCapMinutes: 20 })).toBe(1200);
    expect(calculateModalityEstimatedDuration('For Time', { timeCapMinutes: 10 })).toBe(600);
    expect(calculateModalityEstimatedDuration('Ladder', { repScheme: '21-15-9' })).toBeNull();
    expect(calculateModalityEstimatedDuration('Ladder', { repScheme: '21-15-9', timeCapMinutes: 15 })).toBe(900);
  });

  it('EMOM = totalMinutes en segundos', () => {
    expect(calculateModalityEstimatedDuration('EMOM', { totalMinutes: 12, intervalMinutes: 1 })).toBe(720);
    expect(calculateModalityEstimatedDuration('EMOM', {})).toBeNull();
  });

  it('TABATA 8r (20/10) ×1 = 240s; ×2 bloques suma descanso entre bloques', () => {
    expect(calculateModalityEstimatedDuration('TABATA', { workSeconds: 20, restSeconds: 10, rounds: 8, sets: 1 })).toBe(
      240
    );
    expect(
      calculateModalityEstimatedDuration('TABATA', {
        workSeconds: 20,
        restSeconds: 10,
        rounds: 8,
        sets: 2,
        restBetweenSetsSeconds: 60,
      })
    ).toBe(540);
  });

  it('HIIT 3×5r (40/20) con descansos = 1020s', () => {
    expect(
      calculateModalityEstimatedDuration('HIIT', {
        workSeconds: 40,
        restSeconds: 20,
        rounds: 5,
        sets: 3,
        restBetweenSetsSeconds: 60,
      })
    ).toBe(300 * 3 + 120);
  });

  it('modalidad desconocida → null', () => {
    expect(calculateModalityEstimatedDuration('Strength', {})).toBeNull();
  });
});
