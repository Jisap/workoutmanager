'use client';

import React, { useState, useEffect } from 'react';
import { 
  Dumbbell, 
  CheckCircle2, 
  Plus, 
  TrendingUp, 
  Timer, 
  Flame, 
  Sparkles,
  Zap,
  Activity,
  Layers,
  ChevronRight,
  RotateCcw
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function InteractiveHeroShowcase() {
  const [activeTab, setActiveTab] = useState<'logger' | 'analytics' | 'templates'>('logger');
  
  // State for interactive logger simulation
  const [weight, setWeight] = useState(100);
  const [reps, setReps] = useState(8);
  const [rpe, setRpe] = useState(8.5);
  const [completedSets, setCompletedSets] = useState<number[]>([1]);
  const [restTimer, setRestTimer] = useState(74);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Calculate estimated 1RM using Epley formula: Weight * (1 + Reps/30)
  const estimated1RM = Math.round(weight * (1 + reps / 30));
  const totalVolume = weight * reps * completedSets.length;

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && restTimer > 0) {
      interval = setInterval(() => {
        setRestTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, restTimer]);

  const toggleSet = (setNumber: number) => {
    if (completedSets.includes(setNumber)) {
      setCompletedSets(completedSets.filter(s => s !== setNumber));
    } else {
      setCompletedSets([...completedSets, setNumber]);
      setIsTimerRunning(true);
      setRestTimer(90);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative mx-auto w-full max-w-4xl">
      {/* Ambient background glow */}
      <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-blue-600/30 via-cyan-500/20 to-emerald-500/30 blur-2xl opacity-60 pointer-events-none" />

      {/* Main glass frame */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/90 shadow-2xl backdrop-blur-xl">
        {/* Top window header */}
        <div className="flex flex-wrap items-center justify-between border-b border-zinc-800/80 bg-zinc-900/60 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-rose-500/80" />
            <div className="h-3 w-3 rounded-full bg-amber-500/80" />
            <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
            <span className="ml-2 text-xs font-mono text-zinc-400 hidden sm:inline-block">
              workout-manager://session/active
            </span>
          </div>

          {/* Interactive Navigation Tabs */}
          <div className="flex items-center gap-1 rounded-lg bg-zinc-950/80 p-1 border border-zinc-800">
            <button
              onClick={() => setActiveTab('logger')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all ${
                activeTab === 'logger'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Dumbbell className="h-3.5 w-3.5" />
              <span>Registro en Vivo</span>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all ${
                activeTab === 'analytics'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Analítica & 1RM</span>
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all ${
                activeTab === 'templates'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Plantillas</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6 min-h-[380px] flex flex-col justify-between">
          {activeTab === 'logger' && (
            <div className="space-y-6">
              {/* Exercise Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/60 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
                    <Dumbbell className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-zinc-100 text-base">Press de Banca Plano</h3>
                      <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-400 text-[10px]">
                        Pecho · Hipertrofia
                      </Badge>
                    </div>
                    <p className="text-xs text-zinc-400 font-mono mt-0.5">Tempo: 3-1-X-0 · Descanso: 90s</p>
                  </div>
                </div>

                {/* Rest Timer Widget */}
                <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-1.5">
                  <Timer className={`h-4 w-4 ${isTimerRunning ? 'text-amber-400 animate-pulse' : 'text-zinc-400'}`} />
                  <div className="text-left">
                    <div className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider">Descanso</div>
                    <div className="text-sm font-bold font-mono text-zinc-200">{formatTimer(restTimer)}</div>
                  </div>
                  <button 
                    onClick={() => { setIsTimerRunning(!isTimerRunning); if(!isTimerRunning && restTimer===0) setRestTimer(90); }}
                    className="ml-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                    title="Iniciar/Pausar"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Live Interactive Set Row */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3">
                  <div className="text-xs text-zinc-400 mb-1">Carga (kg)</div>
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => setWeight(Math.max(20, weight - 2.5))}
                      className="h-7 w-7 rounded-md bg-zinc-800 text-zinc-300 hover:bg-zinc-700 font-mono text-sm flex items-center justify-center transition-colors"
                    >
                      -
                    </button>
                    <span className="text-lg font-bold font-mono text-white">{weight} kg</span>
                    <button 
                      onClick={() => setWeight(weight + 2.5)}
                      className="h-7 w-7 rounded-md bg-zinc-800 text-zinc-300 hover:bg-zinc-700 font-mono text-sm flex items-center justify-center transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3">
                  <div className="text-xs text-zinc-400 mb-1">Reps</div>
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => setReps(Math.max(1, reps - 1))}
                      className="h-7 w-7 rounded-md bg-zinc-800 text-zinc-300 hover:bg-zinc-700 font-mono text-sm flex items-center justify-center transition-colors"
                    >
                      -
                    </button>
                    <span className="text-lg font-bold font-mono text-white">{reps}</span>
                    <button 
                      onClick={() => setReps(reps + 1)}
                      className="h-7 w-7 rounded-md bg-zinc-800 text-zinc-300 hover:bg-zinc-700 font-mono text-sm flex items-center justify-center transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3">
                  <div className="text-xs text-zinc-400 mb-1">RPE / Intensidad</div>
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => setRpe(Math.max(6, Math.round((rpe - 0.5) * 10) / 10))}
                      className="h-7 w-7 rounded-md bg-zinc-800 text-zinc-300 hover:bg-zinc-700 font-mono text-sm flex items-center justify-center transition-colors"
                    >
                      -
                    </button>
                    <span className="text-lg font-bold font-mono text-amber-400">@{rpe}</span>
                    <button 
                      onClick={() => setRpe(Math.min(10, Math.round((rpe + 0.5) * 10) / 10))}
                      className="h-7 w-7 rounded-md bg-zinc-800 text-zinc-300 hover:bg-zinc-700 font-mono text-sm flex items-center justify-center transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 flex flex-col justify-between">
                  <div className="text-xs text-blue-300 font-medium">1RM Estimado</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-extrabold font-mono text-blue-400">{estimated1RM}</span>
                    <span className="text-xs text-zinc-400">kg</span>
                    <span className="text-[10px] text-emerald-400 ml-auto font-mono">Epley Calc</span>
                  </div>
                </div>
              </div>

              {/* Interactive Series Table */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Series de trabajo</div>
                {[1, 2, 3, 4].map((s) => {
                  const isDone = completedSets.includes(s);
                  return (
                    <div
                      key={s}
                      onClick={() => toggleSet(s)}
                      className={`group flex items-center justify-between rounded-xl border p-3 cursor-pointer transition-all ${
                        isDone
                          ? 'border-emerald-500/30 bg-emerald-950/20 text-zinc-200'
                          : 'border-zinc-800/60 bg-zinc-900/30 hover:border-zinc-700 text-zinc-400'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-mono font-bold ${
                          isDone ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400'
                        }`}>
                          {s}
                        </div>
                        <span className="text-sm font-mono">
                          {weight} kg × {reps} reps @ RPE {rpe}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-zinc-500">
                          {isDone ? `${weight * reps} kg volumen` : 'Pendiente'}
                        </span>
                        <div className={`h-5 w-5 rounded-md border flex items-center justify-center transition-colors ${
                          isDone 
                            ? 'bg-emerald-500 border-emerald-400 text-zinc-950' 
                            : 'border-zinc-700 bg-zinc-800/50 group-hover:border-zinc-500'
                        }`}>
                          {isDone && <CheckCircle2 className="h-3.5 w-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Realtime Dynamic Metrics */}
              <div className="flex flex-wrap items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/50 px-4 py-2.5">
                <div className="flex items-center gap-4 text-xs font-mono">
                  <span className="text-zinc-400">Series completadas: <strong className="text-zinc-100">{completedSets.length}/4</strong></span>
                  <span className="text-zinc-400">Volumen acumulado: <strong className="text-emerald-400">{totalVolume} kg</strong></span>
                </div>
                <div className="text-[11px] text-zinc-500 flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                  <span>Haz clic en las series o botones para probar</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
                <div>
                  <h3 className="font-semibold text-zinc-100 text-base">Sobrecarga Progresiva & Proyección</h3>
                  <p className="text-xs text-zinc-400">Histórico de volumen y evolución de fuerza en sentadilla / banca</p>
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-mono">
                  +12.4% vs Mes Anterior
                </Badge>
              </div>

              {/* SVG Sparkline / Area Chart Visualization */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-3">
                  <span className="font-mono">Volumen Semanal (kg levantados)</span>
                  <span className="text-blue-400 font-mono">Pico: 18,450 kg</span>
                </div>

                <div className="h-36 w-full flex items-end gap-2 pt-4">
                  {[
                    { sem: 'Sem 1', vol: 11200, height: 45, rpe: 7.5 },
                    { sem: 'Sem 2', vol: 12800, height: 55, rpe: 8.0 },
                    { sem: 'Sem 3', vol: 14500, height: 68, rpe: 8.5 },
                    { sem: 'Sem 4 (Desc)', vol: 9800, height: 35, rpe: 6.5 },
                    { sem: 'Sem 5', vol: 15900, height: 78, rpe: 8.5 },
                    { sem: 'Sem 6', vol: 17200, height: 88, rpe: 9.0 },
                    { sem: 'Sem 7 (Actual)', vol: 18450, height: 96, rpe: 8.5 },
                  ].map((bar, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                      <div className="text-[10px] font-mono text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800 px-1 rounded">
                        {bar.vol}k
                      </div>
                      <div 
                        className={`w-full rounded-t-md transition-all duration-300 group-hover:brightness-125 ${
                          idx === 6 
                            ? 'bg-gradient-to-t from-blue-600 to-cyan-400 shadow-[0_0_15px_rgba(56,189,248,0.3)]' 
                            : idx === 3 
                              ? 'bg-zinc-700' 
                              : 'bg-gradient-to-t from-zinc-800 to-blue-500/70'
                        }`}
                        style={{ height: `${bar.height}%` }}
                      />
                      <span className="text-[10px] font-mono text-zinc-500 whitespace-nowrap">{bar.sem}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Muscle Fatigue & Intensity Distribution */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3">
                  <div className="text-xs text-zinc-400 mb-1">Volumen Pecho / Tríceps</div>
                  <div className="text-lg font-bold font-mono text-white">22 Series / sem</div>
                  <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full w-[85%]" />
                  </div>
                </div>
                <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3">
                  <div className="text-xs text-zinc-400 mb-1">Volumen Pierna (Cuádriceps)</div>
                  <div className="text-lg font-bold font-mono text-white">18 Series / sem</div>
                  <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full w-[70%]" />
                  </div>
                </div>
                <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3">
                  <div className="text-xs text-zinc-400 mb-1">RIR Promedio (Reserva)</div>
                  <div className="text-lg font-bold font-mono text-amber-400">1.8 RIR</div>
                  <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full w-[65%]" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
                <div>
                  <h3 className="font-semibold text-zinc-100 text-base">Motor de Rutinas & Plantillas</h3>
                  <p className="text-xs text-zinc-400">Estructuras predefinidas para atletas de fuerza, hipertrofia y resistencia</p>
                </div>
                <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                  Totalmente Personalizables
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    title: 'Push Pull Legs (PPL Hypertrophy)',
                    focus: 'Frecuencia 2x · 6 días',
                    tag: 'Hipertrofia',
                    tagColor: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
                    exercises: ['Press Militar con Barra', 'Press Banca Inclinado', 'Elevaciones Laterales', 'Extensiones Tríceps'],
                  },
                  {
                    title: 'Hyrox Race Simulator',
                    focus: 'Cardio Híbrido & Fuerza Funcional',
                    tag: 'Hyrox / Funcional',
                    tagColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
                    exercises: ['1000m SkiErg', 'Sled Push 150kg', 'Burpee Broad Jumps', 'Wall Balls 9kg'],
                  },
                  {
                    title: 'Powerlifting 5/3/1 Wave Periodization',
                    focus: 'Cargas Máximas & RPE Target',
                    tag: 'Fuerza Pura',
                    tagColor: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
                    exercises: ['Sentadilla Barra Baja', 'Press Banca Competición', 'Peso Muerto Convencional'],
                  },
                  {
                    title: 'Upper / Lower Torso Pierna',
                    focus: 'Frecuencia Óptima 4 días',
                    tag: 'Atletas Híbridos',
                    tagColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
                    exercises: ['Dominadas Lastradas', 'Sentadilla Búlgara', 'Fondos en Paralelas', 'Hip Thrust'],
                  },
                ].map((item, idx) => (
                  <div 
                    key={idx}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3.5 hover:border-zinc-700 hover:bg-zinc-900/70 transition-all text-left"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md border ${item.tagColor}`}>
                        {item.tag}
                      </span>
                      <span className="text-[11px] text-zinc-500 font-mono">{item.focus}</span>
                    </div>
                    <h4 className="font-semibold text-zinc-200 text-sm">{item.title}</h4>
                    <div className="mt-2.5 flex flex-wrap gap-1">
                      {item.exercises.map((ex, i) => (
                        <span key={i} className="text-[11px] bg-zinc-800/80 text-zinc-400 px-2 py-0.5 rounded">
                          {ex}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
