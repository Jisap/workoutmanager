'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dumbbell, Layers, TrendingUp, Sparkles, PieChart, Activity } from 'lucide-react';

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
  };
}

export function ProgressMusculacion({ musculacion }: ProgressMusculacionProps) {
  const { muscleGroups, pushPullLegsBalance } = musculacion;

  const groupColors: Record<string, { bar: string; text: string; bg: string }> = {
    Pecho: { bar: 'bg-blue-500', text: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-50 dark:bg-blue-950/30' },
    Espalda: { bar: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
    Piernas: { bar: 'bg-purple-500', text: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-50 dark:bg-purple-950/30' },
    Gluteos: { bar: 'bg-pink-500', text: 'text-pink-700 dark:text-pink-300', bg: 'bg-pink-50 dark:bg-pink-950/30' },
    Hombros: { bar: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-950/30' },
    Brazos: { bar: 'bg-cyan-500', text: 'text-cyan-700 dark:text-cyan-300', bg: 'bg-cyan-50 dark:bg-cyan-950/30' },
    Core: { bar: 'bg-rose-500', text: 'text-rose-700 dark:text-rose-300', bg: 'bg-rose-50 dark:bg-rose-950/30' },
    Otros: { bar: 'bg-gray-500', text: 'text-gray-700 dark:text-gray-300', bg: 'bg-gray-50 dark:bg-gray-950/30' },
  };

  return (
    <div className="space-y-6">
      {/* ─── 1. KPIs DE MUSCULACIÓN ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Volumen en Hipertrofia</span>
            <p className="text-2xl font-black text-gray-900 dark:text-gray-100 tabular-nums">
              {(musculacion.totalVolume / 1000).toFixed(1)}k <span className="text-xs font-bold text-blue-600">kg</span>
            </p>
            <p className="text-[11px] text-gray-400">{musculacion.totalVolume.toLocaleString('es-ES')} kg totales</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Series Efectivas</span>
            <p className="text-2xl font-black text-gray-900 dark:text-gray-100 tabular-nums">
              {musculacion.totalSets}
            </p>
            <p className="text-[11px] text-gray-400">series registradas</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Grupos Trabajados</span>
            <p className="text-2xl font-black text-gray-900 dark:text-gray-100 tabular-nums">
              {muscleGroups.length}
            </p>
            <p className="text-[11px] text-gray-400">zonas musculares activas</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Grupo Dominante</span>
            <p className="text-lg font-black text-gray-900 dark:text-gray-100 truncate">
              {muscleGroups[0]?.name || '—'}
            </p>
            <p className="text-[11px] text-gray-400 font-semibold text-emerald-600">
              {muscleGroups[0]?.percentage ? `${muscleGroups[0].percentage}% del volumen` : 'Sin datos'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ─── 2. BALANCE EMPUJE / TIRÓN / PIERNA (PPL) ─── */}
      <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
        <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40">
          <CardTitle className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            Balance de Fuerzas: Empuje vs. Tirón vs. Pierna (PPL)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 space-y-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Distribución proporcional del volumen para asegurar un desarrollo simétrico y prevenir descompensaciones:
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

      {/* ─── 3. VOLUMEN POR GRUPO MUSCULAR Y TOP EJERCICIOS ─── */}
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

                    {/* Top 3 ejercicios del grupo */}
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
