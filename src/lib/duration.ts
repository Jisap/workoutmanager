// Helpers únicos para tiempos mm:ss <-> segundos.
// Antes duplicados en workout-logger-client.tsx y workout-history-client.tsx.

export function formatDurationInput(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null || Number.isNaN(totalSeconds) || totalSeconds < 0) return '';
  const m = Math.floor(totalSeconds / 60);
  const s = Math.round(totalSeconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function parseDurationInput(value: string): number | null {
  const v = value.trim();
  if (!v) return null;
  if (v.includes(':')) {
    const parts = v.split(':').map((p) => p.trim());
    if (parts.length !== 2) return null;
    const m = Number.parseInt(parts[0], 10);
    const s = Number.parseInt(parts[1], 10);
    if (Number.isNaN(m) || Number.isNaN(s) || m < 0 || s < 0 || s >= 60) return null;
    return m * 60 + s;
  }
  const num = Number.parseFloat(v.replace(',', '.'));
  if (Number.isNaN(num) || num < 0) return null;
  // >=30 se interpreta como segundos ("270" -> 270s), si no como minutos decimales ("4.5" -> 270s)
  if (num >= 30) return Math.round(num);
  return Math.round(num * 60);
}

// Alias históricos para no romper imports existentes.
export const formatMMSS = formatDurationInput;
export const parseMMSS = parseDurationInput;
