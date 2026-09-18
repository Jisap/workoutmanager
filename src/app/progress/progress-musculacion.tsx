'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Layers,
  TrendingUp,
  PieChart,
  Activity,
  AlertTriangle,
  TrendingDown,
  Minus,
  Target,
  Flame,
  Zap,
  Scale,
  BarChart3,
  ArrowLeftRight,
  Info,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';

interface MusculacionAvanzado {
  weeklyVolumeTimeline: {
    week: string;
    label: string;
    Pecho: number;
    Espalda: number;
    Piernas: number;
    Gluteos: number;
    Hombros: number;
    Brazos: number;
    Core: number;
  }[];
  // Timeline por sesión (fallback cuando todo cae en 1 semana: sí muestra evolución)
  sessionVolumeTimeline?: {
    week: string;
    label: string;
    workoutName?: string;
    total?: number;
    Pecho: number;
    Espalda: number;
    Piernas: number;
    Gluteos: number;
    Hombros: number;
    Brazos: number;
    Core: number;
  }[];
  weeklyFrequencyTimeline: {
    week: string;
    label: string;
    Pecho: number;
    Espalda: number;
    Piernas: number;
    Gluteos: number;
    Hombros: number;
    Brazos: number;
    Core: number;
  }[];
  groupFrequencyAvg: Record<string, number>;
  repZones: {
    fuerza: { count: number; percentage: number };
    hipertrofia: { count: number; percentage: number };
    resistencia: { count: number; percentage: number };
  };
  avgRelativeIntensity: number;
  avgWeightedWeight: number;
  avgRpe: number | null;
  avgRir: number | null;
  nearFailureSets: number;
  nearFailurePct: number;
  hasRpeData: boolean;
  density: number;
  deloadAlert: { type: 'deload' | 'plateau' | 'fatigue' | null; message: string };
  asymmetryList: {
    group: string;
    dumbbellVolume: number;
    dumbbellSets: number;
    barbellVolume: number;
    barbellSets: number;
    dumbbellPct: number;
    barbellPct: number;
    ratio: number;
  }[];
}

interface ProgressMusculacionProps {
  musculacion: {
    totalVolume: number;
    totalSets: number;
    muscleGroups: {
      name: string;
      volume: number;
      sets: number;
      percentage: number;
      topExercises: {
        name: string;
        volume: number;
        sets: number;
        maxWeight: number;
      }[];
    }[];
    pushPullLegsBalance: {
      push: { volume: number; percentage: number };
      pull: { volume: number; percentage: number };
      legs: { volume: number; percentage: number };
      core: { volume: number; percentage: number };
    };
    avanzado: MusculacionAvanzado;
  };
}

const groupColors: Record<string, { bar: string; text: string; bg: string; border: string; hex: string }> = {
  Pecho: { bar: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40', border: 'border-blue-200 dark:border-blue-800', hex: '#3b82f6' },
  Espalda: { bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-800', hex: '#10b981' },
  Piernas: { bar: 'bg-purple-500', text: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/40', border: 'border-purple-200 dark:border-purple-800', hex: '#a855f7' },
  Gluteos: { bar: 'bg-pink-500', text: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-50 dark:bg-pink-950/40', border: 'border-pink-200 dark:border-pink-800', hex: '#ec4899' },
  Hombros: { bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-200 dark:border-amber-800', hex: '#f59e0b' },
  Brazos: { bar: 'bg-cyan-500', text: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-950/40', border: 'border-cyan-200 dark:border-cyan-800', hex: '#06b6d4' },
  Core: { bar: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/40', border: 'border-rose-200 dark:border-rose-800', hex: '#f43f5e' },
  Otros: { bar: 'bg-gray-500', text: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-950/40', border: 'border-gray-200 dark:border-gray-800', hex: '#6b7280' },
};

const groupOrder = ['Pecho', 'Espalda', 'Piernas', 'Gluteos', 'Hombros', 'Brazos', 'Core'];

export function ProgressMusculacion({ musculacion }: ProgressMusculacionProps) {
  const { muscleGroups, pushPullLegsBalance, avanzado } = musculacion;
  const [hoveredWeek, setHoveredWeek] = useState<number | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | 'all'>('all');

  // ─── SVG Line Chart: Volumen Semanal por Grupo ───
  const svgWidth = 720;
  const svgHeight = 260;
  const padLeft = 60;
  const padRight = 24;
  const padTop = 20;
  const padBottom = 45;
  const chartWidth = svgWidth - padLeft - padRight;
  const chartHeight = svgHeight - padTop - padBottom;

  const weeklyData = avanzado.weeklyVolumeTimeline ?? [];
  const sessionData = avanzado.sessionVolumeTimeline ?? [];
  // Si solo hay 0-1 semanas con datos pero sí hay varias sesiones,
  // mostrar evolución por sesión: si no, el gráfico queda en un único punto.
  const useSessionView = weeklyData.length <= 1 && sessionData.length > 1;
  const chartData = useSessionView ? sessionData : weeklyData;

  const activeGroups = useMemo(() => {
    if (selectedGroup === 'all') return groupOrder;
    return [selectedGroup];
  }, [selectedGroup]);

  const chartPoints = useMemo(() => {
    if (chartData.length === 0) return { points: {}, maxVal: 1 };
    const allVals = chartData.flatMap((w) =>
      activeGroups.map((g) => (w[g as keyof typeof w] as number) || 0)
    );
    const maxVal = Math.max(...allVals, 100);

    const result: Record<string, { x: number; y: number; val: number }[]> = {};
    for (const g of activeGroups) {
      result[g] = chartData.map((w, i) => {
        const val = (w[g as keyof typeof w] as number) || 0;
        const x = chartData.length === 1
          ? padLeft + chartWidth / 2
          : padLeft + (i / Math.max(1, chartData.length - 1)) * chartWidth;
        const y = padTop + chartHeight - (val / maxVal) * chartHeight;
        return { x, y, val };
      });
    }
    return { points: result, maxVal };
  }, [chartData, activeGroups, chartWidth, chartHeight, padLeft, padTop]);

  const maxValForChart = chartPoints.maxVal || 100;

  // Grid lines for Y axis
  const yGridLines = useMemo(() => {
    const steps = 4;
    const stepVal = maxValForChart / steps;
    return Array.from({ length: steps + 1 }, (_, i) => {
      const val = Math.round(stepVal * i);
      const y = padTop + chartHeight - (val / maxValForChart) * chartHeight;
      return { val, y };
    });
  }, [maxValForChart, chartHeight, padTop]);

  return (
    <div className="space-y-6">
      {/* ─── ALERTA DE DELOAD / MESETA ─── */}
      {avanzado.deloadAlert.type && (
        <Card className={`border-2 ${
          avanzado.deloadAlert.type === 'fatigue'
            ? 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20'
            : avanzado.deloadAlert.type === 'deload'
              ? 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20'
              : 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20'
        }`}>
          <CardContent className="p-4 flex items-start gap-3">
            {avanzado.deloadAlert.type === 'fatigue' ? (
              <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
            ) : avanzado.deloadAlert.type === 'deload' ? (
              <TrendingDown className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
            ) : (
              <Minus className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
            )}
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                {avanzado.deloadAlert.type === 'fatigue' ? 'Posible acumulación de fatiga'
                  : avanzado.deloadAlert.type === 'deload' ? 'Semana de deload detectada'
                    : 'Posible meseta detectada'}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{avanzado.deloadAlert.message}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── 1. KPIS DE MUSCULACIÓN ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Volumen Total */}
        <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              Volumen Total
            </span>
            <p className="text-2xl font-black text-gray-900 dark:text-gray-100 tabular-nums">
              {(musculacion.totalVolume / 1000).toFixed(1)}k <span className="text-xs font-bold text-blue-600">kg</span>
            </p>
            <p className="text-[11px] text-gray-400">{musculacion.totalVolume.toLocaleString('es-ES')} kg levantados</p>
          </CardContent>
        </Card>

        {/* Series Efectivas */}
        <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              Series Efectivas
            </span>
            <p className="text-2xl font-black text-gray-900 dark:text-gray-100 tabular-nums">
              {musculacion.totalSets}
            </p>
            <p className="text-[11px] text-gray-400">series de trabajo registradas</p>
          </CardContent>
        </Card>

        {/* Intensidad Relativa (% 1RM) */}
        <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              Intensidad Relativa
            </span>
            <p className="text-2xl font-black text-gray-900 dark:text-gray-100 tabular-nums">
              {avanzado.avgRelativeIntensity > 0 ? `${avanzado.avgRelativeIntensity}%` : '—'}
            </p>
            <p className="text-[11px] text-gray-400">media vs 1RM estimado por serie</p>
          </CardContent>
        </Card>

        {/* RIR / RPE Medio */}
        <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-cyan-600" />
              RIR Promedio
            </span>
            <p className="text-2xl font-black text-gray-900 dark:text-gray-100 tabular-nums">
              {avanzado.hasRpeData && avanzado.avgRir !== null ? `~${avanzado.avgRir}` : '—'}
            </p>
            <p className="text-[11px] text-gray-400">
              {avanzado.hasRpeData && avanzado.avgRpe !== null
                ? `RPE @${avanzado.avgRpe} · ${avanzado.avgRir === 0 ? 'Al fallo total' : `${avanzado.avgRir} reps en reserva`}`
                : 'Sin RPE registrado'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ─── 2. GRÁFICA: VOLUMEN SEMANAL POR GRUPO MUSCULAR ─── */}
      {chartData.length > 0 && (
        <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
          <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <CardTitle className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                {useSessionView ? 'Volumen por Sesión por Grupo Muscular' : 'Volumen Semanal por Grupo Muscular'}
              </CardTitle>
              <span className="text-[11px] text-gray-400">
                {useSessionView
                  ? `Últimas ${chartData.length} sesiones`
                  : `Últimas ${chartData.length} semanas`}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-4">
            {/* Selector interactivo de grupo */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSelectedGroup('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedGroup === 'all'
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-xs'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Todos los grupos
              </button>
              {groupOrder.map((g) => {
                const c = groupColors[g];
                const isSelected = selectedGroup === g;
                return (
                  <button
                    key={g}
                    onClick={() => setSelectedGroup(isSelected ? 'all' : g)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? `${c.bg} ${c.text} ${c.border} border shadow-xs`
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${c.bar}`} />
                    {g}
                  </button>
                );
              })}
            </div>

            {/* SVG Chart */}
            <div className="overflow-x-auto">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto min-w-[520px]">
                <defs>
                  {groupOrder.map((g) => (
                    <linearGradient key={g} id={`grad-${g}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={groupColors[g].hex} stopOpacity={selectedGroup === g ? 0.35 : 0.12} />
                      <stop offset="100%" stopColor={groupColors[g].hex} stopOpacity={0.01} />
                    </linearGradient>
                  ))}
                </defs>

                {/* Y-axis Grid lines & labels */}
                {yGridLines.map((gl, i) => (
                  <g key={i}>
                    <line
                      x1={padLeft}
                      y1={gl.y}
                      x2={svgWidth - padRight}
                      y2={gl.y}
                      stroke="currentColor"
                      className="text-gray-200 dark:text-gray-800"
                      strokeWidth={1}
                      strokeDasharray={i === 0 ? '0' : '4,4'}
                    />
                    <text
                      x={padLeft - 10}
                      y={gl.y + 3.5}
                      textAnchor="end"
                      className="fill-gray-400 dark:fill-gray-500 font-mono text-[10px]"
                    >
                      {gl.val >= 1000 ? `${(gl.val / 1000).toFixed(1)}k` : gl.val}
                    </text>
                  </g>
                ))}

                {/* X-axis labels */}
                {chartData.map((w, i) => {
                  const x = chartData.length === 1
                    ? padLeft + chartWidth / 2
                    : padLeft + (i / Math.max(1, chartData.length - 1)) * chartWidth;
                  return (
                    <text
                      key={i}
                      x={x}
                      y={svgHeight - 12}
                      textAnchor="middle"
                      className="fill-gray-400 dark:fill-gray-500 text-[10px] font-medium"
                    >
                      {w.label}
                    </text>
                  );
                })}

                {/* Render Group Paths */}
                {activeGroups.map((g) => {
                  const pts = chartPoints.points?.[g];
                  if (!pts || pts.length === 0) return null;
                  const hex = groupColors[g].hex;
                  const isHighlighted = selectedGroup === 'all' || selectedGroup === g;

                  const lineD = pts
                    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
                    .join(' ');
                  const bottomY = padTop + chartHeight;
                  const areaD = pts.length === 1
                    ? `M ${pts[0].x - 10} ${bottomY} L ${pts[0].x - 10} ${pts[0].y} L ${pts[0].x + 10} ${pts[0].y} L ${pts[0].x + 10} ${bottomY} Z`
                    : `${lineD} L ${pts[pts.length - 1].x.toFixed(1)} ${bottomY} L ${pts[0].x.toFixed(1)} ${bottomY} Z`;

                  return (
                    <g key={g} opacity={isHighlighted ? 1 : 0.2}>
                      <path d={areaD} fill={`url(#grad-${g})`} />
                      <path
                        d={lineD}
                        fill="none"
                        stroke={hex}
                        strokeWidth={selectedGroup === g ? 3 : 2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {pts.map((p, i) => (
                        <circle
                          key={i}
                          cx={p.x}
                          cy={p.y}
                          r={selectedGroup === g ? 4 : 3}
                          fill={hex}
                          stroke="white"
                          strokeWidth={1.5}
                          className="dark:stroke-gray-900"
                        />
                      ))}
                    </g>
                  );
                })}

                {/* Hover line & marker */}
                {hoveredWeek !== null && hoveredWeek < chartData.length && (
                  <>
                    <line
                      x1={chartData.length === 1 ? padLeft + chartWidth / 2 : padLeft + (hoveredWeek / Math.max(1, chartData.length - 1)) * chartWidth}
                      y1={padTop}
                      x2={chartData.length === 1 ? padLeft + chartWidth / 2 : padLeft + (hoveredWeek / Math.max(1, chartData.length - 1)) * chartWidth}
                      y2={padTop + chartHeight}
                      stroke="currentColor"
                      className="text-gray-400 dark:text-gray-500"
                      strokeWidth={1}
                      strokeDasharray="3,3"
                    />
                    {activeGroups.map((g) => {
                      const pts = chartPoints.points?.[g];
                      if (!pts || !pts[hoveredWeek]) return null;
                      const p = pts[hoveredWeek];
                      return (
                        <circle
                          key={g}
                          cx={p.x}
                          cy={p.y}
                          r={5}
                          fill={groupColors[g].hex}
                          stroke="white"
                          strokeWidth={2}
                          className="dark:stroke-gray-900"
                        />
                      );
                    })}
                  </>
                )}

                {/* Hover detector columns */}
                {chartData.map((_, i) => {
                  const colW = chartWidth / Math.max(1, chartData.length);
                  const x = padLeft + i * colW;
                  return (
                    <rect
                      key={i}
                      x={x}
                      y={padTop}
                      width={colW}
                      height={chartHeight}
                      fill="transparent"
                      onMouseEnter={() => setHoveredWeek(i)}
                      onMouseLeave={() => setHoveredWeek(null)}
                      className="cursor-crosshair"
                    />
                  );
                })}
              </svg>
            </div>

            {/* Tooltip con desglose de la semana */}
            {hoveredWeek !== null && hoveredWeek < chartData.length && (
              <div className="bg-gray-900 text-white dark:bg-gray-800 border border-gray-700 rounded-xl p-3 shadow-xl text-xs space-y-2">
                <div className="flex items-center justify-between border-b border-gray-700/60 pb-1.5">
                  <span className="font-bold text-gray-200">
                    {chartData[hoveredWeek].label}
                    {'workoutName' in chartData[hoveredWeek] && (chartData[hoveredWeek] as { workoutName?: string }).workoutName
                      ? ` · ${(chartData[hoveredWeek] as { workoutName?: string }).workoutName}`
                      : ''}
                  </span>
                  <span className="font-mono text-gray-400 text-[11px]">
                    Total:{' '}
                    {(
                      groupOrder.reduce(
                        (acc, g) => acc + ((chartData[hoveredWeek][g as keyof typeof chartData[0]] as number) || 0),
                        0
                      ) / 1000
                    ).toFixed(1)}k kg
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {groupOrder.map((g) => {
                    const val = (chartData[hoveredWeek][g as keyof typeof chartData[0]] as number) || 0;
                    if (val === 0 && selectedGroup !== 'all' && selectedGroup !== g) return null;
                    return (
                      <div key={g} className="flex items-center justify-between gap-2 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: groupColors[g].hex }} />
                          <span className="text-gray-300">{g}:</span>
                        </div>
                        <span className="font-mono font-bold text-gray-100 tabular-nums">
                          {(val / 1000).toFixed(1)}k kg
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── 3. FRECUENCIA SEMANAL Y CONSISTENCIA POR GRUPO ─── */}
      <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
        <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40">
          <CardTitle className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            Frecuencia Semanal Promedio por Grupo Muscular
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 space-y-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Días promedio por semana en los que estimulas cada grupo muscular. El rango óptimo para maximizar la síntesis proteica es de <span className="font-bold text-emerald-600 dark:text-emerald-400">2 a 3 veces por semana</span>.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {groupOrder.map((g) => {
              const freq = avanzado.groupFrequencyAvg?.[g] ?? 0;
              const c = groupColors[g];
              const isOptimal = freq >= 1.8 && freq <= 3.2;
              const isLow = freq > 0 && freq < 1.8;
              const isZero = freq === 0;

              return (
                <div key={g} className="p-3 bg-gray-50/70 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${c.bar}`} />
                      <span className="text-xs font-bold text-gray-900 dark:text-gray-100">{g}</span>
                    </div>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                      isOptimal
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                        : isLow
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                          : isZero
                            ? 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                    }`}>
                      {isOptimal ? 'Óptimo' : isLow ? 'Frecuencia 1x' : isZero ? 'Sin registro' : 'Frecuencia >3x'}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <span className="text-xl font-black text-gray-900 dark:text-gray-100 tabular-nums">
                      {freq > 0 ? `${freq}x` : '0x'}
                    </span>
                    <span className="text-[10px] text-gray-400">Objetivo: 2-3x / sem</span>
                  </div>

                  {/* Barra de progreso de frecuencia (rango 0 a 4) */}
                  <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${isOptimal ? 'bg-emerald-500' : isLow ? 'bg-amber-500' : 'bg-blue-500'} transition-all duration-500`}
                      style={{ width: `${Math.min((freq / 3) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ─── 4. ZONAS DE REPETICIONES + INTENSIDAD & ESFUERZO ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Zonas de Repeticiones */}
        <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
          <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40">
            <CardTitle className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-amber-600" />
              Zonas de Repeticiones
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Distribución de tus series según el estímulo biomecánico y rango de repeticiones:
            </p>

            {/* Barra segmentada */}
            <div className="w-full h-4 rounded-full overflow-hidden flex bg-gray-100 dark:bg-gray-800">
              <div
                className="bg-red-500 transition-all duration-500"
                style={{ width: `${avanzado.repZones.fuerza.percentage}%` }}
                title={`Fuerza: ${avanzado.repZones.fuerza.percentage}%`}
              />
              <div
                className="bg-blue-500 transition-all duration-500"
                style={{ width: `${avanzado.repZones.hipertrofia.percentage}%` }}
                title={`Hipertrofia: ${avanzado.repZones.hipertrofia.percentage}%`}
              />
              <div
                className="bg-emerald-500 transition-all duration-500"
                style={{ width: `${avanzado.repZones.resistencia.percentage}%` }}
                title={`Resistencia: ${avanzado.repZones.resistencia.percentage}%`}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="p-3 bg-red-50/70 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-[11px] font-bold text-red-900 dark:text-red-200">Fuerza</span>
                </div>
                <p className="text-lg font-black text-red-700 dark:text-red-300 tabular-nums">
                  {avanzado.repZones.fuerza.percentage}%
                </p>
                <p className="text-[10px] text-gray-500">&lt;6 reps · {avanzado.repZones.fuerza.count}s</p>
              </div>

              <div className="p-3 bg-blue-50/70 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-[11px] font-bold text-blue-900 dark:text-blue-200">Hipertrofia</span>
                </div>
                <p className="text-lg font-black text-blue-700 dark:text-blue-300 tabular-nums">
                  {avanzado.repZones.hipertrofia.percentage}%
                </p>
                <p className="text-[10px] text-gray-500">6-12 reps · {avanzado.repZones.hipertrofia.count}s</p>
              </div>

              <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200">Resistencia</span>
                </div>
                <p className="text-lg font-black text-emerald-700 dark:text-emerald-300 tabular-nums">
                  {avanzado.repZones.resistencia.percentage}%
                </p>
                <p className="text-[10px] text-gray-500">&gt;12 reps · {avanzado.repZones.resistencia.count}s</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Intensidad y Esfuerzo */}
        <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
          <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40">
            <CardTitle className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Target className="w-4 h-4 text-red-600" />
              Intensidad y Esfuerzo Real
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-orange-50/70 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/40 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-orange-500" />
                  <span className="text-[11px] font-bold text-orange-900 dark:text-orange-200">Intensidad Relativa</span>
                </div>
                <p className="text-lg font-black text-orange-700 dark:text-orange-300 tabular-nums">
                  {avanzado.avgRelativeIntensity > 0 ? `${avanzado.avgRelativeIntensity}%` : '—'}
                </p>
                <p className="text-[10px] text-gray-500">% medio vs 1RM estimado</p>
              </div>

              <div className="p-3 bg-violet-50/70 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/40 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-violet-500" />
                  <span className="text-[11px] font-bold text-violet-900 dark:text-violet-200">Peso Medio</span>
                </div>
                <p className="text-lg font-black text-violet-700 dark:text-violet-300 tabular-nums">
                  {avanzado.avgWeightedWeight > 0 ? `${avanzado.avgWeightedWeight}` : '—'}
                  <span className="text-xs font-bold text-violet-600 ml-1">kg</span>
                </p>
                <p className="text-[10px] text-gray-500">promedio ponderado por reps</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-rose-50/70 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-rose-500" />
                  <span className="text-[11px] font-bold text-rose-900 dark:text-rose-200">Cerca del Fallo</span>
                </div>
                <p className="text-lg font-black text-rose-700 dark:text-rose-300 tabular-nums">
                  {avanzado.hasRpeData ? `${avanzado.nearFailurePct}%` : '—'}
                </p>
                <p className="text-[10px] text-gray-500">
                  {avanzado.hasRpeData ? `${avanzado.nearFailureSets} series con RPE ≥ 8` : 'Sin datos RPE'}
                </p>
              </div>

              <div className="p-3 bg-cyan-50/70 dark:bg-cyan-950/20 border border-cyan-100 dark:border-cyan-900/40 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-cyan-500" />
                  <span className="text-[11px] font-bold text-cyan-900 dark:text-cyan-200">RIR Promedio</span>
                </div>
                <p className="text-lg font-black text-cyan-700 dark:text-cyan-300 tabular-nums">
                  {avanzado.hasRpeData && avanzado.avgRir !== null ? `~${avanzado.avgRir}` : '—'}
                </p>
                <p className="text-[10px] text-gray-500">
                  {avanzado.hasRpeData ? 'reps en reserva (10 - RPE)' : 'Registra RPE en tus series'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── 5. BALANCE EMPUJE / TIRÓN / PIERNA (PPL) ─── */}
      <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
        <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40">
          <CardTitle className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            Balance de Fuerzas: Empuje vs. Tirón vs. Pierna (PPL)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 space-y-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Distribución proporcional del volumen para asegurar un desarrollo simétrico y prevenir descompensaciones articulares:
          </p>

          {/* Barra segmentada */}
          <div className="w-full h-4 rounded-full overflow-hidden flex bg-gray-100 dark:bg-gray-800">
            <div
              className="bg-blue-500 transition-all duration-500"
              style={{ width: `${pushPullLegsBalance.push.percentage}%` }}
              title={`Empuje: ${pushPullLegsBalance.push.percentage}%`}
            />
            <div
              className="bg-emerald-500 transition-all duration-500"
              style={{ width: `${pushPullLegsBalance.pull.percentage}%` }}
              title={`Tirón: ${pushPullLegsBalance.pull.percentage}%`}
            />
            <div
              className="bg-purple-500 transition-all duration-500"
              style={{ width: `${pushPullLegsBalance.legs.percentage}%` }}
              title={`Pierna: ${pushPullLegsBalance.legs.percentage}%`}
            />
            <div
              className="bg-rose-500 transition-all duration-500"
              style={{ width: `${pushPullLegsBalance.core.percentage}%` }}
              title={`Core: ${pushPullLegsBalance.core.percentage}%`}
            />
          </div>

          {/* Leyenda y detalles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="p-3 bg-blue-50/70 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-xs font-bold text-blue-900 dark:text-blue-200">Empuje (Push)</span>
              </div>
              <p className="text-lg font-black text-blue-700 dark:text-blue-300 tabular-nums">
                {pushPullLegsBalance.push.percentage}%
              </p>
              <p className="text-[10px] text-gray-500">{(pushPullLegsBalance.push.volume / 1000).toFixed(1)}k kg</p>
            </div>

            <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">Tirón (Pull)</span>
              </div>
              <p className="text-lg font-black text-emerald-700 dark:text-emerald-300 tabular-nums">
                {pushPullLegsBalance.pull.percentage}%
              </p>
              <p className="text-[10px] text-gray-500">{(pushPullLegsBalance.pull.volume / 1000).toFixed(1)}k kg</p>
            </div>

            <div className="p-3 bg-purple-50/70 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                <span className="text-xs font-bold text-purple-900 dark:text-purple-200">Pierna (Legs)</span>
              </div>
              <p className="text-lg font-black text-purple-700 dark:text-purple-300 tabular-nums">
                {pushPullLegsBalance.legs.percentage}%
              </p>
              <p className="text-[10px] text-gray-500">{(pushPullLegsBalance.legs.volume / 1000).toFixed(1)}k kg</p>
            </div>

            <div className="p-3 bg-rose-50/70 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="text-xs font-bold text-rose-900 dark:text-rose-200">Core & Abdomen</span>
              </div>
              <p className="text-lg font-black text-rose-700 dark:text-rose-300 tabular-nums">
                {pushPullLegsBalance.core.percentage}%
              </p>
              <p className="text-[10px] text-gray-500">{(pushPullLegsBalance.core.volume / 1000).toFixed(1)}k kg</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── 6. ASIMETRÍAS: MANCUERNA VS BARRA ─── */}
      {avanzado.asymmetryList.length > 0 && (
        <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
          <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40">
            <CardTitle className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-cyan-600" />
              Asimetrías: Mancuerna vs Barra por Grupo Muscular
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Comparación de volumen entre implementos unilaterales (mancuernas) y bilaterales (barra). Un reparto balanceado reduce riesgos de compensación motriz.
            </p>
            <div className="space-y-4">
              {avanzado.asymmetryList.map((a) => {
                const isBalanced = a.dumbbellPct >= 35 && a.dumbbellPct <= 65;
                return (
                  <div key={a.group} className="p-3.5 bg-gray-50/60 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-gray-900 dark:text-gray-100">{a.group}</span>
                      <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                        isBalanced
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                      }`}>
                        {isBalanced ? 'Equilibrado' : a.dumbbellPct > 65 ? 'Dominancia Mancuerna' : 'Dominancia Barra'}
                      </span>
                    </div>

                    {/* Barra comparativa bipolar */}
                    <div className="w-full h-3 rounded-full overflow-hidden flex bg-gray-200 dark:bg-gray-700">
                      <div
                        className="bg-cyan-500 transition-all duration-500"
                        style={{ width: `${a.dumbbellPct}%` }}
                        title={`Mancuerna: ${a.dumbbellPct}%`}
                      />
                      <div
                        className="bg-indigo-500 transition-all duration-500"
                        style={{ width: `${a.barbellPct}%` }}
                        title={`Barra: ${a.barbellPct}%`}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-cyan-500" />
                        Mancuerna: {a.dumbbellPct}% ({a.dumbbellSets}s · {(a.dumbbellVolume / 1000).toFixed(1)}k kg)
                      </span>
                      <span className="flex items-center gap-1.5">
                        Barra: {a.barbellPct}% ({a.barbellSets}s · {(a.barbellVolume / 1000).toFixed(1)}k kg)
                        <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── 7. VOLUMEN POR GRUPO MUSCULAR Y TOP EJERCICIOS ─── */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Layers className="w-4 h-4 text-purple-600" />
          Desglose de Volumen por Grupo Muscular
        </h3>

        {muscleGroups.length === 0 ? (
          <Card className="border-dashed bg-gray-50/50 dark:bg-gray-800/30">
            <CardContent className="py-8 text-center text-gray-500 text-xs">
              No hay suficientes datos de musculación registrados aún.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {muscleGroups.map((group) => {
              const colors = groupColors[group.name] || groupColors['Otros'];

              return (
                <Card key={group.name} className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs overflow-hidden">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${colors.bar}`} />
                        <span className="font-bold text-sm text-gray-900 dark:text-gray-100">{group.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-black text-gray-900 dark:text-gray-100 tabular-nums">
                          {(group.volume / 1000).toFixed(1)}k kg
                        </span>
                        <span className="text-gray-400 font-semibold">({group.sets} series)</span>
                      </div>
                    </div>

                    {/* Barra de porcentaje */}
                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colors.bar} transition-all duration-500`}
                        style={{ width: `${group.percentage}%` }}
                      />
                    </div>

                    {/* Top ejercicios del grupo */}
                    {group.topExercises.length > 0 && (
                      <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-1.5">
                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                          Ejercicios más trabajados:
                        </span>
                        <div className="space-y-1">
                          {group.topExercises.map((ex, exIdx) => (
                            <div key={exIdx} className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                              <span className="truncate pr-2">{ex.name}</span>
                              <span className="font-mono text-[11px] font-semibold text-gray-900 dark:text-gray-200 shrink-0">
                                {(ex.volume / 1000).toFixed(1)}k kg · máx {ex.maxWeight}kg
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
