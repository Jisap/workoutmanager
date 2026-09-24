import type { ModalityConfig } from '@/lib/db/schema';

// ─── Catálogo de WODs oficiales y benchmarks de CrossFit ─────────────────────
// Girls, Héroes y clásicos muy conocidos con su prescripción Rx oficial.
// Al cargar un WOD se rellenan: nombre, modalidad + config, ejercicios y series.
// Pesos en kg. División RX Hombres / RX Mujeres ajusta las cargas al cargar.

export type WodCategory = 'girl' | 'hero' | 'classic';

export type WodRxDivision = 'rx-men' | 'rx-women';

export interface WodMovementSpec {
  /** Nombres a buscar en el catálogo del usuario (en orden de preferencia) */
  searchQueries: string[];
  /** Nombre a mostrar si no existe en el catálogo del usuario */
  fallbackName: string;
  /** Rondas/series a crear para este movimiento */
  rounds: number;
  /** Reps por ronda (0 = a contar durante el WOD, ej. AMRAP por tiempo) */
  reps: number;
  /** Carga Rx hombres (kg) o null si es peso corporal / sin carga */
  weightMen: number | null;
  /** Carga Rx mujeres (kg) o null */
  weightWomen: number | null;
  /** Distancia por ronda en metros (running, remo...) o null */
  distance: number | null;
  /** Nota extra (altura de cajón, chaleco, etc.) */
  note?: string;
}

export interface OfficialWod {
  id: string;
  name: string;
  category: WodCategory;
  scheme: string; // Resumen corto: "21-15-9", "AMRAP 20'", "5 RFT"...
  /** Si existe, cada movimiento genera una serie por valor (ej. [21,15,9]) */
  ladder?: number[];
  description: string;
  modality: string; // Debe coincidir con MODALITY_OPTIONS del logger
  modalityConfig: ModalityConfig;
  rxNote: string; // "Rx 43/30 kg" etc.
  movements: WodMovementSpec[];
}

export const WOD_CATEGORY_LABELS: Record<WodCategory, string> = {
  girl: 'Las Chicas',
  hero: 'Héroes',
  classic: 'Clásicos',
};

const FT = (timeCapMinutes: number): ModalityConfig => ({ timeCapMinutes });
const AMRAP = (timeCapMinutes: number): ModalityConfig => ({ timeCapMinutes });

export const OFFICIAL_WODS: OfficialWod[] = [
  // ─── THE GIRLS ────────────────────────────────────────────────
  {
    id: 'fran',
    name: 'Fran',
    category: 'girl',
    scheme: '21-15-9',
    ladder: [21, 15, 9],
    description: 'El benchmark por excelencia. Thrusters + dominadas, sin pausa.',
    modality: 'For Time',
    modalityConfig: FT(10),
    rxNote: 'Rx 43/30 kg',
    movements: [
      { searchQueries: ['thruster', 'thrusters'], fallbackName: 'Thrusters', rounds: 3, reps: 0, weightMen: 43, weightWomen: 30, distance: null },
      { searchQueries: ['kipping pull-ups', 'dominadas (pull-ups)', 'pull-ups', 'dominadas'], fallbackName: 'Pull-ups', rounds: 3, reps: 0, weightMen: null, weightWomen: null, distance: null },
    ],
  },
  {
    id: 'helen',
    name: 'Helen',
    category: 'girl',
    scheme: '3 RFT',
    description: '3 rondas: 400 m carrera, 21 swings con kettlebell y 12 dominadas.',
    modality: 'For Time',
    modalityConfig: FT(20),
    rxNote: 'Rx KB 24/16 kg',
    movements: [
      { searchQueries: ['running (400m)', 'running', 'correr', 'carrera'], fallbackName: 'Running (400m)', rounds: 3, reps: 0, weightMen: null, weightWomen: null, distance: 400 },
      { searchQueries: ['kettlebell swing', 'swing'], fallbackName: 'Kettlebell Swing', rounds: 3, reps: 21, weightMen: 24, weightWomen: 16, distance: null },
      { searchQueries: ['kipping pull-ups', 'dominadas (pull-ups)', 'pull-ups', 'dominadas'], fallbackName: 'Pull-ups', rounds: 3, reps: 12, weightMen: null, weightWomen: null, distance: null },
    ],
  },
  {
    id: 'grace',
    name: 'Grace',
    category: 'girl',
    scheme: '30 reps',
    description: '30 clean & jerks a toda velocidad. Potencia y técnica bajo fatiga.',
    modality: 'For Time',
    modalityConfig: FT(10),
    rxNote: 'Rx 60/43 kg',
    movements: [
      { searchQueries: ['clean and jerk', 'clean & jerk', 'dos tiempos'], fallbackName: 'Clean and Jerk', rounds: 1, reps: 30, weightMen: 60, weightWomen: 43, distance: null },
    ],
  },
  {
    id: 'isabel',
    name: 'Isabel',
    category: 'girl',
    scheme: '30 reps',
    description: '30 snatches. La hermana rápida de Grace, pura arrancada.',
    modality: 'For Time',
    modalityConfig: FT(10),
    rxNote: 'Rx 60/43 kg',
    movements: [
      { searchQueries: ['power snatch', 'snatch', 'arrancada'], fallbackName: 'Snatch', rounds: 1, reps: 30, weightMen: 60, weightWomen: 43, distance: null },
    ],
  },
  {
    id: 'karen',
    name: 'Karen',
    category: 'girl',
    scheme: '150 reps',
    description: '150 wall balls. Simple en el papel, brutal en las piernas.',
    modality: 'For Time',
    modalityConfig: FT(15),
    rxNote: 'Rx balón 9/6 kg',
    movements: [
      { searchQueries: ['wall balls', 'wall ball', 'balon medicinal'], fallbackName: 'Wall Balls', rounds: 1, reps: 150, weightMen: 9, weightWomen: 6, distance: null },
    ],
  },
  {
    id: 'diane',
    name: 'Diane',
    category: 'girl',
    scheme: '21-15-9',
    ladder: [21, 15, 9],
    description: 'Peso muerto pesado + flexiones en pino. Cadena posterior y hombros.',
    modality: 'For Time',
    modalityConfig: FT(15),
    rxNote: 'Rx 102/70 kg',
    movements: [
      { searchQueries: ['peso muerto', 'deadlift'], fallbackName: 'Peso Muerto', rounds: 3, reps: 0, weightMen: 102, weightWomen: 70, distance: null },
      { searchQueries: ['handstand push-ups', 'hspu', 'pino'], fallbackName: 'Handstand Push-ups', rounds: 3, reps: 0, weightMen: null, weightWomen: null, distance: null },
    ],
  },
  {
    id: 'elizabeth',
    name: 'Elizabeth',
    category: 'girl',
    scheme: '21-15-9',
    ladder: [21, 15, 9],
    description: 'Sentadilla cargada desde el suelo (squat clean) + fondos en anillas.',
    modality: 'For Time',
    modalityConfig: FT(15),
    rxNote: 'Rx 60/43 kg',
    movements: [
      { searchQueries: ['squat clean', 'power clean', 'clean'], fallbackName: 'Squat Clean', rounds: 3, reps: 0, weightMen: 60, weightWomen: 43, distance: null },
      { searchQueries: ['ring dips', 'fondos en anillas', 'fondos en paralelas'], fallbackName: 'Ring Dips', rounds: 3, reps: 0, weightMen: null, weightWomen: null, distance: null },
    ],
  },
  {
    id: 'annie',
    name: 'Annie',
    category: 'girl',
    scheme: '50-40-30-20-10',
    ladder: [50, 40, 30, 20, 10],
    description: 'Saltos dobles de comba + abdominales, de 50 a 10 repeticiones.',
    modality: 'For Time',
    modalityConfig: FT(15),
    rxNote: 'Rx sin escalado',
    movements: [
      { searchQueries: ['double-unders', 'dobles', 'comba'], fallbackName: 'Double-unders', rounds: 5, reps: 0, weightMen: null, weightWomen: null, distance: null },
      { searchQueries: ['sit-ups', 'abdominales', 'crunch'], fallbackName: 'Sit-ups', rounds: 5, reps: 0, weightMen: null, weightWomen: null, distance: null },
    ],
  },
  {
    id: 'cindy',
    name: 'Cindy',
    category: 'girl',
    scheme: "AMRAP 20'",
    description: '20 minutos: 5 dominadas, 10 flexiones y 15 sentadillas al aire.',
    modality: 'AMRAP',
    modalityConfig: AMRAP(20),
    rxNote: 'Rx peso corporal',
    movements: [
      { searchQueries: ['kipping pull-ups', 'dominadas (pull-ups)', 'pull-ups', 'dominadas'], fallbackName: 'Pull-ups', rounds: 8, reps: 5, weightMen: null, weightWomen: null, distance: null },
      { searchQueries: ['push-ups', 'flexiones', 'push ups'], fallbackName: 'Push-ups', rounds: 8, reps: 10, weightMen: null, weightWomen: null, distance: null },
      { searchQueries: ['air squats', 'sentadilla al aire', 'sentadillas'], fallbackName: 'Air Squats', rounds: 8, reps: 15, weightMen: null, weightWomen: null, distance: null },
    ],
  },
  {
    id: 'mary',
    name: 'Mary',
    category: 'girl',
    scheme: "AMRAP 20'",
    description: 'La versión avanzada de Cindy: pino, pistols y dominadas.',
    modality: 'AMRAP',
    modalityConfig: AMRAP(20),
    rxNote: 'Rx peso corporal',
    movements: [
      { searchQueries: ['handstand push-ups', 'hspu', 'pino'], fallbackName: 'Handstand Push-ups', rounds: 6, reps: 5, weightMen: null, weightWomen: null, distance: null },
      { searchQueries: ['pistol squats', 'pistol'], fallbackName: 'Pistol Squats', rounds: 6, reps: 10, weightMen: null, weightWomen: null, distance: null },
      { searchQueries: ['kipping pull-ups', 'dominadas (pull-ups)', 'pull-ups', 'dominadas'], fallbackName: 'Pull-ups', rounds: 6, reps: 15, weightMen: null, weightWomen: null, distance: null },
    ],
  },
  {
    id: 'nancy',
    name: 'Nancy',
    category: 'girl',
    scheme: '5 RFT',
    description: '5 rondas: 400 m carrera + 15 sentadillas con barra sobre la cabeza.',
    modality: 'For Time',
    modalityConfig: FT(25),
    rxNote: 'Rx 43/30 kg',
    movements: [
      { searchQueries: ['running (400m)', 'running', 'correr', 'carrera'], fallbackName: 'Running (400m)', rounds: 5, reps: 0, weightMen: null, weightWomen: null, distance: 400 },
      { searchQueries: ['overhead squat', 'sentadilla sobre la cabeza'], fallbackName: 'Overhead Squat', rounds: 5, reps: 15, weightMen: 43, weightWomen: 30, distance: null },
    ],
  },
  {
    id: 'angie',
    name: 'Angie',
    category: 'girl',
    scheme: '100-100-100-100',
    description: '100 dominadas, 100 flexiones, 100 abdominales y 100 sentadillas.',
    modality: 'Chipper',
    modalityConfig: FT(30),
    rxNote: 'Rx peso corporal',
    movements: [
      { searchQueries: ['kipping pull-ups', 'dominadas (pull-ups)', 'pull-ups', 'dominadas'], fallbackName: 'Pull-ups', rounds: 1, reps: 100, weightMen: null, weightWomen: null, distance: null },
      { searchQueries: ['push-ups', 'flexiones', 'push ups'], fallbackName: 'Push-ups', rounds: 1, reps: 100, weightMen: null, weightWomen: null, distance: null },
      { searchQueries: ['sit-ups', 'abdominales', 'crunch'], fallbackName: 'Sit-ups', rounds: 1, reps: 100, weightMen: null, weightWomen: null, distance: null },
      { searchQueries: ['air squats', 'sentadilla al aire', 'sentadillas'], fallbackName: 'Air Squats', rounds: 1, reps: 100, weightMen: null, weightWomen: null, distance: null },
    ],
  },
  {
    id: 'chelsea',
    name: 'Chelsea',
    category: 'girl',
    scheme: "EMOM 30'",
    description: 'Cada minuto durante 30 min: 5 dominadas, 10 flexiones, 15 sentadillas.',
    modality: 'EMOM',
    modalityConfig: { intervalMinutes: 1, totalMinutes: 30 },
    rxNote: 'Rx peso corporal',
    movements: [
      { searchQueries: ['kipping pull-ups', 'dominadas (pull-ups)', 'pull-ups', 'dominadas'], fallbackName: 'Pull-ups', rounds: 10, reps: 5, weightMen: null, weightWomen: null, distance: null },
      { searchQueries: ['push-ups', 'flexiones', 'push ups'], fallbackName: 'Push-ups', rounds: 10, reps: 10, weightMen: null, weightWomen: null, distance: null },
      { searchQueries: ['air squats', 'sentadilla al aire', 'sentadillas'], fallbackName: 'Air Squats', rounds: 10, reps: 15, weightMen: null, weightWomen: null, distance: null },
    ],
  },
  {
    id: 'barbara',
    name: 'Barbara',
    category: 'girl',
    scheme: '5 RFT + descanso',
    description: '5 rondas de 20-30-40-50 (dominadas, flexiones, abdominales, sentadillas) con 3 min de descanso entre rondas.',
    modality: 'For Time',
    modalityConfig: FT(45),
    rxNote: 'Rx + 3 min descanso/ronda',
    movements: [
      { searchQueries: ['kipping pull-ups', 'dominadas (pull-ups)', 'pull-ups', 'dominadas'], fallbackName: 'Pull-ups', rounds: 5, reps: 20, weightMen: null, weightWomen: null, distance: null },
      { searchQueries: ['push-ups', 'flexiones', 'push ups'], fallbackName: 'Push-ups', rounds: 5, reps: 30, weightMen: null, weightWomen: null, distance: null },
      { searchQueries: ['sit-ups', 'abdominales', 'crunch'], fallbackName: 'Sit-ups', rounds: 5, reps: 40, weightMen: null, weightWomen: null, distance: null },
      { searchQueries: ['air squats', 'sentadilla al aire', 'sentadillas'], fallbackName: 'Air Squats', rounds: 5, reps: 50, weightMen: null, weightWomen: null, distance: null },
    ],
  },
  {
    id: 'jackie',
    name: 'Jackie',
    category: 'girl',
    scheme: '1000-50-30',
    description: '1000 m de remo, 50 thrusters ligeros y 30 dominadas.',
    modality: 'For Time',
    modalityConfig: FT(20),
    rxNote: 'Rx 20/15 kg',
    movements: [
      { searchQueries: ['remo (1000m)', 'remo', 'row', 'rower'], fallbackName: 'Remo (1000m)', rounds: 1, reps: 0, weightMen: null, weightWomen: null, distance: 1000 },
      { searchQueries: ['thruster', 'thrusters'], fallbackName: 'Thrusters', rounds: 1, reps: 50, weightMen: 20, weightWomen: 15, distance: null },
      { searchQueries: ['kipping pull-ups', 'dominadas (pull-ups)', 'pull-ups', 'dominadas'], fallbackName: 'Pull-ups', rounds: 1, reps: 30, weightMen: null, weightWomen: null, distance: null },
    ],
  },
  {
    id: 'kelly',
    name: 'Kelly',
    category: 'girl',
    scheme: '5 RFT',
    description: '5 rondas: 400 m carrera, 30 saltos al cajón y 30 wall balls.',
    modality: 'For Time',
    modalityConfig: FT(30),
    rxNote: 'Rx cajón 60/50 cm · balón 9/6 kg',
    movements: [
      { searchQueries: ['running (400m)', 'running', 'correr', 'carrera'], fallbackName: 'Running (400m)', rounds: 5, reps: 0, weightMen: null, weightWomen: null, distance: 400 },
      { searchQueries: ['box jumps', 'salto al cajon', 'cajon'], fallbackName: 'Box Jumps', rounds: 5, reps: 30, weightMen: null, weightWomen: null, distance: null, note: 'Cajón 60/50 cm' },
      { searchQueries: ['wall balls', 'wall ball', 'balon medicinal'], fallbackName: 'Wall Balls', rounds: 5, reps: 30, weightMen: 9, weightWomen: 6, distance: null },
    ],
  },
  {
    id: 'randy',
    name: 'Randy',
    category: 'girl',
    scheme: '75 reps',
    description: '75 power snatches ligeros. Homenaje al agente Randy Simmons.',
    modality: 'For Time',
    modalityConfig: FT(12),
    rxNote: 'Rx 34/25 kg',
    movements: [
      { searchQueries: ['power snatch', 'snatch', 'arrancada'], fallbackName: 'Power Snatch', rounds: 1, reps: 75, weightMen: 34, weightWomen: 25, distance: null },
    ],
  },
  // ─── HÉROES ───────────────────────────────────────────────────
  {
    id: 'murph',
    name: 'Murph',
    category: 'hero',
    scheme: '1600-100-200-300-1600',
    description: 'En honor al teniente Michael Murphy. 1 milla, 100 dominadas, 200 flexiones, 300 sentadillas y otra milla. Con chaleco 9/6 kg si te atreves.',
    modality: 'Chipper',
    modalityConfig: FT(60),
    rxNote: 'Rx chaleco 9/6 kg (opcional)',
    movements: [
      { searchQueries: ['running (1000m)', 'running', 'correr', 'carrera'], fallbackName: 'Running (1600m)', rounds: 1, reps: 0, weightMen: null, weightWomen: null, distance: 1600 },
      { searchQueries: ['kipping pull-ups', 'dominadas (pull-ups)', 'pull-ups', 'dominadas'], fallbackName: 'Pull-ups', rounds: 10, reps: 10, weightMen: null, weightWomen: null, distance: null, note: 'Partible estilo Cindy: 20× (5-10-15)' },
      { searchQueries: ['push-ups', 'flexiones', 'push ups'], fallbackName: 'Push-ups', rounds: 10, reps: 20, weightMen: null, weightWomen: null, distance: null },
      { searchQueries: ['air squats', 'sentadilla al aire', 'sentadillas'], fallbackName: 'Air Squats', rounds: 10, reps: 30, weightMen: null, weightWomen: null, distance: null },
      { searchQueries: ['running (1000m)', 'running', 'correr', 'carrera'], fallbackName: 'Running (1600m)', rounds: 1, reps: 0, weightMen: null, weightWomen: null, distance: 1600 },
    ],
  },
  {
    id: 'dt',
    name: 'DT',
    category: 'hero',
    scheme: '5 RFT 12-9-6',
    description: 'En honor al sargento Timothy Davis. 5 rondas: 12 pesos muertos, 9 cargadas colgadas y 6 empujones.',
    modality: 'For Time',
    modalityConfig: FT(15),
    rxNote: 'Rx 70/48 kg',
    movements: [
      { searchQueries: ['peso muerto', 'deadlift'], fallbackName: 'Peso Muerto', rounds: 5, reps: 12, weightMen: 70, weightWomen: 48, distance: null },
      { searchQueries: ['hang power clean', 'power clean', 'clean'], fallbackName: 'Hang Power Clean', rounds: 5, reps: 9, weightMen: 70, weightWomen: 48, distance: null },
      { searchQueries: ['push jerk', 'jerk', 'push press'], fallbackName: 'Push Jerk', rounds: 5, reps: 6, weightMen: 70, weightWomen: 48, distance: null },
    ],
  },
  {
    id: 'jt',
    name: 'JT',
    category: 'hero',
    scheme: '21-15-9',
    ladder: [21, 15, 9],
    description: 'En honor al suboficial Jeff Taylor. Tripleta de empuje gimnástico.',
    modality: 'For Time',
    modalityConfig: FT(20),
    rxNote: 'Rx peso corporal',
    movements: [
      { searchQueries: ['handstand push-ups', 'hspu', 'pino'], fallbackName: 'Handstand Push-ups', rounds: 3, reps: 0, weightMen: null, weightWomen: null, distance: null },
      { searchQueries: ['ring dips', 'fondos en anillas', 'fondos en paralelas'], fallbackName: 'Ring Dips', rounds: 3, reps: 0, weightMen: null, weightWomen: null, distance: null },
      { searchQueries: ['push-ups', 'flexiones', 'push ups'], fallbackName: 'Push-ups', rounds: 3, reps: 0, weightMen: null, weightWomen: null, distance: null },
    ],
  },
  {
    id: 'kalsu',
    name: 'Kalsu',
    category: 'hero',
    scheme: '100 thrusters + EMOM',
    description: 'En honor al teniente Robert Kalsu. 100 thrusters pesados, pero cada minuto debes parar y hacer 5 burpees. Empieza con burpees.',
    modality: 'For Time',
    modalityConfig: FT(30),
    rxNote: 'Rx 60/43 kg + 5 burpees EMOM',
    movements: [
      { searchQueries: ['thruster', 'thrusters'], fallbackName: 'Thrusters', rounds: 5, reps: 20, weightMen: 60, weightWomen: 43, distance: null },
      { searchQueries: ['burpee', 'burpees'], fallbackName: 'Burpees', rounds: 5, reps: 5, weightMen: null, weightWomen: null, distance: null, note: '5 al inicio de cada minuto' },
    ],
  },
  // ─── CLÁSICOS ─────────────────────────────────────────────────
  {
    id: 'filthy-fifty',
    name: 'Filthy Fifty',
    category: 'classic',
    scheme: 'Chipper 10×50',
    description: '50 reps de 10 movimientos: cajón, dominadas saltando, KB, zancadas, rodillas al pecho, push press, hiperextensiones, wall balls, burpees y dobles.',
    modality: 'Chipper',
    modalityConfig: FT(35),
    rxNote: 'Rx KB 16/12 · balón 9/6',
    movements: [
      { searchQueries: ['box jumps', 'salto al cajon', 'cajon'], fallbackName: 'Box Jumps', rounds: 1, reps: 50, weightMen: null, weightWomen: null, distance: null },
      { searchQueries: ['kipping pull-ups', 'dominadas (pull-ups)', 'pull-ups', 'dominadas'], fallbackName: 'Jumping Pull-ups', rounds: 1, reps: 50, weightMen: null, weightWomen: null, distance: null },
      { searchQueries: ['kettlebell swing', 'swing'], fallbackName: 'Kettlebell Swing', rounds: 1, reps: 50, weightMen: 16, weightWomen: 12, distance: null },
      { searchQueries: ['zancadas', 'lunges', 'sandbag'], fallbackName: 'Zancadas', rounds: 1, reps: 50, weightMen: null, weightWomen: null, distance: null },
      { searchQueries: ['toes to bar', 'rodillas al pecho', 'knees'], fallbackName: 'Toes to Bar', rounds: 1, reps: 50, weightMen: null, weightWomen: null, distance: null },
      { searchQueries: ['push press', 'push jerk', 'press militar'], fallbackName: 'Push Press', rounds: 1, reps: 50, weightMen: 20, weightWomen: 15, distance: null },
      { searchQueries: ['hiperextension', 'ghd', 'back extension'], fallbackName: 'Hiperextensiones', rounds: 1, reps: 50, weightMen: null, weightWomen: null, distance: null },
      { searchQueries: ['wall balls', 'wall ball', 'balon medicinal'], fallbackName: 'Wall Balls', rounds: 1, reps: 50, weightMen: 9, weightWomen: 6, distance: null },
      { searchQueries: ['burpee', 'burpees'], fallbackName: 'Burpees', rounds: 1, reps: 50, weightMen: null, weightWomen: null, distance: null },
      { searchQueries: ['double-unders', 'dobles', 'comba'], fallbackName: 'Double-unders', rounds: 1, reps: 50, weightMen: null, weightWomen: null, distance: null },
    ],
  },
  {
    id: 'fight-gone-bad',
    name: 'Fight Gone Bad',
    category: 'classic',
    scheme: '3 rondas × 5 estaciones',
    description: '3 rondas de 1 min por estación (wall ball, sumo deadlift high pull, cajón, push press y remo) con 1 min de descanso entre rondas. Cuenta todas tus reps.',
    modality: 'AMRAP',
    modalityConfig: AMRAP(17),
    rxNote: 'Rx 9/6 kg · 34/25 kg · cajón 50 cm',
    movements: [
      { searchQueries: ['wall balls', 'wall ball', 'balon medicinal'], fallbackName: 'Wall Balls', rounds: 3, reps: 0, weightMen: 9, weightWomen: 6, distance: null, note: 'Máx reps en 1 min' },
      { searchQueries: ['sumo deadlift high pull', 'sumo', 'high pull'], fallbackName: 'Sumo Deadlift High Pull', rounds: 3, reps: 0, weightMen: 34, weightWomen: 25, distance: null, note: 'Máx reps en 1 min' },
      { searchQueries: ['box jumps', 'salto al cajon', 'cajon'], fallbackName: 'Box Jumps', rounds: 3, reps: 0, weightMen: null, weightWomen: null, distance: null, note: 'Máx reps en 1 min · cajón 50 cm' },
      { searchQueries: ['push press', 'push jerk', 'press militar'], fallbackName: 'Push Press', rounds: 3, reps: 0, weightMen: 34, weightWomen: 25, distance: null, note: 'Máx reps en 1 min' },
      { searchQueries: ['remo', 'row', 'rower', 'bike'], fallbackName: 'Remo (calorías)', rounds: 3, reps: 0, weightMen: null, weightWomen: null, distance: null, note: 'Máx calorías en 1 min' },
    ],
  },
  {
    id: 'eva',
    name: 'Eva',
    category: 'girl',
    scheme: '5 RFT',
    description: '5 rondas: 800 m carrera, 30 swings americanos con KB y 30 dominadas.',
    modality: 'For Time',
    modalityConfig: FT(40),
    rxNote: 'Rx KB 32/24 kg',
    movements: [
      { searchQueries: ['running (1000m)', 'running', 'correr', 'carrera'], fallbackName: 'Running (800m)', rounds: 5, reps: 0, weightMen: null, weightWomen: null, distance: 800 },
      { searchQueries: ['kettlebell swing', 'swing'], fallbackName: 'Kettlebell Swing (americano)', rounds: 5, reps: 30, weightMen: 32, weightWomen: 24, distance: null },
      { searchQueries: ['kipping pull-ups', 'dominadas (pull-ups)', 'pull-ups', 'dominadas'], fallbackName: 'Pull-ups', rounds: 5, reps: 30, weightMen: null, weightWomen: null, distance: null },
    ],
  },
  {
    id: 'lynne',
    name: 'Lynne',
    category: 'girl',
    scheme: '5 rondas a máx',
    description: '5 rondas de máximas reps: press de banca con peso corporal + dominadas. Descansa lo que necesites entre rondas.',
    modality: 'AMRAP',
    modalityConfig: { ...AMRAP(30), notes: '5 rondas de máximas reps, descanso libre entre rondas' },
    rxNote: 'Rx press con peso corporal',
    movements: [
      { searchQueries: ['press de banca', 'bench press', 'press banca'], fallbackName: 'Press de Banca', rounds: 5, reps: 0, weightMen: null, weightWomen: null, distance: null, note: 'Peso corporal · máx reps' },
      { searchQueries: ['kipping pull-ups', 'dominadas (pull-ups)', 'pull-ups', 'dominadas'], fallbackName: 'Pull-ups', rounds: 5, reps: 0, weightMen: null, weightWomen: null, distance: null, note: 'Máx reps' },
    ],
  },
];
