import { describe, expect, it } from 'vitest';
import {
  OFFICIAL_WODS,
  SCALED_RATIO,
  WOD_CATEGORY_LABELS,
  scaledWeight,
  wodDivisionLabel,
  wodWeightForDivision,
  type WodMovementSpec,
} from './wods-catalog';

function movement(overrides: Partial<WodMovementSpec> = {}): WodMovementSpec {
  return {
    searchQueries: ['thruster'],
    fallbackName: 'Thrusters',
    rounds: 3,
    reps: 10,
    weightMen: 43,
    weightWomen: 30,
    distance: null,
    ...overrides,
  };
}

describe('SCALED_RATIO', () => {
  it('es 60% del Rx', () => {
    expect(SCALED_RATIO).toBe(0.6);
  });
});

describe('scaledWeight', () => {
  it('null/0/negativo se devuelven tal cual (peso corporal o sin carga)', () => {
    expect(scaledWeight(null)).toBeNull();
    expect(scaledWeight(0)).toBe(0);
    expect(scaledWeight(-5)).toBe(-5);
  });

  it('60% redondeado a discos de 2,5 kg', () => {
    // 43 * 0.6 = 25.8 → 25
    expect(scaledWeight(43)).toBe(25);
    // 60 * 0.6 = 36 → 35
    expect(scaledWeight(60)).toBe(35);
    // 24 * 0.6 = 14.4 → 15
    expect(scaledWeight(24)).toBe(15);
    // 102 * 0.6 = 61.2 → 60
    expect(scaledWeight(102)).toBe(60);
  });

  it('mínimo 2,5 kg para que no salga 0', () => {
    expect(scaledWeight(1)).toBe(2.5);
    expect(scaledWeight(2)).toBe(2.5);
  });

  it('pesos ya múltiplos de 2,5 se mantienen proporcionales', () => {
    // 20 * 0.6 = 12 → 12.5
    expect(scaledWeight(20)).toBe(12.5);
    // 30 * 0.6 = 18 → 17.5
    expect(scaledWeight(30)).toBe(17.5);
  });
});

describe('wodWeightForDivision', () => {
  it('rx-men devuelve weightMen', () => {
    expect(wodWeightForDivision(movement(), 'rx-men')).toBe(43);
  });

  it('rx-women devuelve weightWomen', () => {
    expect(wodWeightForDivision(movement(), 'rx-women')).toBe(30);
  });

  it('scaled usa weightMen como base (convención de boxes)', () => {
    expect(wodWeightForDivision(movement(), 'scaled')).toBe(scaledWeight(43));
  });

  it('scaled con weightMen null recurre a weightWomen', () => {
    const m = movement({ weightMen: null, weightWomen: 16 });
    expect(wodWeightForDivision(m, 'scaled')).toBe(scaledWeight(16));
  });

  it('scaled con ambos null devuelve null (peso corporal)', () => {
    const m = movement({ weightMen: null, weightWomen: null });
    expect(wodWeightForDivision(m, 'scaled')).toBeNull();
    expect(wodWeightForDivision(m, 'rx-men')).toBeNull();
  });
});

describe('wodDivisionLabel', () => {
  it('etiquetas cortas para el título del WOD', () => {
    expect(wodDivisionLabel('rx-men')).toBe('RX');
    expect(wodDivisionLabel('rx-women')).toBe('RX W');
    expect(wodDivisionLabel('scaled')).toBe('SC 60%');
  });
});

describe('WOD_CATEGORY_LABELS', () => {
  it('girls en español (cambio de ayer)', () => {
    expect(WOD_CATEGORY_LABELS.girl).toBe('Las Chicas');
    expect(WOD_CATEGORY_LABELS.hero).toBe('Héroes');
    expect(WOD_CATEGORY_LABELS.classic).toBe('Clásicos');
  });
});

describe('OFFICIAL_WODS integrity', () => {
  it('catálogo no vacío con ids únicos', () => {
    expect(OFFICIAL_WODS.length).toBeGreaterThan(0);
    const ids = OFFICIAL_WODS.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('todo WOD tiene modalidad, prescripción y al menos un movimiento', () => {
    for (const wod of OFFICIAL_WODS) {
      expect(wod.name.length).toBeGreaterThan(0);
      expect(wod.modality.length).toBeGreaterThan(0);
      expect(wod.movements.length).toBeGreaterThan(0);
      for (const m of wod.movements) {
        expect(m.fallbackName.length).toBeGreaterThan(0);
        expect(m.searchQueries.length).toBeGreaterThan(0);
      }
    }
  });

  it('scaled nunca supera el Rx en movimientos con carga', () => {
    for (const wod of OFFICIAL_WODS) {
      for (const m of wod.movements) {
        const rx = m.weightMen ?? m.weightWomen;
        if (rx == null || rx <= 0) continue;
        const sc = wodWeightForDivision(m, 'scaled');
        expect(sc).not.toBeNull();
        expect(sc!).toBeLessThanOrEqual(rx);
        expect(sc!).toBeGreaterThan(0);
      }
    }
  });
});
