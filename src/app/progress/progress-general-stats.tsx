'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame, Calendar, Clock, Trophy, TrendingUp, Sparkles, ShieldCheck, BatteryCharging, CheckCircle2 } from 'lucide-react';

interface ProgressGeneralStatsProps {
  general: {
    totalWorkouts: number;
    thisMonthCount: number;
    thisYearCount: number;
    totalHours: number;
    totalVolumeKg: number;
    currentStreak: number;
    longestStreak: number;
    weeklyDistribution: {
      day: string;
      short: string;
      count: number;
      percentage: number;
    }[];
    recovery: {
      status: 'ready' | 'almost_ready' | 'recovering';
      message: string;
      hoursSince: number;
      targetRestHours: number;
      remainingHours: number;
      percentage: number;
      lastWorkoutName: string | null;
      lastWorkoutTypeName: string | null;
      lastWorkoutDate: Date | string | null;
    };
  };
}

export function ProgressGeneralStats({ general }: ProgressGeneralStatsProps) {
  const { recovery } = general;

  // Color de recuperación según el estado
  const recoveryColor =
    recovery.status === 'ready'
      ? {
          bg: 'bg-emerald-50 dark:bg-emerald-950/30',
          border: 'border-emerald-200 dark:border-emerald-800',
          text: 'text-emerald-700 dark:text-emerald-300',
          badge: 'bg-emerald-500 text-white',
          bar: 'bg-emerald-500',
        }
      : recovery.status === 'almost_ready'
      ? {
          bg: 'bg-amber-50 dark:bg-amber-950/30',
          border: 'border-amber-200 dark:border-amber-800',
          text: 'text-amber-700 dark:text-amber-300',
          badge: 'bg-amber-500 text-white',
          bar: 'bg-amber-500',
        }
      : {
          bg: 'bg-blue-50 dark:bg-blue-950/30',
          border: 'border-blue-200 dark:border-blue-800',
          text: 'text-blue-700 dark:text-blue-300',
          badge: 'bg-blue-500 text-white',
          bar: 'bg-blue-500',
        };

  return (
    <div className="space-y-6">
      {/* ─── 1. TARJETAS DE MÉTRICAS GLOBALES ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total y Mensual */}
        <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
          <CardContent className="p-4 sm:p-5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Días Entrenados</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 pt-1">
              <span className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-gray-100 tabular-nums">
                {general.totalWorkouts}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">totales</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-100 dark:border-gray-800 mt-2">
              <span>Este mes: <strong className="text-gray-900 dark:text-gray-200 font-bold">{general.thisMonthCount}</strong></span>
              <span>·</span>
              <span>Este año: <strong className="text-gray-900 dark:text-gray-200 font-bold">{general.thisYearCount}</strong></span>
            </div>
          </CardContent>
        </Card>

        {/* Rachas */}
        <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
          <CardContent className="p-4 sm:p-5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Racha de Días</span>
              <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/50 flex items-center justify-center text-orange-600 dark:text-orange-400">
                <Flame className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 pt-1">
              <span className="text-2xl sm:text-3xl font-black text-orange-600 dark:text-orange-400 tabular-nums flex items-center gap-1">
                {general.currentStreak}
                <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">días</span>
              </span>
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-100 dark:border-gray-800 mt-2">
              Récord histórico: <strong className="text-gray-900 dark:text-gray-200 font-bold">{general.longestStreak}</strong> días seguidos
            </div>
          </CardContent>
        </Card>

        {/* Volumen Total */}
        <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
          <CardContent className="p-4 sm:p-5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Carga Acumulada</span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5 pt-1">
              <span className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-gray-100 tabular-nums">
                {general.totalVolumeKg > 1000
                  ? (general.totalVolumeKg / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 })
                  : general.totalVolumeKg}
              </span>
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                {general.totalVolumeKg > 1000 ? 'toneladas' : 'kg'}
              </span>
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-100 dark:border-gray-800 mt-2 truncate">
              {general.totalVolumeKg.toLocaleString('es-ES')} kg levantados
            </div>
          </CardContent>
        </Card>

        {/* Horas Totales */}
        <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
          <CardContent className="p-4 sm:p-5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Tiempo Invertido</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5 pt-1">
              <span className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-gray-100 tabular-nums">
                {general.totalHours}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">horas</span>
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-100 dark:border-gray-800 mt-2">
              Promedio: <strong className="text-gray-900 dark:text-gray-200 font-bold">{general.totalWorkouts > 0 ? Math.round((general.totalHours * 60) / general.totalWorkouts) : 0} min</strong> / sesión
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── 2. SECCIÓN RECUPERACIÓN INTELIGENTE & DISTRIBUCIÓN SEMANAL ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Widget de Descanso y Recuperación Recomendada */}
        <Card className="lg:col-span-6 border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs overflow-hidden">
          <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <BatteryCharging className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Estado de Recuperación & Descanso
              </CardTitle>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${recoveryColor.badge}`}>
                {recovery.status === 'ready' ? 'Listo' : recovery.status === 'almost_ready' ? 'En reposo' : 'Recuperando'}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-4">
            <div className={`p-3.5 rounded-xl border ${recoveryColor.bg} ${recoveryColor.border} space-y-2`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${recoveryColor.text} flex items-center gap-1.5`}>
                  <ShieldCheck className="w-4 h-4" />
                  {recovery.message}
                </span>
                <span className={`text-xs font-black tabular-nums ${recoveryColor.text}`}>
                  {recovery.percentage}%
                </span>
              </div>

              {/* Barra de progreso de recuperación */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full ${recoveryColor.bar} transition-all duration-700 ease-out`}
                  style={{ width: `${recovery.percentage}%` }}
                />
              </div>
            </div>

            {recovery.lastWorkoutName ? (
              <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 dark:text-gray-500">Último entrenamiento:</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[200px]">
                    {recovery.lastWorkoutName}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 dark:text-gray-500">Tiempo transcurrido:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    hace {recovery.hoursSince} horas
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 dark:text-gray-500">Descanso objetivo sugerido:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {recovery.targetRestHours}h de descanso
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500 text-center py-2">
                Registra tu primer entrenamiento para activar el cálculo de recuperación muscular.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Distribución Semanal (Lunes a Domingo) */}
        <Card className="lg:col-span-6 border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs overflow-hidden">
          <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40">
            <CardTitle className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Distribución Semanal de Entrenamientos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Frecuencia histórica de sesiones realizadas según el día de la semana:
            </p>

            <div className="grid grid-cols-7 gap-1.5 sm:gap-2 pt-2 text-center">
              {general.weeklyDistribution.map((d) => (
                <div key={d.day} className="flex flex-col items-center gap-1.5">
                  <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">{d.short}</span>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 h-24 rounded-lg flex items-end overflow-hidden p-0.5">
                    <div
                      className={`w-full rounded-md transition-all duration-500 ${
                        d.count > 0 ? 'bg-blue-600 dark:bg-blue-500' : 'bg-transparent'
                      }`}
                      style={{ height: `${Math.max(d.percentage, d.count > 0 ? 15 : 0)}%` }}
                    />
                  </div>
                  <span className="text-xs font-black text-gray-900 dark:text-gray-100 tabular-nums">
                    {d.count}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
