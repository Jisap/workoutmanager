'use client';

import { useState, useMemo } from 'react';
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
  }[];
  dailyHistory: {
    date: string;
    weight: number;
    reps: number;
    estimated1RM: number;
    workoutName: string;
  }[];
}

interface BenchmarkItem {
  name: string;
  workoutType?: string;
  attempts: number;
  isOfficial?: boolean;
  bestTimeSeconds: number | null;
  isRx: boolean;
  deltaSeconds: number | null;
  history: {
    date: string;
    timeSeconds: number | null;
    timeMinutes: number;
    isRx: boolean;
    notes: string | null;
    workoutType?: string;
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
    sessions: {
      id: number;
      name: string;
      date: string;
      modality?: string | null;
      modalityConfig?: ModalityConfig | null;
      totalTimeMinutes: number;
      totalTimeSeconds?: number | null;
      notes: string | null;
    }[];
    modalityBreakdown?: {
      modality: string;
      count: number;
    }[];
  };
}

function formatSecondsToTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function ProgressCrossfitCardio({ crossfit, hyroxCardio }: ProgressCrossfitCardioProps) {
  const [selectedModalityFilter, setSelectedModalityFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'benchmarks' | 'olympic' | 'hyrox' | 'cardioPbs'>('benchmarks');
  const [benchmarkCategory, setBenchmarkCategory] = useState<'all' | 'official' | 'custom'>('all');

  const modalityBreakdown = crossfit.modalityBreakdown || [];
  const fastestForTime = crossfit.fastestForTime || [];
  const rxStats = crossfit.rxStats || { rxWodsCount: 0, scaledWodsCount: 0, totalWods: 0, rxPercentage: 0 };
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

  // Filtrado de WODs por modalidad
  const filteredWods = useMemo(() => {
    if (selectedModalityFilter === 'all') return crossfit.wods;
    return crossfit.wods.filter((w) => w.modality === selectedModalityFilter);
  }, [crossfit.wods, selectedModalityFilter]);

  // Lista única de modalidades registradas para los botones de filtro
  const allUsedModalities = useMemo(() => {
    const set = new Set<string>();
    for (const w of crossfit.wods) if (w.modality) set.add(w.modality);
    for (const s of hyroxCardio.sessions) if (s.modality) set.add(s.modality);
    return Array.from(set).sort();
  }, [crossfit.wods, hyroxCardio.sessions]);

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
                    onClick={() => setBenchmarkCategory('all')}
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
                      onClick={() => setBenchmarkCategory('official')}
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
                      onClick={() => setBenchmarkCategory('custom')}
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
                      ? 'No hay entrenamientos funcionales repetidos 2 o más veces.'
                      : 'Aún no has registrado Benchmarks oficiales ni entrenamientos funcionales repetidos.'}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    Al repetir un WOD o sesión funcional con el mismo nombre, el sistema analizará automáticamente tu mejora de tiempo.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredBenchmarks.map((bm) => (
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

                      <div className="flex items-baseline justify-between pt-1">
                        <div>
                          <p className="text-xs text-gray-400">Mejor Tiempo / Récord</p>
                          <p className="text-2xl font-black text-orange-600 dark:text-orange-400 font-mono">
                            {bm.bestTimeSeconds ? formatSecondsToTime(bm.bestTimeSeconds) : 'Completado'}
                          </p>
                        </div>
                        <span className="text-xs text-gray-400">{bm.attempts} {bm.attempts === 1 ? 'intento' : 'intentos'}</span>
                      </div>

                      {bm.deltaSeconds !== null && (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 p-2 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                          <TrendingDown className="w-3.5 h-3.5" />
                          <span className="font-bold">-{bm.deltaSeconds} seg de mejora</span>
                          <span className="text-[10px] text-gray-400">vs primer intento</span>
                        </div>
                      )}

                      {/* Historial de intentos */}
                      <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-1 text-[11px] text-gray-500">
                        {bm.history.slice(-3).reverse().map((h, hIdx) => (
                          <div key={hIdx} className="flex items-center justify-between">
                            <span>{new Date(h.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                            <span className="font-mono font-semibold text-gray-700 dark:text-gray-300">
                              {h.timeSeconds ? formatSecondsToTime(h.timeSeconds) : `${h.timeMinutes} min`} {h.isRx ? '(Rx)' : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
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
                        <div key={i} className="flex items-center justify-between text-[11px]">
                          <span>{new Date(h.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                          <span className="font-mono font-semibold text-gray-800 dark:text-gray-200">
                            {h.weight}kg × {h.reps} reps (1RM ~{h.estimated1RM}kg)
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
                        <div key={i} className="flex items-center justify-between text-[11px]">
                          <span>{new Date(h.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                          <span className="font-mono font-semibold text-gray-800 dark:text-gray-200">
                            {h.weight}kg × {h.reps} reps (1RM ~{h.estimated1RM}kg)
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
                      </div>

                      <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[11px] text-gray-400">
                        <span>{st.totalSets} {st.totalSets === 1 ? 'serie' : 'series'}</span>
                        <span>{st.lastDate ? new Date(st.lastDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : 'Pendiente'}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
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

      {/* ─── 3. DISTRIBUCIÓN POR MODALIDAD & RANKING FOR TIME ─── */}
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

      {/* ─── 4. SECCIÓN HISTORIAL DE WODS & SESIONES ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CrossFit WODs */}
        <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
          <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800 bg-orange-50/40 dark:bg-orange-950/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <CardTitle className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Zap className="w-4 h-4 text-orange-600" />
                Historial de WODs & Sesiones CrossFit
              </CardTitle>

              {/* Filtro rápido por modalidad */}
              {allUsedModalities.length > 0 && (
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
                  {allUsedModalities.map((m) => (
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
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hyrox & Endurance */}
        <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
          <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800 bg-pink-50/40 dark:bg-pink-950/20">
            <CardTitle className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Heart className="w-4 h-4 text-pink-600" />
              Sesiones Hyrox & Cardio / Endurance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-3">
            {hyroxCardio.sessions.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-6">
                No hay sesiones de Hyrox o Cardio registradas todavía.
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {hyroxCardio.sessions.map((sess) => (
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
    </div>
  );
}
