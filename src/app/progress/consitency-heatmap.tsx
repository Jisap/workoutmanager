'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useTransitionNavigate } from '@/components/layout/route-transition';
import {
  Flame,
  Calendar as CalendarIcon,
  TrendingUp,
  Clock,
  Dumbbell,
  Play,
  Plus,
  X,
  Layers,
  FileText,
  Sparkles,
  ChevronRight,
  Info,
  Target,
  CalendarClock,
  Repeat2,
  Trash2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export interface SetDetail {
  setNumber: number;
  weight: number | null;
  repCount: number | null;
  rpe: number | null;
  distance: number | null;
  durationSeconds: number | null;
}

export interface HeatmapExercise {
  name: string;
  orderIndex: number;
  sets: SetDetail[];
  maxWeight: number;
  volume: number;
}

export interface HeatmapWorkout {
  id: number;
  name: string;
  notes: string | null;
  startTime: Date | string;
  totalTimeSeconds: number | null;
  typeId: number;
  typeName: string;
  totalVolume: number;
  totalSetsCount: number;
  exercises: HeatmapExercise[];
}

export interface ConsistencyData {
  dailyCounts: Record<string, number>;
  workoutsByDate: Record<string, HeatmapWorkout[]>;
  currentStreak: number;
  longestStreak: number;
  totalWorkouts: number;
  avgPerWeek: number;
}

/** Sesión programada en un día futuro (vive en localStorage `wm_planned`). */
export interface PlannedSession {
  kind: 'free' | 'repeat';
  label: string;
  refId?: number;
}

interface ConsistencyHeatmapProps {
  data: ConsistencyData;
  /** Oculta las 3 tarjetas KPI (el dashboard ya muestra racha/frecuencia arriba). */
  showKpis?: boolean;
}

const LS_WEEKLY_GOAL = 'wm_weekly_goal';

function weekStartKey(d: Date): string {
  const copy = new Date(d);
  const dow = (copy.getDay() + 6) % 7; // lunes = 0
  copy.setDate(copy.getDate() - dow);
  return copy.toISOString().split('T')[0];
}

/** Panel para programar un día futuro: vacío o repitiendo una sesión reciente. */
function FutureDayPanel({
  existing,
  recents,
  onSave,
  onRemove,
  onStart,
}: {
  existing: PlannedSession | null;
  recents: { id: number; name: string; typeName: string }[];
  onSave: (plan: PlannedSession) => void;
  onRemove: () => void;
  onStart: (plan: PlannedSession) => void;
}) {
  const [editing, setEditing] = useState(false);

  if (existing && !editing) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 rounded-2xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/70 dark:bg-blue-950/20 p-4">
          <div className="p-2.5 rounded-xl bg-blue-500 text-white shrink-0">
            <CalendarClock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              Programado
            </p>
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
              {existing.label}
            </p>
          </div>
        </div>
        <Button onClick={() => onStart(existing)} className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl cursor-pointer gap-1.5">
          <Play className="w-4 h-4 fill-current" />
          Empezar ahora
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="h-11 px-3 text-xs rounded-xl flex-1 cursor-pointer">
            Cambiar plan
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="h-11 px-3 text-xs rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Quitar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ScheduleForm recents={recents} initialMode={existing?.kind ?? 'free'} onSave={onSave} submitLabel={existing ? 'Guardar cambio' : 'Programar'} />
  );
}

/** Formulario de programar (vacío o repetir). Modo controlado internamente. */
function ScheduleForm({
  recents,
  initialMode,
  onSave,
  submitLabel,
}: {
  recents: { id: number; name: string; typeName: string }[];
  initialMode: 'free' | 'repeat';
  onSave: (plan: PlannedSession) => void;
  submitLabel: string;
}) {
  const [mode, setMode] = useState<'free' | 'repeat'>(initialMode);
  const [repeatId, setRepeatId] = useState<string>(recents[0] ? String(recents[0].id) : '');

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setMode('free')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${mode === 'free' ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/60 dark:bg-blue-950/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}
        >
          <Dumbbell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <p className="text-xs font-bold text-gray-900 dark:text-gray-100 mt-1.5">Vacío</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">Registrar sobre la marcha</p>
        </button>
        <button
          type="button"
          onClick={() => setMode('repeat')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${mode === 'repeat' ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/60 dark:bg-blue-950/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}
        >
          <Repeat2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <p className="text-xs font-bold text-gray-900 dark:text-gray-100 mt-1.5">Repetir sesión</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">Cargar una ya hecha</p>
        </button>
      </div>

      {mode === 'repeat' && (
        recents.length > 0 ? (
          <select
            value={repeatId}
            onChange={(e) => setRepeatId(e.target.value)}
            className="w-full h-11 px-3 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 cursor-pointer"
          >
            {recents.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} · {r.typeName}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-xs text-gray-500 dark:text-gray-400">Aún no tienes sesiones para repetir.</p>
        )
      )}

      <Button
        onClick={() => {
          if (mode === 'repeat') {
            const target = recents.find((r) => String(r.id) === repeatId);
            if (!target) return;
            onSave({ kind: 'repeat', label: target.name, refId: target.id });
          } else {
            onSave({ kind: 'free', label: 'Entrenamiento libre' });
          }
        }}
        disabled={mode === 'repeat' && !repeatId}
        className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl cursor-pointer gap-1.5"
      >
        <CalendarClock className="w-4 h-4" />
        {submitLabel}
      </Button>
      <p className="text-[11px] text-gray-400 text-center">
        El plan vive en este dispositivo y no crea borradores en tu historial.
      </p>
    </div>
  );
}

export function ConsistencyHeatmap({ data, showKpis = true }: ConsistencyHeatmapProps) {
  const navigate = useTransitionNavigate();

  // Meta semanal (Ajustes → Objetivos, localStorage). Conecta la meta con el
  // mapa (informe §4.3): el heatmap por fin lee `wm_weekly_goal`.
  const [weeklyGoal, setWeeklyGoal] = useState(3);
  useEffect(() => {
    const stored = localStorage.getItem(LS_WEEKLY_GOAL);
    const n = stored ? parseInt(stored, 10) : 3;
    if (!Number.isNaN(n) && n >= 1 && n <= 7) setWeeklyGoal(n);
  }, []);

  // Días entrenados esta semana (lunes-domingo) para el progreso vs meta
  const thisWeekDays = useMemo(() => {
    const monday = weekStartKey(new Date());
    let days = 0;
    for (const [key, count] of Object.entries(data.dailyCounts)) {
      if (count > 0 && weekStartKey(new Date(key)) === monday) days += 1;
    }
    return days;
  }, [data.dailyCounts]);

  // Día seleccionado actualmente para ver detalles en el modal / panel
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // El mapa arranca centrado en hoy (el rango va 182 atrás / 182 adelante)
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // rAF: espera al layout final (fuentes/zoom) para medir bien el ancho
    const raf = requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollLeft = Math.max(0, (el.scrollWidth - el.clientWidth) / 2);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  // Rango centrado en hoy: 182 días atrás + hoy + 182 adelante.
  // Izquierda = lo entrenado, centro = hoy, derecha = lo que queda por entrenar.
  const PAST_DAYS = 182;
  const FUTURE_DAYS = 182;

  const days = useMemo(() => {
    const result = [];
    const today = new Date();
    const todayKeyLocal = today.toISOString().split('T')[0];
    for (let i = PAST_DAYS; i >= -FUTURE_DAYS; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const workouts = data.workoutsByDate?.[dateKey] || [];

      result.push({
        date: d,
        dateKey,
        count: data.dailyCounts[dateKey] || 0,
        workouts,
        isFuture: dateKey > todayKeyLocal,
      });
    }
    return result;
  }, [data.dailyCounts, data.workoutsByDate]);

  // Clave del día de hoy (misma base que `days`) para resaltarlo en el mapa
  const todayKey = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Planes futuros (localStorage `wm_planned`: fecha → qué entrenar).
  // Sin cambios de esquema: programar no crea borradores en el historial.
  const LS_PLANNED = 'wm_planned';
  const [planned, setPlanned] = useState<Record<string, PlannedSession>>({});
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_PLANNED);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, PlannedSession>;
        // Limpieza: sin pasado (los días pasados ya no se programan)
        const now = new Date().toISOString().split('T')[0];
        const cleaned: Record<string, PlannedSession> = {};
        for (const [k, v] of Object.entries(parsed)) {
          if (k >= now && v && (v.kind === 'free' || v.kind === 'repeat')) cleaned[k] = v;
        }
        setPlanned(cleaned);
      }
    } catch {
      // localStorage corrupto: se ignora sin romper el mapa
    }
  }, []);
  const persistPlanned = (next: Record<string, PlannedSession>) => {
    setPlanned(next);
    try {
      localStorage.setItem(LS_PLANNED, JSON.stringify(next));
    } catch {
      // cuota llena o приватный режим: el plan vive al menos en memoria
    }
  };

  // Columnas estilo GitHub: 53 semanas × filas Dom..Sáb. `weeks[col][row]`.
  // Con 182 atrás + hoy + 182 adelante, hoy cae en la columna central (26).
  const weeks = useMemo(() => {
    const leadingBlanks = days.length > 0 ? days[0].date.getDay() : 0;
    const cols: ({ date: Date; dateKey: string; count: number; isFuture: boolean } | null)[][] = [];
    for (let c = 0; c < 53; c++) {
      const col: ({ date: Date; dateKey: string; count: number; isFuture: boolean } | null)[] = [];
      for (let r = 0; r < 7; r++) {
        const idx = c * 7 + r - leadingBlanks;
        col.push(idx >= 0 && idx < days.length ? days[idx] : null);
      }
      cols.push(col);
    }
    return cols;
  }, [days]);

  // Etiqueta de mes por columna (como GitHub: solo cuando cambia el mes)
  const monthLabels = useMemo(() => {
    let prevMonth = -1;
    return weeks.map((col) => {
      const first = col.find((d) => d !== null);
      if (!first) return '';
      const m = first.date.getMonth();
      if (m === prevMonth) return '';
      prevMonth = m;
      return first.date.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');
    });
  }, [weeks]);

  // Escala de 5 niveles como GitHub (claro + oscuro).
  // Futuro: azul punteado si está vacío, azul sólido si hay plan.
  const getColor = (count: number, isSelected: boolean, isFuture = false, isPlanned = false) => {
    if (isSelected) return 'bg-purple-600 ring-2 ring-purple-600 ring-offset-1 z-10';
    if (isFuture) {
      if (isPlanned) return 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-400';
      return 'bg-blue-50 hover:bg-blue-100 border border-dashed border-blue-200 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 dark:border-blue-800/60';
    }
    if (count === 0) return 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700';
    if (count === 1) return 'bg-emerald-200 hover:bg-emerald-300 dark:bg-emerald-950 dark:hover:bg-emerald-900';
    if (count === 2) return 'bg-emerald-400 hover:bg-emerald-500 dark:bg-emerald-800 dark:hover:bg-emerald-700';
    if (count === 3) return 'bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500';
    return 'bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-400 dark:hover:bg-emerald-300';
  };

  const selectedDayData = useMemo(() => {
    if (!selectedDateKey) return null;
    const dayObj = days.find((d) => d.dateKey === selectedDateKey);
    const workouts = data.workoutsByDate?.[selectedDateKey] || [];
    return {
      dateKey: selectedDateKey,
      date: dayObj ? dayObj.date : new Date(selectedDateKey),
      workouts,
      isFuture: selectedDateKey > todayKey,
    };
  }, [selectedDateKey, days, data.workoutsByDate, todayKey]);

  // Sesiones recientes para "repetir" al programar (únicas, ordenadas)
  const recentOptions = useMemo(() => {
    const map = new Map<number, { id: number; name: string; typeName: string; startTime: Date | string }>();
    for (const list of Object.values(data.workoutsByDate ?? {})) {
      for (const w of list) {
        if (!map.has(w.id)) {
          map.set(w.id, { id: w.id, name: w.name, typeName: w.typeName, startTime: w.startTime });
        }
      }
    }
    return Array.from(map.values())
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      .slice(0, 15);
  }, [data.workoutsByDate]);

  const handleDayClick = (dateKey: string) => {
    setSelectedDateKey(dateKey);
    setIsModalOpen(true);
  };

  const handleRepeatWorkout = (workoutId: number) => {
    setIsModalOpen(false);
    navigate(`/workouts/log?mode=repeat&workoutId=${workoutId}`);
  };

  const handleStartNewWorkout = () => {
    setIsModalOpen(false);
    navigate('/workouts/log?mode=free');
  };

  // Programar: guarda el plan en localStorage (sin tocar el historial)
  const handleSavePlan = (plan: PlannedSession) => {
    if (!selectedDateKey) return;
    persistPlanned({ ...planned, [selectedDateKey]: plan });
    setIsModalOpen(false);
  };

  const handleRemovePlan = () => {
    if (!selectedDateKey) return;
    const next = { ...planned };
    delete next[selectedDateKey];
    persistPlanned(next);
    setIsModalOpen(false);
  };

  const handleStartPlan = (plan: PlannedSession) => {
    setIsModalOpen(false);
    if (plan.kind === 'repeat' && plan.refId) {
      navigate(`/workouts/log?mode=repeat&workoutId=${plan.refId}`);
    } else {
      navigate('/workouts/log?mode=free');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. KPIs DE CONSISTENCIA (ocultos en dashboard: ya tiene sus stat cards) */}
      {showKpis && (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-orange-200/90 bg-orange-50/70 shadow-2xs dark:border-orange-800/60 dark:bg-orange-950/40">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-orange-100 rounded-2xl text-orange-600 shadow-inner dark:bg-orange-900/30 dark:text-orange-400">
              <Flame className="w-6 h-6" />
            </div>

            <div>
              <p className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">Racha Actual</p>
              <p className="text-2xl font-black text-gray-900 dark:text-gray-100 tabular-nums">
                {data.currentStreak} <span className="text-sm font-medium text-gray-500 dark:text-gray-400">días seguidos</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200/90 bg-blue-50/70 shadow-2xs dark:border-blue-800/60 dark:bg-blue-950/40">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-2xl text-blue-600 shadow-inner dark:bg-blue-900/30 dark:text-blue-400">
              <TrendingUp className="w-6 h-6" />
            </div>

            <div>
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Racha Más Larga</p>
              <p className="text-2xl font-black text-gray-900 dark:text-gray-100 tabular-nums">
                {data.longestStreak} <span className="text-sm font-medium text-gray-500 dark:text-gray-400">días récord</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200/90 bg-purple-50/70 shadow-2xs dark:border-purple-800/60 dark:bg-purple-950/40">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-2xl text-purple-600 shadow-inner dark:bg-purple-900/30 dark:text-purple-400">
              <CalendarIcon className="w-6 h-6" />
            </div>

            <div>
              <p className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Frecuencia Semanal</p>
              <p className="text-2xl font-black text-gray-900 dark:text-gray-100 tabular-nums">
                {data.avgPerWeek} <span className="text-sm font-medium text-gray-500 dark:text-gray-400">días / semana</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      )}

      {/* 2. HEATMAP GRID INTERACTIVO ESTILO GITHUB */}
      <Card className="border-gray-200/90 shadow-xs dark:bg-gray-900 dark:border-gray-700">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" /> Mapa de Actividad (6 meses atrás y adelante)
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Hoy está en el centro: a la izquierda lo entrenado, a la derecha lo que queda por entrenar (tócalo para programar).
            </p>
          </div>

          {/* Meta semanal (informe §4.3): progreso lunes-domingo vs tu objetivo */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl border border-blue-100 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-950/20 px-3 py-2.5">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Target className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <p className="text-xs text-gray-700 dark:text-gray-300">
                <span className="font-bold tabular-nums">
                  Esta semana: {thisWeekDays} de {weeklyGoal} días
                </span>
                {thisWeekDays >= weeklyGoal ? (
                  <span className="ml-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                    ¡Meta cumplida! 🎉
                  </span>
                ) : (
                  <span className="ml-1.5 text-gray-500 dark:text-gray-400">
                    te faltan {weeklyGoal - thisWeekDays}
                  </span>
                )}
              </p>
            </div>
            <div
              className="h-2 rounded-full bg-blue-100 dark:bg-blue-900/40 overflow-hidden sm:w-40"
              role="progressbar"
              aria-valuenow={Math.min(thisWeekDays, weeklyGoal)}
              aria-valuemax={weeklyGoal}
              aria-label="Progreso de la meta semanal"
            >
              <div
                className={`h-full rounded-full transition-all ${thisWeekDays >= weeklyGoal ? 'bg-emerald-500' : 'bg-blue-500'}`}
                style={{ width: `${Math.min(100, (thisWeekDays / Math.max(1, weeklyGoal)) * 100)}%` }}
              />
            </div>
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline shrink-0 cursor-pointer"
            >
              Ajustar meta →
            </button>
          </div>

          {/* Grid estilo GitHub: meses arriba, días a la izquierda,
              pasado a la izquierda y hoy a la derecha */}
          <div ref={scrollRef} className="overflow-x-auto pb-2">
            {/* w-max + mx-auto: centrado si cabe, scroll normal si desborda */}
            <div className="mx-auto w-max p-1">
              {/* Etiquetas de mes */}
              <div className="flex gap-[3px] mb-1 ml-[30px]" aria-hidden>
                {monthLabels.map((label, c) => (
                  <span
                    key={c}
                    className="w-3 shrink-0 overflow-visible whitespace-nowrap text-[10px] text-gray-500 dark:text-gray-400 capitalize"
                  >
                    {label}
                  </span>
                ))}
              </div>
              <div className="flex gap-[3px]">
                {/* Etiquetas de día (Lun/Mié/Vie como GitHub) */}
                <div className="flex flex-col gap-[3px] mr-1 shrink-0" aria-hidden>
                  {['', 'lun', '', 'mié', '', 'vie', ''].map((label, r) => (
                    <span
                      key={r}
                      className="h-3 flex items-center text-[9px] text-gray-500 dark:text-gray-400"
                    >
                      {label}
                    </span>
                  ))}
                </div>
                {weeks.map((col, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-[3px]">
                    {col.map((day, dayIndex) => {
                      if (!day) return <div key={dayIndex} className="w-3 h-3 rounded-[3px]" />;

                      const isSelected = selectedDateKey === day.dateKey;
                      const isToday = day.dateKey === todayKey;
                      const isPlanned = day.isFuture && !!planned[day.dateKey];

                      return (
                        <button
                          key={dayIndex}
                          type="button"
                          onClick={() => handleDayClick(day.dateKey)}
                          className={`w-3 h-3 rounded-[3px] ${getColor(
                            day.count,
                            isSelected,
                            day.isFuture,
                            isPlanned
                          )} ${isToday && !isSelected ? 'ring-1 ring-blue-500 ring-offset-1 dark:ring-offset-gray-900' : ''} transition-all active:scale-90 cursor-pointer relative group focus:outline-none`}
                          aria-label={`${day.date.toLocaleDateString('es-ES')}: ${day.isFuture ? (isPlanned ? `programado (${planned[day.dateKey]?.label})` : 'día futuro') : `${day.count} entrenamiento(s)`}`}
                        >
                          {/* Tooltip flotante al pasar el cursor */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-30 pointer-events-none">
                            <div className="bg-gray-900 text-white text-xs rounded-xl px-3 py-1.5 whitespace-nowrap shadow-xl dark:bg-gray-700 dark:text-gray-100 dark:border dark:border-gray-600">
                              {day.isFuture ? (
                                <>
                                  <span className="font-bold">
                                    {isPlanned ? `📅 ${planned[day.dateKey]?.label}` : 'Día futuro'}
                                  </span>
                                  <span className="block text-blue-300 text-[11px] font-semibold">
                                    {isPlanned ? 'Toca para ver el plan →' : 'Toca para programar →'}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span className="font-bold">
                                    {day.count === 0
                                      ? 'Sin entrenamientos'
                                      : `${day.count} ${day.count === 1 ? 'entrenamiento' : 'entrenamientos'}`}
                                  </span>
                                  <span className="block text-gray-300 dark:text-gray-300 text-[11px]">
                                    {day.date.toLocaleDateString('es-ES', {
                                      weekday: 'short',
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                    })}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 text-xs text-gray-400 dark:text-gray-500 pt-1 border-t border-gray-100 dark:border-gray-800">
            <span>{data.totalWorkouts} días activos en total</span>
            <span className="flex items-center gap-1">
              Menos
              <span className="w-3 h-3 rounded-[3px] bg-gray-100 dark:bg-gray-800" />
              <span className="w-3 h-3 rounded-[3px] bg-emerald-200 dark:bg-emerald-950" />
              <span className="w-3 h-3 rounded-[3px] bg-emerald-400 dark:bg-emerald-800" />
              <span className="w-3 h-3 rounded-[3px] bg-emerald-600 dark:bg-emerald-600" />
              <span className="w-3 h-3 rounded-[3px] bg-emerald-800 dark:bg-emerald-400" />
              Más
              <span className="w-3 h-3 rounded-[3px] bg-blue-50 border border-dashed border-blue-300 dark:bg-blue-950/30 dark:border-blue-800/60 ml-2" />
              Futuro
              <span className="w-3 h-3 rounded-[3px] bg-blue-500" />
              Programado
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 3. MODAL / DIALOG DETALLADO DEL DÍA SELECCIONADO */}
      {isModalOpen && selectedDayData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 dark:bg-gray-900 dark:border-gray-700 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header del Modal */}
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/80 dark:bg-gray-800/60">
              <div className="space-y-0.5">
                {selectedDayData.isFuture ? (
                  <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CalendarClock className="w-3.5 h-3.5" /> Programar entreno
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CalendarIcon className="w-3.5 h-3.5" /> Detalle del Día
                  </span>
                )}

                <h3 className="font-bold text-base text-gray-900 dark:text-gray-100 capitalize">
                  {selectedDayData.date.toLocaleDateString('es-ES', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </h3>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {selectedDayData.isFuture ? (
                /* Caso: día futuro → programar (vacío o repetir) */
                <FutureDayPanel
                  key={selectedDayData.dateKey}
                  existing={planned[selectedDayData.dateKey] ?? null}
                  recents={recentOptions}
                  onSave={handleSavePlan}
                  onRemove={handleRemovePlan}
                  onStart={handleStartPlan}
                />
              ) : selectedDayData.workouts.length === 0 ? (
                /* Caso: Día sin entrenamientos */
                <div className="text-center py-10 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500 flex items-center justify-center mx-auto">
                    <CalendarIcon className="w-6 h-6" />
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">Día de descanso</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto mt-1">
                      No hubo entrenamientos registrados en esta fecha. ¡El descanso también es parte del progreso!
                    </p>
                  </div>

                  {/* Solo hoy tiene sentido "entrenar ahora" (el logger registra a fecha actual) */}
                  {selectedDayData.dateKey === todayKey && (
                    <div className="pt-2">
                      <Button
                        onClick={handleStartNewWorkout}
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5 rounded-xl shadow-xs"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Iniciar un entrenamiento hoy</span>
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                /* Caso: Lista de entrenamientos realizados ese día */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {selectedDayData.workouts.length}{' '}
                      {selectedDayData.workouts.length === 1
                        ? 'entrenamiento realizado'
                        : 'entrenamientos realizados'}
                    </span>

                    <Button
                      onClick={handleStartNewWorkout}
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 gap-1 text-gray-700 dark:text-gray-300 dark:border-gray-700"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Añadir otro hoy</span>
                    </Button>
                  </div>

                  {selectedDayData.workouts.map((workout) => (
                    <div
                      key={workout.id}
                      className="bg-gray-50/90 rounded-2xl p-4 border border-gray-200/90 dark:bg-gray-800/50 dark:border-gray-700 space-y-3.5 shadow-2xs"
                    >
                      {/* Cabecera del Entrenamiento */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-gray-200/70 dark:border-gray-700">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-sm sm:text-base text-gray-900 dark:text-gray-100">
                              {workout.name}
                            </h4>

                            {workout.typeName && (
                              <span className="px-2 py-0.5 text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full">
                                {workout.typeName}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {new Date(workout.startTime).toLocaleTimeString('es-ES', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            horas
                          </p>
                        </div>

                        {/* Botón de Repetir */}
                        <Button
                          onClick={() => handleRepeatWorkout(workout.id)}
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 rounded-xl shadow-xs self-start sm:self-auto active:scale-95 transition-all"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Repetir hoy</span>
                        </Button>
                      </div>

                      {/* KPIs del Entrenamiento */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-white p-2 rounded-xl border border-gray-200/70 dark:bg-gray-800 dark:border-gray-700">
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 block font-medium">Duración</span>
                          <span className="font-bold text-xs text-gray-900 dark:text-gray-100 tabular-nums">
                            {workout.totalTimeSeconds
                              ? `${Math.round(workout.totalTimeSeconds / 60)} min`
                              : '—'}
                          </span>
                        </div>

                        <div className="bg-white p-2 rounded-xl border border-gray-200/70 dark:bg-gray-800 dark:border-gray-700">
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 block font-medium">Volumen</span>
                          <span className="font-bold text-xs text-gray-900 dark:text-gray-100 tabular-nums">
                            {workout.totalVolume > 0
                              ? `${workout.totalVolume.toLocaleString('es-ES')} kg`
                              : '0 kg'}
                          </span>
                        </div>

                        <div className="bg-white p-2 rounded-xl border border-gray-200/70 dark:bg-gray-800 dark:border-gray-700">
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 block font-medium">Series</span>
                          <span className="font-bold text-xs text-gray-900 dark:text-gray-100 tabular-nums">
                            {workout.totalSetsCount} series
                          </span>
                        </div>
                      </div>

                      {/* Notas si existen */}
                      {workout.notes && (
                        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200">
                          <span className="font-semibold block text-[11px] text-amber-800 dark:text-amber-300">Notas:</span>
                          <p className="italic">{workout.notes}</p>
                        </div>
                      )}

                      {/* Desglose de Ejercicios y Series */}
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                          Ejercicios y Series Realizadas ({workout.exercises.length}):
                        </span>

                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {workout.exercises.map((ex, idx) => (
                            <div
                              key={idx}
                              className="p-2.5 bg-white rounded-xl border border-gray-200/70 dark:bg-gray-800 dark:border-gray-700 space-y-1"
                            >
                              <div className="flex items-center justify-between text-xs font-bold text-gray-900 dark:text-gray-100">
                                <span>
                                  {idx + 1}. {ex.name}
                                </span>
                                {ex.maxWeight > 0 && (
                                  <span className="text-[11px] text-purple-700 dark:text-purple-300 font-semibold bg-purple-50 dark:bg-purple-900/30 px-1.5 py-0.2 rounded">
                                    Máx: {ex.maxWeight} kg
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap gap-1 pt-0.5">
                                {ex.sets.map((s, sIdx) => (
                                  <span
                                    key={sIdx}
                                    className="px-1.5 py-0.5 text-[10px] bg-gray-50 rounded border border-gray-200 text-gray-700 font-medium tabular-nums dark:bg-gray-700/50 dark:border-gray-600 dark:text-gray-300"
                                  >
                                    {s.weight ? `${s.weight}kg × ` : ''}
                                    {s.repCount ? `${s.repCount}` : s.distance ? `${s.distance}m` : `${s.durationSeconds}s`}
                                    {s.rpe ? <span className="text-gray-400 dark:text-gray-500"> (RPE {s.rpe})</span> : ''}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer del Modal */}
            <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/60 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="text-xs rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}