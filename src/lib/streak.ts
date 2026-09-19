// Cálculo único de rachas. Antes duplicado en getConsistencyData y getAdvancedProgressData.

export interface StreakResult {
  currentStreak: number;
  longestStreak: number;
  totalDays: number;
}

const DAY_MS = 1000 * 60 * 60 * 24;

export function normalizeDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function calculateStreaks(dayTimes: number[], now: Date = new Date()): StreakResult {
  const unique = [...new Set(dayTimes)].sort((a, b) => a - b);
  if (unique.length === 0) return { currentStreak: 0, longestStreak: 0, totalDays: 0 };

  let longestStreak = 0;
  let tempStreak = 0;

  for (let i = 0; i < unique.length; i++) {
    const current = unique[i];
    const prev = i > 0 ? unique[i - 1] : null;
    if (prev == null) {
      tempStreak = 1;
    } else {
      const diffDays = Math.round((current - prev) / DAY_MS);
      if (diffDays === 1) {
        tempStreak++;
      } else if (diffDays === 0) {
        // mismo día duplicado (ya deduplicado, pero tolerante)
      } else {
        if (tempStreak > longestStreak) longestStreak = tempStreak;
        tempStreak = 1;
      }
    }
  }
  if (tempStreak > longestStreak) longestStreak = tempStreak;

  const todayNormalized = normalizeDay(now);
  const lastDate = unique[unique.length - 1];
  const diffFromToday = Math.round((todayNormalized - lastDate) / DAY_MS);
  const currentStreak = diffFromToday <= 1 ? tempStreak : 0;

  return { currentStreak, longestStreak, totalDays: unique.length };
}
