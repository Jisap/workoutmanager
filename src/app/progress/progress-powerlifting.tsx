'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dumbbell, Trophy, Zap, TrendingUp, ShieldAlert, Award } from 'lucide-react';

interface LiftStats {
  name: string;
  maxWeightReal: number;
  estimated1RM: number;
  estimated3RM: number;
  estimated5RM: number;
  totalSets: number;
  history: {
    date: string;
    weight: number;
    reps: number;
    estimated1RM: number;
    workoutName: string;
  }[];
}

interface ProgressPowerliftingProps {
  powerlifting: {
    squat: LiftStats;
    bench: LiftStats;
    deadlift: LiftStats;
    sbdTotal: number;
    sbdRealTotal: number;
  };
}

export function ProgressPowerlifting({ powerlifting }: ProgressPowerliftingProps) {
  const { squat, bench, deadlift, sbdTotal, sbdRealTotal } = powerlifting;

  const lifts = [
    {
      key: 'squat',
      title: 'Sentadilla (Squat)',
      data: squat,
      color: {
        badge: 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        text: 'text-purple-600 dark:text-purple-400',
        border: 'border-purple-200 dark:border-purple-800',
        bg: 'bg-purple-50/50 dark:bg-purple-950/20',
      },
    },
    {
      key: 'bench',
      title: 'Press de Banca (Bench Press)',
      data: bench,
      color: {
        badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        text: 'text-blue-600 dark:text-blue-400',
        border: 'border-blue-200 dark:border-blue-800',
        bg: 'bg-blue-50/50 dark:bg-blue-950/20',
      },
    },
    {
      key: 'deadlift',
      title: 'Peso Muerto (Deadlift)',
      data: deadlift,
      color: {
        badge: 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800',
        text: 'text-orange-600 dark:text-orange-400',
        border: 'border-orange-200 dark:border-orange-800',
        bg: 'bg-orange-50/50 dark:bg-orange-950/20',
      },
    },
  ];

  return (
    <div className="space-y-6">
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

            <div className="flex items-baseline gap-2 bg-white dark:bg-gray-800/80 px-4 py-3 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-2xs self-stretch sm:self-auto justify-center">
              <span className="text-3xl sm:text-4xl font-black text-purple-600 dark:text-purple-400 tabular-nums">
                {sbdTotal.toFixed(1)}
              </span>
              <span className="text-sm font-bold text-gray-500 dark:text-gray-400">kg (1RM)</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-5 pt-4 border-t border-gray-200/60 dark:border-gray-800 text-center">
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Sentadilla 1RM</p>
              <p className="text-base sm:text-lg font-black text-gray-900 dark:text-gray-100 tabular-nums">
                {squat.estimated1RM} kg
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Banca 1RM</p>
              <p className="text-base sm:text-lg font-black text-gray-900 dark:text-gray-100 tabular-nums">
                {bench.estimated1RM} kg
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Peso Muerto 1RM</p>
              <p className="text-base sm:text-lg font-black text-gray-900 dark:text-gray-100 tabular-nums">
                {deadlift.estimated1RM} kg
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── 2. DETALLE DE CADA MOVIMIENTO (1RM, 3RM, 5RM y Cargas Reales) ─── */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Award className="w-4 h-4 text-purple-600" />
          Récords y Proyecciones por Levantamiento (1RM / 3RM / 5RM)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {lifts.map(({ key, title, data, color }) => (
            <Card key={key} className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs overflow-hidden flex flex-col justify-between">
              <div>
                <CardHeader className={`pb-3 border-b border-gray-100 dark:border-gray-800 ${color.bg}`}>
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
                          <div key={hIdx} className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                            <span className="text-[11px]">
                              {new Date(h.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                            </span>
                            <span className="font-mono text-[11px] font-semibold text-gray-900 dark:text-gray-200">
                              {h.weight}kg × {h.reps} reps (1RM ~{h.estimated1RM}kg)
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
