'use client';

// Modales del historial de entrenamientos, extraídos del componente principal
// para cargarse de forma diferida (next/dynamic): no viajan en el JS inicial
// de /workouts, solo al abrir el primer modal. Son 100% controlados por
// props; la lógica de estado y acciones vive en workout-history-client.tsx.
import { useEffect, useMemo, useState } from 'react';
import {
  Bookmark,
  Calendar,
  Check,
  Clock,
  Copy,
  FileDown,
  FileText,
  Flame,
  ImageDown,
  Loader2,
  Pencil,
  Play,
  Save,
  Send,
  Share2,
  Trash2,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { updateWorkoutSetTimes } from './actions';
import { notify } from '@/lib/notify';
import { formatModalitySummary } from '@/lib/modality-utils';
import {
  canvasToBlob,
  copyTextToClipboard,
  downloadBlob,
  formatWorkoutMarkdown,
  formatWorkoutText,
  renderWorkoutCard,
  shareImageFile,
  workoutShareFilename,
  type ShareableWorkout
} from '@/lib/share-workout';
import {
  formatMMSS,
  getTypeStyle,
  isRunExerciseName,
  isWorkoutSavedAsTemplate,
  parseMMSS,
  type ExerciseDetailItem
} from './history-utils';
import type { WorkoutHistoryItem } from './workout-history-client';

// Vista UNIFICADA Hyrox en el historial: una sola lista de estaciones con su tiempo
// editable inline (sustituye a "inputs arriba + tarjetas debajo", que duplicaba lo mismo).
export function HyroxRunTimesEditor({
  workout,
  onSaved,
}: {
  workout: WorkoutHistoryItem;
  onSaved: (updates: { setId: number; durationSeconds: number | null }[]) => void;
}) {
  const runRows = useMemo(() => {
    const rows: {
      exName: string;
      setId: number;
      setNumber: number;
      distance: number | null;
      durationSeconds: number | null;
      repCount: number | null;
      weight: number | null;
      isRun: boolean;
    }[] = [];
    // En Hyrox TODAS las estaciones llevan tiempo: incluimos cada set del workout,
    // no solo los runs. Así Wall Balls, Farmer Carry, etc. también son editables.
    workout.exercisesSummary.forEach((ex) => {
      const isRun = isRunExerciseName(ex.name);
      (ex.sets || []).forEach((s) => {
        if (s.id == null) return;
        rows.push({
          exName: ex.name,
          setId: s.id,
          setNumber: s.setNumber,
          distance: s.distance ?? null,
          durationSeconds: s.durationSeconds ?? null,
          repCount: s.repCount ?? null,
          weight: s.weight ?? null,
          isRun,
        });
      });
    });
    return rows;
  }, [workout]);

  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(false);

  useEffect(() => {
    const init: Record<number, string> = {};
    runRows.forEach((r) => {
      init[r.setId] = r.durationSeconds != null ? formatMMSS(r.durationSeconds) : '';
    });
    setDrafts(init);
  }, [runRows]);

  if (runRows.length === 0) return null;

  const handleSave = async () => {
    const updates: { setId: number; durationSeconds: number | null }[] = [];
    for (const r of runRows) {
      const raw = (drafts[r.setId] ?? '').trim();
      if (raw === '' && r.durationSeconds == null) continue;
      if (raw === '') {
        if (r.durationSeconds !== null) updates.push({ setId: r.setId, durationSeconds: null });
        continue;
      }
      const parsed = parseMMSS(raw);
      if (parsed === null) {
        notify.warning('Formato inválido', `En "${r.exName}" usa m:ss, ej. 4:30`);
        return;
      }
      if (parsed !== r.durationSeconds) updates.push({ setId: r.setId, durationSeconds: parsed });
    }
    if (updates.length === 0) return;
    setIsSaving(true);
    try {
      const res = await updateWorkoutSetTimes({ workoutId: workout.id, updates });
      if (res.success) {
        onSaved(updates);
        notify.success('Tiempos actualizados', `${updates.length} ${updates.length === 1 ? 'tramo actualizado' : 'tramos actualizados'}`);
        setSavedTick(true);
        setTimeout(() => setSavedTick(false), 2500);
      }
    } catch (e) {
      console.error(e);
      notify.errorFrom(e, 'Error al guardar los tiempos');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-3.5 bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/60 rounded-2xl space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-purple-600" />
          Tiempos por estación (editable)
        </span>
        <span className="text-[11px] text-purple-700/70 dark:text-purple-300/70 font-medium">Formato m:ss · ej. 4:30</span>
      </div>
      <div className="space-y-1.5 max-h-72 overflow-y-auto pr-0.5">
        {runRows.map((r, idx) => (
          <div key={r.setId} className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-purple-100 dark:border-purple-900/40 rounded-xl px-2.5 py-1.5">
            <span className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300">
              {idx + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-gray-800 dark:text-gray-200 truncate">
                {r.isRun ? '🏃 ' : '🏋️ '}{r.exName}
              </p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-mono truncate">
                {r.distance ? `${r.distance}m · ` : ''}
                {(r.repCount ?? 0) > 0 ? `${r.repCount} reps · ` : ''}
                {r.weight ? `@ ${r.weight}kg` : 'tiempo'}
              </p>
            </div>
            <input
              type="text"
              inputMode="numeric"
              placeholder="m:ss"
              value={drafts[r.setId] ?? ''}
              onChange={(e) => setDrafts((prev) => ({ ...prev, [r.setId]: e.target.value }))}
              className="w-20 shrink-0 text-center text-xs font-mono font-bold px-2 py-1 rounded-lg border border-purple-200 dark:border-purple-800 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500"
            />
          </div>
        ))}
      </div>
      <Button
        type="button"
        size="sm"
        onClick={handleSave}
        disabled={isSaving}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl cursor-pointer"
      >
        {isSaving ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
            Guardando tiempos...
          </>
        ) : savedTick ? (
          <>
            <Check className="w-3.5 h-3.5 mr-1" />
            ¡Tiempos actualizados!
          </>
        ) : (
          <>
            <Save className="w-3.5 h-3.5 mr-1" />
            Guardar tiempos
          </>
        )}
      </Button>
      <p className="text-[11px] text-purple-700/70 dark:text-purple-300/60">
        Al guardar se recalculan tus PBs, el balance Running vs Estaciones y las estaciones Hyrox en Progreso.
      </p>
    </div>
  );
}

// ---------- Detail Modal (para Historial) ----------
function ShareWorkoutMenu({ workout }: { workout: ShareableWorkout }) {
  const [open, setOpen] = useState(false);
  const [working, setWorking] = useState<string | null>(null);
  const canNativeShare = typeof navigator !== 'undefined' && 'share' in navigator;

  const run = async (key: string, fn: () => Promise<void>) => {
    if (working) return;
    setWorking(key);
    try {
      await fn();
    } catch (e) {
      console.error(e);
      notify.errorFrom(e, 'No se pudo compartir el entrenamiento');
    } finally {
      setWorking(null);
      setOpen(false);
    }
  };

  const handleCopy = () =>
    run('copy', async () => {
      const ok = await copyTextToClipboard(formatWorkoutText(workout));
      if (ok) notify.success('Resumen copiado', 'Pégalo donde quieras compartirlo');
      else notify.error('No se pudo copiar', 'Tu navegador bloqueó el portapapeles');
    });

  const handleMarkdown = () =>
    run('md', async () => {
      const blob = new Blob([formatWorkoutMarkdown(workout)], {
        type: 'text/markdown;charset=utf-8'
      });
      downloadBlob(blob, workoutShareFilename(workout, 'md'));
      notify.success('Markdown descargado', 'Ábrelo con cualquier editor o app de notas');
    });

  const buildImageFile = async () => {
    const blob = await canvasToBlob(await renderWorkoutCard(workout));
    return new File([blob], workoutShareFilename(workout, 'png'), { type: 'image/png' });
  };

  const handleImageDownload = () =>
    run('png', async () => {
      const file = await buildImageFile();
      downloadBlob(file, file.name);
      notify.success('Imagen descargada', 'Lista para publicar o enviar');
    });

  const handleNativeShare = () =>
    run('share', async () => {
      const file = await buildImageFile();
      const shared = await shareImageFile(file, workout.name, formatWorkoutText(workout));
      if (!shared) {
        downloadBlob(file, file.name);
        notify.info('Tu dispositivo no permite compartir directo', 'Se descargó la imagen');
      }
    });

  const itemClass =
    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-800 cursor-pointer';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={!!working}
        className="inline-flex h-7 shrink-0 cursor-pointer items-center justify-center gap-1 rounded-[min(var(--radius-md),12px)] border border-sky-200 bg-background px-2.5 text-[0.8rem] font-semibold text-sky-700 transition-all outline-none select-none hover:bg-sky-50 disabled:pointer-events-none disabled:opacity-50 dark:border-sky-800 dark:text-sky-400 dark:hover:bg-sky-950/30"
      >
        {working ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Share2 className="w-3.5 h-3.5 text-sky-600" />
        )}
        <span>Compartir</span>
      </PopoverTrigger>
      <PopoverContent align="end" side="top" className="w-60 p-1.5">
        <button type="button" disabled={!!working} onClick={handleCopy} className={itemClass}>
          <Copy className="w-4 h-4 text-gray-400" />
          Copiar resumen
        </button>
        <button type="button" disabled={!!working} onClick={handleMarkdown} className={itemClass}>
          <FileDown className="w-4 h-4 text-gray-400" />
          Descargar Markdown
        </button>
        <button
          type="button"
          disabled={!!working}
          onClick={handleImageDownload}
          className={itemClass}
        >
          <ImageDown className="w-4 h-4 text-gray-400" />
          Descargar imagen
        </button>
        {canNativeShare ? (
          <button
            type="button"
            disabled={!!working}
            onClick={handleNativeShare}
            className={itemClass}
          >
            <Send className="w-4 h-4 text-gray-400" />
            Compartir imagen…
          </button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

export function WorkoutDetailModal({
  workout,
  onClose,
  onRepeat,
  onConvertToTemplate,
  onDelete,
  onEdit,
  onTimesSaved,
}: {
  workout: WorkoutHistoryItem;
  onClose: () => void;
  onRepeat: () => void;
  onConvertToTemplate: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onTimesSaved?: (updates: { setId: number; durationSeconds: number | null }[]) => void;
}) {
  const style = getTypeStyle(workout.typeName);
  const TypeIcon = style.icon;
  const isHyroxWorkout =
    workout.typeName.toLowerCase().includes('hyrox') ||
    workout.name.toLowerCase().includes('hyrox');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-start justify-between gap-3 bg-gray-50/80 dark:bg-gray-800/60">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide border ${style.badge}`}>
                <TypeIcon className="w-3 h-3" />
                {workout.typeName}
              </span>
              {workout.modality && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                  <Flame className="w-2.5 h-2.5" />
                  {formatModalitySummary(workout.modality, workout.modalityConfig)}
                </span>
              )}
              {workout.totalTimeSeconds && workout.totalTimeSeconds > 0 ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <Check className="w-2.5 h-2.5 stroke-[3]" /> Finalizado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  <Save className="w-2.5 h-2.5" /> Sin finalizar (Guardado)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base text-gray-900 dark:text-gray-100 truncate">{workout.name}</h3>
              <button
                type="button"
                onClick={onEdit}
                className="p-1 rounded-lg text-gray-400 dark:text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer"
                title="Editar nombre y notas del entrenamiento"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <Calendar className="w-3 h-3" />
              {new Date(workout.startTime).toLocaleDateString('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
              {' · '}
              {new Date(workout.startTime).toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit',
              })}h
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-700 transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200/70 dark:border-gray-700 p-2.5">
              <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider">Duración</p>
              <p className="text-sm font-black text-gray-900 dark:text-gray-100 tabular-nums mt-0.5">
                {workout.totalTimeSeconds ? `${Math.round(workout.totalTimeSeconds / 60)} min` : '—'}
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200/70 dark:border-gray-700 p-2.5">
              <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider">Volumen</p>
              <p className="text-sm font-black text-gray-900 dark:text-gray-100 tabular-nums mt-0.5">
                {workout.totalVolume > 0 ? `${(workout.totalVolume / 1000).toFixed(1)}k kg` : '0 kg'}
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200/70 dark:border-gray-700 p-2.5">
              <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider">Series</p>
              <p className="text-sm font-black text-gray-900 dark:text-gray-100 tabular-nums mt-0.5">{workout.totalSets}</p>
            </div>
          </div>

          {/* Notes */}
          {workout.modality === 'EMOM' &&
            workout.exercisesSummary.length > 1 &&
            (workout.modalityConfig?.emomMode === 'shared' || workout.modalityConfig?.emomMode === 'alternate') && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-xl text-[11px] text-blue-900 dark:text-blue-200">
                {workout.modalityConfig.emomMode === 'shared'
                  ? `Minutos compartidos: Min N = ${workout.exercisesSummary.map((e) => e.name).join(' + ')} juntos. Un solo EMOM, no uno por ejercicio.`
                  : `Minutos alternos impar/par entre ${workout.exercisesSummary.map((e) => e.name).join(' y ')}.`}
              </div>
            )}
          {workout.notes && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex gap-2">
              <FileText className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
              <p className="italic">{workout.notes}</p>
            </div>
          )}

          {/* Hyrox: UNA sola lista unificada (estación + meta + tiempo editable).
              Sustituye al anterior "inputs arriba + tarjetas debajo" que duplicaba cada estación. */}
          {isHyroxWorkout && onTimesSaved ? (
            <HyroxRunTimesEditor workout={workout} onSaved={onTimesSaved} />
          ) : (
            /* Exercises (no-Hyrox: vista de tarjetas habitual) */
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                Ejercicios & Repeticiones ({workout.exercisesSummary.length})
              </span>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {workout.exercisesSummary.map((ex, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200/70 dark:border-gray-700 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900 dark:text-gray-100 truncate pr-2">
                        {idx + 1}. {ex.name}
                      </span>

                      <span className="text-gray-500 dark:text-gray-400 font-medium shrink-0">
                        {ex.setsCount} series {ex.maxWeight > 0 ? `· máx ${ex.maxWeight}kg` : ''}
                      </span>
                    </div>

                    {/* Series individuales con reps, distancia y tiempo */}
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {ex.sets && ex.sets.length > 0 ? (
                        ex.sets.map((s, sIdx) => (
                          <span
                            key={sIdx}
                            className="px-2 py-0.5 text-[11px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md font-mono text-gray-800 dark:text-gray-200 shadow-2xs"
                          >
                            <strong className="text-gray-400 dark:text-gray-500 mr-1 text-[10px]">S{s.setNumber}:</strong>
                            {(s.distance ?? 0) > 0 && (
                              <span className="font-bold text-purple-700 dark:text-purple-300 mr-1">{s.distance}m</span>
                            )}
                            {s.durationSeconds != null && (
                              <span className="font-bold text-emerald-700 dark:text-emerald-300 mr-1">⏱ {formatMMSS(s.durationSeconds)}</span>
                            )}
                            <span className="font-bold text-blue-700 dark:text-blue-400">{s.repCount ?? 0} reps</span>
                            {s.weight ? <span className="text-gray-600 dark:text-gray-400"> @ {s.weight}kg</span> : ''}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-blue-700 dark:text-blue-400 font-mono font-medium">
                          {ex.repsSummary || `${ex.setsCount} series`}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/60 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl gap-1.5 px-2.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="text-xs text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 border-blue-200 dark:border-blue-800 rounded-xl gap-1.5 px-2.5 cursor-pointer font-semibold"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Editar</span>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onConvertToTemplate}
              title={isWorkoutSavedAsTemplate(workout) ? 'Ya guardado como plantilla' : 'Guardar como plantilla'}
              className="text-xs text-purple-700 hover:text-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/20 border-purple-200 dark:border-purple-800 rounded-xl gap-1.5 cursor-pointer font-semibold"
            >
              <Bookmark
                className="w-3.5 h-3.5 text-purple-600"
                fill={isWorkoutSavedAsTemplate(workout) ? 'currentColor' : 'none'}
              />
              <span>{isWorkoutSavedAsTemplate(workout) ? 'Guardado como Plantilla' : 'Guardar como Plantilla'}</span>
            </Button>

            <ShareWorkoutMenu workout={workout} />

            <Button variant="outline" size="sm" onClick={onClose} className="text-xs rounded-xl cursor-pointer">
              Cerrar
            </Button>

            <Button
              size="sm"
              onClick={onRepeat}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 rounded-xl shadow-sm cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {workout.totalTimeSeconds && workout.totalTimeSeconds > 0
                ? 'Repetir entrenamiento'
                : 'Iniciar entrenamiento'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Edit Workout Modal ----------
export function EditWorkoutModal({
  workout,
  onClose,
  onSave,
  isSaving,
}: {
  workout: { id: number; name: string; notes: string };
  onClose: () => void;
  onSave: (name: string, notes: string) => void;
  isSaving: boolean;
}) {
  const [name, setName] = useState(workout.name);
  const [notes, setNotes] = useState(workout.notes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim(), notes.trim());
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in zoom-in-95 duration-150">
        <form onSubmit={handleSubmit}>
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/80 dark:bg-gray-800/60">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                <Pencil className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">Editar Entrenamiento</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Nombre del entrenamiento *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Torso Hipertrofia, Push Day A..."
                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-gray-100"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Notas / Sensaciones
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Buena sesión de fuerza, descansos controlados..."
                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-gray-100 resize-none"
              />
            </div>
          </div>

          <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/60 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="rounded-xl text-xs cursor-pointer">
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSaving || !name.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                  Guardando...
                </>
              ) : (
                'Guardar Cambios'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------- Edit Template Modal ----------
export function EditTemplateModal({
  template,
  onClose,
  onSave,
  isSaving,
}: {
  template: { id: number; name: string; description: string };
  onClose: () => void;
  onSave: (name: string, description: string) => void;
  isSaving: boolean;
}) {
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim(), description.trim());
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in zoom-in-95 duration-150">
        <form onSubmit={handleSubmit}>
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/80 dark:bg-gray-800/60">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
                <Bookmark className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">Editar Plantilla</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Nombre de la plantilla *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Push Pull Legs, WOD Fran..."
                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-gray-900 dark:text-gray-100"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Descripción / Enfoque
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej: Rutina de hipertrofia frecuencia 2, enfocada en hombro lateral..."
                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-gray-900 dark:text-gray-100 resize-none"
              />
            </div>
          </div>

          <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/60 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="rounded-xl text-xs cursor-pointer">
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSaving || !name.trim()}
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-sm cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                  Guardando...
                </>
              ) : (
                'Guardar Cambios'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------- Exercise Detail Modal ----------
export function ExerciseDetailModal({
  workoutName,
  typeName,
  startTime,
  exercises,
  onClose,
}: {
  workoutName: string;
  typeName: string;
  startTime: Date | string;
  exercises: ExerciseDetailItem[];
  onClose: () => void;
}) {
  const style = getTypeStyle(typeName);
  const TypeIcon = style.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-start justify-between gap-3 bg-gray-50/80 dark:bg-gray-800/60">
          <div className="space-y-1 min-w-0">
            <h3 className="font-extrabold text-base text-gray-900 dark:text-gray-100 truncate">
              {workoutName}
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide border ${style.badge}`}>
                <TypeIcon className="w-3 h-3" />
                {typeName}
              </span>
              <span className="text-xs text-gray-500 flex items-center gap-1.5">
                <Calendar className="w-3 h-3" />
                {new Date(startTime).toLocaleDateString('es-ES', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-700 transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex-1">
          {exercises.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-8">Sin ejercicios registrados</p>
          ) : (
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto pr-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50/80 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <th className="py-2 px-3">#</th>
                    <th className="py-2 px-3">Ejercicio</th>
                    <th className="py-2 px-3 text-center">Series</th>
                    <th className="py-2 px-3 text-center">Max Carga</th>
                    <th className="py-2 px-3">Detalle de Series</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {exercises.map((ex, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800 transition-colors">
                      <td className="py-2.5 px-3 text-gray-400 dark:text-gray-500 font-medium">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-bold text-gray-900 dark:text-gray-100">{ex.name}</td>
                      <td className="py-2.5 px-3 text-center font-semibold text-gray-700 dark:text-gray-300 tabular-nums">
                        {ex.setsCount}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {ex.maxWeight > 0 ? (
                          <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md border border-blue-100 dark:border-blue-800 font-bold tabular-nums">
                            {ex.maxWeight}kg
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {ex.sets && ex.sets.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {ex.sets.map((s, sIdx) => (
                              <span
                                key={sIdx}
                                className="px-2 py-0.5 text-[11px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md font-mono text-gray-800 dark:text-gray-200 shadow-2xs"
                              >
                                <strong className="text-gray-400 dark:text-gray-500 mr-1 text-[10px]">S{s.setNumber}:</strong>
                                {s.distance ? (
                                  <span className="font-bold text-purple-700 dark:text-purple-300 mr-1">{s.distance}m</span>
                                ) : null}
                                {s.durationSeconds != null ? (
                                  <span className="font-bold text-emerald-700 dark:text-emerald-300 mr-1">⏱ {formatMMSS(s.durationSeconds)}</span>
                                ) : null}
                                {(s.repCount ?? 0) > 0 || (s.distance == null && s.durationSeconds == null) ? (
                                  <span className="font-bold text-blue-700 dark:text-blue-400">{s.repCount ?? 0} reps</span>
                                ) : null}
                                {s.weight ? <span className="text-gray-600 dark:text-gray-400"> @ {s.weight}kg</span> : ''}
                                {s.calories ? <span className="text-orange-600 dark:text-orange-400"> · {s.calories}kcal</span> : ''}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-blue-700 dark:text-blue-400 font-mono font-medium">
                            {ex.repsSummary || `${ex.setsCount} series`}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/60 flex items-center justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs rounded-xl cursor-pointer"
          >
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}
