'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, Heart, Flame, Clock, Award, Timer, Activity } from 'lucide-react';

interface ProgressCrossfitCardioProps {
  crossfit: {
    totalWods: number;
    wods: {
      id: number;
      name: string;
      date: string;
      totalTimeMinutes: number;
      exercisesCount: number;
      notes: string | null;
    }[];
  };
  hyroxCardio: {
    totalMinutes: number;
    totalSessions: number;
    sessions: {
      id: number;
      name: string;
      date: string;
      totalTimeMinutes: number;
      notes: string | null;
    }[];
  };
}

export function ProgressCrossfitCardio({ crossfit, hyroxCardio }: ProgressCrossfitCardioProps) {
  return (
    <div className="space-y-6">
      {/* ─── 1. RESUMEN DE SESIONES FUNCIONALES Y CARDIO ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">WODs / CrossFit</span>
            <p className="text-2xl font-black text-orange-600 dark:text-orange-400 tabular-nums">
              {crossfit.totalWods}
            </p>
            <p className="text-[11px] text-gray-400">sesiones funcionales</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Sesiones Hyrox / Cardio</span>
            <p className="text-2xl font-black text-pink-600 dark:text-pink-400 tabular-nums">
              {hyroxCardio.totalSessions}
            </p>
            <p className="text-[11px] text-gray-400">entrenamientos de resistencia</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Tiempo en Cardio</span>
            <p className="text-2xl font-black text-gray-900 dark:text-gray-100 tabular-nums">
              {hyroxCardio.totalMinutes} <span className="text-xs font-bold text-gray-400">min</span>
            </p>
            <p className="text-[11px] text-gray-400">{(hyroxCardio.totalMinutes / 60).toFixed(1)} horas acumuladas</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Intensidad Media</span>
            <p className="text-lg font-black text-gray-900 dark:text-gray-100 flex items-center gap-1">
              <Flame className="w-4 h-4 text-orange-500" />
              Alta / Aeróbica
            </p>
            <p className="text-[11px] text-emerald-600 font-semibold">Resistencia metabólica</p>
          </CardContent>
        </Card>
      </div>

      {/* ─── 2. SECCIÓN WODS & BENCHMARKS DE CROSSFIT ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CrossFit WODs */}
        <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
          <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800 bg-orange-50/40 dark:bg-orange-950/20">
            <CardTitle className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Zap className="w-4 h-4 text-orange-600" />
              Historial de WODs & Sesiones CrossFit
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-3">
            {crossfit.wods.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-6">
                No hay WODs de CrossFit o Funcional registrados todavía.
              </p>
            ) : (
              <div className="space-y-2">
                {crossfit.wods.map((wod) => (
                  <div
                    key={wod.id}
                    className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="font-bold text-xs text-gray-900 dark:text-gray-100 truncate">{wod.name}</p>
                      <div className="flex items-center gap-2 text-[11px] text-gray-400">
                        <span>{new Date(wod.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                        <span>·</span>
                        <span>{wod.exercisesCount} ejercicios</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 bg-white dark:bg-gray-900 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 font-mono text-xs font-bold text-orange-600 dark:text-orange-400">
                      <Timer className="w-3.5 h-3.5" />
                      <span>{wod.totalTimeMinutes > 0 ? `${wod.totalTimeMinutes} min` : 'Completado'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hyrox & Endurance */}
        <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-2xs">
          <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800 bg-pink-50/40 dark:bg-pink-950/20">
            <CardTitle className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Heart className="w-4 h-4 text-pink-600" />
              Sesiones Hyrox & Cardio / Endurance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-3">
            {hyroxCardio.sessions.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-6">
                No hay sesiones de Hyrox o Cardio registradas todavía.
              </p>
            ) : (
              <div className="space-y-2">
                {hyroxCardio.sessions.map((sess) => (
                  <div
                    key={sess.id}
                    className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="font-bold text-xs text-gray-900 dark:text-gray-100 truncate">{sess.name}</p>
                      <div className="flex items-center gap-2 text-[11px] text-gray-400">
                        <span>{new Date(sess.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 bg-white dark:bg-gray-900 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 font-mono text-xs font-bold text-pink-600 dark:text-pink-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{sess.totalTimeMinutes > 0 ? `${sess.totalTimeMinutes} min` : 'Completado'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
