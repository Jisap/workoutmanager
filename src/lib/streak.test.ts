import { describe, expect, it } from 'vitest';
import { calculateStreaks, normalizeDay } from './streak';

function day(y: number, m: number, d: number): number {
  return new Date(y, m, d).getTime();
}

describe('normalizeDay', () => {
  it('misma fecha a distintas horas → mismo valor', () => {
    const a = normalizeDay(new Date(2026, 8, 20, 8, 30));
    const b = normalizeDay(new Date(2026, 8, 20, 22, 15));
    expect(a).toBe(b);
  });

  it('días distintos → valores distintos', () => {
    expect(normalizeDay(new Date(2026, 8, 20))).not.toBe(normalizeDay(new Date(2026, 8, 21)));
  });
});

describe('calculateStreaks', () => {
  it('vacío → ceros', () => {
    expect(calculateStreaks([])).toEqual({ currentStreak: 0, longestStreak: 0, totalDays: 0 });
  });

  it('un solo día entrenado hoy → racha 1', () => {
    const today = new Date(2026, 8, 20, 12, 0);
    const res = calculateStreaks([day(2026, 8, 20)], today);
    expect(res).toEqual({ currentStreak: 1, longestStreak: 1, totalDays: 1 });
  });

  it('3 días consecutivos → racha 3', () => {
    const today = new Date(2026, 8, 20);
    const res = calculateStreaks([day(2026, 8, 18), day(2026, 8, 19), day(2026, 8, 20)], today);
    expect(res.currentStreak).toBe(3);
    expect(res.longestStreak).toBe(3);
    expect(res.totalDays).toBe(3);
  });

  it('entrenar ayer también mantiene la racha viva', () => {
    const today = new Date(2026, 8, 20);
    const res = calculateStreaks([day(2026, 8, 18), day(2026, 8, 19)], today);
    expect(res.currentStreak).toBe(2);
  });

  it('hueco de 2+ días rompe la racha actual pero conserva la mejor', () => {
    const today = new Date(2026, 8, 20);
    const res = calculateStreaks(
      [day(2026, 8, 10), day(2026, 8, 11), day(2026, 8, 12), day(2026, 8, 20)],
      today
    );
    expect(res.currentStreak).toBe(1);
    expect(res.longestStreak).toBe(3);
    expect(res.totalDays).toBe(4);
  });

  it('último entreno hace 3 días → racha actual 0', () => {
    const today = new Date(2026, 8, 20);
    const res = calculateStreaks([day(2026, 8, 15), day(2026, 8, 16)], today);
    expect(res.currentStreak).toBe(0);
    expect(res.longestStreak).toBe(2);
  });

  it('días duplicados se deduplican', () => {
    const today = new Date(2026, 8, 20);
    const d = day(2026, 8, 20);
    const res = calculateStreaks([d, d, d], today);
    expect(res.totalDays).toBe(1);
    expect(res.currentStreak).toBe(1);
  });

  it('desordenados se ordenan solos', () => {
    const today = new Date(2026, 8, 20);
    const res = calculateStreaks([day(2026, 8, 20), day(2026, 8, 18), day(2026, 8, 19)], today);
    expect(res.currentStreak).toBe(3);
  });

  it('racha larga detecta el mejor tramo aunque no sea el último', () => {
    const today = new Date(2026, 8, 30);
    const days = [
      day(2026, 8, 1),
      day(2026, 8, 2),
      day(2026, 8, 3),
      day(2026, 8, 4),
      day(2026, 8, 5),
      day(2026, 8, 20),
      day(2026, 8, 21),
    ];
    const res = calculateStreaks(days, today);
    expect(res.longestStreak).toBe(5);
    // último entreno hace 9 días → racha muerta
    expect(res.currentStreak).toBe(0);
  });
});
