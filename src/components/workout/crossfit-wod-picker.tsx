'use client';

import { useMemo, useState } from 'react';
import {
  Trophy,
  Medal,
  Star,
  Search,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  ChevronLeft,
} from 'lucide-react';
import {
  OFFICIAL_WODS,
  WOD_CATEGORY_LABELS,
  type OfficialWod,
  type WodCategory,
  type WodRxDivision,
  type WodMovementSpec,
} from '@/lib/wods-catalog';
import type { ModalityConfig } from '@/lib/db/schema';
import type { AvailableExercise } from '@/app/workouts/log/workout-logger-client';
import type { HyroxGeneratedExercise } from './hyrox-race-builder';

const CATEGORY_OPTIONS: { id: WodCategory | 'all'; label: string; icon: React.ElementType }[] = [
  { id: 'all', label: 'Todos', icon: Star },
  { id: 'girl', label: 'The Girls', icon: Medal },
  { id: 'hero', label: 'Héroes', icon: Trophy },
  { id: 'classic', label: 'Clásicos', icon: Sparkles },
];

const DIVISION_OPTIONS: { id: WodRxDivision; label: string; sub: string }[] = [
  { id: 'rx-men', label: 'RX Hombres', sub: 'Cargas Rx masculinas' },
  { id: 'rx-women', label: 'RX Mujeres', sub: 'Cargas Rx femeninas' },
];

export interface WodApplyPayload {
  title: string;
  exercises: HyroxGeneratedExercise[];
  modality: string;
  modalityConfig: ModalityConfig;
}

interface CrossfitWodPickerProps {
  availableExercises: AvailableExercise[];
  onApplyWod: (payload: WodApplyPayload) => void;
}

export function CrossfitWodPicker({ availableExercises, onApplyWod }: CrossfitWodPickerProps) {
  const [category, setCategory] = useState<WodCategory | 'all'>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [division, setDivision] = useState<WodRxDivision>('rx-men');
  const [isApplied, setIsApplied] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return OFFICIAL_WODS.filter((w) => {
      if (category !== 'all' && w.category !== category) return false;
      if (!q) return true;
      return (
        w.name.toLowerCase().includes(q) ||
        w.scheme.toLowerCase().includes(q) ||
        w.description.toLowerCase().includes(q) ||
        w.movements.some((m) => m.fallbackName.toLowerCase().includes(q))
      );
    });
  }, [category, query]);

  const selected: OfficialWod | null = useMemo(
    () => OFFICIAL_WODS.find((w) => w.id === selectedId) ?? null,
    [selectedId]
  );

  // Resolver un movimiento contra el catálogo del usuario
  const resolveMovement = (m: WodMovementSpec): { id: number; name: string; found: boolean } => {
    for (const q of m.searchQueries) {
      const match = availableExercises.find((ex) => ex.name.toLowerCase().includes(q.toLowerCase()));
      if (match) return { id: match.id, name: match.name, found: true };
    }
    const fallback = availableExercises[0];
    return { id: fallback?.id ?? 0, name: m.fallbackName, found: false };
  };

  const missingInSelected = useMemo(() => {
    if (!selected) return [];
    return selected.movements.filter((m) => !resolveMovement(m).found).map((m) => m.fallbackName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, availableExercises]);

  const movementPreview = (m: WodMovementSpec): string => {
    const weight = division === 'rx-men' ? m.weightMen : m.weightWomen;
    const parts: string[] = [];
    if (selected?.ladder) {
      parts.push(selected.ladder.join('-'));
    } else if (m.reps > 0) {
      parts.push(m.rounds > 1 ? `${m.rounds}×${m.reps}` : `${m.reps}`);
    } else {
      parts.push(m.rounds > 1 ? `${m.rounds} rondas` : 'máx reps');
    }
    if (m.distance) parts.push(`${m.distance}m`);
    if (weight) parts.push(`@${weight}kg`);
    return parts.join(' · ');
  };

  const handleLoad = () => {
    if (!selected) return;
    const generated: HyroxGeneratedExercise[] = selected.movements.map((m) => {
      const resolved = resolveMovement(m);
      const weight = division === 'rx-men' ? m.weightMen : m.weightWomen;
      // Esquema 21-15-9 y similares: una serie por valor; si no, N rondas × reps
      const repsList: number[] = selected.ladder ?? Array.from({ length: Math.max(1, m.rounds) }, () => m.reps);
      return {
        id: crypto.randomUUID(),
        exerciseId: resolved.id,
        name: resolved.name,
        sets: repsList.map((reps) => ({
          id: crypto.randomUUID(),
          repCount: reps,
          weight,
          distance: m.distance,
          durationSeconds: null,
          isCompleted: false,
        })),
      };
    });

    const todayStr = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    const divisionLabel = division === 'rx-men' ? 'RX' : 'RX W';
    onApplyWod({
      title: `${selected.name} · ${divisionLabel} · ${todayStr}`,
      exercises: generated,
      modality: selected.modality,
      modalityConfig: selected.modalityConfig,
    });
    setIsApplied(true);
    setTimeout(() => setIsApplied(false), 3000);
  };

  return (
    <div className="bg-gradient-to-br from-orange-50/90 via-amber-50/40 to-white dark:from-orange-950/30 dark:via-gray-900/60 dark:to-gray-900 border border-orange-200/90 dark:border-orange-800/60 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-orange-200/60 dark:border-orange-800/40 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-orange-500 text-white shadow-xs">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                WODs Oficiales & Benchmarks
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-200 dark:bg-orange-900 text-orange-900 dark:text-orange-200">
                {OFFICIAL_WODS.length} WODs
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Elige un Girl, un Héroe o un clásico… o configura el tuyo abajo a mano.
            </p>
          </div>
        </div>

        {selected && (
          <button
            type="button"
            onClick={handleLoad}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-2 shrink-0 ${
              isApplied ? 'bg-emerald-600 text-white' : 'bg-orange-500 hover:bg-orange-600 text-white active:scale-98'
            }`}
          >
            {isApplied ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>¡WOD Cargado!</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Cargar {selected.name}</span>
              </>
            )}
          </button>
        )}
      </div>

      {!selected ? (
        <>
          {/* Filtros + buscador */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 shrink-0">
              {CATEGORY_OPTIONS.map((c) => {
                const Icon = c.icon;
                const isActive = category === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${
                      isActive
                        ? 'bg-orange-500 text-white border-orange-600 shadow-xs'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-orange-300'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{c.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre o movimiento (pull-ups, thruster...)"
                className="w-full h-9 pl-9 pr-3 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
          </div>

          {/* Lista de WODs */}
          {filtered.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-4">
              Sin resultados. Prueba con otro nombre o movimiento.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-0.5">
              {filtered.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setSelectedId(w.id)}
                  className="p-3 rounded-xl border text-left transition-all cursor-pointer bg-white dark:bg-gray-800/80 border-gray-200 dark:border-gray-700 hover:border-orange-400 hover:shadow-xs flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-sm text-gray-900 dark:text-gray-100">{w.name}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                        w.category === 'girl'
                          ? 'bg-pink-100 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300'
                          : w.category === 'hero'
                            ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                            : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {WOD_CATEGORY_LABELS[w.category]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="font-mono font-bold text-orange-600 dark:text-orange-400">{w.scheme}</span>
                    <span className="text-gray-400">· {w.modality}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2">{w.description}</p>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Detalle del WOD seleccionado */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="flex items-center gap-1 text-[11px] font-bold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Volver al catálogo
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-base font-black text-gray-900 dark:text-gray-100">{selected.name}</h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300">
                {WOD_CATEGORY_LABELS[selected.category]}
              </span>
              <span className="text-xs font-mono font-bold text-orange-600 dark:text-orange-400">{selected.scheme}</span>
              <span className="text-[11px] text-gray-500 dark:text-gray-400">· {selected.modality} · {selected.rxNote}</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300">{selected.description}</p>

            {/* División Rx */}
            <div className="grid grid-cols-2 gap-2 max-w-md">
              {DIVISION_OPTIONS.map((d) => {
                const isActive = division === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDivision(d.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isActive
                        ? 'bg-orange-500 text-white border-orange-600 shadow-xs'
                        : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:border-orange-300'
                    }`}
                  >
                    <div className="font-bold text-xs">{d.label}</div>
                    <div className={`text-[10px] mt-0.5 ${isActive ? 'text-orange-100' : 'text-gray-400'}`}>{d.sub}</div>
                  </button>
                );
              })}
            </div>

            {/* Movimientos con preview */}
            <div className="space-y-1.5">
              {selected.movements.map((m, idx) => {
                const resolved = resolveMovement(m);
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 text-xs"
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-gray-900 dark:text-gray-100">
                        {idx + 1}. {resolved.name}
                      </span>
                      {!resolved.found && (
                        <span className="ml-2 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                          (no está en tu catálogo — se puede crear)
                        </span>
                      )}
                      {m.note && <p className="text-[10px] text-gray-400 mt-0.5">{m.note}</p>}
                    </div>
                    <span className="font-mono font-bold text-orange-600 dark:text-orange-400 shrink-0 text-[11px]">
                      {movementPreview(m)}
                    </span>
                  </div>
                );
              })}
            </div>

            {missingInSelected.length > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>{missingInSelected.join(', ')}</strong> no existe(n) aún en tu catálogo de ejercicios.
                  Al cargar el WOD podrás crearlo(s) con el botón + de cada ejercicio, o ejecuta el seed para
                  importar el catálogo oficial completo.
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={handleLoad}
              className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2 ${
                isApplied ? 'bg-emerald-600 text-white' : 'bg-orange-500 hover:bg-orange-600 text-white'
              }`}
            >
              {isApplied ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>¡WOD Cargado! Ya puedes registrar tus series abajo</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Cargar {selected.name} en el entrenamiento</span>
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
