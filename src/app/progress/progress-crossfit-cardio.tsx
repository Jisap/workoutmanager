'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Zap,
  Heart,
  Flame,
  Clock,
  Award,
  Timer,
  Activity,
  Trophy,
  BarChart3,
  TrendingUp,
  Layers,
  CheckCircle2,
  Dumbbell,
  Compass,
  ArrowDownRight,
  TrendingDown,
  Sparkles,
  Repeat,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { type ModalityConfig } from '@/lib/db/schema';
import { formatModalitySummary } from '@/lib/modality-utils';

interface LiftStats {
  name: string;
  maxWeightReal: number;
  estimated1RM: number;
  totalSets: number;
  history: {
    date: string;
    weight: number;
    reps: number;
    estimated1RM: number;
    workoutName: string;
    workoutType?: string | null;
  }[];
  dailyHistory: {
    date: string;
    weight: number;
    reps: number;
    estimated1RM: number;
    workoutName: string;
    workoutType?: string | null;
  }[];
  allSources?: {
    snatch: Omit<LiftStats, 'allSources' | 'sourceInfo'>;
    cleanAndJerk: Omit<LiftStats, 'allSources' | 'sourceInfo'>;
    totalOlympic: number;
  };
  sourceInfo?: {
    strictMode: boolean;
    excludedSets: number;
  };
}

interface BenchmarkItem {
  name: string;
  workoutType?: string;
  attempts: number;
  isOfficial?: boolean;
  bestTimeSeconds: number | null;
  bestRxTimeSeconds?: number | null;
  bestScaledTimeSeconds?: number | null;
  bestScoreRounds?: number | null;
  bestScoreReps?: number | null;
  isRx: boolean;
  deltaSeconds: number | null;
  history: {
    workoutId?: number;
    date: string;
    timeSeconds: number | null;
    timeMinutes: number;
    isRx: boolean;
    notes: string | null;
    workoutType?: string;
    scoreRounds?: number | null;
    scoreReps?: number | null;
  }[];
}

interface CardioPB {
  discipline: string;
  distance: number;
  bestTimeSeconds: number;
  pace: string;
  date: string;
  workoutName: string;
}

interface HyroxStation {
  id: string;
  stationNumber: number;
  name: string;
  officialStandard: string;
  category: 'cardio' | 'power' | 'endurance';
  bestTimeSeconds: number | null;
  bestPace: string | null;
  bestWeightKg: number | null;
  bestReps: number | null;
  bestDistanceM: number | null;
  totalSets: number;
  lastDate: string | null;
  history: {
    workoutId?: number;
    date: string;
    timeSeconds: number | null;
    distance: number | null;
    weight: number | null;
    reps: number | null;
    workoutName: string;
  }[];
}

interface HyroxEvent {
  name: string;
  attempts: number;
  bestTimeSeconds: number | null;
  deltaSeconds: number | null;
  history: {
    date: string;
    timeSeconds: number | null;
    timeMinutes: number;
    notes: string | null;
  }[];
}

interface HyroxBalance {
  totalRunSeconds: number;
  totalStationsSeconds: number;
  runPercentage: number;
  stationsPercentage: number;
  hasSplitData: boolean;
}

interface ProgressCrossfitCardioProps {
  crossfit: {
    totalWods: number;
    rxStats?: {
      rxWodsCount: number;
      scaledWodsCount: number;
      totalWods: number;
      rxPercentage: number;
    };
    timeCapStats?: {
      wodsWithCap: number;
      finishedUnderCap: number;
      capSuccessRate: number;
    };
    olympic?: {
      snatch: LiftStats;
      cleanAndJerk: LiftStats;
      totalOlympic: number;
      allSources?: {
        snatch: LiftStats;
        cleanAndJerk: LiftStats;
        totalOlympic: number;
      };
      sourceInfo?: {
        strictMode: boolean;
        excludedSets: number;
      };
    };
    benchmarks?: BenchmarkItem[];
    cardioPBs?: CardioPB[];
    wods: {
      id: number;
      name: string;
      date: string;
      modality?: string | null;
      modalityConfig?: ModalityConfig | null;
      totalTimeMinutes: number;
      totalTimeSeconds?: number | null;
      exercisesCount: number;
      isRx?: boolean;
      notes: string | null;
    }[];
    modalityBreakdown?: {
      modality: string;
      count: number;
      percentage: number;
    }[];
    fastestForTime?: {
      id: number;
      name: string;
      modality: string | null;
      modalityConfig?: ModalityConfig | null;
      date: string;
      totalTimeMinutes: number;
      totalTimeSeconds: number | null;
    }[];
  };
  hyroxCardio: {
    totalMinutes: number;
    totalSessions: number;
    cardioPBs?: CardioPB[];
    stations?: HyroxStation[];
    events?: HyroxEvent[];
    balance?: HyroxBalance;
    runs?: {
      workoutId?: number;
      date: string;
      timeSeconds: number;
      distance: number | null;
      workoutName: string;
    }[];
    sessions: {
      id: number;
      name: string;
      date: string;
      modality?: string | null;
      modalityConfig?: ModalityConfig | null;
      totalTimeMinutes: number;
      totalTimeSeconds?: number | null;
      notes: string | null;
      segments?: {
        name: string;
        orderIndex: number;
        distance: number | null;
        durationSeconds: number | null;
        weight: number | null;
        reps: number | null;
      }[];
    }[];
    modalityBreakdown?: {
      modality: string;
      count: number;
      percentage?: number;
    }[];
  };
}

function formatSecondsToTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Delta de mejora en formato m:ss (ej. "−900 seg" → "−15:00")
function formatDeltaTime(seconds: number): string {
  const abs = Math.abs(Math.round(seconds));
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  const sign = seconds > 0 ? '−' : seconds < 0 ? '+' : '';
  return `${sign}${m}:${String(s).padStart(2, '0')}`;
}

function formatScore(rounds: number | null | undefined, reps: number | null | undefined): string {
  if (rounds == null) return '—';
  return reps != null && reps > 0 ? `${rounds}+${reps}` : `${rounds}`;
}

export function ProgressCrossfitCardio({ crossfit, hyroxCardio }: ProgressCrossfitCardioProps) {
  const [selectedModalityFilter, setSelectedModalityFilter] = useState<string>('all');
  const [selectedHyroxModalityFilter, setSelectedHyroxModalityFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'benchmarks' | 'olympic' | 'hyrox' | 'cardioPbs'>('benchmarks');
  const [benchmarkCategory, setBenchmarkCategory] = useState<'all' | 'official' | 'custom'>('all');
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [stationHoverIndex, setStationHoverIndex] = useState<number | null>(null);
  // Comparador de sesiones: A = sesión analizada, B = referencia (o 'none')
  const [sessionAId, setSessionAId] = useState<number | null>(null);
  const [sessionBId, setSessionBId] = useState<string>('none');
  // Benchmarks: historiales expandidos por nombre + levantamiento olímpico graficado
  const [expandedBenchmarks, setExpandedBenchmarks] = useState<Record<string, boolean>>({});
  const [olympicLift, setOlympicLift] = useState<'snatch' | 'cleanAndJerk'>('snatch');

  const modalityBreakdown = crossfit.modalityBreakdown || [];
  const hyroxModalityBreakdown = hyroxCardio.modalityBreakdown || [];
  const fastestForTime = crossfit.fastestForTime || [];
  const rxStats = crossfit.rxStats || { rxWodsCount: 0, scaledWodsCount: 0, totalWods: 0, rxPercentage: 0 };
  const timeCapStats = crossfit.timeCapStats || { wodsWithCap: 0, finishedUnderCap: 0, capSuccessRate: 0 };
  const olympic = crossfit.olympic;
  const benchmarks = crossfit.benchmarks || [];
  const cardioPBs = crossfit.cardioPBs || hyroxCardio.cardioPBs || [];

  const hyroxStations = hyroxCardio.stations || [];
  const hyroxEvents = hyroxCardio.events || [];
  const hyroxBalance = hyroxCardio.balance || {
    totalRunSeconds: 0,
    totalStationsSeconds: 0,
    runPercentage: 50,
    stationsPercentage: 50,
    hasSplitData: false,
  };

  // Conteo y filtrado de benchmarks oficiales vs funcionales repetidos
  const officialCount = useMemo(() => benchmarks.filter((b) => b.isOfficial).length, [benchmarks]);
  const customCount = useMemo(() => benchmarks.filter((b) => !b.isOfficial).length, [benchmarks]);

  const filteredBenchmarks = useMemo(() => {
    if (benchmarkCategory === 'official') return benchmarks.filter((b) => b.isOfficial);
    if (benchmarkCategory === 'custom') return benchmarks.filter((b) => !b.isOfficial);
    return benchmarks;
  }, [benchmarks, benchmarkCategory]);

  // Paginación de tarjetas: 6 por página en desktop, 3 en móvil.
  const [benchmarkPage, setBenchmarkPage] = useState(1);
  const [isMobileView, setIsMobileView] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const onChange = (e: MediaQueryListEvent) => setIsMobileView(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  const benchmarkVisibleLimit = isMobileView ? 3 : 6;
  const benchmarkTotalPages = Math.max(1, Math.ceil(filteredBenchmarks.length / benchmarkVisibleLimit));
  const benchmarkSafePage = Math.min(benchmarkPage, benchmarkTotalPages);
  const visibleBenchmarks = filteredBenchmarks.slice(
    (benchmarkSafePage - 1) * benchmarkVisibleLimit,
    benchmarkSafePage * benchmarkVisibleLimit
  );
  // Números de página con ventana (1 … 4 5 6 … 12)
  const benchmarkPageItems: (number | string)[] = (() => {
    if (benchmarkTotalPages <= 7) {
      return Array.from({ length: benchmarkTotalPages }, (_, i) => i + 1);
    }
    const pages = new Set<number>([
      1, 2,
      benchmarkSafePage - 1, benchmarkSafePage, benchmarkSafePage + 1,
      benchmarkTotalPages - 1, benchmarkTotalPages,
    ]);
    const sorted = [...pages]
      .filter((p) => p >= 1 && p <= benchmarkTotalPages)
      .sort((a, b) => a - b);
    const items: (number | string)[] = [];
    let prev = 0;
    for (const p of sorted) {
      if (p - prev > 1) items.push('…');
      items.push(p);
      prev = p;
    }
    return items;
  })();

  // Filtrado de WODs por modalidad (solo CrossFit)
  const filteredWods = useMemo(() => {
    if (selectedModalityFilter === 'all') return crossfit.wods;
    return crossfit.wods.filter((w) => w.modality === selectedModalityFilter);
  }, [crossfit.wods, selectedModalityFilter]);

  // Filtrado de sesiones Hyrox por modalidad (solo Hyrox/Cardio)
  const filteredHyroxSessions = useMemo(() => {
    if (selectedHyroxModalityFilter === 'all') return hyroxCardio.sessions;
    return hyroxCardio.sessions.filter((s) => s.modality === selectedHyroxModalityFilter);
  }, [hyroxCardio.sessions, selectedHyroxModalityFilter]);

  // Modalidades separadas por disciplina para no mezclar badges/filtros
  const crossfitUsedModalities = useMemo(() => {
    const set = new Set<string>();
    for (const w of crossfit.wods) if (w.modality) set.add(w.modality);
    return Array.from(set).sort();
  }, [crossfit.wods]);

  const hyroxUsedModalities = useMemo(() => {
    const set = new Set<string>();
    for (const s of hyroxCardio.sessions) if (s.modality) set.add(s.modality);
    return Array.from(set).sort();
  }, [hyroxCardio.sessions]);

  // Total combinado solo para la tarjeta resumen "Modalidades Únicas"
  const allUsedModalities = useMemo(() => {
    return Array.from(new Set([...crossfitUsedModalities, ...hyroxUsedModalities])).sort();
  }, [crossfitUsedModalities, hyroxUsedModalities]);

  // Las secciones inferiores son específicas de cada pestaña:
  // benchmarks/olympic -> stats CrossFit · hyrox -> solo stats Hyrox · cardioPbs -> sin historiales
  const showCrossfitSections = activeTab === 'benchmarks' || activeTab === 'olympic';
  const showHyroxSections = activeTab === 'hyrox';

  // ─── Gráficos de tiempos por estación Hyrox ───
  // Estaciones con al menos 1 tiempo registrado (orden oficial)
  const stationsWithTimes = useMemo(
    () => hyroxStations.filter((st) => (st.history || []).some((h) => h.timeSeconds != null && h.timeSeconds > 0)),
    [hyroxStations]
  );
  const activeStation = useMemo(() => {
    if (hyroxStations.length === 0) return null;
    if (selectedStationId) {
      const found = hyroxStations.find((st) => st.id === selectedStationId);
      if (found) return found;
    }
    // Por defecto: primera estación con tiempos, si no la primera estación
    return stationsWithTimes[0] || hyroxStations[0];
  }, [hyroxStations, stationsWithTimes, selectedStationId]);

  // Serie por sesión (mejor tiempo de cada entrenamiento) ordenada cronológicamente.
  // Se agrupa por workout (no por día) para que dos Hyrox del mismo día sean 2 puntos.
  const stationTimeSeries = useMemo(() => {
    if (!activeStation) return [];
    const perWorkout = new Map<string, { date: string; timeSeconds: number; workoutName: string }>();
    for (const h of activeStation.history || []) {
      if (h.timeSeconds == null || h.timeSeconds <= 0) continue;
      const key = h.workoutId != null ? `w${h.workoutId}` : `${h.date.split('T')[0]}|${h.workoutName}`;
      const prev = perWorkout.get(key);
      if (!prev || h.timeSeconds < prev.timeSeconds) {
        perWorkout.set(key, { date: h.date, timeSeconds: h.timeSeconds, workoutName: h.workoutName });
      }
    }
    return Array.from(perWorkout.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [activeStation]);

  const stationTimeStats = useMemo(() => {
    if (stationTimeSeries.length === 0) return null;
    const times = stationTimeSeries.map((p) => p.timeSeconds);
    const best = Math.min(...times);
    const worst = Math.max(...times);
    const first = times[0];
    const latest = times[times.length - 1];
    return {
      best,
      worst,
      first,
      latest,
      improvement: first - latest, // >0 = mejora (menos segundos)
      improvementPct: first > 0 ? Math.round(((first - latest) / first) * 100) : 0,
      count: stationTimeSeries.length,
    };
  }, [stationTimeSeries]);

  // Geometría del gráfico SVG de tiempos (mismo patrón que powerlifting)
  const stationSvg = { width: 720, height: 240, padLeft: 62, padRight: 24, padTop: 20, padBottom: 40 };
  const stationChart = useMemo(() => {
    const { width, height, padLeft, padRight, padTop, padBottom } = stationSvg;
    const cw = width - padLeft - padRight;
    const ch = height - padTop - padBottom;
    if (stationTimeSeries.length === 0 || !stationTimeStats) {
      return { points: [], lineD: '', areaD: '', yTicks: [], cw, ch };
    }
    const min = stationTimeStats.best;
    const max = stationTimeStats.worst;
    const span = Math.max(1, max - min);
    // Margen visual del 15% por arriba/abajo para que la curva respire
    const lo = Math.max(0, min - span * 0.25);
    const hi = max + span * 0.25;
    const range = Math.max(1, hi - lo);
    const points = stationTimeSeries.map((p, i) => {
      const x =
        stationTimeSeries.length === 1
          ? padLeft + cw / 2
          : padLeft + (i / Math.max(1, stationTimeSeries.length - 1)) * cw;
      const y = padTop + ch - ((p.timeSeconds - lo) / range) * ch;
      return { x, y, ...p };
    });
    // Con un solo registro no hay curva: no se dibuja línea ficticia (solo el punto)
    const lineD = points.length > 1
      ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
      : '';
    const bottomY = padTop + ch;
    const areaD =
      points.length > 1
        ? `${lineD} L ${points[points.length - 1].x.toFixed(1)} ${bottomY} L ${points[0].x.toFixed(1)} ${bottomY} Z`
        : '';
    const yTicks = [0, 0.5, 1].map((r) => {
      const val = Math.round(hi - r * (hi - lo));
      const y = padTop + ch * r;
      return { val, y };
    });
    return { points, lineD, areaD, yTicks, cw, ch };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stationTimeSeries, stationTimeStats]);

  // ─── Comparador de sesiones Hyrox (estilo ROXFIT/RoxOpt: splits A vs B con deltas) ───
  const hyroxSessionOptions = useMemo(() => hyroxCardio.sessions || [], [hyroxCardio.sessions]);
  const sessionA = useMemo(() => {
    if (hyroxSessionOptions.length === 0) return null;
    if (sessionAId != null) {
      const found = hyroxSessionOptions.find((s) => s.id === sessionAId);
      if (found) return found;
    }
    return hyroxSessionOptions[0]; // más reciente
  }, [hyroxSessionOptions, sessionAId]);
  const sessionB = useMemo(() => {
    if (sessionBId === 'none') return null;
    return hyroxSessionOptions.find((s) => s.id === Number(sessionBId)) || null;
  }, [hyroxSessionOptions, sessionBId]);

  const isRunSegment = (name: string) => {
    const n = name.toLowerCase();
    return n.includes('run') || n.includes('correr') || n.includes('carrera') || n.includes('running');
  };
  const cleanSegmentName = (name: string) => name.replace(/^\d+\.\s*/, '').trim();

  interface CompareRow {
    idx: number;
    name: string;
    meta: string;
    isRun: boolean;
    timeA: number | null;
    timeB: number | null;
    delta: number | null; // A − B: negativo (verde) = A más rápida
  }
  const compareRows: CompareRow[] = useMemo(() => {
    if (!sessionA) return [];
    const segsA = sessionA.segments || [];
    const segsB = sessionB?.segments || [];
    const len = Math.max(segsA.length, segsB.length);
    const rows: CompareRow[] = [];
    for (let i = 0; i < len; i++) {
      const a = segsA[i];
      const b = segsB[i];
      const name = cleanSegmentName(a?.name || b?.name || `Tramo ${i + 1}`);
      const metaParts: string[] = [];
      const dist = a?.distance ?? b?.distance;
      const reps = a?.reps ?? b?.reps;
      const weight = a?.weight ?? b?.weight;
      if (dist) metaParts.push(`${dist}m`);
      if (reps) metaParts.push(`${reps} reps`);
      if (weight) metaParts.push(`@${weight}kg`);
      const timeA = a?.durationSeconds ?? null;
      const timeB = b?.durationSeconds ?? null;
      rows.push({
        idx: i,
        name,
        meta: metaParts.join(' · ') || '—',
        isRun: isRunSegment(a?.name || b?.name || ''),
        timeA: timeA != null && timeA > 0 ? timeA : null,
        timeB: timeB != null && timeB > 0 ? timeB : null,
        delta: timeA != null && timeA > 0 && timeB != null && timeB > 0 ? timeA - timeB : null,
      });
    }
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionA, sessionB]);

  const compareTotals = useMemo(() => {
    let runA = 0, stA = 0, runB = 0, stB = 0;
    let hasA = false, hasB = false;
    for (const r of compareRows) {
      if (r.timeA != null) {
        hasA = true;
        if (r.isRun) runA += r.timeA; else stA += r.timeA;
      }
      if (r.timeB != null) {
        hasB = true;
        if (r.isRun) runB += r.timeB; else stB += r.timeB;
      }
    }
    return {
      runA, stA, totalA: runA + stA, hasA,
      runB, stB, totalB: runB + stB, hasB,
      deltaTotal: hasA && hasB ? runA + stA - (runB + stB) : null,
    };
  }, [compareRows]);

  const maxAbsDelta = useMemo(() => {
    let m = 1;
    for (const r of compareRows) {
      if (r.delta != null && Math.abs(r.delta) > m) m = Math.abs(r.delta);
    }
    return m;
  }, [compareRows]);

  // ─── Evolución 1RM olímpico (Snatch / Clean & Jerk) ───
  // El backend ya entrega dailyHistory; aquí se dibuja la curva de 1RM estimado.
  const olympicSeries = useMemo(() => {
    if (!olympic) return [];
    const lift = olympicLift === 'snatch' ? olympic.snatch : olympic.cleanAndJerk;
    return [...(lift.dailyHistory || [])].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [olympic, olympicLift]);

  const olympicStats = useMemo(() => {
    if (olympicSeries.length === 0) return null;
    const vals = olympicSeries.map((p) => p.estimated1RM);
    const best = Math.max(...vals);
    return {
      best,
      first: vals[0],
      latest: vals[vals.length - 1],
      gain: vals[vals.length - 1] - vals[0],
      count: olympicSeries.length,
    };
  }, [olympicSeries]);

  const olympicSvg = { width: 720, height: 240, padLeft: 56, padRight: 24, padTop: 20, padBottom: 40 };
  const olympicChart = useMemo(() => {
    const { width, height, padLeft, padRight, padTop, padBottom } = olympicSvg;
    const cw = width - padLeft - padRight;
    const ch = height - padTop - padBottom;
    if (olympicSeries.length === 0 || !olympicStats) {
      return { points: [], lineD: '', areaD: '', yTicks: [] as { val: number; y: number }[] };
    }
    const vals = olympicSeries.map((p) => p.estimated1RM);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = Math.max(1, max - min);
    const lo = Math.max(0, min - span * 0.3);
    const hi = max + span * 0.3;
    const range = Math.max(1, hi - lo);
    const points = olympicSeries.map((p, i) => {
      const x =
        olympicSeries.length === 1
          ? padLeft + cw / 2
          : padLeft + (i / Math.max(1, olympicSeries.length - 1)) * cw;
      const y = padTop + ch - ((p.estimated1RM - lo) / range) * ch;
      return { x, y, ...p };
    });
    const lineD =
      points.length > 1
        ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
        : '';
    const bottomY = padTop + ch;
    const areaD =
      points.length > 1
        ? `${lineD} L ${points[points.length - 1].x.toFixed(1)} ${bottomY} L ${points[0].x.toFixed(1)} ${bottomY} Z`
        : '';
    const steps = 4;
    const yTicks = Array.from({ length: steps + 1 }, (_, i) => {
      const val = Math.round(lo + (range * i) / steps);
      const y = padTop + ch - (i / steps) * ch;
      return { val, y };
    });
    return { points, lineD, areaD, yTicks };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [olympicSeries, olympicStats]);

  const formatDelta = (d: number) => `${d > 0 ? '+' : '−'}${Math.abs(d)}s`;

  // ─── Comparativa 1000m por tramo: los 8 runs de A frente a los de B ───
  interface RunCompareRow {
    idx: number;
    timeA: number | null;
    timeB: number | null;
    delta: number | null; // A − B
  }
  const runCompareRows: RunCompareRow[] = useMemo(() => {
    const runsA = (sessionA?.segments || []).filter((s) => isRunSegment(s.name));
    const runsB = (sessionB?.segments || []).filter((s) => isRunSegment(s.name));
    const len = Math.max(runsA.length, runsB.length);
    const rows: RunCompareRow[] = [];
    for (let i = 0; i < len; i++) {
      const tA = runsA[i]?.durationSeconds ?? null;
      const tB = runsB[i]?.durationSeconds ?? null;
      const vA = tA != null && tA > 0 ? tA : null;
      const vB = tB != null && tB > 0 ? tB : null;
      rows.push({ idx: i, timeA: vA, timeB: vB, delta: vA != null && vB != null ? vA - vB : null });
    }
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionA, sessionB]);

  const runCompareStats = useMemo(() => {
    let max = 1;
    let sumA = 0, nA = 0, sumB = 0, nB = 0;
    for (const r of runCompareRows) {
      if (r.timeA != null) {
        if (r.timeA > max) max = r.timeA;
        sumA += r.timeA; nA++;
      }
      if (r.timeB != null) {
        if (r.timeB > max) max = r.timeB;
        sumB += r.timeB; nB++;
      }
    }
    const avgA = nA > 0 ? sumA / nA : null;
    const avgB = nB > 0 ? sumB / nB : null;
    return {
      max, avgA, avgB,
      avgDelta: avgA != null && avgB != null ? Math.round(avgA - avgB) : null,
      hasData: nA > 0,
    };
  }, [runCompareRows]);

  return (
    <div className="space-y-6">
      {/* ─── 1. RESUMEN DE SESIONES FUNCIONALES Y CARDIO ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-orange-500" />
              WODs Realizados
            </span>
            <p className="text-2xl font-black text-orange-600 dark:text-orange-400 tabular-nums">
              {crossfit.totalWods}
            </p>
            <p className="text-[11px] text-gray-400">sesiones funcionales registradas</p>
          </CardContent>
        </Card>

        {/* Tasa Rx vs Scaled */}
        <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-emerald-500" />
              Tasa en Rx
            </span>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
              {rxStats.rxPercentage}%
            </p>
            <p className="text-[11px] text-gray-400">
              {rxStats.rxWodsCount} en Rx · {rxStats.scaledWodsCount} Escalados
            </p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-pink-500" />
              Sesiones Hyrox / Cardio
            </span>
            <p className="text-2xl font-black text-pink-600 dark:text-pink-400 tabular-nums">
              {hyroxCardio.totalSessions}
            </p>
            <p className="text-[11px] text-gray-400">{hyroxCardio.totalMinutes} min de resistencia</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-purple-500" />
              Modalidades Únicas
            </span>
            <p className="text-2xl font-black text-purple-600 dark:text-purple-400 tabular-nums">
              {allUsedModalities.length}
            </p>
            <p className="text-[11px] text-purple-600 font-semibold">Formatos practicados</p>
          </CardContent>
        </Card>
      </div>

      {/* ─── 2. HALTEROFILIA, BENCHMARKS, HYROX & CARDIO (NAV TABS) ─── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab('benchmarks')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'benchmarks'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            Benchmarks & WODs de Referencia
          </button>
          <button
            onClick={() => setActiveTab('olympic')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'olympic'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
            }`}
          >
            <Dumbbell className="w-3.5 h-3.5" />
            Halterofilia Olímpica
          </button>
          <button
            onClick={() => setActiveTab('hyrox')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'hyrox'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            Hyrox & 8 Estaciones
          </button>
          <button
            onClick={() => setActiveTab('cardioPbs')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'cardioPbs'
                ? 'bg-pink-600 text-white shadow-xs'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
            }`}
          >
            <Timer className="w-3.5 h-3.5" />
            PBs de Ergómetros & Carrera
          </button>
        </div>

        {/* TAB 1: BENCHMARKS & WODS DE REFERENCIA */}
        {activeTab === 'benchmarks' && (
          <div className="space-y-4">
            {/* Sub-filtros por categoría */}
            {benchmarks.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-50/70 dark:bg-gray-800/40 p-2 rounded-xl border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => { setBenchmarkCategory('all'); setBenchmarkPage(1); }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      benchmarkCategory === 'all'
                        ? 'bg-orange-600 text-white shadow-2xs'
                        : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Todos ({benchmarks.length})
                  </button>
                  {officialCount > 0 && (
                    <button
                      type="button"
                      onClick={() => { setBenchmarkCategory('official'); setBenchmarkPage(1); }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        benchmarkCategory === 'official'
                          ? 'bg-amber-500 text-amber-950 shadow-2xs'
                          : 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100'
                      }`}
                    >
                      🏆 Oficiales CrossFit ({officialCount})
                    </button>
                  )}
                  {customCount > 0 && (
                    <button
                      type="button"
                      onClick={() => { setBenchmarkCategory('custom'); setBenchmarkPage(1); }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        benchmarkCategory === 'custom'
                          ? 'bg-orange-600 text-white shadow-2xs'
                          : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      ⚡ Funcionales & WODs ({customCount})
                    </button>
                  )}
                </div>

                <span className="text-[11px] text-gray-400">
                  Comparativa de progresión y récords personales
                </span>
              </div>
            )}

            {filteredBenchmarks.length === 0 ? (
              <Card className="border-dashed bg-gray-50/50 dark:bg-gray-800/30">
                <CardContent className="py-8 text-center text-xs text-gray-500 space-y-1">
                  <p className="font-semibold text-gray-700 dark:text-gray-300">
                    {benchmarkCategory === 'official'
                      ? 'No hay Benchmarks oficiales de CrossFit registrados todavía (Fran, Cindy, Murph, etc.).'
                      : benchmarkCategory === 'custom'
                      ? 'No hay entrenamientos funcionales registrados todavía.'
                      : 'Aún no has registrado Benchmarks oficiales ni entrenamientos funcionales.'}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    Al repetir un WOD o sesión funcional con el mismo nombre, el sistema analizará automáticamente tu mejora de tiempo.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {visibleBenchmarks.map((bm) => {
                  const isExpanded = !!expandedBenchmarks[bm.name];
                  const timedAttempts = bm.history.filter((h) => h.timeSeconds != null && h.timeSeconds > 0);
                  const lastWorkoutId = bm.history.length > 0 ? bm.history[bm.history.length - 1].workoutId : undefined;
                  const hasScore = bm.bestScoreRounds != null;
                  // Mini sparkline de tiempos (cronológico, abajo = más rápido)
                  const spark = (() => {
                    if (timedAttempts.length < 2) return null;
                    const vals = timedAttempts.map((h) => h.timeSeconds as number);
                    const min = Math.min(...vals);
                    const max = Math.max(...vals);
                    const span = Math.max(1, max - min);
                    const W = 120, H = 34, P = 3;
                    const pts = vals.map((v, i) => {
                      const x = P + (i / Math.max(1, vals.length - 1)) * (W - P * 2);
                      const y = P + (1 - (v - min) / span) * (H - P * 2);
                      return `${x.toFixed(1)},${y.toFixed(1)}`;
                    });
                    return { line: pts.join(' '), last: vals[vals.length - 1], first: vals[0], W, H };
                  })();
                  const visibleHistory = isExpanded ? [...bm.history].reverse() : bm.history.slice(-3).reverse();
                  return (
                  <Card key={bm.name} className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-sm text-gray-900 dark:text-gray-100 block truncate">{bm.name}</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {bm.isOfficial ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                🏆 Oficial CrossFit
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.2 rounded bg-orange-100/80 text-orange-900 dark:bg-orange-950/40 dark:text-orange-300 border border-orange-200 dark:border-orange-800/50">
                                ⚡ {bm.workoutType || 'Funcional'}
                              </span>
                            )}
                          </div>
                        </div>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                          bm.isRx
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                        }`}>
                          {bm.isRx ? 'Rx' : 'Scaled'}
                        </span>
                      </div>

                      <div className="flex items-end justify-between gap-2 pt-1">
                        <div>
                          <p className="text-xs text-gray-400">
                            {hasScore ? 'Mejor Score (rondas+reps)' : 'Mejor Tiempo / Récord'}
                          </p>
                          <p className="text-2xl font-black text-orange-600 dark:text-orange-400 font-mono">
                            {hasScore
                              ? formatScore(bm.bestScoreRounds, bm.bestScoreReps)
                              : bm.bestTimeSeconds
                                ? formatSecondsToTime(bm.bestTimeSeconds)
                                : 'Completado'}
                          </p>
                          {/* Mejores marcas separadas Rx / Scaled */}
                          {!hasScore && bm.bestRxTimeSeconds != null && bm.bestScaledTimeSeconds != null && (
                            <p className="text-[10px] text-gray-400 mt-0.5 font-mono">
                              Rx {formatSecondsToTime(bm.bestRxTimeSeconds)} · Sc {formatSecondsToTime(bm.bestScaledTimeSeconds)}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          {spark && (
                            <svg width={spark.W} height={spark.H} className="overflow-visible">
                              <title>{`Evolución: ${formatSecondsToTime(spark.first)} → ${formatSecondsToTime(spark.last)}`}</title>
                              <polyline
                                points={spark.line}
                                fill="none"
                                stroke={spark.last <= spark.first ? '#10b981' : '#f43f5e'}
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <circle
                                cx={Number(spark.line.split(' ').pop()?.split(',')[0])}
                                cy={Number(spark.line.split(' ').pop()?.split(',')[1])}
                                r={3}
                                fill={spark.last <= spark.first ? '#10b981' : '#f43f5e'}
                                stroke="white"
                                strokeWidth={1.5}
                              />
                            </svg>
                          )}
                          <span className="text-xs text-gray-400">{bm.attempts} {bm.attempts === 1 ? 'intento' : 'intentos'}</span>
                        </div>
                      </div>

                      {bm.deltaSeconds !== null && bm.deltaSeconds !== 0 && (
                        <div className={`flex items-center gap-1.5 text-xs p-2 rounded-lg border ${
                          bm.deltaSeconds > 0
                            ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/40'
                            : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/40'
                        }`}>
                          <TrendingDown className={`w-3.5 h-3.5 ${bm.deltaSeconds < 0 ? 'rotate-180' : ''}`} />
                          <span className="font-bold">{formatDeltaTime(bm.deltaSeconds)} de mejora</span>
                          <span className="text-[10px] text-gray-400">vs primer intento</span>
                        </div>
                      )}

                      {/* Historial de intentos (expandible) */}
                      <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-1 text-[11px] text-gray-500">
                        {visibleHistory.map((h, hIdx) => (
                          <div key={hIdx} className="flex items-center justify-between gap-2">
                            <span className="shrink-0">{new Date(h.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                            {h.scoreRounds != null ? (
                              <span className="font-mono font-semibold text-gray-700 dark:text-gray-300">
                                {formatScore(h.scoreRounds, h.scoreReps)} {h.isRx ? '(Rx)' : ''}
                              </span>
                            ) : (
                              <span className="font-mono font-semibold text-gray-700 dark:text-gray-300">
                                {h.timeSeconds ? formatSecondsToTime(h.timeSeconds) : `${h.timeMinutes} min`} {h.isRx ? '(Rx)' : ''}
                              </span>
                            )}
                          </div>
                        ))}
                        <div className="flex items-center justify-between pt-1">
                          {bm.history.length > 3 ? (
                            <button
                              type="button"
                              onClick={() => setExpandedBenchmarks((prev) => ({ ...prev, [bm.name]: !prev[bm.name] }))}
                              className="flex items-center gap-1 text-[11px] font-bold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer"
                            >
                              {isExpanded ? (
                                <>Ver menos <ChevronUp className="w-3 h-3" /></>
                              ) : (
                                <>Ver historial completo ({bm.history.length}) <ChevronDown className="w-3 h-3" /></>
                              )}
                            </button>
                          ) : <span />}
                          {lastWorkoutId != null && (
                            <Link
                              href={`/workouts/log?mode=repeat&workoutId=${lastWorkoutId}`}
                              className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                              title={`Repetir ${bm.name}`}
                            >
                              <Repeat className="w-3 h-3" />
                              Repetir
                            </Link>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  );
                })}
                {filteredBenchmarks.length > 0 && (
                  <div className="col-span-full flex items-center justify-center gap-1.5 pt-1 flex-wrap">
                    {benchmarkTotalPages > 1 && (
                    <button
                      type="button"
                      disabled={benchmarkSafePage <= 1}
                      onClick={() => setBenchmarkPage((p) => Math.max(1, p - 1))}
                      className="h-7 w-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      title="Página anterior"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    )}
                    {benchmarkTotalPages > 1 && benchmarkPageItems.map((item, idx) =>
                      typeof item === 'number' ? (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setBenchmarkPage(item)}
                          className={`h-7 min-w-7 px-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            item === benchmarkSafePage
                              ? 'bg-orange-600 text-white shadow-2xs'
                              : 'border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                        >
                          {item}
                        </button>
                      ) : (
                        <span key={`gap-${idx}`} className="text-xs text-gray-400 px-0.5">
                          {item}
                        </span>
                      )
                    )}
                    {benchmarkTotalPages > 1 && (
                    <button
                      type="button"
                      disabled={benchmarkSafePage >= benchmarkTotalPages}
                      onClick={() => setBenchmarkPage((p) => Math.min(benchmarkTotalPages, p + 1))}
                      className="h-7 w-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      title="Página siguiente"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    )}
                    <span className="text-[11px] text-gray-400 font-mono w-full text-center">
                      Mostrando {(benchmarkSafePage - 1) * benchmarkVisibleLimit + 1}
                      –{Math.min(benchmarkSafePage * benchmarkVisibleLimit, filteredBenchmarks.length)}
                      {' '}de {filteredBenchmarks.length}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: HALTEROFILIA OLÍMPICA */}
        {activeTab === 'olympic' && olympic && (
          <div className="space-y-4">
            {/* Hero Total Olímpico */}
            <Card className="border-purple-200/80 dark:border-purple-800/60 bg-gradient-to-br from-purple-50/60 via-white to-orange-50/30 dark:from-purple-950/20 dark:via-gray-900 dark:to-orange-950/20 shadow-xs">
              <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    <Trophy className="w-3.5 h-3.5" /> Total Olímpico (Halterofilia)
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
                    Snatch (Arrancada) + Clean & Jerk (Dos Tiempos)
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Suma combinada de tu 1RM en los dos movimientos de levantamiento olímpico.
                  </p>
                </div>

                <div className="flex items-baseline gap-2 bg-white dark:bg-gray-800/80 px-4 py-3 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-2xs self-stretch sm:self-auto justify-center">
                  <span className="text-3xl font-black text-purple-600 dark:text-purple-400 tabular-nums">
                    {olympic.totalOlympic}
                  </span>
                  <span className="text-sm font-bold text-gray-400">kg Total</span>
                </div>
              </CardContent>
            </Card>

            {/* Curva de evolución 1RM estimado */}
            <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
              <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <CardTitle className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                    Evolución del 1RM Estimado
                  </CardTitle>
                  <div className="flex items-center gap-1.5">
                    {(['snatch', 'cleanAndJerk'] as const).map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setOlympicLift(l)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          olympicLift === l
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200'
                        }`}
                      >
                        {l === 'snatch' ? 'Snatch' : 'Clean & Jerk'}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 space-y-4">
                {olympicSeries.length === 0 || !olympicStats ? (
                  <p className="text-xs text-gray-500 text-center py-6">
                    Sin registros de {olympicLift === 'snatch' ? 'Snatch' : 'Clean & Jerk'} todavía.
                  </p>
                ) : (
                  <>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                        olympicStats.gain > 0
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                          : olympicStats.gain < 0
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {olympicStats.gain > 0
                          ? `+${Math.round(olympicStats.gain * 10) / 10} kg desde el inicio`
                          : olympicStats.gain < 0
                          ? `${Math.round(olympicStats.gain * 10) / 10} kg vs inicio`
                          : 'Sin variación'}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        Mejor: <strong className="text-purple-600 dark:text-purple-400 font-mono">{olympicStats.best} kg</strong> · {olympicStats.count} registros
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <svg viewBox={`0 0 ${olympicSvg.width} ${olympicSvg.height}`} className="w-full h-auto min-w-[500px]">
                        <defs>
                          <linearGradient id="olympicGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#9333ea" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#9333ea" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        {olympicChart.yTicks.map((t, i) => (
                          <g key={i}>
                            <line
                              x1={olympicSvg.padLeft}
                              y1={t.y}
                              x2={olympicSvg.width - olympicSvg.padRight}
                              y2={t.y}
                              stroke="currentColor"
                              className="text-gray-200 dark:text-gray-800"
                              strokeWidth={1}
                              strokeDasharray={i === 0 ? '0' : '4,4'}
                            />
                            <text
                              x={olympicSvg.padLeft - 8}
                              y={t.y + 3.5}
                              textAnchor="end"
                              className="fill-gray-400 dark:fill-gray-500 font-mono text-[10px]"
                            >
                              {t.val}
                            </text>
                          </g>
                        ))}
                        {olympicChart.points.map((p, i) => {
                          const show =
                            olympicSeries.length <= 8 ||
                            i === 0 ||
                            i === olympicSeries.length - 1 ||
                            i % Math.ceil(olympicSeries.length / 7) === 0;
                          return show ? (
                            <text
                              key={i}
                              x={p.x}
                              y={olympicSvg.height - 12}
                              textAnchor="middle"
                              className="fill-gray-400 dark:fill-gray-500 text-[9px] font-medium"
                            >
                              {new Date(p.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                            </text>
                          ) : null;
                        })}
                        {olympicChart.points.length > 1 && (
                          <>
                            <path d={olympicChart.areaD} fill="url(#olympicGradient)" />
                            <path
                              d={olympicChart.lineD}
                              fill="none"
                              stroke="#9333ea"
                              strokeWidth={2.5}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </>
                        )}
                        {olympicChart.points.map((pt, i) => {
                          const isBest = pt.estimated1RM === olympicStats.best;
                          return (
                            <g key={i}>
                              <circle
                                cx={pt.x}
                                cy={pt.y}
                                r={isBest ? 4.5 : 3.5}
                                fill={isBest ? '#f59e0b' : '#9333ea'}
                                stroke="white"
                                strokeWidth={2}
                              >
                                <title>{`${pt.weight}kg × ${pt.reps} (1RM ~${pt.estimated1RM}kg) · ${new Date(pt.date).toLocaleDateString('es-ES')}`}</title>
                              </circle>
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Snatch */}
              <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
                <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800 bg-purple-50/40 dark:bg-purple-950/20">
                  <CardTitle className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center justify-between">
                    <span>Snatch (Arrancada)</span>
                    <span className="text-xs font-normal text-purple-600 font-semibold">{olympic.snatch.totalSets} series</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase">1RM Estimado</span>
                      <p className="text-2xl font-black text-purple-600 dark:text-purple-400 tabular-nums">
                        {olympic.snatch.estimated1RM > 0 ? `${olympic.snatch.estimated1RM} kg` : '—'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Carga Real Máx</span>
                      <p className="text-lg font-bold text-gray-800 dark:text-gray-200 tabular-nums">
                        {olympic.snatch.maxWeightReal > 0 ? `${olympic.snatch.maxWeightReal} kg` : '—'}
                      </p>
                    </div>
                  </div>

                  {olympic.snatch.history.length > 0 && (
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-1 text-xs text-gray-500">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Últimos levantamientos:</span>
                      {olympic.snatch.history.slice(-3).reverse().map((h, i) => (
                        <div key={i} className="flex items-center justify-between gap-2 text-[11px]">
                          <span>{new Date(h.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                          <span className="font-mono font-semibold text-gray-800 dark:text-gray-200 text-right">
                            {h.weight}kg × {h.reps} reps (1RM ~{h.estimated1RM}kg)
                            {h.workoutType && (
                              <span className="ml-1.5 font-sans font-bold text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 align-middle">
                                {h.workoutType}
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Clean & Jerk */}
              <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
                <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800 bg-orange-50/40 dark:bg-orange-950/20">
                  <CardTitle className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center justify-between">
                    <span>Clean & Jerk (Dos Tiempos)</span>
                    <span className="text-xs font-normal text-orange-600 font-semibold">{olympic.cleanAndJerk.totalSets} series</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase">1RM Estimado</span>
                      <p className="text-2xl font-black text-orange-600 dark:text-orange-400 tabular-nums">
                        {olympic.cleanAndJerk.estimated1RM > 0 ? `${olympic.cleanAndJerk.estimated1RM} kg` : '—'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Carga Real Máx</span>
                      <p className="text-lg font-bold text-gray-800 dark:text-gray-200 tabular-nums">
                        {olympic.cleanAndJerk.maxWeightReal > 0 ? `${olympic.cleanAndJerk.maxWeightReal} kg` : '—'}
                      </p>
                    </div>
                  </div>

                  {olympic.cleanAndJerk.history.length > 0 && (
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-1 text-xs text-gray-500">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Últimos levantamientos:</span>
                      {olympic.cleanAndJerk.history.slice(-3).reverse().map((h, i) => (
                        <div key={i} className="flex items-center justify-between gap-2 text-[11px]">
                          <span>{new Date(h.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                          <span className="font-mono font-semibold text-gray-800 dark:text-gray-200 text-right">
                            {h.weight}kg × {h.reps} reps (1RM ~{h.estimated1RM}kg)
                            {h.workoutType && (
                              <span className="ml-1.5 font-sans font-bold text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 align-middle">
                                {h.workoutType}
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* TAB 3: HYROX & 8 ESTACIONES */}
        {activeTab === 'hyrox' && (
          <div className="space-y-6">
            {/* 1. Hero: Balance Running vs Estaciones */}
            <Card className="border-purple-200/80 dark:border-purple-800/60 bg-gradient-to-br from-purple-50/60 via-white to-pink-50/40 dark:from-purple-950/20 dark:via-gray-900 dark:to-pink-950/20 shadow-xs">
              <CardContent className="p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      <Flame className="w-3.5 h-3.5 text-purple-600" /> Balance Hyrox (Running vs Fuerza Funcional)
                    </span>
                    <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                      Distribución del Tiempo de Competición
                    </h3>
                  </div>

                  <span className={`text-xs font-bold px-3 py-1 rounded-xl self-start sm:self-auto ${
                    hyroxBalance.runPercentage >= 40 && hyroxBalance.runPercentage <= 60
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : hyroxBalance.runPercentage > 60
                      ? 'bg-pink-100 text-pink-800 dark:bg-pink-950/60 dark:text-pink-300 border border-pink-200 dark:border-pink-800'
                      : 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                  }`}>
                    {hyroxBalance.runPercentage >= 40 && hyroxBalance.runPercentage <= 60
                      ? '🟢 Perfil Híbrido Equilibrado'
                      : hyroxBalance.runPercentage > 60
                      ? '🏃 Dominancia de Running'
                      : '🏋️ Dominancia de Estaciones'}
                  </span>
                </div>

                {/* Barra Bipolar Comparativa */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-pink-600 dark:text-pink-400 flex items-center gap-1.5">
                      <Timer className="w-3.5 h-3.5" />
                      Carrera (Running): {hyroxBalance.runPercentage}% ({Math.round(hyroxBalance.totalRunSeconds / 60)} min)
                    </span>
                    <span className="text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                      <Dumbbell className="w-3.5 h-3.5" />
                      Estaciones: {hyroxBalance.stationsPercentage}% ({Math.round(hyroxBalance.totalStationsSeconds / 60)} min)
                    </span>
                  </div>

                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3 flex overflow-hidden p-0.5 gap-0.5 border border-gray-200 dark:border-gray-700">
                    <div
                      className="bg-linear-to-r from-pink-500 to-rose-500 h-full rounded-l-full transition-all duration-500"
                      style={{ width: `${Math.max(8, Math.min(92, hyroxBalance.runPercentage))}%` }}
                    />
                    <div
                      className="bg-linear-to-r from-purple-500 to-indigo-500 h-full rounded-r-full transition-all duration-500"
                      style={{ width: `${Math.max(8, Math.min(92, hyroxBalance.stationsPercentage))}%` }}
                    />
                  </div>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  En el estándar oficial de Hyrox, el tiempo objetivo ideal se divide en aproximadamente un <strong>50% en los 8 km de carrera</strong> y un <strong>50% en las 8 estaciones de fuerza</strong>.
                </p>
              </CardContent>
            </Card>

            {/* 1b. Sesiones a analizar (A/B): contexto de todas las comparativas de abajo */}
            {sessionA && (
              <div id="hyrox-session-bar" className="grid grid-cols-1 sm:grid-cols-2 gap-2 scroll-mt-4">
                <label className="flex items-center gap-2 bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/60 rounded-xl px-3 py-2">
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-purple-600 text-white shrink-0">A</span>
                  <span className="flex flex-col min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 leading-none">Sesión analizada</span>
                    <select
                      value={sessionA.id}
                      onChange={(e) => setSessionAId(Number(e.target.value))}
                      className="w-full text-xs font-bold bg-transparent text-gray-900 dark:text-gray-100 focus:outline-none cursor-pointer [color-scheme:light] dark:[color-scheme:dark] [&>option]:bg-white [&>option]:text-gray-900 dark:[&>option]:bg-gray-900 dark:[&>option]:text-gray-100"
                    >
                      {hyroxSessionOptions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {new Date(s.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} · {s.name.slice(0, 32)}
                        </option>
                      ))}
                    </select>
                  </span>
                </label>
                <label className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2">
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-gray-500 text-white shrink-0">B</span>
                  <span className="flex flex-col min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 leading-none">Comparar con</span>
                    <select
                      value={sessionBId}
                      onChange={(e) => setSessionBId(e.target.value)}
                      className="w-full text-xs font-bold bg-transparent text-gray-900 dark:text-gray-100 focus:outline-none cursor-pointer [color-scheme:light] dark:[color-scheme:dark] [&>option]:bg-white [&>option]:text-gray-900 dark:[&>option]:bg-gray-900 dark:[&>option]:text-gray-100"
                    >
                      <option value="none">Sin comparar (solo A)</option>
                      {hyroxSessionOptions.filter((s) => s.id !== sessionA.id).map((s) => (
                        <option key={s.id} value={s.id}>
                          {new Date(s.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} · {s.name.slice(0, 32)}
                        </option>
                      ))}
                    </select>
                  </span>
                </label>
              </div>
            )}

            {/* 2. Simuladores & Eventos Hyrox (Tiempos de Carrera) */}
            {hyroxEvents.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-purple-600" />
                    Simuladores & Carreras Hyrox Registradas
                  </h4>
                  <span className="text-xs text-gray-400">Evolución de tiempo total</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {hyroxEvents.map((ev) => (
                    <Card key={ev.name} className="border-purple-200/80 dark:border-purple-800/50 dark:bg-gray-900 shadow-2xs">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <span className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">{ev.name}</span>
                          <span className="text-xs text-purple-600 font-semibold">{ev.attempts} {ev.attempts === 1 ? 'edición' : 'ediciones'}</span>
                        </div>

                        <div>
                          <p className="text-xs text-gray-400">Mejor Tiempo Total</p>
                          <p className="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono">
                            {ev.bestTimeSeconds ? formatSecondsToTime(ev.bestTimeSeconds) : 'Completado'}
                          </p>
                        </div>

                        {ev.deltaSeconds !== null && (
                          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 p-2 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                            <TrendingDown className="w-3.5 h-3.5" />
                            <span className="font-bold">-{ev.deltaSeconds} seg de mejora</span>
                            <span className="text-[10px] text-gray-400">vs 1ª edición</span>
                          </div>
                        )}

                        <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-1 text-[11px] text-gray-500">
                          {ev.history.slice(-3).reverse().map((h, hIdx) => (
                            <div key={hIdx} className="flex items-center justify-between">
                              <span>{new Date(h.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                              <span className="font-mono font-semibold text-gray-700 dark:text-gray-300">
                                {h.timeSeconds ? formatSecondsToTime(h.timeSeconds) : `${h.timeMinutes} min`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* 2b. Comparativa 1000m por tramo: los 8 runs de A frente a los de B */}
            {sessionA && runCompareStats.hasData && (
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-pink-600" />
                    Comparativa 1000m por Tramo
                  </h4>
                  <p className="text-xs text-gray-400">Los 8 runs de la sesión A frente a los de la sesión B (usa los selectores A/B de arriba)</p>
                </div>
                <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
                  <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800 bg-pink-50/40 dark:bg-pink-950/20">
                    <CardTitle className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center justify-between flex-wrap gap-2">
                      <span className="flex items-center gap-2">
                        <Timer className="w-4 h-4 text-pink-600" />
                        <span className="text-purple-700 dark:text-purple-300">A · {sessionA.name.slice(0, 28)}</span>
                        {sessionB && <span className="text-gray-400 font-semibold">vs B · {sessionB.name.slice(0, 28)}</span>}
                      </span>
                      {runCompareStats.avgDelta != null ? (
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                          runCompareStats.avgDelta < 0
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                            : runCompareStats.avgDelta > 0
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          Media A {runCompareStats.avgDelta < 0 ? `${runCompareStats.avgDelta}s` : runCompareStats.avgDelta > 0 ? `+${runCompareStats.avgDelta}s` : 'igual'} vs B
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-gray-400">Elige una sesión B en el comparador para ver deltas</span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-2 sm:gap-3 text-center">
                      <div className="p-3 rounded-xl bg-pink-50/70 dark:bg-pink-950/20 border border-pink-100 dark:border-pink-800/50">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-pink-600 dark:text-pink-400">Media / 1km (A)</p>
                        <p className="text-lg sm:text-xl font-black text-pink-700 dark:text-pink-300 font-mono tabular-nums">
                          {runCompareStats.avgA != null ? formatSecondsToTime(Math.round(runCompareStats.avgA)) : '—'}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Media / 1km (B)</p>
                        <p className="text-lg sm:text-xl font-black text-gray-900 dark:text-gray-100 font-mono tabular-nums">
                          {runCompareStats.avgB != null ? formatSecondsToTime(Math.round(runCompareStats.avgB)) : '—'}
                        </p>
                      </div>
                    </div>
                    {/* Leyenda */}
                    <div className="flex items-center gap-4 text-[11px] font-bold">
                      <span className="flex items-center gap-1.5 text-pink-700 dark:text-pink-300">
                        <span className="w-3 h-3 rounded-sm bg-pink-500 inline-block" /> A
                      </span>
                      {sessionB && (
                        <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                          <span className="w-3 h-3 rounded-sm bg-gray-400 inline-block" /> B
                        </span>
                      )}
                    </div>
                    {/* Barras pareadas por run */}
                    <div className="space-y-2.5">
                      {runCompareRows.map((r) => (
                        <div key={r.idx} className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-gray-700 dark:text-gray-300">Run {r.idx + 1}</span>
                            {r.delta != null ? (
                              <span className={`font-mono font-black px-1.5 py-0.5 rounded-md tabular-nums ${
                                r.delta < 0
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                                  : r.delta > 0
                                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                                  : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                              }`}>
                                {r.delta === 0 ? '=' : formatDelta(r.delta)}
                              </span>
                            ) : (
                              <span className="font-mono text-[11px] font-bold text-pink-700 dark:text-pink-300 tabular-nums">
                                {r.timeA != null ? formatSecondsToTime(r.timeA) : '—'}
                              </span>
                            )}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-extrabold text-pink-600 w-3">A</span>
                              <div className="flex-1 h-5 rounded-md bg-pink-100 dark:bg-pink-950/30 overflow-hidden">
                                {r.timeA != null && (
                                  <div
                                    className="h-full rounded-md bg-linear-to-r from-pink-500 to-rose-500 flex items-center justify-end pr-1.5"
                                    style={{ width: `${Math.max(6, (r.timeA / runCompareStats.max) * 100)}%` }}
                                  >
                                    <span className="text-[10px] font-mono font-black text-white tabular-nums">
                                      {formatSecondsToTime(r.timeA)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            {sessionB && (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-extrabold text-gray-400 w-3">B</span>
                                <div className="flex-1 h-5 rounded-md bg-gray-100 dark:bg-gray-800 overflow-hidden">
                                  {r.timeB != null && (
                                    <div
                                      className="h-full rounded-md bg-gray-400 dark:bg-gray-500 flex items-center justify-end pr-1.5"
                                      style={{ width: `${Math.max(6, (r.timeB / runCompareStats.max) * 100)}%` }}
                                    >
                                      <span className="text-[10px] font-mono font-black text-white tabular-nums">
                                        {formatSecondsToTime(r.timeB)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* 2c. Splits de la sesión + comparador A vs B (estilo ROXFIT/RoxOpt) */}
            {sessionA && (
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-600" />
                    Splits por Sesión y Comparador
                  </h4>
                  <p className="text-xs text-gray-400">Tiempos tramo a tramo de tu entrenamiento y comparativa con otra sesión (verde = más rápido)</p>
                </div>

                {/* Contexto: las sesiones se eligen arriba (los comparadores comparten A/B) */}
                <a href="#hyrox-session-bar" className="flex items-center gap-2 text-[11px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-50/60 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-800/50 rounded-xl px-3 py-2 hover:bg-purple-100 dark:hover:bg-purple-950/40 transition-colors">
                  <span className="font-extrabold">A · {sessionA.name.slice(0, 30)}</span>
                  <span className="text-gray-400">vs</span>
                  <span className="font-extrabold">{sessionB ? `B · ${sessionB.name.slice(0, 30)}` : 'sin comparar'}</span>
                  <span className="ml-auto text-purple-500 underline underline-offset-2">cambiar ↑</span>
                </a>

                <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs overflow-hidden">
                  <CardContent className="p-0">
                    {/* Cabecera */}
                    <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/50">
                      <div className="col-span-1 text-center">#</div>
                      <div className="col-span-5">Tramo</div>
                      <div className="col-span-2 text-center text-purple-700 dark:text-purple-300">A · {formatSecondsToTime(compareTotals.totalA)}</div>
                      {sessionB ? (
                        <>
                          <div className="col-span-2 text-center">B · {formatSecondsToTime(compareTotals.totalB)}</div>
                          <div className="col-span-2 text-center">Δ</div>
                        </>
                      ) : (
                        <div className="col-span-4 text-center">% del total</div>
                      )}
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-96 overflow-y-auto">
                      {compareRows.map((r) => (
                        <div key={r.idx} className="grid grid-cols-12 gap-2 px-4 py-2 items-center hover:bg-purple-50/40 dark:hover:bg-purple-950/10">
                          <div className="col-span-1 flex justify-center">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${
                              r.isRun
                                ? 'bg-pink-100 dark:bg-pink-950/50 text-pink-700 dark:text-pink-300'
                                : 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300'
                            }`}>
                              {r.idx + 1}
                            </span>
                          </div>
                          <div className="col-span-5 min-w-0">
                            <p className="font-bold text-xs text-gray-900 dark:text-gray-100 truncate">
                              {r.isRun ? '🏃 ' : '🏋️ '}{r.name}
                            </p>
                            <p className="text-[10px] text-gray-400 font-mono truncate">{r.meta}</p>
                          </div>
                          <div className="col-span-2 text-center font-mono text-xs font-black text-purple-700 dark:text-purple-300 tabular-nums">
                            {r.timeA != null ? formatSecondsToTime(r.timeA) : '—'}
                          </div>
                          {sessionB ? (
                            <>
                              <div className="col-span-2 text-center font-mono text-xs font-bold text-gray-500 dark:text-gray-400 tabular-nums">
                                {r.timeB != null ? formatSecondsToTime(r.timeB) : '—'}
                              </div>
                              <div className="col-span-2 text-center">
                                {r.delta != null ? (
                                  <span className={`inline-block font-mono text-[11px] font-black px-1.5 py-0.5 rounded-md tabular-nums ${
                                    r.delta < 0
                                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                                      : r.delta > 0
                                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                                      : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                                  }`}>
                                    {r.delta === 0 ? '=' : formatDelta(r.delta)}
                                  </span>
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </div>
                            </>
                          ) : (
                            <div className="col-span-4 flex items-center gap-2">
                              <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${r.isRun ? 'bg-pink-500' : 'bg-purple-500'}`}
                                  style={{ width: `${compareTotals.totalA > 0 && r.timeA != null ? Math.max(3, (r.timeA / compareTotals.totalA) * 100) : 0}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-mono font-bold text-gray-500 tabular-nums w-9 text-right">
                                {compareTotals.totalA > 0 && r.timeA != null ? `${Math.round((r.timeA / compareTotals.totalA) * 100)}%` : '—'}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {/* Totales Run / Estaciones / Sesión */}
                    <div className="border-t dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/50 px-4 py-3 grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-pink-600 dark:text-pink-400">🏃 Runs</p>
                        <p className="text-sm font-black font-mono tabular-nums text-gray-900 dark:text-gray-100">
                          {formatSecondsToTime(compareTotals.runA)}
                        </p>
                        {sessionB && compareTotals.hasB && (
                          <p className={`text-[11px] font-mono font-bold tabular-nums ${compareTotals.runA - compareTotals.runB < 0 ? 'text-emerald-600' : compareTotals.runA - compareTotals.runB > 0 ? 'text-rose-600' : 'text-gray-400'}`}>
                            Δ {formatDelta(compareTotals.runA - compareTotals.runB)}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">🏋️ Estaciones</p>
                        <p className="text-sm font-black font-mono tabular-nums text-gray-900 dark:text-gray-100">
                          {formatSecondsToTime(compareTotals.stA)}
                        </p>
                        {sessionB && compareTotals.hasB && (
                          <p className={`text-[11px] font-mono font-bold tabular-nums ${compareTotals.stA - compareTotals.stB < 0 ? 'text-emerald-600' : compareTotals.stA - compareTotals.stB > 0 ? 'text-rose-600' : 'text-gray-400'}`}>
                            Δ {formatDelta(compareTotals.stA - compareTotals.stB)}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Total tramos</p>
                        <p className="text-sm font-black font-mono tabular-nums text-gray-900 dark:text-gray-100">
                          {formatSecondsToTime(compareTotals.totalA)}
                        </p>
                        {sessionB && compareTotals.deltaTotal != null && (
                          <p className={`text-[11px] font-mono font-bold tabular-nums ${compareTotals.deltaTotal < 0 ? 'text-emerald-600' : compareTotals.deltaTotal > 0 ? 'text-rose-600' : 'text-gray-400'}`}>
                            Δ {formatDelta(compareTotals.deltaTotal)}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Gráfico de deltas por tramo (solo comparando) */}
                {sessionB && compareRows.some((r) => r.delta != null) && (
                  <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
                    <CardContent className="p-4 space-y-2">
                      <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Diferencia por tramo (A − B · izquierda verde = A más rápida)
                      </p>
                      <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                        {compareRows.map((r) =>
                          r.delta == null ? null : (
                            <div key={r.idx} className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-gray-500 w-28 truncate shrink-0">{r.idx + 1}. {r.name}</span>
                              <div className="flex-1 h-5 relative bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden flex">
                                <div className="flex-1 flex justify-end items-center border-r border-gray-300 dark:border-gray-600">
                                  {r.delta < 0 && (
                                    <div
                                      className="h-full bg-emerald-500 rounded-l-md"
                                      style={{ width: `${Math.max(2, (Math.abs(r.delta) / maxAbsDelta) * 50)}%` }}
                                    />
                                  )}
                                </div>
                                <div className="flex-1 flex justify-start items-center">
                                  {r.delta > 0 && (
                                    <div
                                      className="h-full bg-rose-500 rounded-r-md"
                                      style={{ width: `${Math.max(2, (Math.abs(r.delta) / maxAbsDelta) * 50)}%` }}
                                    />
                                  )}
                                </div>
                              </div>
                              <span className={`text-[10px] font-mono font-black w-12 text-right tabular-nums ${r.delta < 0 ? 'text-emerald-600' : r.delta > 0 ? 'text-rose-600' : 'text-gray-400'}`}>
                                {r.delta === 0 ? '=' : formatDelta(r.delta)}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* 3. Las 8 Estaciones Oficiales de Hyrox */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-purple-600" />
                    Panel de Rendimiento: Las 8 Estaciones Oficiales Hyrox
                  </h4>
                  <p className="text-xs text-gray-400">Mejores marcas, ritmos y cargas registradas por estación</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {hyroxStations.map((st) => (
                  <Card key={st.id} className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-gray-900 dark:text-gray-100 block truncate">{st.name}</span>
                          <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 block">{st.officialStandard}</span>
                        </div>
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase shrink-0 ${
                          st.category === 'cardio'
                            ? 'bg-pink-100 text-pink-800 dark:bg-pink-950/60 dark:text-pink-300'
                            : st.category === 'power'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}>
                          {st.category}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] text-gray-400 font-semibold uppercase">Mejor Registro</span>
                        <div className="flex items-baseline gap-2">
                          <p className="text-xl font-black text-gray-900 dark:text-gray-100 font-mono">
                            {st.bestTimeSeconds
                              ? formatSecondsToTime(st.bestTimeSeconds)
                              : st.bestWeightKg
                              ? `${st.bestWeightKg} kg`
                              : st.bestDistanceM
                              ? `${st.bestDistanceM} m`
                              : st.bestReps
                              ? `${st.bestReps} reps`
                              : 'Sin datos'}
                          </p>
                          {st.bestPace && (
                            <span className="text-xs font-mono font-bold text-pink-600 dark:text-pink-400">
                              {st.bestPace}
                            </span>
                          )}
                        </div>
                        {st.bestWeightKg && st.bestTimeSeconds && (
                          <p className="text-[11px] text-gray-500 font-medium">Carga: {st.bestWeightKg} kg</p>
                        )}
                        {st.bestReps && st.bestTimeSeconds && (
                          <p className="text-[11px] text-gray-500 font-medium">Reps: {st.bestReps}</p>
                        )}
                      </div>

                      {/* Últimos tiempos por estación */}
                      {st.history.length > 0 && (
                        <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-1 text-[11px] text-gray-500">
                          <span className="text-[10px] font-bold text-gray-400 uppercase">Últimos tiempos:</span>
                          {st.history.slice(-3).reverse().map((h, hIdx) => (
                            <div key={hIdx} className="flex items-center justify-between gap-2">
                              <span className="truncate">
                                {new Date(h.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                {h.workoutName ? ` · ${h.workoutName.slice(0, 18)}` : ''}
                              </span>
                              <span className="font-mono font-bold text-gray-700 dark:text-gray-300 shrink-0">
                                {h.timeSeconds ? formatSecondsToTime(h.timeSeconds) : '—'}
                                {h.weight ? ` @${h.weight}kg` : ''}
                                {h.reps ? ` ×${h.reps}` : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[11px] text-gray-400">
                        <span>{st.totalSets} {st.totalSets === 1 ? 'serie' : 'series'}</span>
                        <span>{st.lastDate ? new Date(st.lastDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : 'Pendiente'}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* 4. Evolución de tiempos por estación (gráfico) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                    Evolución de Tiempos por Estación
                  </h4>
                  <p className="text-xs text-gray-400">Selecciona una estación para ver su curva de tiempos (abajo = más rápido)</p>
                </div>
              </div>

              {/* Selector de estación */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {hyroxStations.map((st) => {
                  const isActive = activeStation?.id === st.id;
                  const hasTimes = (st.history || []).some((h) => h.timeSeconds != null && h.timeSeconds > 0);
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => {
                        setSelectedStationId(st.id);
                        setStationHoverIndex(null);
                      }}
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap border ${
                        isActive
                          ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                          : hasTimes
                          ? 'bg-purple-50 dark:bg-purple-950/30 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-100'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-200'
                      }`}
                      title={hasTimes ? `${st.name}: ${st.history.filter((h) => h.timeSeconds).length} tiempos` : `${st.name}: sin tiempos todavía`}
                    >
                      {st.name}
                    </button>
                  );
                })}
              </div>

              {activeStation && stationTimeStats && stationTimeSeries.length > 0 ? (
                <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
                  <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800 bg-purple-50/40 dark:bg-purple-950/20">
                    <CardTitle className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center justify-between flex-wrap gap-2">
                      <span className="flex items-center gap-2">
                        <Timer className="w-4 h-4 text-purple-600" />
                        {activeStation.name}
                        <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                          {activeStation.officialStandard}
                        </span>
                      </span>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                        stationTimeStats.improvement > 0
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                          : stationTimeStats.improvement < 0
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {stationTimeStats.improvement > 0
                          ? `−${stationTimeStats.improvement}s (−${stationTimeStats.improvementPct}%) de mejora`
                          : stationTimeStats.improvement < 0
                          ? `+${Math.abs(stationTimeStats.improvement)}s vs inicio`
                          : 'Sin variación'}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-5 space-y-4">
                    {/* KPIs de la estación */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
                      <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-800/50">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Mejor</p>
                        <p className="text-lg sm:text-xl font-black text-purple-700 dark:text-purple-300 font-mono tabular-nums">
                          {formatSecondsToTime(stationTimeStats.best)}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Último</p>
                        <p className="text-lg sm:text-xl font-black text-gray-900 dark:text-gray-100 font-mono tabular-nums">
                          {formatSecondsToTime(stationTimeStats.latest)}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Registros</p>
                        <p className="text-lg sm:text-xl font-black text-gray-900 dark:text-gray-100 tabular-nums">
                          {stationTimeStats.count}
                        </p>
                      </div>
                    </div>

                    {/* Con un solo registro no hay evolución: se muestra el punto y este aviso */}
                    {stationTimeSeries.length === 1 && (
                      <p className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl px-3 py-2">
                        Solo hay 1 sesión con tiempo en esta estación ({formatSecondsToTime(stationTimeSeries[0].timeSeconds)}).
                        {hyroxCardio.totalSessions > 1
                          ? ` Tienes ${hyroxCardio.totalSessions} sesiones Hyrox/Cardio: abre las otras en Historial y comprueba que tengan tiempos ⏱ en sus tramos (cada sesión con tiempos suma un punto).`
                          : ' Registra otro Hyrox con tiempos (o edítalos desde el historial) y aquí verás la curva de evolución.'}
                      </p>
                    )}

                    {/* Gráfico SVG */}
                    <div className="overflow-x-auto">
                      <svg viewBox={`0 0 ${stationSvg.width} ${stationSvg.height}`} className="w-full h-auto min-w-[500px]">
                        <defs>
                          <linearGradient id="hyroxStationGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        {stationChart.yTicks.map((t, i) => (
                          <g key={i}>
                            <line
                              x1={stationSvg.padLeft}
                              y1={t.y}
                              x2={stationSvg.width - stationSvg.padRight}
                              y2={t.y}
                              stroke="currentColor"
                              className="text-gray-200 dark:text-gray-800"
                              strokeWidth={1}
                              strokeDasharray={i === 2 ? '0' : '4,4'}
                            />
                            <text
                              x={stationSvg.padLeft - 10}
                              y={t.y + 3.5}
                              textAnchor="end"
                              className="fill-gray-400 dark:fill-gray-500 font-mono text-[10px]"
                            >
                              {formatSecondsToTime(t.val)}
                            </text>
                          </g>
                        ))}
                        {stationChart.points.length > 1 && (
                          <>
                            <path d={stationChart.areaD} fill="url(#hyroxStationGradient)" />
                            <path
                              d={stationChart.lineD}
                              fill="none"
                              stroke="#9333ea"
                              strokeWidth={2.5}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </>
                        )}
                        {stationTimeSeries.map((p, i) => {
                          const pt = stationChart.points[i];
                          if (!pt) return null;
                          const show =
                            stationTimeSeries.length <= 6 ||
                            i === 0 ||
                            i === stationTimeSeries.length - 1 ||
                            i % Math.ceil(stationTimeSeries.length / 5) === 0;
                          return show ? (
                            <text
                              key={i}
                              x={pt.x}
                              y={stationSvg.height - 12}
                              textAnchor="middle"
                              className="fill-gray-400 dark:fill-gray-500 text-[9px] font-medium"
                            >
                              {new Date(p.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                            </text>
                          ) : null;
                        })}
                        {stationChart.points.map((pt, i) => {
                          const isBest = pt.timeSeconds === stationTimeStats.best;
                          const isHovered = stationHoverIndex === i;
                          const isLast = i === stationChart.points.length - 1 && stationHoverIndex === null;
                          return (
                            <g
                              key={i}
                              className="cursor-pointer"
                              onMouseEnter={() => setStationHoverIndex(i)}
                              onMouseLeave={() => setStationHoverIndex(null)}
                            >
                              <circle cx={pt.x} cy={pt.y} r="18" fill="transparent" />
                              {(isHovered || isLast) && (
                                <circle cx={pt.x} cy={pt.y} r="8" fill="#a855f7" opacity="0.3" />
                              )}
                              <circle
                                cx={pt.x}
                                cy={pt.y}
                                r={isHovered ? 5 : isBest ? 4.5 : 3.5}
                                fill={isBest ? '#f59e0b' : '#9333ea'}
                                stroke="white"
                                strokeWidth={2}
                              />
                            </g>
                          );
                        })}
                      </svg>
                      {(() => {
                        const idx = stationHoverIndex ?? stationChart.points.length - 1;
                        const pt = stationChart.points[idx];
                        if (!pt) return null;
                        return (
                          <div className="bg-gray-900 text-white dark:bg-gray-800 border border-gray-700 rounded-xl p-2.5 text-xs mt-2 max-w-xs">
                            <p className="font-bold font-mono text-sm">{formatSecondsToTime(pt.timeSeconds)}</p>
                            <p className="text-[11px] text-gray-300 truncate">{pt.workoutName || activeStation.name}</p>
                            <p className="text-[10px] text-gray-400">
                              {new Date(pt.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                              {pt.timeSeconds === stationTimeStats.best ? ' · 🏆 récord' : ''}
                            </p>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Historial completo de la estación */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Historial ({stationTimeSeries.length})
                      </span>
                      <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                        {stationTimeSeries.slice().reverse().map((p, i) => (
                          <div key={i} className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 px-2 py-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/60">
                            <span className="text-[11px]">
                              {new Date(p.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                              {p.workoutName ? ` · ${p.workoutName.slice(0, 24)}` : ''}
                            </span>
                            <span className={`font-mono text-[11px] font-bold tabular-nums ${p.timeSeconds === stationTimeStats.best ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-gray-200'}`}>
                              {formatSecondsToTime(p.timeSeconds)}
                              {p.timeSeconds === stationTimeStats.best ? ' 🏆' : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-dashed bg-gray-50/50 dark:bg-gray-800/30">
                  <CardContent className="py-8 text-center text-xs text-gray-500 space-y-1">
                    <p className="font-semibold text-gray-700 dark:text-gray-300">
                      {activeStation
                        ? `Sin tiempos registrados en ${activeStation.name} todavía.`
                        : 'Sin estaciones con tiempos todavía.'}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      Registra el tiempo (m:ss) de cada tramo al finalizar el Hyrox o desde el historial y aquí verás su curva de progresión.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: CARDIO & ERGÓMETROS PBs */}
        {activeTab === 'cardioPbs' && (
          <div className="space-y-4">
            {cardioPBs.length === 0 ? (
              <Card className="border-dashed bg-gray-50/50 dark:bg-gray-800/30">
                <CardContent className="py-8 text-center text-xs text-gray-500">
                  Registra series de Remo, SkiErg o Carrera con distancia (metros) y tiempo (segundos) para ver tus mejores marcas personales (PBs).
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {cardioPBs.map((pb, idx) => (
                  <Card key={idx} className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-pink-600 dark:text-pink-400">{pb.discipline}</span>
                        <span className="text-[10px] text-gray-400">{new Date(pb.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-xl font-black text-gray-900 dark:text-gray-100">{pb.distance}m</span>
                        <span className="text-lg font-mono font-bold text-pink-600 dark:text-pink-400">
                          ⏱️ {formatSecondsToTime(pb.bestTimeSeconds)}
                        </span>
                      </div>
                      {pb.pace && (
                        <p className="text-[11px] text-gray-500 font-mono">Ritmo: {pb.pace}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── 3. DISTRIBUCIÓN CROSSFIT (solo benchmarks / halterofilia) ─── */}
      {showCrossfitSections && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribución de Modalidades */}
        <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
          <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800 bg-orange-50/40 dark:bg-orange-950/20">
            <CardTitle className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-orange-600" />
                Distribución por Formato de WOD
              </span>
              <span className="text-xs font-normal text-gray-400">
                {modalityBreakdown.reduce((acc, m) => acc + m.count, 0)} sesiones categorizadas
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-4">
            {modalityBreakdown.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-6">
                Aún no has registrado modalidades (AMRAP, For Time, EMOM, etc.).
              </p>
            ) : (
              <div className="space-y-3">
                {modalityBreakdown.map((item) => (
                  <div key={item.modality} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-orange-500" />
                        {item.modality}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 font-mono font-semibold">
                        {item.count} {item.count === 1 ? 'sesión' : 'sesiones'} ({item.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-linear-to-r from-orange-500 to-amber-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(4, item.percentage)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mejores Tiempos For Time / AFAP */}
        <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
          <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800 bg-amber-50/40 dark:bg-amber-950/20">
            <CardTitle className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                Mejores Tiempos (For Time / AFAP)
              </span>
              <span className="text-xs font-normal text-amber-600 dark:text-amber-400 font-semibold">
                Velocidad & Sprint
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-3">
            {fastestForTime.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-6">
                Registra WODs con modalidad "For Time" o "AFAP" para ver tus récords de velocidad aquí.
              </p>
            ) : (
              <div className="space-y-2">
                {fastestForTime.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          idx === 0
                            ? 'bg-amber-400 text-amber-950 shadow-xs'
                            : idx === 1
                            ? 'bg-gray-300 text-gray-800'
                            : idx === 2
                            ? 'bg-amber-700 text-amber-100'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 text-[11px]'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-xs text-gray-900 dark:text-gray-100 truncate">{item.name}</p>
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                          <span>{formatModalitySummary(item.modality, item.modalityConfig)}</span>
                          <span>·</span>
                          <span>{new Date(item.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                        </div>
                      </div>
                    </div>

                    <div className="font-mono text-xs font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800 shrink-0">
                      ⏱️ {item.totalTimeSeconds ? formatSecondsToTime(item.totalTimeSeconds) : `${item.totalTimeMinutes} min`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      )}

      {/* ─── 3b. DISTRIBUCIÓN HYROX (solo pestaña Hyrox & estaciones) ─── */}
      {showHyroxSections && (
        <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
          <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800 bg-purple-50/40 dark:bg-purple-950/20">
            <CardTitle className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-600" />
                Distribución por Formato Hyrox / Cardio
              </span>
              <span className="text-xs font-normal text-gray-400">
                {hyroxModalityBreakdown.reduce((acc, m) => acc + m.count, 0)} sesiones categorizadas
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-4">
            {hyroxModalityBreakdown.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-6">
                Aún no has registrado modalidades en sesiones Hyrox / Cardio.
              </p>
            ) : (
              <div className="space-y-3">
                {hyroxModalityBreakdown.map((item) => (
                  <div key={item.modality} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-purple-500" />
                        {item.modality}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 font-mono font-semibold">
                        {item.count} {item.count === 1 ? 'sesión' : 'sesiones'} ({item.percentage ?? 0}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-linear-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(4, item.percentage ?? 0)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── 4. HISTORIALES SEPARADOS POR DISCIPLINA ─── */}
      {showCrossfitSections && (
      <div className="grid grid-cols-1 gap-6">
        {/* CrossFit WODs */}
        <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
          <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800 bg-orange-50/40 dark:bg-orange-950/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <CardTitle className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Zap className="w-4 h-4 text-orange-600" />
                Historial de WODs & Sesiones CrossFit
              </CardTitle>

              {/* Filtro rápido por modalidad (solo CrossFit) */}
              {crossfitUsedModalities.length > 0 && (
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                  <button
                    type="button"
                    onClick={() => setSelectedModalityFilter('all')}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                      selectedModalityFilter === 'all'
                        ? 'bg-orange-600 text-white shadow-2xs'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    Todos
                  </button>
                  {crossfitUsedModalities.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSelectedModalityFilter(m)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                        selectedModalityFilter === m
                          ? 'bg-orange-600 text-white shadow-2xs'
                          : 'bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/40 hover:bg-orange-100'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-3">
            {timeCapStats.wodsWithCap > 0 && (
              <div className="flex items-center gap-2 text-xs bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl px-3 py-2">
                <Timer className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="text-gray-600 dark:text-gray-300">
                  <strong className="text-amber-700 dark:text-amber-300 font-mono">{timeCapStats.capSuccessRate}% bajo time-cap</strong>
                  {' '}({timeCapStats.finishedUnderCap}/{timeCapStats.wodsWithCap} WODs con límite terminados a tiempo)
                </span>
              </div>
            )}
            {filteredWods.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-6">
                No hay WODs {selectedModalityFilter !== 'all' ? `con modalidad ${selectedModalityFilter}` : ''} registrados todavía.
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {filteredWods.map((wod) => (
                  <div
                    key={wod.id}
                    className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-bold text-xs text-gray-900 dark:text-gray-100 truncate">{wod.name}</p>
                        {wod.modality && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-orange-100 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800 shrink-0">
                            <Flame className="w-2.5 h-2.5" />
                            {formatModalitySummary(wod.modality, wod.modalityConfig)}
                          </span>
                        )}
                        {wod.isRx !== undefined && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                            wod.isRx ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                          }`}>
                            {wod.isRx ? 'Rx' : 'Scaled'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-gray-400">
                        <span>{new Date(wod.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                        <span>·</span>
                        <span>{wod.exercisesCount} ejercicios</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 bg-white dark:bg-gray-900 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 font-mono text-xs font-bold text-orange-600 dark:text-orange-400">
                      <Timer className="w-3.5 h-3.5" />
                      <span>{wod.totalTimeSeconds ? formatSecondsToTime(wod.totalTimeSeconds) : wod.totalTimeMinutes > 0 ? `${wod.totalTimeMinutes} min` : 'Completado'}</span>
                    </div>
                    <Link
                      href={`/workouts/log?mode=repeat&workoutId=${wod.id}`}
                      className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                      title={`Repetir ${wod.name}`}
                    >
                      <Repeat className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
      )}

      {/* ─── 4b. HISTORIAL HYROX (solo pestaña Hyrox & estaciones) ─── */}
      {showHyroxSections && (
      <div className="grid grid-cols-1 gap-6">
        <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
          <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800 bg-pink-50/40 dark:bg-pink-950/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <CardTitle className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Heart className="w-4 h-4 text-pink-600" />
                Sesiones Hyrox & Cardio / Endurance
              </CardTitle>
              {hyroxUsedModalities.length > 0 && (
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                  <button
                    type="button"
                    onClick={() => setSelectedHyroxModalityFilter('all')}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                      selectedHyroxModalityFilter === 'all'
                        ? 'bg-pink-600 text-white shadow-2xs'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    Todos
                  </button>
                  {hyroxUsedModalities.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSelectedHyroxModalityFilter(m)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                        selectedHyroxModalityFilter === m
                          ? 'bg-pink-600 text-white shadow-2xs'
                          : 'bg-pink-50 dark:bg-pink-950/30 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800/40 hover:bg-pink-100'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-3">
            {filteredHyroxSessions.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-6">
                No hay sesiones de Hyrox o Cardio {selectedHyroxModalityFilter !== 'all' ? `con modalidad ${selectedHyroxModalityFilter}` : ''} registradas todavía.
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {filteredHyroxSessions.map((sess) => (
                  <div
                    key={sess.id}
                    className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-bold text-xs text-gray-900 dark:text-gray-100 truncate">{sess.name}</p>
                        {sess.modality && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-pink-100 dark:bg-pink-950/40 text-pink-800 dark:text-pink-300 border border-pink-200 dark:border-pink-800 shrink-0">
                            <Flame className="w-2.5 h-2.5" />
                            {formatModalitySummary(sess.modality, sess.modalityConfig)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-gray-400">
                        <span>{new Date(sess.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 bg-white dark:bg-gray-900 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 font-mono text-xs font-bold text-pink-600 dark:text-pink-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{sess.totalTimeMinutes > 0 ? `${sess.totalTimeMinutes} min` : 'Completado'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      )}
    </div>
  );
}
