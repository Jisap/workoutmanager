'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { getExerciseProgressForCurrentUser } from '../workouts/actions';
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
  Timer,
  Route,
} from 'lucide-react';

export interface SetDetail {
  setNumber: number;
  weight: number;
  reps: number;
  rpe: number | null;
  estimated1RM: number;
  distance: number | null;
  durationSeconds: number | null;
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
  totalDistance: number;
  totalDurationSeconds: number;
  maxDistance: number;
  isBodyweight: boolean;
  isDraft: boolean;
  avgRpe: number | null;
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

type MetricType = '1rm' | 'maxWeight' | 'volume' | 'reps' | 'distance' | 'duration';
type TimeRange = '1m' | '3m' | '6m' | '1y' | 'all';

// En la métrica de tiempo menos es mejor (los PRs y la tendencia invierten su sentido)
const lowerIsBetter = (m: MetricType) => m === 'duration';

function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

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

  // Qué tipos de datos tiene el ejercicio (fuerza, cardio, carries, bodyweight)
  const hasWeightData = useMemo(() => (data || []).some((s) => !s.isBodyweight), [data]);
  const has1RMData = useMemo(() => (data || []).some((s) => s.estimated1RM > 0), [data]);
  const hasDistData = useMemo(() => (data || []).some((s) => (s.totalDistance || 0) > 0), [data]);
  const hasTimeData = useMemo(() => (data || []).some((s) => (s.totalDurationSeconds || 0) > 0), [data]);

  // Estados interactivos (métrica por defecto según el tipo real de datos)
  const [metric, setMetric] = useState<MetricType>(() => {
    if (!data || data.length === 0) return '1rm';
    if (data.some((s) => s.estimated1RM > 0)) return '1rm';
    if (data.some((s) => !s.isBodyweight)) return 'maxWeight';
    if (data.some((s) => (s.totalDistance || 0) > 0)) return 'distance';
    if (data.some((s) => (s.totalDurationSeconds || 0) > 0)) return 'duration';
    return 'reps';
  });
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  // Nuevos: tendencia, volumen en barras, borradores y comparador
  const [showTrend, setShowTrend] = useState(true);
  const [showVolumeBars, setShowVolumeBars] = useState(true);
  const [includeDrafts, setIncludeDrafts] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [compareSearch, setCompareSearch] = useState('');
  const [compareId, setCompareId] = useState<number | null>(null);
  const [compareData, setCompareData] = useState<ProgressSessionPoint[] | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);

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

  // Borradores (guardados sin finalizar) se excluyen por defecto: contaminan la curva
  const draftCount = useMemo(() => (data || []).filter((s) => s.isDraft).length, [data]);
  const visibleData = useMemo(() => {
    if (!data) return [];
    return includeDrafts ? data : data.filter((s) => !s.isDraft);
  }, [data, includeDrafts]);

  // Hay datos de RPE para mostrar la columna de esfuerzo
  const hasRpeData = useMemo(() => visibleData.some((s) => s.avgRpe != null), [visibleData]);

  // Filtrado de datos por rango temporal
  const filteredData = useMemo(() => {
    if (!visibleData || visibleData.length === 0) return [];

    const now = new Date().getTime();
    return visibleData
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
  }, [visibleData, timeRange]);

  // Valor de la métrica activa por sesión (se reutiliza en PRs, tendencia y comparador)
  const metricVal = (s: ProgressSessionPoint): number => {
    if (metric === '1rm') return s.estimated1RM;
    if (metric === 'maxWeight') return s.maxWeight;
    if (metric === 'reps') return s.maxReps;
    if (metric === 'distance') return s.totalDistance || 0;
    if (metric === 'duration') return s.totalDurationSeconds || 0;
    // Volumen: en bodyweight se mide en reps (el volumen en kg siempre es 0 ahí)
    return isBodyweight ? (s.totalReps ?? 0) : s.totalVolume;
  };

  // PRs cronológicos: sesiones que superan todo lo anterior (desde la 2ª en adelante).
  // En tiempo, mejor = menos segundos (se ignoran sesiones sin tiempo registrado).
  const chronoPRs = useMemo(() => {
    const lower = lowerIsBetter(metric);
    const flags = new Array(filteredData.length).fill(false);
    let best = lower ? Infinity : -Infinity;
    filteredData.forEach((s, i) => {
      const v = metricVal(s);
      if (i === 0) {
        best = v;
      } else if (lower ? v > 0 && v < best : v > best) {
        flags[i] = true;
        best = v;
      }
    });
    return flags;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredData, metric]);

  // Estado de progresión: días/sesiones desde el último PR
  const prStatus = useMemo(() => {
    if (filteredData.length < 2) return null;
    let lastPRDate = new Date(filteredData[0].date).getTime();
    let sessionsSincePR = 0;
    chronoPRs.forEach((isPR, i) => {
      if (isPR) {
        lastPRDate = new Date(filteredData[i].date).getTime();
        sessionsSincePR = 0;
      } else if (i > 0) {
        sessionsSincePR++;
      }
    });
    const daysSincePR = Math.max(0, Math.round((new Date().getTime() - lastPRDate) / (1000 * 60 * 60 * 24)));
    const prCount = chronoPRs.filter(Boolean).length;
    const status = daysSincePR <= 30 ? 'progressing' : daysSincePR <= 60 ? 'steady' : 'stalled';
    return { daysSincePR, sessionsSincePR, prCount, status: status as 'progressing' | 'steady' | 'stalled' };
  }, [filteredData, chronoPRs]);

  // Comparador: cargar el segundo ejercicio bajo demanda
  const handleSelectCompare = async (exerciseId: number) => {
    if (exerciseId === selectedExerciseId) return;
    setCompareId(exerciseId);
    setIsCompareOpen(false);
    setCompareLoading(true);
    try {
      const res = await getExerciseProgressForCurrentUser(exerciseId);
      setCompareData(res as ProgressSessionPoint[]);
    } catch {
      setCompareData([]);
    } finally {
      setCompareLoading(false);
    }
  };

  const compareExercise = compareId != null ? availableExercises.find((ex) => ex.id === compareId) : undefined;
  const compareFiltered = useMemo(() => {
    if (!compareData) return [];
    const list = includeDrafts ? compareData : compareData.filter((s) => !s.isDraft);
    if (timeRange === 'all') return [...list].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const now = new Date().getTime();
    const limits: Record<TimeRange, number> = { '1m': 30, '3m': 90, '6m': 180, '1y': 365, all: Infinity };
    return list
      .filter((s) => (now - new Date(s.date).getTime()) / (1000 * 60 * 60 * 24) <= limits[timeRange])
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [compareData, includeDrafts, timeRange]);

  // Crecimiento % inicio→fin para A y B (misma métrica)
  const compareGrowth = useMemo(() => {
    const growthOf = (arr: ProgressSessionPoint[]) => {
      if (arr.length < 2) return null;
      const first = metricVal(arr[0]);
      const last = metricVal(arr[arr.length - 1]);
      if (first <= 0) return null;
      return ((last - first) / first) * 100;
    };
    return { a: growthOf(filteredData), b: compareFiltered.length > 0 ? growthOf(compareFiltered) : null };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredData, compareFiltered, metric]);

  const handleSelectExercise = (exerciseId: number) => {
    setIsSelectorOpen(false);
    router.push(`/progress?exerciseId=${exerciseId}`);
  };

  // Métricas calculadas para el ejercicio actual
  const stats = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return null;

    const values = filteredData.map((d) => metricVal(d));

    const currentVal = values[values.length - 1];
    const initialVal = values[0];
    const peakVal = Math.max(...values);
    const minVal = Math.min(...values);
    // Mejor marca según el sentido de la métrica (en tiempo gana el mínimo > 0)
    const positiveVals = values.filter((v) => v > 0);
    const bestVal = lowerIsBetter(metric)
      ? positiveVals.length > 0
        ? Math.min(...positiveVals)
        : 0
      : peakVal;
    const diff = currentVal - initialVal;
    const diffPercent = initialVal > 0 ? (diff / initialVal) * 100 : 0;
    const avgMetricVal = values.reduce((a, b) => a + b, 0) / values.length;

    // Mejor 1RM histórico
    const best1RMSession = [...filteredData].sort((a, b) => b.estimated1RM - a.estimated1RM)[0];
    const bestMaxWeightSession = [...filteredData].sort((a, b) => b.maxWeight - a.maxWeight)[0];
    const bestMaxRepsSession = [...filteredData].sort((a, b) => b.maxReps - a.maxReps)[0];
    const totalVolumeAll = filteredData.reduce((acc, s) => acc + s.totalVolume, 0);
    const totalRepsAll = filteredData.reduce((acc, s) => acc + (s.totalReps ?? 0), 0);
    const totalDistanceAll = filteredData.reduce((acc, s) => acc + (s.totalDistance || 0), 0);
    const totalDurationAll = filteredData.reduce((acc, s) => acc + (s.totalDurationSeconds || 0), 0);
    const avgVolume = Math.round(totalVolumeAll / filteredData.length);
    const avgReps = Math.round(totalRepsAll / filteredData.length);
    // Mejor distancia (máximo por sesión) y mejor tiempo (mínimo con registro)
    const withDist = filteredData.filter((s) => (s.totalDistance || 0) > 0);
    const bestDistanceSession = withDist.length > 0 ? [...withDist].sort((a, b) => (b.totalDistance || 0) - (a.totalDistance || 0))[0] : undefined;
    const withTime = filteredData.filter((s) => (s.totalDurationSeconds || 0) > 0);
    const bestDurationSession = withTime.length > 0 ? [...withTime].sort((a, b) => (a.totalDurationSeconds || 0) - (b.totalDurationSeconds || 0))[0] : undefined;

    return {
      currentVal,
      peakVal,
      minVal,
      bestVal,
      diff,
      diffPercent,
      avgMetricVal,
      best1RM: best1RMSession?.estimated1RM ?? 0,
      best1RMSession,
      bestMaxWeight: bestMaxWeightSession?.maxWeight ?? 0,
      bestMaxWeightSession,
      bestMaxReps: bestMaxRepsSession?.maxReps ?? 0,
      bestMaxRepsSession,
      bestDistance: bestDistanceSession?.totalDistance ?? 0,
      bestDistanceSession,
      bestDuration: bestDurationSession?.totalDurationSeconds ?? 0,
      bestDurationSession,
      totalDistanceAll,
      totalDurationAll,
      avgVolume,
      avgReps,
      totalRepsAll,
      totalSessions: filteredData.length,
      values,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Recta de tendencia (mínimos cuadrados sobre el índice de sesión)
  const trendPathD = useMemo(() => {
    if (!stats || filteredData.length < 3) return '';
    const n = filteredData.length;
    const values = filteredData.map((d) => metricVal(d));
    const meanX = (n - 1) / 2;
    const meanY = values.reduce((a, b) => a + b, 0) / n;
    let num = 0;
    let den = 0;
    values.forEach((v, i) => {
      num += (i - meanX) * (v - meanY);
      den += (i - meanX) * (i - meanX);
    });
    if (den === 0) return '';
    const slope = num / den;
    const intercept = meanY - slope * meanX;
    const min = stats.minVal;
    const max = stats.peakVal;
    const range = max - min || (max === 0 ? 10 : max * 0.2 || 1);
    const yOf = (idx: number) => {
      const v = intercept + slope * idx;
      const normalized = (v - min) / range;
      return padTop + chartHeight - normalized * chartHeight;
    };
    const x0 = padLeft;
    const x1 = padLeft + chartWidth;
    return `M ${x0.toFixed(1)} ${yOf(0).toFixed(1)} L ${x1.toFixed(1)} ${yOf(n - 1).toFixed(1)}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats, filteredData, metric, chartWidth, chartHeight, padLeft, padTop]);

  // Barras de volumen al fondo (segundo eje implícito, mitad inferior, sutiles)
  const maxVolume = useMemo(
    () => filteredData.reduce((m, s) => Math.max(m, s.totalVolume || 0), 0),
    [filteredData]
  );
  const canShowVolumeBars = !isBodyweight && (metric === '1rm' || metric === 'maxWeight') && maxVolume > 0;
  const volumeBars = useMemo(() => {
    if (!canShowVolumeBars || filteredData.length === 0) return [];
    const bottomY = padTop + chartHeight;
    const maxH = chartHeight * 0.45;
    const slot = chartWidth / filteredData.length;
    const barW = Math.max(2, Math.min(26, slot * 0.55));
    return filteredData.map((s, i) => {
      const h = maxVolume > 0 ? ((s.totalVolume || 0) / maxVolume) * maxH : 0;
      const cx = filteredData.length === 1
        ? padLeft + chartWidth / 2
        : padLeft + (i / (filteredData.length - 1 || 1)) * chartWidth;
      return { x: cx - barW / 2, y: bottomY - h, w: barW, h, vol: s.totalVolume || 0 };
    });
  }, [canShowVolumeBars, filteredData, maxVolume, chartWidth, chartHeight, padLeft, padTop]);

  // Serie del comparador B proyectada sobre el mismo eje Y (misma métrica y unidades)
  const comparePoints = useMemo(() => {
    if (!stats || compareFiltered.length === 0) return [];
    const min = stats.minVal;
    const max = stats.peakVal;
    const range = max - min || (max === 0 ? 10 : max * 0.2 || 1);
    return compareFiltered.map((d, i) => {
      const x = compareFiltered.length === 1
        ? padLeft + chartWidth / 2
        : padLeft + (i / (compareFiltered.length - 1 || 1)) * chartWidth;
      const normalized = (metricVal(d) - min) / range;
      const y = padTop + chartHeight - normalized * chartHeight;
      return { x, y, val: metricVal(d), session: d };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats, compareFiltered, metric, chartWidth, chartHeight, padLeft, padTop]);

  const comparePathD = useMemo(() => {
    if (comparePoints.length === 0) return '';
    if (comparePoints.length === 1) {
      return `M ${padLeft} ${comparePoints[0].y} L ${padLeft + chartWidth} ${comparePoints[0].y}`;
    }
    return comparePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  }, [comparePoints, padLeft, chartWidth]);

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
    if (m === 'distance') return 'Distancia / Sesión';
    if (m === 'duration') return 'Tiempo / Sesión';
    return 'Volumen Total';
  };

  const formatVal = (v: number) => {
    if (metric === 'volume') return isBodyweight ? `${v} reps` : `${v.toLocaleString('es-ES')} kg`;
    if (metric === 'reps') return `${v} reps`;
    if (metric === 'distance') return `${v.toLocaleString('es-ES')} m`;
    if (metric === 'duration') return formatDuration(v);
    return `${v} kg`;
  };

  // Diferencia inicio→fin con unidades y signo (en tiempo, bajar es mejorar)
  const formatDiff = (d: number) => {
    if (metric === 'duration') {
      if (d === 0) return '0:00';
      const sign = d > 0 ? '+' : '−';
      return `${sign}${formatDuration(Math.abs(d))}`;
    }
    if (metric === 'distance') return `${d > 0 ? '+' : ''}${d.toLocaleString('es-ES')} m`;
    if (metric === 'reps' || (metric === 'volume' && isBodyweight)) return `${d > 0 ? '+' : ''}${d} reps`;
    return `${d > 0 ? '+' : ''}${d} kg`;
  };

  const isGoodDiff = (d: number) => (lowerIsBetter(metric) ? d < 0 : d > 0);

  return (
    <div className="space-y-6">
      {/* 1. SELETOR PROFESIONAL DE EJERCICIO */}
      <div className="bg-white rounded-2xl border border-gray-200/90 p-4 sm:p-5 shadow-xs dark:bg-gray-900 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
              <Dumbbell className="w-3.5 h-3.5" /> Ejercicio Activo
            </span>
            <div className="flex items-center gap-3">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                {selectedExercise ? selectedExercise.name : 'Selecciona un ejercicio'}
              </h2>
              {selectedExercise && (
                <span className="px-2.5 py-0.5 text-xs font-medium bg-purple-50 text-purple-700 rounded-full border border-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800">
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
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 mr-1 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-500" /> Frecuentes:
            </span>
            {quickAccessExercises.map((ex) => (
              <button
                key={ex.id}
                onClick={() => handleSelectExercise(ex.id)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                  selectedExerciseId === ex.id
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                <span>{ex.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    selectedExerciseId === ex.id
                      ? 'bg-purple-700/80 text-purple-100'
                      : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
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
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              {/* Buscador en tiempo real */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Escribe para buscar (ej. Press Banca, Sentadilla...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
                  autoFocus
                />
              </div>

              {/* Filtro: Solo con registros */}
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200 dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
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
                      ? 'bg-purple-100 text-purple-800 font-semibold dark:bg-purple-900/30 dark:text-purple-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Lista de resultados en cuadrícula */}
            <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-xl bg-gray-50/50 dark:divide-gray-800 dark:border-gray-700 dark:bg-gray-800/50">
              {filteredExercises.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
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
                          ? 'bg-purple-50 text-purple-900 font-semibold dark:bg-purple-900/30 dark:text-purple-200'
                          : 'hover:bg-white text-gray-800 dark:hover:bg-gray-800 dark:text-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isSelected && <Check className="w-4 h-4 text-purple-600 dark:text-purple-400" />}
                        <span>{ex.name}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">({ex.categoryName})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {ex.sessionCount > 0 ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-medium dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800">
                            {ex.sessionCount} {ex.sessionCount === 1 ? 'sesión' : 'sesiones'}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-500">Sin datos</span>
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
        <Card className="bg-gray-50/60 border-dashed border-gray-300 dark:bg-gray-800/50 dark:border-gray-700">
          <CardContent className="py-14 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mx-auto shadow-inner dark:bg-purple-900/30 dark:text-purple-400">
              <Dumbbell className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
              Sin registros {timeRange !== 'all' ? 'en este período' : 'para este ejercicio'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              {timeRange !== 'all'
                ? 'Prueba a cambiar el rango temporal a "Todo el histórico" para ver sesiones anteriores.'
                : draftCount > 0 && !includeDrafts
                ? `Solo hay ${draftCount} ${draftCount === 1 ? 'sesión guardada sin finalizar (borrador)' : 'sesiones guardadas sin finalizar (borradores)'}. Activa "Borradores" arriba para incluirlas o finaliza la sesión desde Historial.`
                : `Aún no has registrado series con peso en "${selectedExercise?.name ?? 'este ejercicio'}".`}
            </p>
          </CardContent>
        </Card>
      )}

      {/* CASO CON DATOS: DASHBOARD COMPLETO DE ANALÍTICA */}
      {filteredData && filteredData.length > 0 && stats && (
        <>
          {/* 2. BARRA DE CONTROL DE MÉTRICAS Y RANGOS TEMPORALES */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-200 dark:bg-gray-900 dark:border-gray-700">
            {/* Selector de Métrica (solo las que tienen datos reales) */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl dark:bg-gray-800 overflow-x-auto">
              {has1RMData && (
                <>
                  <button
                    onClick={() => setMetric('1rm')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                      metric === '1rm'
                        ? 'bg-white text-purple-700 shadow-xs dark:bg-gray-700 dark:text-purple-300'
                        : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                    }`}
                  >
                    <Target className="w-3.5 h-3.5" />
                    <span>1RM Estimado</span>
                  </button>

                  <button
                    onClick={() => setMetric('maxWeight')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                      metric === 'maxWeight'
                        ? 'bg-white text-purple-700 shadow-xs dark:bg-gray-700 dark:text-purple-300'
                        : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                    }`}
                  >
                    <Trophy className="w-3.5 h-3.5" />
                    <span>Carga Máx.</span>
                  </button>
                </>
              )}

              {hasWeightData && !has1RMData && (
                <button
                  onClick={() => setMetric('maxWeight')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                    metric === 'maxWeight'
                      ? 'bg-white text-purple-700 shadow-xs dark:bg-gray-700 dark:text-purple-300'
                      : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>Carga Máx.</span>
                </button>
              )}

              {!hasWeightData && (
                <button
                  onClick={() => setMetric('reps')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                    metric === 'reps'
                      ? 'bg-white text-purple-700 shadow-xs dark:bg-gray-700 dark:text-purple-300'
                      : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                  }`}
                >
                  <Target className="w-3.5 h-3.5" />
                  <span>Máx. Reps</span>
                </button>
              )}

              {hasDistData && (
                <button
                  onClick={() => setMetric('distance')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                    metric === 'distance'
                      ? 'bg-white text-purple-700 shadow-xs dark:bg-gray-700 dark:text-purple-300'
                      : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                  }`}
                >
                  <Route className="w-3.5 h-3.5" />
                  <span>Distancia</span>
                </button>
              )}

              {hasTimeData && (
                <button
                  onClick={() => setMetric('duration')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                    metric === 'duration'
                      ? 'bg-white text-purple-700 shadow-xs dark:bg-gray-700 dark:text-purple-300'
                      : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                  }`}
                >
                  <Timer className="w-3.5 h-3.5" />
                  <span>Tiempo</span>
                </button>
              )}

              {(!hasWeightData || maxVolume > 0) && (
              <button
                onClick={() => setMetric('volume')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                  metric === 'volume'
                    ? 'bg-white text-purple-700 shadow-xs dark:bg-gray-700 dark:text-purple-300'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{isBodyweight ? 'Total Reps' : 'Volumen'}</span>
              </button>
              )}
            </div>

            {/* Selector de Rango Temporal */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl self-start sm:self-auto dark:bg-gray-800">
              {(['1m', '3m', '6m', '1y', 'all'] as TimeRange[]).map((r) => {
                const label = r === '1m' ? '1M' : r === '3m' ? '3M' : r === '6m' ? '6M' : r === '1y' ? '1A' : 'Todo';
                return (
                  <button
                    key={r}
                    onClick={() => setTimeRange(r)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                      timeRange === r
                        ? 'bg-gray-900 text-white shadow-xs dark:bg-gray-700 dark:text-gray-100'
                        : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2b. OPCIONES DE VISTA: tendencia, volumen, borradores y comparador */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setShowTrend((v) => !v)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all border ${
                showTrend
                  ? 'bg-gray-900 text-white border-gray-900 dark:bg-gray-700 dark:border-gray-700'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700'
              }`}
              title="Recta de tendencia (regresión lineal)"
            >
              Tendencia {showTrend ? '· on' : '· off'}
            </button>
            {canShowVolumeBars && (
              <button
                onClick={() => setShowVolumeBars((v) => !v)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all border ${
                  showVolumeBars
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700'
                }`}
                title="Volumen por sesión como barras de fondo"
              >
                Volumen {showVolumeBars ? '· on' : '· off'}
              </button>
            )}
            {draftCount > 0 && (
              <button
                onClick={() => setIncludeDrafts((v) => !v)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all border ${
                  includeDrafts
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700'
                }`}
                title="Las sesiones guardadas sin finalizar contaminan la curva"
              >
                Borradores ({draftCount}) {includeDrafts ? '· incluidos' : '· excluidos'}
              </button>
            )}
            <button
              onClick={() => setIsCompareOpen((v) => !v)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all border flex items-center gap-1 ${
                compareId != null
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700'
              }`}
              title="Superponer la curva de otro ejercicio (misma métrica y unidades)"
            >
              <Filter className="w-3 h-3" />
              {compareId != null ? `vs ${compareExercise?.name ?? ''}` : 'Comparar'}
            </button>
            {compareLoading && <span className="text-xs text-gray-400">Cargando…</span>}
          </div>

          {/* Panel del comparador */}
          {isCompareOpen && (
            <div className="bg-white p-3 rounded-2xl border border-gray-200 space-y-2 dark:bg-gray-900 dark:border-gray-700">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar segundo ejercicio para comparar…"
                  value={compareSearch}
                  onChange={(e) => setCompareSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                  autoFocus
                />
              </div>
              <div className="max-h-44 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-xl dark:divide-gray-800 dark:border-gray-700">
                {availableExercises
                  .filter((ex) => ex.id !== selectedExerciseId && ex.sessionCount > 0)
                  .filter((ex) => ex.name.toLowerCase().includes(compareSearch.toLowerCase().trim()))
                  .slice(0, 20)
                  .map((ex) => (
                    <button
                      key={ex.id}
                      onClick={() => handleSelectCompare(ex.id)}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-emerald-50 text-gray-800 flex items-center justify-between dark:hover:bg-emerald-950/30 dark:text-gray-200"
                    >
                      <span>{ex.name} <span className="text-xs text-gray-400">({ex.categoryName})</span></span>
                      <span className="text-xs text-gray-400">{ex.sessionCount} sesiones</span>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Leyenda del comparador + crecimiento */}
          {compareId != null && compareData && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-gray-700 dark:text-gray-300">
                <span className="w-4 h-0.5 bg-purple-600 rounded-full inline-block" />
                {selectedExercise?.name ?? 'A'}
                {compareGrowth.a != null && (
                  <span className={`font-mono ${compareGrowth.a >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    ({compareGrowth.a >= 0 ? '+' : ''}{compareGrowth.a.toFixed(1)}%)
                  </span>
                )}
              </span>
              <span className="flex items-center gap-1.5 font-semibold text-gray-700 dark:text-gray-300">
                <span className="w-4 h-0 border-t-2 border-dashed border-emerald-500 inline-block" />
                {compareExercise?.name ?? 'B'}
                {compareGrowth.b != null && (
                  <span className={`font-mono ${compareGrowth.b >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    ({compareGrowth.b >= 0 ? '+' : ''}{compareGrowth.b.toFixed(1)}%)
                  </span>
                )}
              </span>
              <button
                onClick={() => { setCompareId(null); setCompareData(null); }}
                className="text-gray-400 hover:text-rose-600 font-bold cursor-pointer"
                title="Quitar comparación"
              >
                ✕
              </button>
            </div>
          )}

          {/* 2c. ESTADO DE PROGRESIÓN (racha de PRs) */}
          {prStatus && (
            <div className={`flex flex-wrap items-center gap-2 px-3.5 py-2.5 rounded-2xl border text-xs ${
              prStatus.status === 'progressing'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-200'
                : prStatus.status === 'steady'
                ? 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200'
                : 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-200'
            }`}>
              <span className={`font-black px-2 py-0.5 rounded-lg text-[11px] ${
                prStatus.status === 'progressing'
                  ? 'bg-emerald-500 text-white'
                  : prStatus.status === 'steady'
                  ? 'bg-amber-500 text-white'
                  : 'bg-rose-500 text-white'
              }`}>
                {prStatus.status === 'progressing' ? 'PROGRESANDO' : prStatus.status === 'steady' ? 'ESTABLE' : 'ESTANCADO'}
              </span>
              <span className="font-medium">
                {prStatus.prCount} {prStatus.prCount === 1 ? 'récord' : 'récords'} superados
                {prStatus.sessionsSincePR > 0
                  ? ` · último hace ${prStatus.daysSincePR} ${prStatus.daysSincePR === 1 ? 'día' : 'días'} (${prStatus.sessionsSincePR} ${prStatus.sessionsSincePR === 1 ? 'sesión' : 'sesiones'} sin PR)`
                  : ' · ¡récord en la última sesión!'}
              </span>
            </div>
          )}

          {/* 3. TARJETAS DE IMPACTO ANALÍTICO (KPIs adaptados al tipo de ejercicio) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Récord principal */}
            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-2xl p-4 shadow-sm relative overflow-hidden">
              <div className="absolute right-[-10px] bottom-[-10px] opacity-10">
                <Target className="w-24 h-24 text-white" />
              </div>
              <div className="relative z-10 space-y-1">
                <span className="text-xs font-medium text-purple-100 flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-yellow-300" />
                  {hasWeightData && stats.best1RM > 0
                    ? 'Récord 1RM Estimado'
                    : hasWeightData
                    ? 'Récord de Carga'
                    : hasDistData
                    ? 'Mayor Distancia / Sesión'
                    : hasTimeData
                    ? 'Mejor Tiempo / Sesión'
                    : 'Máx. Repeticiones'}
                </span>
                <p className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums">
                  {hasWeightData && stats.best1RM > 0 ? (
                    <>{stats.best1RM}<span className="text-sm font-medium opacity-80"> kg</span></>
                  ) : hasWeightData ? (
                    <>{stats.bestMaxWeight}<span className="text-sm font-medium opacity-80"> kg</span></>
                  ) : hasDistData ? (
                    <>{stats.bestDistance.toLocaleString('es-ES')}<span className="text-sm font-medium opacity-80"> m</span></>
                  ) : hasTimeData ? (
                    <>{formatDuration(stats.bestDuration)}</>
                  ) : (
                    <>{stats.bestMaxReps}<span className="text-sm font-medium opacity-80"> reps</span></>
                  )}
                </p>
                <p className="text-[11px] text-purple-100/90 truncate">
                  {(() => {
                    const s = hasWeightData
                      ? stats.best1RM > 0 ? stats.best1RMSession : stats.bestMaxWeightSession
                      : hasDistData ? stats.bestDistanceSession : hasTimeData ? stats.bestDurationSession : stats.bestMaxRepsSession;
                    if (!s) return 'Sin registros';
                    const d = new Date(s.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
                    if (hasWeightData && stats.best1RM > 0) return `${d} (${s.maxWeight}kg x ${s.maxReps})`;
                    return d;
                  })()}
                </p>
              </div>
            </div>

            {/* Secundario: carga máxima / acumulado de distancia / tiempo / reps */}
            <div className="bg-white rounded-2xl p-4 border border-gray-200/90 shadow-xs space-y-1 dark:bg-gray-900 dark:border-gray-700">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Dumbbell className="w-3.5 h-3.5 text-blue-500" />
                {hasWeightData ? 'Carga Máxima Levantada' : hasDistData ? 'Distancia Acumulada' : hasTimeData ? 'Tiempo Acumulado' : 'Total Reps Acumuladas'}
              </span>
              <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight tabular-nums">
                {hasWeightData ? (
                  <>{stats.bestMaxWeight}<span className="text-sm font-normal text-gray-400 dark:text-gray-500"> kg</span></>
                ) : hasDistData ? (
                  <>{stats.totalDistanceAll.toLocaleString('es-ES')}<span className="text-sm font-normal text-gray-400 dark:text-gray-500"> m</span></>
                ) : hasTimeData ? (
                  <>{formatDuration(stats.totalDurationAll)}</>
                ) : (
                  <>{stats.totalRepsAll}<span className="text-sm font-normal text-gray-400 dark:text-gray-500"> reps</span></>
                )}
              </p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                {hasWeightData && stats.bestMaxWeightSession
                  ? `x ${stats.bestMaxWeightSession.maxReps} reps`
                  : `en ${stats.totalSessions} ${stats.totalSessions === 1 ? 'sesión' : 'sesiones'}`}
              </p>
            </div>

            {/* Progresión Neta (sentido según métrica: en tiempo, bajar es mejorar) */}
            <div className="bg-white rounded-2xl p-4 border border-gray-200/90 shadow-xs space-y-1 dark:bg-gray-900 dark:border-gray-700">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                {stats.diff !== 0 && isGoodDiff(stats.diff) ? (
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                ) : stats.diff !== 0 ? (
                  <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
                ) : (
                  <Minus className="w-3.5 h-3.5 text-gray-400" />
                )}
                Evolución ({getMetricLabel(metric)})
              </span>
              <p
                className={`text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums ${
                  stats.diff !== 0 && isGoodDiff(stats.diff) ? 'text-emerald-600' : stats.diff !== 0 ? 'text-rose-600' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {formatDiff(Math.round(stats.diff * 10) / 10)}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                {stats.diffPercent > 0 ? `+${stats.diffPercent.toFixed(1)}%` : `${stats.diffPercent.toFixed(1)}%`} desde el inicio
              </p>
            </div>

            {/* Media por sesión de la métrica activa */}
            <div className="bg-white rounded-2xl p-4 border border-gray-200/90 shadow-xs space-y-1 dark:bg-gray-900 dark:border-gray-700">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <BarChart3 className="w-3.5 h-3.5 text-amber-500" />
                Media / Sesión ({getMetricLabel(metric)})
              </span>
              <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight tabular-nums">
                {formatVal(Math.round(stats.avgMetricVal * 10) / 10)}
              </p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                En {stats.totalSessions} {stats.totalSessions === 1 ? 'sesión' : 'sesiones'}
              </p>
            </div>
          </div>

          {/* 4. GRÁFICO PROFESIONAL CON HOVER INTERACTIVO */}
          <div className="bg-white rounded-2xl border border-gray-200/90 p-4 sm:p-6 shadow-xs space-y-4 dark:bg-gray-900 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                  Curva de Progresión: {getMetricLabel(metric)}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {points.length} puntos registrados. Pasa el cursor sobre la gráfica para ver el desglose de cada sesión.
                </p>
              </div>

              {activePoint && (
                <div className="bg-purple-50 border border-purple-100 px-3 py-1.5 rounded-xl text-xs text-purple-900 font-medium self-start sm:self-auto shadow-2xs dark:bg-purple-900/30 dark:border-purple-800 dark:text-purple-200">
                  <span className="text-gray-500 dark:text-gray-400">
                    {activePoint.date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}:
                  </span>{' '}
                  <strong className="text-purple-950 font-bold text-sm tabular-nums dark:text-purple-200">
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
                        className="text-[10px] fill-gray-400 font-medium select-none dark:fill-gray-500"
                      >
                        {metric === 'duration'
                          ? formatDuration(tickVal)
                          : metric === 'distance'
                          ? `${tickVal}m`
                          : metric === 'volume'
                          ? isBodyweight ? `${tickVal}r` : `${Math.round(tickVal / 100) * 100}`
                          : metric === 'reps' ? `${tickVal}r` : `${tickVal}kg`}
                      </text>
                    </g>
                  );
                })}

                {/* Barras de volumen al fondo (segundo eje implícito) */}
                {showVolumeBars && volumeBars.map((b, i) => (
                  <rect
                    key={`v${i}`}
                    x={b.x}
                    y={b.y}
                    width={b.w}
                    height={Math.max(0, b.h)}
                    rx={2}
                    fill="#8b5cf6"
                    opacity={0.14}
                  >
                    <title>{`Volumen: ${b.vol.toLocaleString('es-ES')} kg`}</title>
                  </rect>
                ))}

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

                {/* Recta de tendencia */}
                {showTrend && trendPathD && (
                  <path
                    d={trendPathD}
                    fill="none"
                    stroke="#9ca3af"
                    strokeWidth="1.5"
                    strokeDasharray="6 4"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                    opacity={0.9}
                  >
                    <title>Tendencia (regresión lineal)</title>
                  </path>
                )}

                {/* Curva del comparador B */}
                {comparePathD && (
                  <path
                    d={comparePathD}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2"
                    strokeDasharray="5 4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                    opacity={0.9}
                  />
                )}
                {comparePoints.map((p, i) => (
                  <circle key={`c${i}`} cx={p.x} cy={p.y} r="2.5" fill="#10b981" stroke="#ffffff" strokeWidth="1.5">
                    <title>{`${compareExercise?.name ?? 'B'}: ${formatVal(p.val)} · ${new Date(p.session.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`}</title>
                  </circle>
                ))}

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
                  const isPeak = p.val === stats.bestVal && stats.bestVal > 0;
                  const isChronoPR = !!chronoPRs[i];

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
                      >
                        {isChronoPR && <title>🏆 Récord superado en esta sesión</title>}
                      </circle>

                      {/* Anillo dorado: la sesión batió el récord hasta entonces */}
                      {isChronoPR && !isHovered && (
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="7"
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="1.5"
                          opacity="0.7"
                        />
                      )}
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
                      className="text-[10px] fill-gray-400 font-medium select-none dark:fill-gray-500"
                    >
                      {p.date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </text>
                  );
                })}
              </svg>
            </div>

            {/* Desglose detallado de la sesión seleccionada / hovered */}
            {activePoint && activePoint.session && (
              <div className="bg-gray-50/80 rounded-xl p-3.5 border border-gray-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 dark:bg-gray-800/60 dark:border-gray-700">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                      {activePoint.session.workoutName}
                    </span>
                    {activePoint.session.isDraft && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800">
                        BORRADOR
                      </span>
                    )}
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      • {activePoint.date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-xs text-gray-400 dark:text-gray-500">Series:</span>
                    {activePoint.session.sets.map((s, idx) => {
                      const parts: string[] = [];
                      if (s.weight > 0 && s.reps > 0) parts.push(`${s.weight}kg × ${s.reps}`);
                      else if (s.weight > 0) parts.push(`${s.weight}kg`);
                      else if (s.reps > 0) parts.push(`${s.reps} reps`);
                      if (s.distance) parts.push(`${s.distance}m`);
                      if (s.durationSeconds) parts.push(formatDuration(s.durationSeconds));
                      return (
                      <span
                        key={idx}
                        className="px-2 py-0.5 text-xs bg-white rounded-md border border-gray-200 text-gray-700 font-medium tabular-nums dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                      >
                        {parts.join(' · ') || '—'}
                        {s.rpe ? <span className="text-gray-400 dark:text-gray-500 text-[10px]"> (RPE {s.rpe})</span> : ''}
                      </span>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-200 dark:border-gray-700 flex-wrap">
                  {hasWeightData && (
                  <div className="text-left sm:text-right">
                    <span className="text-[11px] text-gray-400 dark:text-gray-500 block">1RM Estimado</span>
                    <span className="font-bold text-sm text-purple-700 dark:text-purple-400 tabular-nums">
                      {activePoint.session.estimated1RM} kg
                    </span>
                  </div>
                  )}
                  {maxVolume > 0 && (
                  <div className="text-left sm:text-right">
                    <span className="text-[11px] text-gray-400 dark:text-gray-500 block">Volumen</span>
                    <span className="font-bold text-sm text-gray-900 dark:text-gray-100 tabular-nums">
                      {activePoint.session.totalVolume.toLocaleString('es-ES')} kg
                    </span>
                  </div>
                  )}
                  {(activePoint.session.totalDistance || 0) > 0 && (
                  <div className="text-left sm:text-right">
                    <span className="text-[11px] text-gray-400 dark:text-gray-500 block">Distancia</span>
                    <span className="font-bold text-sm text-gray-900 dark:text-gray-100 tabular-nums">
                      {(activePoint.session.totalDistance || 0).toLocaleString('es-ES')} m
                    </span>
                  </div>
                  )}
                  {(activePoint.session.totalDurationSeconds || 0) > 0 && (
                  <div className="text-left sm:text-right">
                    <span className="text-[11px] text-gray-400 dark:text-gray-500 block">Tiempo</span>
                    <span className="font-bold text-sm text-gray-900 dark:text-gray-100 tabular-nums">
                      {formatDuration(activePoint.session.totalDurationSeconds || 0)}
                    </span>
                  </div>
                  )}
                  {activePoint.session.avgRpe != null && (
                    <div className="text-left sm:text-right">
                      <span className="text-[11px] text-gray-400 dark:text-gray-500 block">Esfuerzo medio</span>
                      <span className="font-bold text-sm text-orange-600 dark:text-orange-400 tabular-nums">
                        RPE {activePoint.session.avgRpe}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 5. CALCULADORA DE PROYECCIÓN 1RM (REP-MAX TABLE) */}
          {repMaxTable && (
            <div className="bg-white rounded-2xl border border-gray-200/90 p-4 sm:p-5 shadow-xs space-y-3 dark:bg-gray-900 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-600" /> Proyección de Repeticiones Máximas (Rep-Max)
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Pesos objetivo estimados según tu 1RM récord de <strong className="text-purple-700 dark:text-purple-400">{stats.best1RM} kg</strong>.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {repMaxTable.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      item.reps === '1RM'
                        ? 'bg-purple-50/70 border-purple-200 ring-1 ring-purple-300 dark:bg-purple-900/20 dark:border-purple-800'
                        : 'bg-gray-50/50 border-gray-200/70 dark:bg-gray-800/50 dark:border-gray-700'
                    }`}
                  >
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 block uppercase">
                      {item.reps}
                    </span>
                    <p className="text-lg font-extrabold text-gray-900 dark:text-gray-100 tabular-nums mt-0.5">
                      {item.weight} <span className="text-xs font-normal text-gray-500 dark:text-gray-400">kg</span>
                    </p>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium block mt-0.5">
                      {Math.round(item.pct * 100)}% ({item.desc})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. HISTORIAL DETALLADO DE SESIONES */}
          <div className="bg-white rounded-2xl border border-gray-200/90 p-4 sm:p-5 shadow-xs space-y-4 dark:bg-gray-900 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                <History className="w-4 h-4 text-gray-600 dark:text-gray-400" /> Registro Histórico de Sesiones
              </h4>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {filteredData.length} {filteredData.length === 1 ? 'sesión' : 'sesiones'}
              </span>
            </div>

            <div className="overflow-hidden border border-gray-200/80 dark:border-gray-700 rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider dark:bg-gray-800/60 dark:border-gray-700 dark:text-gray-400">
                  <tr>
                    <th className="text-left px-4 py-3">Fecha / Entrenamiento</th>
                    <th className="text-left px-4 py-3 hidden md:table-cell">Series Realizadas</th>
                    {!isBodyweight && <th className="text-right px-4 py-3">Carga Máx</th>}
                    {!isBodyweight && <th className="text-right px-4 py-3">1RM Est.</th>}
                    {isBodyweight && <th className="text-right px-4 py-3">Máx Reps</th>}
                    <th className="text-right px-4 py-3">{isBodyweight ? 'Total Reps' : 'Volumen'}</th>
                    {hasDistData && <th className="text-right px-4 py-3">Distancia</th>}
                    {hasTimeData && <th className="text-right px-4 py-3">Tiempo</th>}
                    {hasRpeData && <th className="text-right px-4 py-3 hidden sm:table-cell">RPE Ø</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-900">
                  {filteredData
                    .slice()
                    .reverse()
                    .map((session, i) => {
                      const isPR = !isBodyweight && session.maxWeight === stats.bestMaxWeight;
                      const is1RMPeak = !isBodyweight && session.estimated1RM === stats.best1RM;
                      const isRepsPR = isBodyweight && session.maxReps === stats.bestMaxReps;
                      // chronoPRs está en orden cronológico; la tabla va al revés
                      const chronoIdx = filteredData.length - 1 - i;
                      const isChronoPR = !!chronoPRs[chronoIdx];

                      return (
                        <tr key={i} className="hover:bg-purple-50/20 dark:hover:bg-purple-900/20 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm flex items-center gap-1.5 flex-wrap">
                              {session.workoutName}
                              {isChronoPR && <span title="Batió el récord hasta entonces">🏆</span>}
                              {session.isDraft && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800">
                                  BORRADOR
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(session.date).toLocaleDateString('es-ES', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </p>
                          </td>

                          <td className="px-4 py-3 hidden md:table-cell">
                            <div className="flex flex-wrap gap-1">
                              {session.sets.map((s, idx) => {
                                const parts: string[] = [];
                                if (s.weight > 0 && s.reps > 0) parts.push(`${s.weight}kg × ${s.reps}`);
                                else if (s.weight > 0) parts.push(`${s.weight}kg`);
                                else if (s.reps > 0) parts.push(`${s.reps} reps`);
                                if (s.distance) parts.push(`${s.distance}m`);
                                if (s.durationSeconds) parts.push(formatDuration(s.durationSeconds));
                                return (
                                <span
                                  key={idx}
                                  className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-medium tabular-nums dark:bg-gray-800 dark:text-gray-300"
                                >
                                  {parts.join(' · ') || '—'}
                                </span>
                                );
                              })}
                            </div>
                          </td>

                          {!isBodyweight && (
                            <td className="px-4 py-3 text-right">
                              <span className="font-bold text-gray-900 dark:text-gray-100 tabular-nums">{session.maxWeight} kg</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400 block">x {session.maxReps} reps</span>
                            </td>
                          )}

                          {!isBodyweight && (
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <span className="font-bold text-purple-700 dark:text-purple-400 tabular-nums">
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
                                <span className="font-bold text-purple-700 dark:text-purple-400 tabular-nums">
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

                          <td className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400 tabular-nums">
                            {isBodyweight
                              ? `${session.totalReps ?? 0} reps`
                              : `${session.totalVolume.toLocaleString('es-ES')} kg`}
                          </td>
                          {hasDistData && (
                            <td className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400 tabular-nums">
                              {(session.totalDistance || 0) > 0 ? `${(session.totalDistance || 0).toLocaleString('es-ES')} m` : '—'}
                            </td>
                          )}
                          {hasTimeData && (
                            <td className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400 tabular-nums">
                              {(session.totalDurationSeconds || 0) > 0 ? formatDuration(session.totalDurationSeconds || 0) : '—'}
                            </td>
                          )}
                          {hasRpeData && (
                            <td className="px-4 py-3 text-right hidden sm:table-cell">
                              <span className={`font-bold tabular-nums ${
                                session.avgRpe != null && session.avgRpe >= 8
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : session.avgRpe != null
                                  ? 'text-gray-700 dark:text-gray-300'
                                  : 'text-gray-300 dark:text-gray-600'
                              }`}>
                                {session.avgRpe != null ? session.avgRpe.toFixed(1) : '—'}
                              </span>
                            </td>
                          )}
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