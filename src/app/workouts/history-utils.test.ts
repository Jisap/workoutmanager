import { describe, expect, it } from 'vitest';
import {
  formatMMSS,
  getTypeStyle,
  isRunExerciseName,
  isWorkoutSavedAsTemplate,
} from './history-utils';

describe('getTypeStyle', () => {
  it('musculación/fuerza/gym → azul', () => {
    for (const name of ['Musculación', 'Fuerza', 'Gym total']) {
      expect(getTypeStyle(name).bar).toBe('bg-blue-500');
    }
  });

  it('pierna/leg → azul (nuevo de ayer)', () => {
    expect(getTypeStyle('Pierna').bar).toBe('bg-blue-500');
    expect(getTypeStyle('Leg Day').bar).toBe('bg-blue-500');
    expect(getTypeStyle('PIERNA INTENSA').bar).toBe('bg-blue-500');
  });

  it('crossfit/wod/funcional → naranja', () => {
    for (const name of ['CrossFit', 'WOD Fran', 'Funcional']) {
      expect(getTypeStyle(name).bar).toBe('bg-orange-500');
    }
  });

  it('cardio/correr/run → rosa', () => {
    expect(getTypeStyle('Cardio').bar).toBe('bg-pink-500');
    expect(getTypeStyle('Correr').bar).toBe('bg-pink-500');
    expect(getTypeStyle('Running').bar).toBe('bg-pink-500');
  });

  it('hyrox/hybrid → morado', () => {
    expect(getTypeStyle('Hyrox race').bar).toBe('bg-purple-500');
  });

  it('yoga/stretch/movilidad → teal', () => {
    expect(getTypeStyle('Yoga').bar).toBe('bg-teal-500');
  });

  it('desconocido → gris', () => {
    expect(getTypeStyle('Ajedrez').bar).toBe('bg-gray-400');
  });

  it('insensible a mayúsculas', () => {
    expect(getTypeStyle('MUSCULACIÓN').bar).toBe('bg-blue-500');
    expect(getTypeStyle('crossfit').bar).toBe('bg-orange-500');
  });
});

describe('isWorkoutSavedAsTemplate', () => {
  it('true si savedAsTemplate o templateId', () => {
    expect(isWorkoutSavedAsTemplate({ savedAsTemplate: true } as never)).toBe(true);
    expect(isWorkoutSavedAsTemplate({ templateId: 9 } as never)).toBe(true);
    expect(isWorkoutSavedAsTemplate({ savedAsTemplate: true, templateId: 9 } as never)).toBe(true);
  });

  it('false si no hay marca ni templateId', () => {
    expect(isWorkoutSavedAsTemplate({} as never)).toBe(false);
    expect(isWorkoutSavedAsTemplate({ savedAsTemplate: false, templateId: null } as never)).toBe(false);
  });
});

describe('formatMMSS', () => {
  it('null/undefined → em dash', () => {
    expect(formatMMSS(null)).toBe('—');
    expect(formatMMSS(undefined)).toBe('—');
  });

  it('segundos → m:ss', () => {
    expect(formatMMSS(90)).toBe('1:30');
    expect(formatMMSS(0)).toBe('0:00');
  });
});

describe('isRunExerciseName', () => {
  it('detecta variantes de carrera', () => {
    expect(isRunExerciseName('Running (400m)')).toBe(true);
    expect(isRunExerciseName('Correr suave')).toBe(true);
    expect(isRunExerciseName('Carrera continua')).toBe(true);
    expect(isRunExerciseName('Run 5k')).toBe(true);
    expect(isRunExerciseName('Remo (1000m)')).toBe(true);
  });

  it('no marca fuerza como carrera', () => {
    expect(isRunExerciseName('Press banca')).toBe(false);
    expect(isRunExerciseName('Sentadilla')).toBe(false);
  });
});
