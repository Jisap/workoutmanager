'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Scale,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  Trash2,
  History,
  Ruler,
  Loader2,
  Pencil,
  Weight,
} from 'lucide-react';
import {
  logBodyMeasurement,
  deleteBodyMeasurement,
  updateBodyMeasurement,
  type BodyMeasurementDTO,
} from './measurements-actions';
import { notify } from '@/lib/notify';

type CorporalMetric =
  | 'weightKg'
  | 'bodyFatPct'
  | 'muscleMassKg'
  | 'waistCm'
  | 'chestCm'
  | 'armCm'
  | 'thighCm'
  | 'hipCm';

interface MetricDef {
  id: CorporalMetric;
  label: string;
  short: string;
  unit: string;
  decimals: number;
  goodWhen: 'up' | 'down' | 'neutral';
}

const METRICS: MetricDef[] = [
  { id: 'weightKg', label: 'Peso corporal', short: 'Peso', unit: 'kg', decimals: 1, goodWhen: 'neutral' },
  { id: 'bodyFatPct', label: '% Grasa corporal', short: 'Grasa', unit: '%', decimals: 1, goodWhen: 'down' },
  { id: 'muscleMassKg', label: 'Masa muscular', short: 'Músculo', unit: 'kg', decimals: 1, goodWhen: 'up' },
  { id: 'waistCm', label: 'Cintura', short: 'Cintura', unit: 'cm', decimals: 1, goodWhen: 'down' },
  { id: 'chestCm', label: 'Pecho', short: 'Pecho', unit: 'cm', decimals: 1, goodWhen: 'neutral' },
  { id: 'armCm', label: 'Brazo', short: 'Brazo', unit: 'cm', decimals: 1, goodWhen: 'up' },
  { id: 'thighCm', label: 'Muslo', short: 'Muslo', unit: 'cm', decimals: 1, goodWhen: 'up' },
  { id: 'hipCm', label: 'Cadera', short: 'Cadera', unit: 'cm', decimals: 1, goodWhen: 'neutral' },
];

function bmiCategory(bmi: number): { label: string; className: string } {
  if (bmi < 18.5) return { label: 'Por debajo', className: 'text-sky-600 dark:text-sky-400' };
  if (bmi < 25) return { label: 'Saludable', className: 'text-emerald-600 dark:text-emerald-400' };
  if (bmi < 30) return { label: 'Sobrepeso', className: 'text-amber-600 dark:text-amber-400' };
  return { label: 'Obesidad', className: 'text-rose-600 dark:text-rose-400' };
}

export function ProgressCorporal({
  measurements,
  trainingVolume = [],
}: {
  measurements: BodyMeasurementDTO[];
  trainingVolume?: { date: string; volume: number }[];
}) {
  const router = useRouter();
  const [metricId, setMetricId] = useState<CorporalMetric>('weightKg');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Métricas con al menos un dato (para no ofrecer curvas vacías)
  const availableMetrics = useMemo(
    () => METRICS.filter((m) => measurements.some((r) => r[m.id] != null)),
    [measurements]
  );
  const metric: MetricDef = METRICS.find((m) => m.id === metricId) ?? METRICS[0];
  const activeMetric: MetricDef =
    availableMetrics.some((m) => m.id === metric.id) ? metric : (availableMetrics[0] ?? METRICS[0]);

  const points = useMemo(() => {
    return measurements
      .filter((r) => r[activeMetric.id] != null)
      .map((r) => ({ date: new Date(r.measuredAt), val: r[activeMetric.id] as number, id: r.id }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [measurements, activeMetric]);

  const stats = useMemo(() => {
    if (points.length === 0) return null;
    const vals = points.map((p) => p.val);
    const current = vals[vals.length - 1];
    const first = vals[0];
    return {
      current,
      diff: current - first,
      min: Math.min(...vals),
      max: Math.max(...vals),
      count: points.length,
    };
  }, [points]);

  // IMC con el último peso y la última altura registrados (pueden venir de registros distintos)
  const bmi = useMemo(() => {
    const lastW = [...measurements].reverse().find((r) => r.weightKg != null);
    const lastH = [...measurements].reverse().find((r) => r.heightCm != null);
    if (!lastW?.weightKg || !lastH?.heightCm || lastH.heightCm <= 0) return null;
    const m = lastH.heightCm / 100;
    return { value: lastW.weightKg / (m * m), date: lastW.measuredAt };
  }, [measurements]);

  // ─── Geometría del gráfico ───
  const svgWidth = 720;
  const svgHeight = 260;
  const padLeft = 60;
  const padRight = 24;
  const padTop = 20;
  const padBottom = 45;
  const chartWidth = svgWidth - padLeft - padRight;
  const chartHeight = svgHeight - padTop - padBottom;

  const yRange = useMemo(() => {
    if (!stats) return { lo: 0, hi: 1 };
    const span = Math.max(stats.max - stats.min, Math.abs(stats.max) * 0.05 || 1);
    return { lo: Math.max(0, stats.min - span * 0.3), hi: stats.max + span * 0.3 };
  }, [stats]);

  const chartPoints = useMemo(() => {
    const { lo, hi } = yRange;
    const range = Math.max(1e-9, hi - lo);
    return points.map((p, i) => ({
      ...p,
      x: points.length === 1 ? padLeft + chartWidth / 2 : padLeft + (i / Math.max(1, points.length - 1)) * chartWidth,
      y: padTop + chartHeight - ((p.val - lo) / range) * chartHeight,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, yRange]);

  const lineD = chartPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const bottomY = padTop + chartHeight;
  const areaD =
    chartPoints.length > 1
      ? `${lineD} L ${chartPoints[chartPoints.length - 1].x.toFixed(1)} ${bottomY} L ${chartPoints[0].x.toFixed(1)} ${bottomY} Z`
      : '';

  const yTicks = useMemo(() => {
    const { lo, hi } = yRange;
    return Array.from({ length: 5 }, (_, i) => {
      const val = lo + ((hi - lo) * i) / 4;
      const y = padTop + chartHeight - (i / 4) * chartHeight;
      return { val, y };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yRange]);

  const fmt = (v: number) => `${v.toFixed(activeMetric.decimals)} ${activeMetric.unit}`;
  const diffIsGood =
    stats && stats.diff !== 0
      ? activeMetric.goodWhen === 'neutral'
        ? null
        : activeMetric.goodWhen === 'up'
          ? stats.diff > 0
          : stats.diff < 0
      : null;

  // ─── Formulario de registro ───
  const todayStr = new Date().toISOString().split('T')[0];
  const [formDate, setFormDate] = useState(todayStr);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [formNotes, setFormNotes] = useState('');
  // Edición (informe §5: antes solo borrar+recrear) y modo rápido Solo peso
  const [editingId, setEditingId] = useState<number | null>(null);
  const [quickWeight, setQuickWeight] = useState(false);

  const openDialog = () => {
    // Pre-rellenar altura con la última conocida (casi nunca cambia)
    const lastH = [...measurements].reverse().find((r) => r.heightCm != null);
    setEditingId(null);
    setQuickWeight(false);
    setFormDate(todayStr);
    setFormValues(lastH?.heightCm != null ? { heightCm: String(lastH.heightCm) } : {});
    setFormNotes('');
    setIsDialogOpen(true);
  };

  const openEditDialog = (m: BodyMeasurementDTO) => {
    setEditingId(m.id);
    setQuickWeight(false);
    setFormDate(new Date(m.measuredAt).toISOString().split('T')[0]);
    const vals: Record<string, string> = {};
    for (const k of ['weightKg', 'heightCm', 'bodyFatPct', 'muscleMassKg', 'waistCm', 'chestCm', 'armCm', 'thighCm', 'hipCm'] as const) {
      if (m[k] != null) vals[k] = String(m[k]);
    }
    setFormValues(vals);
    setFormNotes(m.notes ?? '');
    setIsDialogOpen(true);
  };

  const setField = (key: string, val: string) => setFormValues((prev) => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    const num = (key: string): number | null => {
      const raw = (formValues[key] || '').replace(',', '.').trim();
      if (!raw) return null;
      const n = parseFloat(raw);
      return isNaN(n) || n < 0 ? null : n;
    };
    setIsSaving(true);
    try {
      const payload = {
        measuredAt: formDate ? new Date(`${formDate}T12:00:00`).toISOString() : undefined,
        weightKg: num('weightKg'),
        // En modo Solo peso solo viajan peso+notas (rápido en el gimnasio)
        heightCm: quickWeight ? null : num('heightCm'),
        bodyFatPct: quickWeight ? null : num('bodyFatPct'),
        muscleMassKg: quickWeight ? null : num('muscleMassKg'),
        waistCm: quickWeight ? null : num('waistCm'),
        chestCm: quickWeight ? null : num('chestCm'),
        armCm: quickWeight ? null : num('armCm'),
        thighCm: quickWeight ? null : num('thighCm'),
        hipCm: quickWeight ? null : num('hipCm'),
        notes: formNotes || null,
      };
      if (editingId != null) {
        await updateBodyMeasurement(editingId, payload);
        notify.success('Medición actualizada');
      } else {
        await logBodyMeasurement(payload);
        notify.success('Medición guardada');
      }
      setIsDialogOpen(false);
      setEditingId(null);
      router.refresh();
    } catch (e) {
      notify.errorFrom(e, editingId != null ? 'Error al actualizar la medición' : 'Error al guardar la medición');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (confirmDeleteId == null) return;
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    setDeletingId(id);
    try {
      await deleteBodyMeasurement(id);
      router.refresh();
      notify.success('Medición eliminada');
    } catch (e) {
      notify.errorFrom(e, 'Error al eliminar la medición');
    } finally {
      setDeletingId(null);
    }
  };

  // ─── Correlación peso ↔ volumen entrenado (últimos 30 días) ───
  // Lectura orientativa: ¿el cuerpo y el rendimiento van en la misma dirección?
  const correlation = useMemo(() => {
    const DAY = 24 * 60 * 60 * 1000;
    const now = new Date().getTime();
    const weights = measurements
      .filter((r) => r.weightKg != null)
      .map((r) => ({ t: new Date(r.measuredAt).getTime(), v: r.weightKg as number }))
      .sort((a, b) => a.t - b.t);
    let deltaW: number | null = null;
    if (weights.length >= 2) {
      const last = weights[weights.length - 1];
      const older = weights.filter((w) => w.t <= now - 30 * DAY);
      const ref = older.length > 0 ? older[older.length - 1] : weights[0];
      if (ref.t !== last.t) deltaW = Math.round((last.v - ref.v) * 10) / 10;
    }

    const recentVol = trainingVolume
      .filter((w) => new Date(w.date).getTime() >= now - 30 * DAY)
      .reduce((a, w) => a + (w.volume || 0), 0);
    const prevVol = trainingVolume
      .filter((w) => {
        const t = new Date(w.date).getTime();
        return t >= now - 60 * DAY && t < now - 30 * DAY;
      })
      .reduce((a, w) => a + (w.volume || 0), 0);
    const volPct = prevVol > 0 ? Math.round(((recentVol - prevVol) / prevVol) * 100) : null;

    if (deltaW == null || volPct == null) {
      return { deltaW, volPct, verdict: null as string | null, tone: 'neutral' as const };
    }
    const wUp = deltaW >= 0.5;
    const wDown = deltaW <= -0.5;
    const vUp = volPct >= 5;
    const vDown = volPct <= -5;

    let verdict: string;
    let tone: 'good' | 'warn' | 'neutral' = 'neutral';
    if (!wUp && !wDown && vUp) {
      verdict = 'Peso estable con más trabajo: posible recomposición (misma báscula, más rendimiento).';
      tone = 'good';
    } else if (!wUp && !wDown && !vUp && !vDown) {
      verdict = 'Todo estable: peso y trabajo en mantenimiento.';
    } else if (!wUp && !wDown && vDown) {
      verdict = 'Peso estable pero con menos trabajo: vigila la adherencia al plan.';
      tone = 'warn';
    } else if (wUp && vUp) {
      verdict = 'Ganancia alineada con el entreno: el peso acompaña al aumento de trabajo.';
      tone = 'good';
    } else if (wUp) {
      verdict = 'El peso sube sin más trabajo: revisa dieta, descanso y NEAT antes de asumir que es músculo.';
      tone = 'warn';
    } else if (vDown) {
      verdict = 'Peso y trabajo a la baja: posible exceso de déficit o fatiga acumulada.';
      tone = 'warn';
    } else {
      verdict = 'Definición manteniendo rendimiento: el peso baja sin perder trabajo. Buena señal.';
      tone = 'good';
    }
    return { deltaW, volPct, verdict, tone };
  }, [measurements, trainingVolume]);

  const reversed = [...measurements].reverse();

  return (
    <div className="space-y-6">
      {/* ─── KPIs ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-blue-600" />
              Peso Actual
            </span>
            <p className="text-2xl font-black text-gray-900 dark:text-gray-100 tabular-nums">
              {(() => {
                const last = [...measurements].reverse().find((r) => r.weightKg != null);
                return last?.weightKg != null ? (
                  <>{last.weightKg.toFixed(1)} <span className="text-xs font-bold text-blue-600">kg</span></>
                ) : (
                  '—'
                );
              })()}
            </p>
            <p className="text-[11px] text-gray-400">último registro de peso</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              IMC Estimado
            </span>
            <p className="text-2xl font-black text-gray-900 dark:text-gray-100 tabular-nums">
              {bmi ? bmi.value.toFixed(1) : '—'}
            </p>
            <p className="text-[11px] text-gray-400">
              {bmi ? <span className={`font-bold ${bmiCategory(bmi.value).className}`}>{bmiCategory(bmi.value).label}</span> : 'Registra peso + altura'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <Ruler className="w-3.5 h-3.5 text-purple-600" />
              % Grasa Actual
            </span>
            <p className="text-2xl font-black text-gray-900 dark:text-gray-100 tabular-nums">
              {(() => {
                const last = [...measurements].reverse().find((r) => r.bodyFatPct != null);
                return last?.bodyFatPct != null ? (
                  <>{last.bodyFatPct.toFixed(1)}<span className="text-xs font-bold text-purple-600">%</span></>
                ) : (
                  '—'
                );
              })()}
            </p>
            <p className="text-[11px] text-gray-400">último registro de composición</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-amber-600" />
              Mediciones
            </span>
            <p className="text-2xl font-black text-gray-900 dark:text-gray-100 tabular-nums">{measurements.length}</p>
            <p className="text-[11px] text-gray-400">registros voluntarios totales</p>
          </CardContent>
        </Card>
      </div>

      {/* ─── CORRELACIÓN PESO ↔ VOLUMEN (últimos 30 días) ─── */}
      <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
        <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40">
          <CardTitle className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-sky-600" />
            Peso vs Volumen Entrenado
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 space-y-3">
          {correlation.verdict == null ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Necesitas al menos 2 registros de peso y volumen entrenado en los últimos 60 días para la lectura.
              Registra tu peso cada semana y entrena con regularidad: aquí aparecerá si tu cuerpo y tu rendimiento
              van en la misma dirección.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="p-3 rounded-xl bg-sky-50/70 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-800/50 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">Peso (30d)</p>
                  <p className={`text-xl font-black tabular-nums ${correlation.deltaW != null && correlation.deltaW !== 0 ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}`}>
                    {correlation.deltaW != null && correlation.deltaW > 0 ? '+' : ''}{correlation.deltaW?.toFixed(1)} kg
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-800/50 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Volumen (30d vs previos)</p>
                  <p className={`text-xl font-black tabular-nums ${correlation.volPct !== 0 ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}`}>
                    {correlation.volPct != null && correlation.volPct > 0 ? '+' : ''}{correlation.volPct}%
                  </p>
                </div>
              </div>
              <div className={`flex items-start gap-2 p-3 rounded-xl border text-xs ${
                correlation.tone === 'good'
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-200'
                  : correlation.tone === 'warn'
                  ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50 text-amber-900 dark:text-amber-200'
                  : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
              }`}>
                <span className="font-bold">{correlation.verdict}</span>
              </div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">
                Lectura orientativa: el peso fluctúa por agua, glucógeno y digestiones. Valora tendencias de varias
                semanas, no un dato aislado.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {measurements.length === 0 ? (
        <Card className="border-dashed bg-gray-50/50 dark:bg-gray-800/30">
          <CardContent className="py-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto dark:bg-blue-900/30 dark:text-blue-400">
              <Scale className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Sin mediciones todavía</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                Registra tu peso, % de grasa, masa muscular y perímetros cuando quieras (p. ej. una vez por semana,
                siempre en ayunas). Con 2 o más registros verás aquí tu curva de evolución.
              </p>
            </div>
            <Button onClick={openDialog} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold gap-1.5">
              <Plus className="w-4 h-4" /> Registrar primera medición
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ─── GRÁFICA DE EVOLUCIÓN ─── */}
          <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
            <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <CardTitle className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  Evolución Corporal
                </CardTitle>
                <Button onClick={openDialog} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold gap-1.5 self-start sm:self-auto">
                  <Plus className="w-3.5 h-3.5" /> Nueva medición
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-4">
              {/* Selector de métrica */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {METRICS.map((m) => {
                  const hasData = availableMetrics.some((a) => a.id === m.id);
                  const isActive = activeMetric.id === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      disabled={!hasData}
                      onClick={() => setMetricId(m.id)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                        isActive
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : hasData
                          ? 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-300'
                          : 'bg-gray-50 dark:bg-gray-800/50 text-gray-300 dark:text-gray-600 border-gray-100 dark:border-gray-800 cursor-not-allowed'
                      }`}
                    >
                      {m.short}
                    </button>
                  );
                })}
              </div>

              {stats && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-black text-gray-900 dark:text-gray-100 tabular-nums">
                    Actual: {fmt(stats.current)}
                  </span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 ${
                      stats.diff === 0 || diffIsGood === null
                        ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        : diffIsGood
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                    }`}
                  >
                    {stats.diff === 0 ? (
                      <><Minus className="w-3 h-3" /> sin cambios</>
                    ) : stats.diff > 0 ? (
                      <><TrendingUp className="w-3 h-3" /> +{(stats.diff).toFixed(activeMetric.decimals)} {activeMetric.unit}</>
                    ) : (
                      <><TrendingDown className="w-3 h-3" /> {(stats.diff).toFixed(activeMetric.decimals)} {activeMetric.unit}</>
                    )}
                  </span>
                  <span className="text-[11px] text-gray-400">
                    {stats.count} {stats.count === 1 ? 'registro' : 'registros'} · mín {fmt(stats.min)} · máx {fmt(stats.max)}
                  </span>
                </div>
              )}

              {/* SVG */}
              <div className="overflow-x-auto">
                <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto min-w-[520px]">
                  <defs>
                    <linearGradient id="corporalGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  {yTicks.map((t, i) => (
                    <g key={i}>
                      <line
                        x1={padLeft}
                        y1={t.y}
                        x2={svgWidth - padRight}
                        y2={t.y}
                        stroke="currentColor"
                        className="text-gray-200 dark:text-gray-800"
                        strokeWidth={1}
                        strokeDasharray={i === 0 ? '0' : '4,4'}
                      />
                      <text
                        x={padLeft - 8}
                        y={t.y + 3.5}
                        textAnchor="end"
                        className="fill-gray-400 dark:fill-gray-500 font-mono text-[10px]"
                      >
                        {t.val.toFixed(activeMetric.decimals)}
                      </text>
                    </g>
                  ))}
                  {chartPoints.map((p, i) => {
                    const show =
                      chartPoints.length <= 8 ||
                      i === 0 ||
                      i === chartPoints.length - 1 ||
                      i % Math.ceil(chartPoints.length / 7) === 0;
                    return show ? (
                      <text
                        key={p.id}
                        x={p.x}
                        y={svgHeight - 12}
                        textAnchor="middle"
                        className="fill-gray-400 dark:fill-gray-500 text-[10px] font-medium"
                      >
                        {p.date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </text>
                    ) : null;
                  })}
                  {areaD && <path d={areaD} fill="url(#corporalGradient)" />}
                  {lineD && chartPoints.length > 1 && (
                    <path
                      d={lineD}
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                  {chartPoints.map((p, i) => (
                    <g
                      key={`pt-${p.id}`}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredIndex(i)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      onClick={() => setHoveredIndex((prev) => (prev === i ? null : i))}
                    >
                      <circle cx={p.x} cy={p.y} r="16" fill="transparent" />
                      {(hoveredIndex === i || (hoveredIndex === null && i === chartPoints.length - 1)) && (
                        <circle cx={p.x} cy={p.y} r="8" fill="#2563eb" opacity="0.25" />
                      )}
                      <circle cx={p.x} cy={p.y} r={hoveredIndex === i ? 5 : 4} fill="#2563eb" stroke="white" strokeWidth={2} />
                    </g>
                  ))}
                </svg>
                {(() => {
                  const idx = hoveredIndex ?? chartPoints.length - 1;
                  const pt = chartPoints[idx];
                  if (!pt) return null;
                  return (
                    <div className="bg-gray-900 text-white dark:bg-gray-800 border border-gray-700 rounded-xl p-2.5 text-xs mt-2 max-w-xs">
                      <p className="font-bold font-mono text-sm tabular-nums">{fmt(pt.val)}</p>
                      <p className="text-[10px] text-gray-400">
                        {pt.date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  );
                })()}
              </div>
            </CardContent>
          </Card>

          {/* ─── HISTORIAL ─── */}
          <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
            <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40">
              <CardTitle className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <History className="w-4 h-4 text-gray-500" />
                Historial de Mediciones
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              <div className="overflow-x-auto border border-gray-200/80 dark:border-gray-700 rounded-xl">
                <table className="w-full text-sm min-w-[640px]">
                  <thead className="bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider dark:bg-gray-800/60 dark:border-gray-700 dark:text-gray-400">
                    <tr>
                      <th className="text-left px-4 py-3">Fecha</th>
                      <th className="text-right px-3 py-3">Peso</th>
                      <th className="text-right px-3 py-3">Grasa</th>
                      <th className="text-right px-3 py-3">Músculo</th>
                      <th className="text-right px-3 py-3">Cintura</th>
                      <th className="text-right px-3 py-3">Pecho</th>
                      <th className="text-right px-3 py-3">Brazo</th>
                      <th className="text-right px-3 py-3">Muslo</th>
                      <th className="text-right px-3 py-3">Cadera</th>
                      <th className="text-right px-3 py-3"><span className="sr-only">Acciones</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-900">
                    {reversed.map((r) => (
                      <tr key={r.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-colors">
                        <td className="px-4 py-2.5 text-xs font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                          {new Date(r.measuredAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {r.notes && <p className="text-[10px] font-normal text-gray-400 truncate max-w-[140px]">{r.notes}</p>}
                        </td>
                        {([r.weightKg && `${r.weightKg.toFixed(1)}`, r.bodyFatPct && `${r.bodyFatPct.toFixed(1)}%`, r.muscleMassKg && `${r.muscleMassKg.toFixed(1)}`, r.waistCm && `${r.waistCm.toFixed(1)}`, r.chestCm && `${r.chestCm.toFixed(1)}`, r.armCm && `${r.armCm.toFixed(1)}`, r.thighCm && `${r.thighCm.toFixed(1)}`, r.hipCm && `${r.hipCm.toFixed(1)}`] as (string | false | null | undefined)[]).map((v, ci) => (
                          <td key={ci} className="px-3 py-2.5 text-right text-xs font-mono tabular-nums text-gray-700 dark:text-gray-300">
                            {v || <span className="text-gray-300 dark:text-gray-600">—</span>}
                          </td>
                        ))}
                        <td className="px-3 py-2.5 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => openEditDialog(r)}
                            className="p-1.5 rounded-lg text-gray-300 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer"
                            title="Editar medición"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(r.id)}
                            disabled={deletingId === r.id}
                            className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer disabled:opacity-50"
                            title="Eliminar medición"
                          >
                            {deletingId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ─── DIÁLOGO DE REGISTRO ─── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-blue-600" />
              {editingId != null ? 'Editar medición' : 'Registrar medición'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Solo rellena lo que hayas medido hoy. Con 2+ registros de la misma métrica verás su evolución.
            </p>
            {/* Modo rápido Solo peso (informe §5): báscula en 10 segundos */}
            {editingId == null && (
              <button
                type="button"
                onClick={() => setQuickWeight((v) => !v)}
                className={`w-full flex items-center justify-between gap-2 px-3 h-11 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  quickWeight
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Weight className="w-3.5 h-3.5" />
                  Modo rápido: solo peso
                </span>
                <span className={`w-9 h-5 rounded-full relative transition-colors ${quickWeight ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${quickWeight ? 'left-[18px]' : 'left-0.5'}`} />
                </span>
              </button>
            )}
            <div className="space-y-1.5">
              <Label>Fecha</Label>
              <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="tabular-nums" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { key: 'weightKg', label: 'Peso (kg)', step: '0.1' },
                { key: 'heightCm', label: 'Altura (cm)', step: '0.5' },
                { key: 'bodyFatPct', label: '% Grasa', step: '0.1' },
                { key: 'muscleMassKg', label: 'Músculo (kg)', step: '0.1' },
                { key: 'waistCm', label: 'Cintura (cm)', step: '0.5' },
                { key: 'chestCm', label: 'Pecho (cm)', step: '0.5' },
                { key: 'armCm', label: 'Brazo (cm)', step: '0.1' },
                { key: 'thighCm', label: 'Muslo (cm)', step: '0.5' },
                { key: 'hipCm', label: 'Cadera (cm)', step: '0.5' },
              ]
                .filter((f) => !quickWeight || f.key === 'weightKg')
                .map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <Label className="text-xs">{f.label}</Label>
                  <Input
                    type="number"
                    min="0"
                    step={f.step}
                    inputMode="decimal"
                    placeholder="—"
                    value={formValues[f.key] || ''}
                    onChange={(e) => setField(f.key, e.target.value)}
                    className="tabular-nums text-center font-bold"
                  />
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label>Notas (opcional)</Label>
              <Textarea
                placeholder="Ej: en ayunas, post-competición, con báscula nueva…"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={2}
                className="text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="text-xs">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold gap-1.5">
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : editingId != null ? <Pencil className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {isSaving ? 'Guardando…' : editingId != null ? 'Guardar cambios' : 'Guardar medición'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── DIÁLOGO DE CONFIRMACIÓN DE BORRADO ─── */}
      <Dialog open={confirmDeleteId !== null} onOpenChange={(open) => { if (!open) setConfirmDeleteId(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900 dark:text-gray-100">
              Eliminar medición
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-gray-500 dark:text-gray-400 py-2">
            ¿Eliminar la medición del{' '}
            <strong className="text-gray-700 dark:text-gray-200">
              {(() => {
                const target = measurements.find((m) => m.id === confirmDeleteId);
                return target
                  ? new Date(target.measuredAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
                  : '—';
              })()}
            </strong>
            ? Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)} className="text-xs">
              Cancelar
            </Button>
            <Button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold gap-1.5">
              <Trash2 className="w-3.5 h-3.5" />
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
