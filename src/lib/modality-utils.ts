import { ModalityConfig } from './db/schema';

export function formatModalitySummary(
  modality: string | null | undefined,
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
      return config.totalMinutes ? `${interval} ${config.totalMinutes}'` : interval;
    }
    case 'TABATA': {
      const work = config.workSeconds ?? 20;
      const rest = config.restSeconds ?? 10;
      const rounds = config.rounds ?? 8;
      const sets = config.sets && config.sets > 1 ? `${config.sets}×` : '';
      return `TABATA ${sets}${rounds}r (${work}/${rest}s)`;
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
  modality: string | null | undefined,
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
