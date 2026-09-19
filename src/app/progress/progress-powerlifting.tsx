'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Trophy,
  Award,
  TrendingUp,
  Activity,
  Flame,
  Scale,
  Zap,
  Info,
  CheckCircle2,
  AlertTriangle,
  Sliders,
} from 'lucide-react';

interface LiftHistoryEntry {
  date: string;
  weight: number;
  reps: number;
  estimated1RM: number;
  workoutName: string;
  workoutType?: string | null;
}

interface LiftStats {
  name: string;
  maxWeightReal: number;
  estimated1RM: number;
  estimated3RM: number;
  estimated5RM: number;
  totalSets: number;
  history: LiftHistoryEntry[];
  dailyHistory: LiftHistoryEntry[];
}

interface SbdView {
  squat: LiftStats;
  bench: LiftStats;
  deadlift: LiftStats;
  sbdTotal: number;
  sbdRealTotal: number;
  proportions: {
    squatPct: number;
    benchPct: number;
    deadliftPct: number;
    idealRatios: { squat: number; bench: number; deadlift: number };
    balanceStatus: string;
    balanceMessage: string;
    balanceType: 'balanced' | 'lagging_bench' | 'lagging_squat' | 'lagging_deadlift' | 'dominant';
  };
}

interface ProgressPowerliftingProps {
  powerlifting: SbdView & {
    allSources?: SbdView;
    sourceInfo?: {
      strictMode: boolean;
      allowedTypes: string[];
      excludedSets: number;
      excludedByType: Record<string, number>;
    };
  };
}

// Coeficientes oficiales DOTS (IPF)
function calculateDots(totalKg: number, bodyweightKg: number, isMale = true): number {
  if (totalKg <= 0 || bodyweightKg <= 30) return 0;
  const bw = Math.min(Math.max(bodyweightKg, 40), 210);

  // Polinomio DOTS: A*x^4 + B*x^3 + C*x^2 + D*x + E
  const c = isMale
    ? {
        a: -0.000001093,
        b: 0.0007391293,
        c: -0.1918759221,
        d: 24.0900756,
        e: -307.75076,
      }
    : {
        a: -0.0000010706,
        b: 0.0005158568,
        c: -0.1126655495,
        d: 13.6175032,
        e: -57.96288,
      };

  const denom =
    c.a * Math.pow(bw, 4) +
    c.b * Math.pow(bw, 3) +
    c.c * Math.pow(bw, 2) +
    c.d * bw +
    c.e;

  if (denom <= 0) return 0;
  return Math.round((totalKg * (500 / denom)) * 10) / 10;
}

function getDotsLevel(dots: number): { label: string; color: string; desc: string; maxRange: number } {
  if (dots < 200) return { label: 'Iniciación', color: 'text-gray-500', desc: 'Construyendo patrones básicos de fuerza', maxRange: 200 };
  if (dots < 275) return { label: 'Principiante', color: 'text-blue-600 dark:text-blue-400', desc: 'Fuerza sólida respecto a tu peso corporal', maxRange: 275 };
  if (dots < 350) return { label: 'Intermedio', color: 'text-emerald-600 dark:text-emerald-400', desc: 'Rendimiento notable en atletas aficionados', maxRange: 350 };
  if (dots < 425) return { label: 'Avanzado', color: 'text-purple-600 dark:text-purple-400', desc: 'Nivel competitivo regional/nacional', maxRange: 425 };
  return { label: 'Élite / Clase Mundial', color: 'text-amber-600 dark:text-amber-400', desc: 'Marcas de nivel élite internacional', maxRange: 500 };
}

export function ProgressPowerlifting({ powerlifting }: ProgressPowerliftingProps) {
  // Vista por defecto: solo fuerza (Powerlifting + Musculación). Opt-in: incluir WODs.
  const [includeWods, setIncludeWods] = useState(false);
  const view: SbdView =
    includeWods && powerlifting.allSources ? powerlifting.allSources : powerlifting;
  const { squat, bench, deadlift, sbdTotal, sbdRealTotal, proportions } = view;
  const excludedSets = powerlifting.sourceInfo?.excludedSets ?? 0;

  // Estado para la calculadora DOTS
  const [bodyweight, setBodyweight] = useState<number>(75);
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [activeChartLift, setActiveChartLift] = useState<'all' | 'squat' | 'bench' | 'deadlift'>('all');
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; text: string; date: string; lift: string } | null>(null);

  const dotsScore = useMemo(() => {
    return calculateDots(sbdTotal, bodyweight, gender === 'male');
  }, [sbdTotal, bodyweight, gender]);

  const dotsLevel = useMemo(() => getDotsLevel(dotsScore), [dotsScore]);

  const liftsConfig = [
    {
      key: 'squat',
      title: 'Sentadilla (Squat)',
      short: 'Sentadilla',
      data: squat,
      pct: proportions?.squatPct || 0,
      idealPct: proportions?.idealRatios?.squat || 35,
      color: {
        badge: 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        text: 'text-purple-600 dark:text-purple-400',
        border: 'border-purple-200 dark:border-purple-800',
        bg: 'bg-purple-500',
        hex: '#a855f7',
        lightBg: 'bg-purple-50/70 dark:bg-purple-950/20',
      },
    },
    {
      key: 'bench',
      title: 'Press de Banca (Bench Press)',
      short: 'Banca',
      data: bench,
      pct: proportions?.benchPct || 0,
      idealPct: proportions?.idealRatios?.bench || 25,
      color: {
        badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        text: 'text-blue-600 dark:text-blue-400',
        border: 'border-blue-200 dark:border-blue-800',
        bg: 'bg-blue-500',
        hex: '#3b82f6',
        lightBg: 'bg-blue-50/70 dark:bg-blue-950/20',
      },
    },
    {
      key: 'deadlift',
      title: 'Peso Muerto (Deadlift)',
      short: 'Peso Muerto',
      data: deadlift,
      pct: proportions?.deadliftPct || 0,
      idealPct: proportions?.idealRatios?.deadlift || 40,
      color: {
        badge: 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800',
        text: 'text-orange-600 dark:text-orange-400',
        border: 'border-orange-200 dark:border-orange-800',
        bg: 'bg-orange-500',
        hex: '#f97316',
        lightBg: 'bg-orange-50/70 dark:bg-orange-950/20',
      },
    },
  ];

  // ─── SVG Line Chart: Evolución 1RM en el tiempo ───
  const svgWidth = 720;
  const svgHeight = 240;
  const padLeft = 55;
  const padRight = 24;
  const padTop = 20;
  const padBottom = 40;
  const chartWidth = svgWidth - padLeft - padRight;
  const chartHeight = svgHeight - padTop - padBottom;

  // Unificar fechas cronológicas de los 3 movimientos
  const timelineData = useMemo(() => {
    const allDatesSet = new Set<string>();
    squat.dailyHistory?.forEach((h) => allDatesSet.add(h.date.split('T')[0]));
    bench.dailyHistory?.forEach((h) => allDatesSet.add(h.date.split('T')[0]));
    deadlift.dailyHistory?.forEach((h) => allDatesSet.add(h.date.split('T')[0]));

    const sortedDates = Array.from(allDatesSet).sort();
    if (sortedDates.length === 0) return { dates: [], points: {}, max1RM: 100 };

    const squatMap = new Map(squat.dailyHistory?.map((h) => [h.date.split('T')[0], h]));
    const benchMap = new Map(bench.dailyHistory?.map((h) => [h.date.split('T')[0], h]));
    const deadliftMap = new Map(deadlift.dailyHistory?.map((h) => [h.date.split('T')[0], h]));

    let max1RM = Math.max(
      squat.estimated1RM || 0,
      bench.estimated1RM || 0,
      deadlift.estimated1RM || 0,
      100
    );

    const getPointsForLift = (map: Map<string, any>) => {
      const pts: { x: number; y: number; val: number; date: string; raw: any }[] = [];
      sortedDates.forEach((d, i) => {
        const item = map.get(d);
        if (item) {
          const x = sortedDates.length === 1
            ? padLeft + chartWidth / 2
            : padLeft + (i / Math.max(1, sortedDates.length - 1)) * chartWidth;
          const y = padTop + chartHeight - (item.estimated1RM / max1RM) * chartHeight;
          pts.push({ x, y, val: item.estimated1RM, date: d, raw: item });
        }
      });
      return pts;
    };

    return {
      dates: sortedDates,
      points: {
        squat: getPointsForLift(squatMap),
        bench: getPointsForLift(benchMap),
        deadlift: getPointsForLift(deadliftMap),
      },
      max1RM,
    };
  }, [squat, bench, deadlift, chartWidth, chartHeight, padLeft, padTop]);

  const ySteps = useMemo(() => {
    const steps = 4;
    const stepVal = timelineData.max1RM / steps;
    return Array.from({ length: steps + 1 }, (_, i) => {
      const val = Math.round(stepVal * i);
      const y = padTop + chartHeight - (val / timelineData.max1RM) * chartHeight;
      return { val, y };
    });
  }, [timelineData.max1RM, chartHeight, padTop]);

  return (
    <div className="space-y-6">
      {/* ─── 0. FUENTE DE DATOS: solo fuerza por defecto ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border border-purple-200/70 dark:border-purple-800/50 bg-purple-50/60 dark:bg-purple-950/20 text-xs">
        <p className="text-gray-600 dark:text-gray-300">
          {includeWods ? (
            <>Incluyendo <strong>todas las modalidades</strong> (fuerza + WODs de CrossFit/Funcional).</>
          ) : (
            <>Solo <strong>Powerlifting + Musculación</strong>
              {excludedSets > 0 && (
                <> · <span className="text-gray-500">{excludedSets} {excludedSets === 1 ? 'serie' : 'series'} de otras modalidades excluida{excludedSets === 1 ? '' : 's'}</span></>
              )}
              .</>
          )}
        </p>
        {powerlifting.allSources && (
          <button
            type="button"
            onClick={() => setIncludeWods((v) => !v)}
            className={`shrink-0 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer border ${
              includeWods
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-white dark:bg-gray-900 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/40'
            }`}
            title="Los WODs se hacen bajo fatiga y con técnica distinta; mezclarlos infla el 1RM estimado"
          >
            {includeWods ? 'Ver solo fuerza' : 'Incluir WODs'}
          </button>
        )}
      </div>

      {/* ─── 1. SBD TOTAL CARD (Hero de Powerlifting) ─── */}
      <Card className="border-purple-200/80 dark:border-purple-800/60 bg-gradient-to-br from-purple-50/60 via-white to-blue-50/40 dark:from-purple-950/20 dark:via-gray-900 dark:to-blue-950/20 shadow-xs">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                <Trophy className="w-3.5 h-3.5" /> Total Powerlifting (Big 3)
              </span>
              <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-100">
                SBD Total: Sentadilla + Banca + Peso Muerto
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Suma acumulada de tu 1RM estimado en los tres movimientos básicos de fuerza máxima.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-baseline sm:items-center gap-3 bg-white dark:bg-gray-800/80 p-3.5 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-2xs self-stretch sm:self-auto justify-between sm:justify-start">
              <div>
                <span className="text-3xl sm:text-4xl font-black text-purple-600 dark:text-purple-400 tabular-nums">
                  {sbdTotal.toFixed(1)}
                </span>
                <span className="text-xs font-bold text-gray-400 ml-1.5">kg 1RM</span>
              </div>
              <div className="border-l border-gray-200 dark:border-gray-700 pl-3 hidden sm:block">
                <p className="text-[10px] text-gray-400 font-semibold uppercase">Carga Real</p>
                <p className="text-sm font-bold text-gray-700 dark:text-gray-300 tabular-nums">
                  {sbdRealTotal.toFixed(1)} kg
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-5 pt-4 border-t border-gray-200/60 dark:border-gray-800 text-center">
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Sentadilla 1RM</p>
              <p className="text-base sm:text-lg font-black text-gray-900 dark:text-gray-100 tabular-nums">
                {squat.estimated1RM} kg
              </p>
              <p className="text-[10px] text-gray-400">Real máx: {squat.maxWeightReal}kg</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Banca 1RM</p>
              <p className="text-base sm:text-lg font-black text-gray-900 dark:text-gray-100 tabular-nums">
                {bench.estimated1RM} kg
              </p>
              <p className="text-[10px] text-gray-400">Real máx: {bench.maxWeightReal}kg</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">Peso Muerto 1RM</p>
              <p className="text-base sm:text-lg font-black text-gray-900 dark:text-gray-100 tabular-nums">
                {deadlift.estimated1RM} kg
              </p>
              <p className="text-[10px] text-gray-400">Real máx: {deadlift.maxWeightReal}kg</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── 2. GRÁFICA DE EVOLUCIÓN TEMPORAL 1RM ─── */}
      <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
        <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <CardTitle className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              Evolución del 1RM Estimado en el Tiempo
            </CardTitle>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveChartLift('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeChartLift === 'all'
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Todos
              </button>
              {liftsConfig.map((l) => (
                <button
                  key={l.key}
                  onClick={() => setActiveChartLift(l.key as any)}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeChartLift === l.key
                      ? `${l.color.lightBg} ${l.color.text} border ${l.color.border}`
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {l.short}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 space-y-4">
          {timelineData.dates.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400">
              {includeWods
                ? 'Registra entrenamientos de Sentadilla, Press de Banca o Peso Muerto para ver la curva de fuerza en el tiempo.'
                : 'Sin marcas de fuerza (Powerlifting/Musculación) todavía. Tus series de CrossFit/Funcional no cuentan aquí por defecto — usa “Incluir WODs” si quieres verlas.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto min-w-[500px]">
                {/* Y Axis Grid */}
                {ySteps.map((s, i) => (
                  <g key={i}>
                    <line
                      x1={padLeft}
                      y1={s.y}
                      x2={svgWidth - padRight}
                      y2={s.y}
                      stroke="currentColor"
                      className="text-gray-200 dark:text-gray-800"
                      strokeWidth={1}
                      strokeDasharray={i === 0 ? '0' : '4,4'}
                    />
                    <text
                      x={padLeft - 10}
                      y={s.y + 3.5}
                      textAnchor="end"
                      className="fill-gray-400 dark:fill-gray-500 font-mono text-[10px]"
                    >
                      {s.val} kg
                    </text>
                  </g>
                ))}

                {/* X Axis Date labels */}
                {timelineData.dates.map((d, i) => {
                  const x = timelineData.dates.length === 1
                    ? padLeft + chartWidth / 2
                    : padLeft + (i / Math.max(1, timelineData.dates.length - 1)) * chartWidth;
                  const show =
                    timelineData.dates.length <= 6 ||
                    i === 0 ||
                    i === timelineData.dates.length - 1 ||
                    i % Math.ceil(timelineData.dates.length / 5) === 0;

                  return show ? (
                    <text
                      key={i}
                      x={x}
                      y={svgHeight - 12}
                      textAnchor="middle"
                      className="fill-gray-400 dark:fill-gray-500 text-[9px] font-medium"
                    >
                      {new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </text>
                  ) : null;
                })}

                {/* Lines and points */}
                {liftsConfig.map((l) => {
                  if (activeChartLift !== 'all' && activeChartLift !== l.key) return null;
                  const pts = (timelineData.points as any)[l.key] || [];
                  if (pts.length === 0) return null;

                  const lineD = pts
                    .map((p: any, i: number) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
                    .join(' ');

                  return (
                    <g key={l.key}>
                      {pts.length > 1 && (
                        <path
                          d={lineD}
                          fill="none"
                          stroke={l.color.hex}
                          strokeWidth={2.5}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}
                      {pts.map((p: any, i: number) => (
                        <circle
                          key={i}
                          cx={p.x}
                          cy={p.y}
                          r={4.5}
                          fill={l.color.hex}
                          stroke="white"
                          strokeWidth={2}
                          className="dark:stroke-gray-900 cursor-pointer transition-transform hover:scale-125"
                          onMouseEnter={() =>
                            setHoveredPoint({
                              x: p.x,
                              y: p.y,
                              lift: l.title,
                              text: `${p.val} kg 1RM (${p.raw.weight}kg × ${p.raw.reps})`,
                              date: new Date(p.date).toLocaleDateString('es-ES', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              }),
                            })
                          }
                          onMouseLeave={() => setHoveredPoint(null)}
                        />
                      ))}
                    </g>
                  );
                })}
              </svg>

              {/* Tooltip flotante */}
              {hoveredPoint && (
                <div className="bg-gray-900 text-white dark:bg-gray-800 border border-gray-700 rounded-xl p-2.5 shadow-xl text-xs space-y-0.5 mt-2 max-w-xs">
                  <p className="font-bold text-gray-200">{hoveredPoint.lift}</p>
                  <p className="text-gray-300 font-mono">{hoveredPoint.text}</p>
                  <p className="text-[10px] text-gray-400">{hoveredPoint.date}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── 3. ANÁLISIS DE PROPORCIÓN SBD & REZAGO ─── */}
      <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
        <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40">
          <CardTitle className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Scale className="w-4 h-4 text-blue-600" />
            Proporción SBD y Balance de Levantamientos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Distribución porcentual de tu Total SBD frente a la media anatómica estándar de powerlifting (<strong>35% Sentadilla · 25% Banca · 40% Peso Muerto</strong>).
            </p>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1.5 ${
              proportions?.balanceType === 'balanced'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
            }`}>
              {proportions?.balanceType === 'balanced' ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5" />
              )}
              {proportions?.balanceStatus || 'Equilibrado'}
            </span>
          </div>

          {/* Barra segmentada comparativa */}
          <div className="w-full h-4 rounded-full overflow-hidden flex bg-gray-100 dark:bg-gray-800">
            <div
              className="bg-purple-500 transition-all duration-500"
              style={{ width: `${proportions?.squatPct || 0}%` }}
              title={`Sentadilla: ${proportions?.squatPct}%`}
            />
            <div
              className="bg-blue-500 transition-all duration-500"
              style={{ width: `${proportions?.benchPct || 0}%` }}
              title={`Banca: ${proportions?.benchPct}%`}
            />
            <div
              className="bg-orange-500 transition-all duration-500"
              style={{ width: `${proportions?.deadliftPct || 0}%` }}
              title={`Peso Muerto: ${proportions?.deadliftPct}%`}
            />
          </div>

          {/* Cards de desglose SBD */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {liftsConfig.map((l) => {
              const diff = l.pct - l.idealPct;
              return (
                <div key={l.key} className={`p-3.5 rounded-xl border ${l.color.lightBg} ${l.color.border} space-y-1.5`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900 dark:text-gray-100">{l.short}</span>
                    <span className="text-[11px] font-mono text-gray-400">Ideal ~{l.idealPct}%</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <p className={`text-xl font-black tabular-nums ${l.color.text}`}>
                      {l.pct}%
                    </p>
                    <span className={`text-[10px] font-bold ${
                      Math.abs(diff) <= 3
                        ? 'text-emerald-600'
                        : diff < -3
                          ? 'text-amber-600'
                          : 'text-blue-600'
                    }`}>
                      {diff > 0 ? `+${diff}%` : `${diff}%`} vs ideal
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    {l.data.estimated1RM} kg de {sbdTotal.toFixed(1)} kg total
                  </p>
                </div>
              );
            })}
          </div>

          {proportions?.balanceMessage && (
            <p className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/60 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
              💡 {proportions.balanceMessage}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ─── 4. CALCULADORA Y COEFICIENTE DE RENDIMIENTO (DOTS) ─── */}
      <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
        <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <CardTitle className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              Fuerza Relativa: Puntos DOTS (Estándar Oficial IPF)
            </CardTitle>
            <span className="text-[11px] text-gray-400">Normalizado por peso corporal</span>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 space-y-5">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            La fórmula <strong>DOTS</strong> es la métrica oficial de la Federación Internacional de Powerlifting (IPF). Permite comparar tu nivel de fuerza absoluta ponderado según tu peso corporal y sexo biológico.
          </p>

          {/* Controles de Peso Corporal y Sexo */}
          <div className="flex flex-wrap items-center gap-4 p-3.5 bg-gray-50/70 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Tu Peso:</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="40"
                  max="200"
                  value={bodyweight}
                  onChange={(e) => setBodyweight(Math.max(30, Number(e.target.value) || 75))}
                  className="w-16 px-2 py-1 text-center font-bold text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                />
                <span className="text-xs text-gray-500">kg</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Sexo:</span>
              <button
                onClick={() => setGender('male')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  gender === 'male'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                Masculino
              </button>
              <button
                onClick={() => setGender('female')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  gender === 'female'
                    ? 'bg-pink-600 text-white shadow-xs'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                Femenino
              </button>
            </div>
          </div>

          {/* Resultado DOTS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50/40 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200/80 dark:border-amber-800/40 rounded-2xl space-y-1">
              <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                Puntuación DOTS
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-amber-600 dark:text-amber-400 tabular-nums">
                  {dotsScore}
                </span>
                <span className="text-xs font-bold text-amber-700 dark:text-amber-300">puntos</span>
              </div>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-1">
                Nivel estimado: <span className={`font-black ${dotsLevel.color}`}>{dotsLevel.label}</span>
              </p>
              <p className="text-[11px] text-gray-500">{dotsLevel.desc}</p>
            </div>

            {/* Escala de nivel */}
            <div className="space-y-2 text-xs">
              <span className="font-bold text-gray-700 dark:text-gray-300">Escala de Clasificación:</span>
              <div className="space-y-1 text-[11px]">
                <div className="flex items-center justify-between text-gray-500">
                  <span>Principiante</span>
                  <span className="font-mono">&lt; 275 pts</span>
                </div>
                <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span>Intermedio (Atleta sólido)</span>
                  <span className="font-mono">275 - 350 pts</span>
                </div>
                <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 font-semibold">
                  <span>Avanzado (Competidor regional)</span>
                  <span className="font-mono">350 - 425 pts</span>
                </div>
                <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 font-bold">
                  <span>Élite Nacional / Internacional</span>
                  <span className="font-mono">&gt; 425 pts</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── 5. DETALLE DE CADA MOVIMIENTO (1RM, 3RM, 5RM y Cargas Reales) ─── */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Award className="w-4 h-4 text-purple-600" />
          Récords y Proyecciones por Levantamiento (1RM / 3RM / 5RM)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {liftsConfig.map(({ key, title, data, color }) => (
            <Card key={key} className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs overflow-hidden flex flex-col justify-between">
              <div>
                <CardHeader className={`pb-3 border-b border-gray-100 dark:border-gray-800 ${color.lightBg}`}>
                  <CardTitle className="text-xs font-bold text-gray-900 dark:text-gray-100 flex items-center justify-between">
                    <span className="truncate">{title}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${color.badge}`}>
                      {data.totalSets} series
                    </span>
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-4 space-y-4">
                  {/* Grid de 1RM, 3RM y 5RM */}
                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    <div className="p-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 space-y-0.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">1RM Est.</span>
                      <p className={`text-base font-black tabular-nums ${color.text}`}>
                        {data.estimated1RM > 0 ? `${data.estimated1RM}` : '—'}
                      </p>
                      <span className="text-[9px] text-gray-400">kg</span>
                    </div>

                    <div className="p-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 space-y-0.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">3RM Est.</span>
                      <p className="text-base font-black text-gray-900 dark:text-gray-100 tabular-nums">
                        {data.estimated3RM > 0 ? `${data.estimated3RM}` : '—'}
                      </p>
                      <span className="text-[9px] text-gray-400">kg</span>
                    </div>

                    <div className="p-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 space-y-0.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">5RM Est.</span>
                      <p className="text-base font-black text-gray-900 dark:text-gray-100 tabular-nums">
                        {data.estimated5RM > 0 ? `${data.estimated5RM}` : '—'}
                      </p>
                      <span className="text-[9px] text-gray-400">kg</span>
                    </div>
                  </div>

                  {/* Carga real más pesada levantada */}
                  <div className="flex items-center justify-between text-xs p-2.5 bg-gray-50/80 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-800">
                    <span className="text-gray-500 font-medium">Carga real máxima:</span>
                    <span className="font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                      {data.maxWeightReal > 0 ? `${data.maxWeightReal} kg` : 'Sin registros'}
                    </span>
                  </div>

                  {/* Historial reciente */}
                  {data.history.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Últimos levantamientos:
                      </span>
                      <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                        {data.history.slice(-4).reverse().map((h, hIdx) => (
                          <div key={hIdx} className="flex items-center justify-between gap-2 text-xs text-gray-600 dark:text-gray-400">
                            <span className="text-[11px] shrink-0">
                              {new Date(h.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                            </span>
                            <span className="font-mono text-[11px] font-semibold text-gray-900 dark:text-gray-200 text-right">
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
                    </div>
                  )}
                </CardContent>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
