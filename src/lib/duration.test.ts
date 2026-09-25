import { describe, expect, it } from 'vitest';
import {
  formatDurationInput,
  parseDurationInput,
} from './duration';

describe('formatDurationInput', () => {
  it('null/undefined/negativo/NaN → cadena vacía', () => {
    expect(formatDurationInput(null)).toBe('');
    expect(formatDurationInput(undefined)).toBe('');
    expect(formatDurationInput(-10)).toBe('');
    expect(formatDurationInput(NaN)).toBe('');
  });

  it('0 → 0:00', () => {
    expect(formatDurationInput(0)).toBe('0:00');
  });

  it('formato m:ss con cero a la izquierda', () => {
    expect(formatDurationInput(65)).toBe('1:05');
    expect(formatDurationInput(600)).toBe('10:00');
    expect(formatDurationInput(90)).toBe('1:30');
  });
});

describe('parseDurationInput', () => {
  it('vacío → null', () => {
    expect(parseDurationInput('')).toBeNull();
    expect(parseDurationInput('   ')).toBeNull();
  });

  it('mm:ss válido', () => {
    expect(parseDurationInput('1:30')).toBe(90);
    expect(parseDurationInput('10:00')).toBe(600);
    expect(parseDurationInput('0:45')).toBe(45);
  });

  it('mm:ss inválido → null (segundos >= 60, formato raro)', () => {
    expect(parseDurationInput('1:70')).toBeNull();
    expect(parseDurationInput('1:2:3')).toBeNull();
    expect(parseDurationInput('a:b')).toBeNull();
    expect(parseDurationInput('-1:10')).toBeNull();
  });

  it('número >= 30 se interpreta como segundos', () => {
    expect(parseDurationInput('270')).toBe(270);
    expect(parseDurationInput('30')).toBe(30);
  });

  it('número < 30 se interpreta como minutos decimales', () => {
    expect(parseDurationInput('4.5')).toBe(270);
    expect(parseDurationInput('1')).toBe(60);
  });

  it('acepta coma decimal española', () => {
    expect(parseDurationInput('4,5')).toBe(270);
  });

  it('negativo o texto → null', () => {
    expect(parseDurationInput('-5')).toBeNull();
    expect(parseDurationInput('abc')).toBeNull();
  });

  it('roundtrip formato → parse', () => {
    for (const secs of [0, 45, 90, 600, 754]) {
      expect(parseDurationInput(formatDurationInput(secs))).toBe(secs);
    }
  });
});
