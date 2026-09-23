'use client';

import React from 'react';
import { Clock, Timer, Flame, Zap, Plus, Minus, Settings2, Sparkles, RotateCw, Activity } from 'lucide-react';
import { ModalityConfig } from '@/lib/db/schema';
import { formatModalitySummary, calculateModalityEstimatedDuration } from '@/lib/modality-utils';

interface ModalityConfigPanelProps {
  modality: string;
  config: ModalityConfig;
  onChange: (newConfig: ModalityConfig) => void;
}

export function ModalityConfigPanel({
  modality,
  config,
  onChange,
}: ModalityConfigPanelProps) {
  const update = (partial: Partial<ModalityConfig>) => {
    onChange({ ...config, ...partial });
  };

  const estimatedSecs = calculateModalityEstimatedDuration(modality, config);
  const formattedEstimated =
    estimatedSecs !== null
      ? `${Math.floor(estimatedSecs / 60)}m ${estimatedSecs % 60 > 0 ? `${estimatedSecs % 60}s` : ''}`.trim()
      : null;

  const summary = formatModalitySummary(modality, config);

  return (
    <div className="bg-gradient-to-br from-orange-50/70 via-amber-50/40 to-white dark:from-orange-950/20 dark:via-gray-900/40 dark:to-gray-900 border border-orange-200/90 dark:border-orange-900/50 rounded-2xl p-4 shadow-xs space-y-4">
      {/* Encabezado del panel de configuración de tiempos */}
      <div className="flex items-center justify-between gap-3 flex-wrap border-b border-orange-200/60 dark:border-orange-900/40 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
            <Timer className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider flex items-center gap-1.5">
              Parámetros de Ejecución ({modality})
            </h4>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Configura los tiempos objetivo, rondas o intervalos recomendados
            </p>
          </div>
        </div>

        {summary && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500 text-white font-bold text-xs shadow-xs">
            <Flame className="w-3.5 h-3.5" />
            <span>{summary}</span>
            {formattedEstimated && (
              <span className="text-[10px] opacity-80 border-l border-white/30 pl-1.5 ml-0.5">
                ≈ {formattedEstimated}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ─── VISTAS ESPECÍFICAS POR MODALIDAD ─── */}

      {/* 1. AMRAP / FOR TIME / AFAP / CHIPPER: Time Cap */}
      {(modality === 'AMRAP' || modality === 'For Time' || modality === 'AFAP' || modality === 'Chipper') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="space-y-0.5">
              <label className="text-xs font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-orange-500" />
                {modality === 'AMRAP' ? 'Duración / Time Cap del AMRAP' : 'Time Cap Límite (Recomendado)'}
              </label>
              <p className="text-[11px] text-gray-500">
                {modality === 'AMRAP'
                  ? 'Minutos para completar tantas rondas/repeticiones como sea posible'
                  : 'Límite máximo de tiempo para completar todo el trabajo'}
              </p>
            </div>

            <div className="flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl p-1 shadow-xs">
              <button
                type="button"
                onClick={() => update({ timeCapMinutes: Math.max(1, (config.timeCapMinutes || 20) - 1) })}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-baseline gap-0.5 px-2">
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={config.timeCapMinutes || 20}
                  onChange={(e) => update({ timeCapMinutes: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                  className="w-12 text-center text-sm font-black text-gray-900 dark:text-gray-100 bg-transparent focus:outline-none"
                />
                <span className="text-xs font-bold text-gray-500">min</span>
              </div>
              <button
                type="button"
                onClick={() => update({ timeCapMinutes: Math.min(120, (config.timeCapMinutes || 20) + 1) })}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Presets rápidos de minutos */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[11px] font-medium text-gray-500 mr-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-orange-500" /> Presets:
            </span>
            {[8, 10, 12, 15, 18, 20, 25, 30].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => update({ timeCapMinutes: mins })}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all border ${
                  (config.timeCapMinutes || 20) === mins
                    ? 'bg-orange-500 text-white border-orange-600 shadow-xs'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-orange-300 hover:text-orange-600'
                }`}
              >
                {mins}&apos;
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 2. EMOM: Intervalo y Minutos Totales */}
      {modality === 'EMOM' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Intervalo / Frecuencia */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                <RotateCw className="w-3.5 h-3.5 text-orange-500" />
                Frecuencia del Intervalo
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { value: 1, label: 'EMOM (1 min)' },
                  { value: 2, label: 'E2MOM (2 min)' },
                  { value: 3, label: 'E3MOM (3 min)' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update({ intervalMinutes: opt.value })}
                    className={`p-2 rounded-xl text-xs font-bold text-center border transition-all ${
                      (config.intervalMinutes || 1) === opt.value
                        ? 'bg-orange-500 text-white border-orange-600 shadow-xs'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-orange-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Duración Total */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-800 dark:text-gray-200 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-orange-500" />
                  Duración Total
                </span>
                <span className="text-[11px] font-bold text-orange-600 dark:text-orange-400">
                  {Math.floor((config.totalMinutes || 12) / (config.intervalMinutes || 1))} rondas
                </span>
              </label>
              <div className="flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl p-1 shadow-xs">
                <button
                  type="button"
                  onClick={() =>
                    update({
                      totalMinutes: Math.max(
                        config.intervalMinutes || 1,
                        (config.totalMinutes || 12) - (config.intervalMinutes || 1)
                      ),
                    })
                  }
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <div className="flex items-baseline justify-center gap-0.5 px-2 flex-1">
                  <input
                    type="number"
                    min={config.intervalMinutes || 1}
                    max="120"
                    step={config.intervalMinutes || 1}
                    value={config.totalMinutes || 12}
                    onChange={(e) =>
                      update({
                        totalMinutes: Math.max(1, parseInt(e.target.value, 10) || 1),
                      })
                    }
                    className="w-12 text-center text-sm font-black text-gray-900 dark:text-gray-100 bg-transparent focus:outline-none"
                  />
                  <span className="text-xs font-bold text-gray-500">minutos</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    update({
                      totalMinutes: (config.totalMinutes || 12) + (config.intervalMinutes || 1),
                    })
                  }
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Presets de EMOM */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[11px] font-medium text-gray-500 mr-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-orange-500" /> Presets comunes:
            </span>
            {[
              { label: '10 min', total: 10, interval: 1 },
              { label: '12 min', total: 12, interval: 1 },
              { label: '16 min (E2MOM · 8r)', total: 16, interval: 2 },
              { label: '20 min', total: 20, interval: 1 },
              { label: '24 min (E2MOM · 12r)', total: 24, interval: 2 },
            ].map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => update({ totalMinutes: p.total, intervalMinutes: p.interval })}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all border ${
                  config.totalMinutes === p.total && config.intervalMinutes === p.interval
                    ? 'bg-orange-500 text-white border-orange-600 shadow-xs'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-orange-300 hover:text-orange-600'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. TABATA: Trabajo (20s), Descanso (10s), Rondas (8), Ciclos */}
      {modality === 'TABATA' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Trabajo (s) */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <Flame className="w-3 h-3 text-emerald-500" /> Trabajo (On)
              </label>
              <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl p-1">
                <input
                  type="number"
                  min="5"
                  max="120"
                  step="5"
                  value={config.workSeconds ?? 20}
                  onChange={(e) => update({ workSeconds: Math.max(5, parseInt(e.target.value, 10) || 20) })}
                  className="w-full text-center text-xs font-black text-gray-900 dark:text-gray-100 bg-transparent focus:outline-none"
                />
                <span className="text-[10px] font-bold text-gray-400 pr-1.5">seg</span>
              </div>
            </div>

            {/* Descanso (s) */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <Clock className="w-3 h-3 text-blue-500" /> Descanso (Off)
              </label>
              <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl p-1">
                <input
                  type="number"
                  min="0"
                  max="120"
                  step="5"
                  value={config.restSeconds ?? 10}
                  onChange={(e) => update({ restSeconds: Math.max(0, parseInt(e.target.value, 10) || 10) })}
                  className="w-full text-center text-xs font-black text-gray-900 dark:text-gray-100 bg-transparent focus:outline-none"
                />
                <span className="text-[10px] font-bold text-gray-400 pr-1.5">seg</span>
              </div>
            </div>

            {/* Rondas por ciclo */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <RotateCw className="w-3 h-3 text-orange-500" /> Rondas
              </label>
              <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl p-1">
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={config.rounds ?? 8}
                  onChange={(e) => update({ rounds: Math.max(1, parseInt(e.target.value, 10) || 8) })}
                  className="w-full text-center text-xs font-black text-gray-900 dark:text-gray-100 bg-transparent focus:outline-none"
                />
                <span className="text-[10px] font-bold text-gray-400 pr-1.5">rondas</span>
              </div>
            </div>

            {/* Bloques / Ciclos */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <Zap className="w-3 h-3 text-purple-500" /> Ciclos / Bloques
              </label>
              <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl p-1">
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={config.sets ?? 1}
                  onChange={(e) => update({ sets: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                  className="w-full text-center text-xs font-black text-gray-900 dark:text-gray-100 bg-transparent focus:outline-none"
                />
                <span className="text-[10px] font-bold text-gray-400 pr-1.5">bloques</span>
              </div>
            </div>
          </div>

          {/* Presets Tabata */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[11px] font-medium text-gray-500 mr-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-orange-500" /> Presets:
            </span>
            {[
              { label: 'Clásico 20/10s (8 rondas · 4 min)', work: 20, rest: 10, rounds: 8, sets: 1 },
              { label: 'Doble Tabata (2 bloques · 8 min)', work: 20, rest: 10, rounds: 8, sets: 2 },
              { label: 'Tabata Extendido 30/15s (8r)', work: 30, rest: 15, rounds: 8, sets: 1 },
            ].map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => update({ workSeconds: p.work, restSeconds: p.rest, rounds: p.rounds, sets: p.sets })}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-orange-300 hover:text-orange-600 transition-all"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 4. HIIT / INTERVALOS: Trabajo, Descanso, Rondas, Bloques, Descanso entre bloques */}
      {modality === 'HIIT' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {/* Trabajo (s) */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <Flame className="w-3 h-3 text-emerald-500" /> Trabajo (s)
              </label>
              <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl p-1">
                <input
                  type="number"
                  min="5"
                  max="300"
                  step="5"
                  value={config.workSeconds ?? 40}
                  onChange={(e) => update({ workSeconds: Math.max(5, parseInt(e.target.value, 10) || 40) })}
                  className="w-full text-center text-xs font-black text-gray-900 dark:text-gray-100 bg-transparent focus:outline-none"
                />
                <span className="text-[10px] font-bold text-gray-400 pr-1">s</span>
              </div>
            </div>

            {/* Descanso (s) */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <Clock className="w-3 h-3 text-blue-500" /> Descanso (s)
              </label>
              <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl p-1">
                <input
                  type="number"
                  min="0"
                  max="300"
                  step="5"
                  value={config.restSeconds ?? 20}
                  onChange={(e) => update({ restSeconds: Math.max(0, parseInt(e.target.value, 10) || 20) })}
                  className="w-full text-center text-xs font-black text-gray-900 dark:text-gray-100 bg-transparent focus:outline-none"
                />
                <span className="text-[10px] font-bold text-gray-400 pr-1">s</span>
              </div>
            </div>

            {/* Rondas por bloque */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <RotateCw className="w-3 h-3 text-orange-500" /> Rondas / Blq
              </label>
              <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl p-1">
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={config.rounds ?? 5}
                  onChange={(e) => update({ rounds: Math.max(1, parseInt(e.target.value, 10) || 5) })}
                  className="w-full text-center text-xs font-black text-gray-900 dark:text-gray-100 bg-transparent focus:outline-none"
                />
                <span className="text-[10px] font-bold text-gray-400 pr-1">r</span>
              </div>
            </div>

            {/* Bloques totales */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <Zap className="w-3 h-3 text-purple-500" /> Series/Bloques
              </label>
              <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl p-1">
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={config.sets ?? 3}
                  onChange={(e) => update({ sets: Math.max(1, parseInt(e.target.value, 10) || 3) })}
                  className="w-full text-center text-xs font-black text-gray-900 dark:text-gray-100 bg-transparent focus:outline-none"
                />
                <span className="text-[10px] font-bold text-gray-400 pr-1">bloq</span>
              </div>
            </div>

            {/* Descanso entre bloques */}
            <div className="space-y-1 col-span-2 sm:col-span-1">
              <label className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <Activity className="w-3 h-3 text-rose-500" /> Pausa / Bloq
              </label>
              <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl p-1">
                <input
                  type="number"
                  min="0"
                  max="300"
                  step="10"
                  value={config.restBetweenSetsSeconds ?? 60}
                  onChange={(e) =>
                    update({ restBetweenSetsSeconds: Math.max(0, parseInt(e.target.value, 10) || 60) })
                  }
                  className="w-full text-center text-xs font-black text-gray-900 dark:text-gray-100 bg-transparent focus:outline-none"
                />
                <span className="text-[10px] font-bold text-gray-400 pr-1">s</span>
              </div>
            </div>
          </div>

          {/* Presets HIIT */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[11px] font-medium text-gray-500 mr-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-orange-500" /> Presets:
            </span>
            {[
              { label: '40s / 20s · 5r × 3 bloques', work: 40, rest: 20, rounds: 5, sets: 3, restSets: 60 },
              { label: '30s / 30s · 6r × 2 bloques', work: 30, rest: 30, rounds: 6, sets: 2, restSets: 60 },
              { label: '45s / 15s · 4r × 4 bloques', work: 45, rest: 15, rounds: 4, sets: 4, restSets: 90 },
            ].map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() =>
                  update({
                    workSeconds: p.work,
                    restSeconds: p.rest,
                    rounds: p.rounds,
                    sets: p.sets,
                    restBetweenSetsSeconds: p.restSets,
                  })
                }
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-orange-300 hover:text-orange-600 transition-all"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 5. LADDER: Esquema de repeticiones + Time Cap opcional */}
      {modality === 'Ladder' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Esquema de repeticiones */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                <Settings2 className="w-3.5 h-3.5 text-orange-500" />
                Esquema de Repeticiones (Escalera)
              </label>
              <input
                type="text"
                placeholder="Ej. 21-15-9 o 1-2-3-4-5-6-7-8-9-10"
                value={config.repScheme || '21-15-9'}
                onChange={(e) => update({ repScheme: e.target.value })}
                className="w-full px-3 py-1.5 text-xs font-bold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              {(() => {
                const nums = (config.repScheme || '').match(/\d+/g);
                if (!nums || nums.length === 0) {
                  return <p className="text-[11px] text-red-500 font-medium">Escribe números separados por guiones, ej. 21-15-9</p>;
                }
                if (nums.length > 30) {
                  return <p className="text-[11px] text-red-500 font-medium">Máximo 30 valores</p>;
                }
                return (
                  <p className="text-[11px] text-gray-500">
                    {nums.length} series: {nums.join(' · ')}
                  </p>
                );
              })()}
            </div>

            {/* Time Cap opcional */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-orange-500" />
                Time Cap Recomendado (opcional)
              </label>
              <div className="flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl p-1 shadow-xs">
                <button
                  type="button"
                  onClick={() => update({ timeCapMinutes: Math.max(1, (config.timeCapMinutes || 15) - 1) })}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <div className="flex items-baseline justify-center gap-0.5 px-2 flex-1">
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={config.timeCapMinutes || 15}
                    onChange={(e) => update({ timeCapMinutes: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                    className="w-12 text-center text-sm font-black text-gray-900 dark:text-gray-100 bg-transparent focus:outline-none"
                  />
                  <span className="text-xs font-bold text-gray-500">min</span>
                </div>
                <button
                  type="button"
                  onClick={() => update({ timeCapMinutes: Math.min(60, (config.timeCapMinutes || 15) + 1) })}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Presets de Escalera */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[11px] font-medium text-gray-500 mr-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-orange-500" /> Esquemas populares:
            </span>
            {['21-15-9', '15-12-9', '10-8-6-4-2', '1-2-3-4-5-6-7-8-9-10', '10-9-8-7-6-5-4-3-2-1', '50-40-30-20-10'].map((sch) => (
              <button
                key={sch}
                type="button"
                onClick={() => update({ repScheme: sch })}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all border ${
                  config.repScheme === sch
                    ? 'bg-orange-500 text-white border-orange-600 shadow-xs'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-orange-300 hover:text-orange-600'
                }`}
              >
                {sch}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
