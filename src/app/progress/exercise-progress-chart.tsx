'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import {
  Trophy,
  TrendingUp,
  Calendar,
  Dumbbell,
  History,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Search,
  ChevronDown,
  Sparkles,
  Layers,
  Target,
  BarChart3,
  Filter,
  Check,
  Zap,
} from 'lucide-react';

export interface SetDetail {
  setNumber: number;
  weight: number;
  reps: number;
  rpe: number | null;
  estimated1RM: number;
}

export interface ProgressSessionPoint {
  workoutId: number;
  workoutName: string;
  date: Date | string;
  maxWeight: number;
  maxReps: number;
  estimated1RM: number;
  totalVolume: number;
  totalReps: number;
  isBodyweight: boolean;
  sets: SetDetail[];
}

export interface AvailableExercise {
  id: number;
  name: string;
  categoryId: number | null;
  categoryName: string;
  sessionCount: number;
}

interface ExerciseAnalyticsProps {
  availableExercises: AvailableExercise[];
  selectedExerciseId: number | null;
  data: ProgressSessionPoint[] | null;
}

type MetricType = '1rm' | 'maxWeight' | 'volume' | 'reps';
type TimeRange = '1m' | '3m' | '6m' | '1y' | 'all';

export function ExerciseProgressChart({
  availableExercises,
  selectedExerciseId,
  data,
}: ExerciseAnalyticsProps) {
  const router = useRouter();

  // Detect if exercise is primarily bodyweight (no weight data)
  const isBodyweight = useMemo(() => {
    if (!data || data.length === 0) return false;
    return data.every((s) => s.isBodyweight);
  }, [data]);

  // Estados interactivos
  const [metric, setMetric] = useState<MetricType>(() => (data?.every((s) => s.isBodyweight) ? 'reps' : '1rm'));
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Estados del selector
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [onlyWithLogs, setOnlyWithLogs] = useState(true);

  const selectedExercise = availableExercises.find((ex) => ex.id === selectedExerciseId);

  // Categorías únicas disponibles
  const categories = useMemo(() => {
    const set = new Set<string>();
    availableExercises.forEach((ex) => {
      if (ex.categoryName) set.add(ex.categoryName);
    });
    return ['Todos', ...Array.from(set)];
  }, [availableExercises]);

  // Ejercicios más frecuentes para acceso rápido
  const quickAccessExercises = useMemo(() => {
    return availableExercises
      .filter((ex) => ex.sessionCount > 0)
      .sort((a, b) => b.sessionCount - a.sessionCount)
      .slice(0, 4);
  }, [availableExercises]);

  // Filtrado de la lista de ejercicios para el modal/dropdown
  const filteredExercises = useMemo(() => {
    return availableExercises.filter((ex) => {
      const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
      const matchesCategory = selectedCategory === 'Todos' || ex.categoryName === selectedCategory;
      const matchesLogs = onlyWithLogs ? ex.sessionCount > 0 : true;
      return matchesSearch && matchesCategory && matchesLogs;
    });
  }, [availableExercises, searchQuery, selectedCategory, onlyWithLogs]);

  // Filtrado de datos por rango temporal
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const now = new Date().getTime();
    return data
      .filter((session) => {
        if (timeRange === 'all') return true;
        const sessionTime = new Date(session.date).getTime();
        const daysDiff = (now - sessionTime) / (1000 * 60 * 60 * 24);

        if (timeRange === '1m') return daysDiff <= 30;
        if (timeRange === '3m') return daysDiff <= 90;
        if (timeRange === '6m') return daysDiff <= 180;
        if (timeRange === '1y') return daysDiff <= 365;
        return true;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [data, timeRange]);

  const handleSelectExercise = (exerciseId: number) => {
    setIsSelectorOpen(false);
    router.push(`/progress?exerciseId=${exerciseId}`);
  };

  // Métricas calculadas para el ejercicio actual
  const stats = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return null;

    const values = filteredData.map((d) => {
      if (metric === '1rm') return d.estimated1RM;
      if (metric === 'maxWeight') return d.maxWeight;
      if (metric === 'reps') return d.maxReps;
      return d.totalVolume;
    });

    const currentVal = values[values.length - 1];
    const initialVal = values[0];
    const peakVal = Math.max(...values);
    const minVal = Math.min(...values);
    const diff = currentVal - initialVal;
    const diffPercent = initialVal > 0 ? (diff / initialVal) * 100 : 0;

    // Mejor 1RM histórico
    const best1RMSession = [...filteredData].sort((a, b) => b.estimated1RM - a.estimated1RM)[0];
    const bestMaxWeightSession = [...filteredData].sort((a, b) => b.maxWeight - a.maxWeight)[0];
    const bestMaxRepsSession = [...filteredData].sort((a, b) => b.maxReps - a.maxReps)[0];
    const totalVolumeAll = filteredData.reduce((acc, s) => acc + s.totalVolume, 0);
    const totalRepsAll = filteredData.reduce((acc, s) => acc + (s.totalReps ?? 0), 0);
    const avgVolume = Math.round(totalVolumeAll / filteredData.length);
    const avgReps = Math.round(totalRepsAll / filteredData.length);

    return {
      currentVal,
      peakVal,
      minVal,
      diff,
      diffPercent,
      best1RM: best1RMSession?.estimated1RM ?? 0,
      best1RMSession,
      bestMaxWeight: bestMaxWeightSession?.maxWeight ?? 0,
      bestMaxWeightSession,
      bestMaxReps: bestMaxRepsSession?.maxReps ?? 0,
      bestMaxRepsSession,
      avgVolume,
      avgReps,
      totalRepsAll,
      totalSessions: filteredData.length,
      values,
    };
  }, [filteredData, metric]);

  // Configuraciones del gráfico SVG
  const svgWidth = 700;
  const svgHeight = 260;
  const padLeft = 55;
  const padRight = 30;
  const padTop = 35;
  const padBottom = 45;
  const chartWidth = svgWidth - padLeft - padRight;
  const chartHeight = svgHeight - padTop - padBottom;

  const points = useMemo(() => {
    if (!stats || filteredData.length === 0) return [];

    const min = stats.minVal;
    const max = stats.peakVal;
    const range = max - min || (max === 0 ? 10 : max * 0.2 || 1);

    return filteredData.map((d, i) => {
      let x = padLeft + (i / (filteredData.length - 1 || 1)) * chartWidth;
      if (filteredData.length === 1) x = padLeft + chartWidth / 2;

      const val =
        metric === '1rm' ? d.estimated1RM
        : metric === 'maxWeight' ? d.maxWeight
        : metric === 'reps' ? d.maxReps
        : d.totalVolume;
      const normalized = (val - min) / range;
      const y = padTop + chartHeight - normalized * chartHeight;

      return {
        x,
        y,
        val,
        date: new Date(d.date),
        session: d,
      };
    });
  }, [stats, filteredData, metric, chartWidth, chartHeight, padLeft, padTop]);

  // Generación del trazado SVG
  const linePathD = useMemo(() => {
    if (points.length === 0) return '';
    if (points.length === 1) {
      return `M ${padLeft} ${points[0].y} L ${svgWidth - padRight} ${points[0].y}`;
    }
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  }, [points, padLeft, padRight, svgWidth]);

  const areaPathD = useMemo(() => {
    if (points.length === 0) return '';
    const bottomY = padTop + chartHeight;
    if (points.length === 1) {
      return `M ${padLeft} ${bottomY} L ${padLeft} ${points[0].y} L ${svgWidth - padRight} ${points[0].y} L ${svgWidth - padRight} ${bottomY} Z`;
    }
    return `${linePathD} L ${points[points.length - 1].x.toFixed(1)} ${bottomY} L ${points[0].x.toFixed(1)} ${bottomY} Z`;
  }, [linePathD, points, padLeft, padRight, padTop, chartHeight, svgWidth]);

  const activePoint = hoveredIndex !== null && points[hoveredIndex] ? points[hoveredIndex] : points[points.length - 1];

  // Cálculo de tabla 1RM Rep-Max estimada basada en el mejor 1RM
  const repMaxTable = useMemo(() => {
    if (!stats || stats.best1RM <= 0) return null;
    const oneRM = stats.best1RM;
    const percentages = [
      { reps: '1RM', pct: 1.0, desc: 'Fuerza Máxima' },
      { reps: '3RM', pct: 0.93, desc: 'Fuerza Pesada' },
      { reps: '5RM', pct: 0.87, desc: 'Fuerza Base' },
      { reps: '8RM', pct: 0.80, desc: 'Hipertrofia/Fuerza' },
      { reps: '10RM', pct: 0.75, desc: 'Hipertrofia' },
      { reps: '12RM', pct: 0.70, desc: 'Resistencia Muscular' },
    ];

    return percentages.map((p) => ({
      ...p,
      weight: Math.round(oneRM * p.pct * 2) / 2, // Redondear al 0.5 kg más cercano
    }));
  }, [stats]);

  const getMetricLabel = (m: MetricType) => {
    if (m === '1rm') return '1RM Estimado';
    if (m === 'maxWeight') return 'Carga Máxima';
    if (m === 'reps') return 'Máx. Repeticiones';
    return 'Volumen Total';
  };

  const formatVal = (v: number) => {
    if (metric === 'volume') return `${v.toLocaleString('es-ES')} kg`;
    if (metric === 'reps') return `${v} reps`;
    return `${v} kg`;
  };

  return (
    <div className="space-y-6">
      {/* 1. SELETOR PROFESIONAL DE EJERCICIO */}
      <div className="bg-white rounded-2xl border border-gray-200/90 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-purple-600 uppercase tracking-wider flex items-center gap-1.5">
              <Dumbbell className="w-3.5 h-3.5" /> Ejercicio Activo
            </span>
            <div className="flex items-center gap-3">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                {selectedExercise ? selectedExercise.name : 'Selecciona un ejercicio'}
              </h2>
              {selectedExercise && (
                <span className="px-2.5 py-0.5 text-xs font-medium bg-purple-50 text-purple-700 rounded-full border border-purple-100">
                  {selectedExercise.categoryName}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => setIsSelectorOpen(!isSelectorOpen)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-black text-white text-sm font-medium rounded-xl shadow-xs transition-all active:scale-[0.98]"
          >
            <Search className="w-4 h-4" />
            <span>Buscar ejercicio</span>
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isSelectorOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Accesos rápidos a los ejercicios más frecuentes */}
        {quickAccessExercises.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-gray-400 mr-1 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-500" /> Frecuentes:
            </span>
            {quickAccessExercises.map((ex) => (
              <button
                key={ex.id}
                onClick={() => handleSelectExercise(ex.id)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                  selectedExerciseId === ex.id
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>{ex.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    selectedExerciseId === ex.id
                      ? 'bg-purple-700/80 text-purple-100'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {ex.sessionCount}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Modal / Panel Desplegable de Selección */}
        {isSelectorOpen && (
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              {/* Buscador en tiempo real */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Escribe para buscar (ej. Press Banca, Sentadilla...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                  autoFocus
                />
              </div>

              {/* Filtro: Solo con registros */}
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-gray-600 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={onlyWithLogs}
                  onChange={(e) => setOnlyWithLogs(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                />
                Solo con entrenamientos
              </label>
            </div>

            {/* Categorías */}
            <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                    selectedCategory === cat
                      ? 'bg-purple-100 text-purple-800 font-semibold'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Lista de resultados en cuadrícula */}
            <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-xl bg-gray-50/50">
              {filteredExercises.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-500">
                  No se encontraron ejercicios con estos criterios.
                </div>
              ) : (
                filteredExercises.map((ex) => {
                  const isSelected = selectedExerciseId === ex.id;
                  return (
                    <button
                      key={ex.id}
                      onClick={() => handleSelectExercise(ex.id)}
                      className={`w-full text-left px-4 py-2.5 flex items-center justify-between text-sm transition-colors ${
                        isSelected
                          ? 'bg-purple-50 text-purple-900 font-semibold'
                          : 'hover:bg-white text-gray-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isSelected && <Check className="w-4 h-4 text-purple-600" />}
                        <span>{ex.name}</span>
                        <span className="text-xs text-gray-400 font-normal">({ex.categoryName})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {ex.sessionCount > 0 ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-medium">
                            {ex.sessionCount} {ex.sessionCount === 1 ? 'sesión' : 'sesiones'}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Sin datos</span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* CASO: SIN DATOS */}
      {(!filteredData || filteredData.length === 0) && (
        <Card className="bg-gray-50/60 border-dashed border-gray-300">
          <CardContent className="py-14 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mx-auto shadow-inner">
              <Dumbbell className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900">
              Sin registros {timeRange !== 'all' ? 'en este período' : 'para este ejercicio'}
            </h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              {timeRange !== 'all'
                ? 'Prueba a cambiar el rango temporal a "Todo el histórico" para ver sesiones anteriores.'
                : `Aún no has registrado series con peso en "${selectedExercise?.name ?? 'este ejercicio'}".`}
            </p>
          </CardContent>
        </Card>
      )}

      {/* CASO CON DATOS: DASHBOARD COMPLETO DE ANALÍTICA */}
      {filteredData && filteredData.length > 0 && stats && (
        <>
          {/* 2. BARRA DE CONTROL DE MÉTRICAS Y RANGOS TEMPORALES */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-200">
            {/* Selector de Métrica */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
              {!isBodyweight && (
                <>
                  <button
                    onClick={() => setMetric('1rm')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      metric === '1rm'
                        ? 'bg-white text-purple-700 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Target className="w-3.5 h-3.5" />
                    <span>1RM Estimado</span>
                  </button>

                  <button
                    onClick={() => setMetric('maxWeight')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      metric === 'maxWeight'
                        ? 'bg-white text-purple-700 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Trophy className="w-3.5 h-3.5" />
                    <span>Carga Máx.</span>
                  </button>
                </>
              )}

              {isBodyweight && (
                <button
                  onClick={() => setMetric('reps')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    metric === 'reps'
                      ? 'bg-white text-purple-700 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Target className="w-3.5 h-3.5" />
                  <span>Máx. Reps</span>
                </button>
              )}

              <button
                onClick={() => setMetric('volume')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  metric === 'volume'
                    ? 'bg-white text-purple-700 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{isBodyweight ? 'Total Reps' : 'Volumen'}</span>
              </button>
            </div>

            {/* Selector de Rango Temporal */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl self-start sm:self-auto">
              {(['1m', '3m', '6m', '1y', 'all'] as TimeRange[]).map((r) => {
                const label = r === '1m' ? '1M' : r === '3m' ? '3M' : r === '6m' ? '6M' : r === '1y' ? '1A' : 'Todo';
                return (
                  <button
                    key={r}
                    onClick={() => setTimeRange(r)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                      timeRange === r
                        ? 'bg-gray-900 text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. TARJETAS DE IMPACTO ANALÍTICO (KPIs) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Récord: 1RM para con peso, Máx Reps para bodyweight */}
            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-2xl p-4 shadow-sm relative overflow-hidden">
              <div className="absolute right-[-10px] bottom-[-10px] opacity-10">
                <Target className="w-24 h-24 text-white" />
              </div>
              <div className="relative z-10 space-y-1">
                <span className="text-xs font-medium text-purple-100 flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-yellow-300" />
                  {isBodyweight ? 'Máx. Repeticiones' : 'Récord 1RM Estimado'}
                </span>
                <p className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums">
                  {isBodyweight ? stats.bestMaxReps : stats.best1RM}
                  <span className="text-sm font-medium opacity-80">
                    {isBodyweight ? ' reps' : ' kg'}
                  </span>
                </p>
                <p className="text-[11px] text-purple-100/90 truncate">
                  {isBodyweight
                    ? (stats.bestMaxRepsSession
                        ? new Date(stats.bestMaxRepsSession.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
                        : 'Sin registros')
                    : (stats.best1RMSession
                        ? `${new Date(stats.best1RMSession.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} (${stats.best1RMSession.maxWeight}kg x ${stats.best1RMSession.maxReps})`
                        : 'Sin registros')}
                </p>
              </div>
            </div>

            {/* Carga Máxima (solo si tiene peso) / Total Reps (bodyweight) */}
            <div className="bg-white rounded-2xl p-4 border border-gray-200/90 shadow-xs space-y-1">
              <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                <Dumbbell className="w-3.5 h-3.5 text-blue-500" />
                {isBodyweight ? 'Total Reps Acumuladas' : 'Carga Máxima Levantada'}
              </span>
              <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight tabular-nums">
                {isBodyweight ? stats.totalRepsAll : stats.bestMaxWeight}
                <span className="text-sm font-normal text-gray-400">
                  {isBodyweight ? ' reps' : ' kg'}
                </span>
              </p>
              <p className="text-[11px] text-gray-400">
                {isBodyweight
                  ? `en ${stats.totalSessions} sesiones`
                  : (stats.bestMaxWeightSession ? `x ${stats.bestMaxWeightSession.maxReps} reps` : '—')}
              </p>
            </div>

            {/* Progresión Neta */}
            <div className="bg-white rounded-2xl p-4 border border-gray-200/90 shadow-xs space-y-1">
              <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                {stats.diff > 0 ? (
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                ) : stats.diff < 0 ? (
                  <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
                ) : (
                  <Minus className="w-3.5 h-3.5 text-gray-400" />
                )}
                Evolución ({getMetricLabel(metric)})
              </span>
              <p
                className={`text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums ${
                  stats.diff > 0 ? 'text-emerald-600' : stats.diff < 0 ? 'text-rose-600' : 'text-gray-700'
                }`}
              >
                {stats.diff > 0 ? `+${stats.diff}` : stats.diff}
                <span className="text-sm font-normal text-gray-400">
                  {isBodyweight ? ' reps' : ' kg'}
                </span>
              </p>
              <p className="text-[11px] text-gray-500 font-medium">
                {stats.diffPercent > 0 ? `+${stats.diffPercent.toFixed(1)}%` : `${stats.diffPercent.toFixed(1)}%`} desde el inicio
              </p>
            </div>

            {/* Reps/Volumen Medio */}
            <div className="bg-white rounded-2xl p-4 border border-gray-200/90 shadow-xs space-y-1">
              <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                <BarChart3 className="w-3.5 h-3.5 text-amber-500" />
                {isBodyweight ? 'Reps Medias / Sesión' : 'Volumen Medio / Sesión'}
              </span>
              <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight tabular-nums">
                {isBodyweight ? stats.avgReps : stats.avgVolume.toLocaleString('es-ES')}
                <span className="text-sm font-normal text-gray-400">
                  {isBodyweight ? ' reps' : ' kg'}
                </span>
              </p>
              <p className="text-[11px] text-gray-400">
                En {stats.totalSessions} {stats.totalSessions === 1 ? 'sesión' : 'sesiones'}
              </p>
            </div>
          </div>

          {/* 4. GRÁFICO PROFESIONAL CON HOVER INTERACTIVO */}
          <div className="bg-white rounded-2xl border border-gray-200/90 p-4 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                  Curva de Progresión: {getMetricLabel(metric)}
                </h3>
                <p className="text-xs text-gray-500">
                  {points.length} puntos registrados. Pasa el cursor sobre la gráfica para ver el desglose de cada sesión.
                </p>
              </div>

              {activePoint && (
                <div className="bg-purple-50 border border-purple-100 px-3 py-1.5 rounded-xl text-xs text-purple-900 font-medium self-start sm:self-auto shadow-2xs">
                  <span className="text-gray-500">
                    {activePoint.date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}:
                  </span>{' '}
                  <strong className="text-purple-950 font-bold text-sm tabular-nums">
                    {formatVal(activePoint.val)}
                  </strong>
                </div>
              )}
            </div>

            {/* Lienzo SVG */}
            <div className="relative w-full aspect-[2.5/1] min-h-[220px]">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Líneas horizontales del eje Y */}
                {[0, 0.33, 0.66, 1].map((ratio, idx) => {
                  const y = padTop + chartHeight * ratio;
                  const rangeVal = stats.peakVal - stats.minVal || 1;
                  const tickVal = Math.round(stats.peakVal - ratio * rangeVal);

                  return (
                    <g key={idx}>
                      <line
                        x1={padLeft}
                        y1={y}
                        x2={svgWidth - padRight}
                        y2={y}
                        stroke="#f3f4f6"
                        strokeWidth="1.2"
                        strokeDasharray={idx === 3 ? 'none' : '4 4'}
                      />
                      <text
                        x={padLeft - 8}
                        y={y + 3.5}
                        textAnchor="end"
                        className="text-[10px] fill-gray-400 font-medium select-none"
                      >
                        {metric === 'volume' ? `${Math.round(tickVal / 100) * 100}` : metric === 'reps' ? `${tickVal}r` : `${tickVal}kg`}
                      </text>
                    </g>
                  );
                })}

                {/* Área bajo la curva con gradiente */}
                <path d={areaPathD} fill="url(#chartGradient)" />

                {/* Línea principal */}
                <path
                  d={linePathD}
                  fill="none"
                  stroke="#7c3aed"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />

                {/* Línea vertical de guía (Crosshair) */}
                {hoveredIndex !== null && points[hoveredIndex] && (
                  <line
                    x1={points[hoveredIndex].x}
                    y1={padTop}
                    x2={points[hoveredIndex].x}
                    y2={padTop + chartHeight}
                    stroke="#a78bfa"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                )}

                {/* Puntos interactivos con halos */}
                {points.map((p, i) => {
                  const isHovered = hoveredIndex === i;
                  const isLast = i === points.length - 1 && hoveredIndex === null;
                  const isPeak = p.val === stats.peakVal;

                  return (
                    <g
                      key={i}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredIndex(i)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    >
                      {/* Área táctil amplia */}
                      <circle cx={p.x} cy={p.y} r="18" fill="transparent" />

                      {/* Halo si es hovered o último */}
                      {(isHovered || isLast) && (
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="8"
                          fill="#8b5cf6"
                          opacity="0.3"
                          className="animate-pulse"
                        />
                      )}

                      {/* Punto central */}
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={isHovered ? '5' : isPeak ? '4.5' : '3.5'}
                        fill={isPeak ? '#f59e0b' : '#7c3aed'}
                        stroke="#ffffff"
                        strokeWidth="2"
                        className="transition-all duration-150"
                      />
                    </g>
                  );
                })}

                {/* Fechas en el eje X */}
                {points.map((p, i) => {
                  const shouldShow =
                    points.length <= 6 ||
                    i === 0 ||
                    i === points.length - 1 ||
                    i % Math.ceil(points.length / 5) === 0;

                  if (!shouldShow) return null;

                  return (
                    <text
                      key={i}
                      x={p.x}
                      y={svgHeight - 12}
                      textAnchor="middle"
                      className="text-[10px] fill-gray-400 font-medium select-none"
                    >
                      {p.date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </text>
                  );
                })}
              </svg>
            </div>

            {/* Desglose detallado de la sesión seleccionada / hovered */}
            {activePoint && activePoint.session && (
              <div className="bg-gray-50/80 rounded-xl p-3.5 border border-gray-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-gray-900">
                      {activePoint.session.workoutName}
                    </span>
                    <span className="text-xs text-gray-500">
                      • {activePoint.date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-xs text-gray-400">Series:</span>
                    {activePoint.session.sets.map((s, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 text-xs bg-white rounded-md border border-gray-200 text-gray-700 font-medium tabular-nums"
                      >
                        {s.weight > 0 ? `${s.weight}kg × ` : ''}{s.reps} reps
                        {s.rpe ? <span className="text-gray-400 text-[10px]"> (RPE {s.rpe})</span> : ''}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-4 border-t sm:border-t-0 pt-2 sm:pt-0">
                  <div className="text-left sm:text-right">
                    <span className="text-[11px] text-gray-400 block">1RM Estimado</span>
                    <span className="font-bold text-sm text-purple-700 tabular-nums">
                      {activePoint.session.estimated1RM} kg
                    </span>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-[11px] text-gray-400 block">Volumen</span>
                    <span className="font-bold text-sm text-gray-900 tabular-nums">
                      {activePoint.session.totalVolume.toLocaleString('es-ES')} kg
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 5. CALCULADORA DE PROYECCIÓN 1RM (REP-MAX TABLE) */}
          {repMaxTable && (
            <div className="bg-white rounded-2xl border border-gray-200/90 p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-600" /> Proyección de Repeticiones Máximas (Rep-Max)
                  </h4>
                  <p className="text-xs text-gray-500">
                    Pesos objetivo estimados según tu 1RM récord de <strong className="text-purple-700">{stats.best1RM} kg</strong>.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {repMaxTable.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      item.reps === '1RM'
                        ? 'bg-purple-50/70 border-purple-200 ring-1 ring-purple-300'
                        : 'bg-gray-50/50 border-gray-200/70'
                    }`}
                  >
                    <span className="text-xs font-bold text-gray-500 block uppercase">
                      {item.reps}
                    </span>
                    <p className="text-lg font-extrabold text-gray-900 tabular-nums mt-0.5">
                      {item.weight} <span className="text-xs font-normal text-gray-500">kg</span>
                    </p>
                    <span className="text-[10px] text-gray-400 font-medium block mt-0.5">
                      {Math.round(item.pct * 100)}% ({item.desc})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. HISTORIAL DETALLADO DE SESIONES */}
          <div className="bg-white rounded-2xl border border-gray-200/90 p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <History className="w-4 h-4 text-gray-600" /> Registro Histórico de Sesiones
              </h4>
              <span className="text-xs text-gray-500">
                {filteredData.length} {filteredData.length === 1 ? 'sesión' : 'sesiones'}
              </span>
            </div>

            <div className="overflow-hidden border border-gray-200/80 rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-4 py-3">Fecha / Entrenamiento</th>
                    <th className="text-left px-4 py-3 hidden md:table-cell">Series Realizadas</th>
                    {!isBodyweight && <th className="text-right px-4 py-3">Carga Máx</th>}
                    {!isBodyweight && <th className="text-right px-4 py-3">1RM Est.</th>}
                    {isBodyweight && <th className="text-right px-4 py-3">Máx Reps</th>}
                    <th className="text-right px-4 py-3">{isBodyweight ? 'Total Reps' : 'Volumen'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredData
                    .slice()
                    .reverse()
                    .map((session, i) => {
                      const isPR = !isBodyweight && session.maxWeight === stats.bestMaxWeight;
                      const is1RMPeak = !isBodyweight && session.estimated1RM === stats.best1RM;
                      const isRepsPR = isBodyweight && session.maxReps === stats.bestMaxReps;

                      return (
                        <tr key={i} className="hover:bg-purple-50/20 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-900 text-sm">{session.workoutName}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(session.date).toLocaleDateString('es-ES', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </p>
                          </td>

                          <td className="px-4 py-3 hidden md:table-cell">
                            <div className="flex flex-wrap gap-1">
                              {session.sets.map((s, idx) => (
                                <span
                                  key={idx}
                                  className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-medium tabular-nums"
                                >
                                  {s.weight > 0 ? `${s.weight}kg × ` : ''}{s.reps} reps
                                </span>
                              ))}
                            </div>
                          </td>

                          {!isBodyweight && (
                            <td className="px-4 py-3 text-right">
                              <span className="font-bold text-gray-900 tabular-nums">{session.maxWeight} kg</span>
                              <span className="text-xs text-gray-500 block">x {session.maxReps} reps</span>
                            </td>
                          )}

                          {!isBodyweight && (
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <span className="font-bold text-purple-700 tabular-nums">
                                  {session.estimated1RM} kg
                                </span>
                                {is1RMPeak && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                    <Trophy className="w-2.5 h-2.5 text-amber-600" /> PR
                                  </span>
                                )}
                              </div>
                            </td>
                          )}

                          {isBodyweight && (
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <span className="font-bold text-purple-700 tabular-nums">
                                  {session.maxReps} reps
                                </span>
                                {isRepsPR && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                    <Trophy className="w-2.5 h-2.5 text-amber-600" /> PR
                                  </span>
                                )}
                              </div>
                            </td>
                          )}

                          <td className="px-4 py-3 text-right font-medium text-gray-600 tabular-nums">
                            {isBodyweight
                              ? `${session.totalReps ?? 0} reps`
                              : `${session.totalVolume.toLocaleString('es-ES')} kg`}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}