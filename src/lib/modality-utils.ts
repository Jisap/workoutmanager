import { ModalityConfig, type Modality } from './db/schema';

export function formatModalitySummary(
  modality: Modality | string | null | undefined,
  config: ModalityConfig | null | undefined
): string | null {
  if (!modality) return null;
  if (!config) return modality;

  switch (modality) {
    case 'AMRAP':
      return config.timeCapMinutes ? `AMRAP ${config.timeCapMinutes}'` : 'AMRAP';
    case 'For Time':
      return config.timeCapMinutes ? `For Time (Cap ${config.timeCapMinutes}')` : 'For Time';
    case 'AFAP':
      return config.timeCapMinutes ? `AFAP (Cap ${config.timeCapMinutes}')` : 'AFAP';
    case 'Chipper':
      return config.timeCapMinutes ? `Chipper (Cap ${config.timeCapMinutes}')` : 'Chipper';
    case 'EMOM': {
      const interval = config.intervalMinutes && config.intervalMinutes > 1 ? `E${config.intervalMinutes}MOM` : 'EMOM';
      const base = config.totalMinutes ? `${interval} ${config.totalMinutes}'` : interval;
      if (config.emomMode === 'alternate') return `${base} · alternos`;
      if (config.emomMode === 'shared') return `${base} · ambos`;
      return base;
    }
    case 'TABATA': {
      const work = config.workSeconds ?? 20;
      const rest = config.restSeconds ?? 10;
      const rounds = config.rounds ?? 8;
      const sets = config.sets && config.sets > 1 ? `${config.sets}×` : '';
      const base = `TABATA ${sets}${rounds}r (${work}/${rest}s)`;
      if (config.tabataMode === 'shared') return `${base} · rotando`;
      if (config.tabataMode === 'perExercise') return `${base} · c/u`;
      return base;
    }
    case 'HIIT': {
      const work = config.workSeconds ?? 40;
      const rest = config.restSeconds ?? 20;
      const rounds = config.rounds ?? 5;
      const sets = config.sets && config.sets > 1 ? `${config.sets}×` : '';
      return `HIIT ${sets}${rounds}r (${work}/${rest}s)`;
    }
    case 'Ladder': {
      const scheme = config.repScheme ? ` (${config.repScheme})` : '';
      const cap = config.timeCapMinutes ? ` · Cap ${config.timeCapMinutes}'` : '';
      return `Ladder${scheme}${cap}`;
    }
    default:
      return modality;
  }
}

export function calculateModalityEstimatedDuration(
  modality: Modality | string | null | undefined,
  config: ModalityConfig | null | undefined
): number | null {
  if (!modality || !config) return null;

  switch (modality) {
    case 'AMRAP':
    case 'For Time':
    case 'AFAP':
    case 'Chipper':
      return config.timeCapMinutes ? config.timeCapMinutes * 60 : null;
    case 'EMOM':
      return config.totalMinutes ? config.totalMinutes * 60 : null;
    case 'TABATA': {
      const work = config.workSeconds ?? 20;
      const rest = config.restSeconds ?? 10;
      const rounds = config.rounds ?? 8;
      const sets = config.sets ?? 1;
      const restBetweenSets = config.restBetweenSetsSeconds ?? 60;
      const singleSetSecs = (work + rest) * rounds;
      return singleSetSecs * sets + (sets > 1 ? restBetweenSets * (sets - 1) : 0);
    }
    case 'HIIT': {
      const work = config.workSeconds ?? 40;
      const rest = config.restSeconds ?? 20;
      const rounds = config.rounds ?? 5;
      const sets = config.sets ?? 3;
      const restBetweenSets = config.restBetweenSetsSeconds ?? 60;
      const singleSetSecs = (work + rest) * rounds;
      return singleSetSecs * sets + (sets > 1 ? restBetweenSets * (sets - 1) : 0);
    }
    case 'Ladder':
      return config.timeCapMinutes ? config.timeCapMinutes * 60 : null;
    default:
      return null;
  }
}

// ─── Esquema Ladder ("21-15-9") → [21, 15, 9] ───
// Acepta separadores -, ,, ;, espacios y rangos "1 a 10" / "1 to 10" / "10-9-...-1".
// Devuelve null si no hay números válidos (1-1000, máx 30 valores).
export function parseRepScheme(input: string | null | undefined): number[] | null {
  if (!input) return null;
  const s = input.trim().toLowerCase();
  if (!s) return null;

  // Rango explícito con solo 2 números: "1 a 10", "1 to 10", "1-10" ambiguo.
  // Solo expandimos cuando hay palabra "a"/"to" para no romper "21-15-9".
  const rangeMatch = s.match(/^(\d{1,4})\s*(a|al|to|hasta)\s*(\d{1,4})$/);
  if (rangeMatch) {
    const a = parseInt(rangeMatch[1], 10);
    const b = parseInt(rangeMatch[3], 10);
    if (a < 1 || b < 1 || a > 1000 || b > 1000) return null;
    const len = Math.abs(b - a) + 1;
    if (len > 30) return null;
    const out: number[] = [];
    if (a <= b) {
      for (let i = a; i <= b; i++) out.push(i);
    } else {
      for (let i = a; i >= b; i--) out.push(i);
    }
    return out;
  }

  const nums = (s.match(/\d+/g) || []).map((n) => parseInt(n, 10)).filter((n) => n >= 1 && n <= 1000);
  if (nums.length === 0 || nums.length > 30) return null;
  return nums;
}

export interface ModalitySeriesStructure {
  count: number;
  reps?: number[];
  label: string;
}

// Estructura de series que tiene sentido por modalidad (sin temporizadores).
// Solo crecimiento: nunca borra datos, el usuario reduce a mano si quiere.
export function getModalitySeriesStructure(
  modality: Modality | string | null | undefined,
  config: ModalityConfig | null | undefined
): ModalitySeriesStructure | null {
  if (!modality || !config) return null;

  switch (modality) {
    case 'EMOM': {
      const interval = Math.max(1, config.intervalMinutes || 1);
      const total = Math.max(interval, config.totalMinutes || 12);
      const count = Math.max(1, Math.min(60, Math.floor(total / interval)));
      const prefix = interval > 1 ? `E${interval}MOM` : 'EMOM';
      return { count, label: `${prefix} ${total}' → ${count} intervalos (Min 1-${count})` };
    }
    case 'TABATA': {
      const rounds = Math.max(1, Math.min(30, config.rounds ?? 8));
      const blocks = Math.max(1, Math.min(10, config.sets ?? 1));
      const count = Math.min(60, rounds * blocks);
      return {
        count,
        label: blocks > 1 ? `TABATA ${blocks} bloques × ${rounds}r → ${count} rondas` : `TABATA ${rounds}r → ${count} rondas`,
      };
    }
    case 'HIIT': {
      const rounds = Math.max(1, Math.min(30, config.rounds ?? 5));
      const blocks = Math.max(1, Math.min(10, config.sets ?? 3));
      const count = Math.min(60, rounds * blocks);
      return {
        count,
        label: `HIIT ${blocks} bloques × ${rounds}r → ${count} esfuerzos`,
      };
    }
    case 'Ladder': {
      const reps = parseRepScheme(config.repScheme);
      if (!reps) return null;
      return { count: reps.length, reps, label: `Ladder ${reps.join('-')} → ${reps.length} series` };
    }
    default:
      return null;
  }
}
