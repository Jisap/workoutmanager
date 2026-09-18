'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProgressGeneralStats } from './progress-general-stats';
import { ProgressMusculacion } from './progress-musculacion';
import { ProgressPowerlifting } from './progress-powerlifting';
import { ProgressCrossfitCardio } from './progress-crossfit-cardio';
import { ProgressCorporal } from './progress-corporal';
import { ExerciseProgressChart } from './exercise-progress-chart';
import { ConsistencyHeatmap } from './consitency-heatmap';
import type { BodyMeasurementDTO } from './measurements-actions';
import {
  BarChart3,
  Dumbbell,
  Zap,
  Award,
  LineChart,
  Calendar,
  Trophy,
  Flame,
  Activity,
  Heart,
  Scale,
} from 'lucide-react';

interface ProgressClientProps {
  advancedData: {
    general: any;
    musculacion: any;
    powerlifting: any;
    crossfit: any;
    hyroxCardio: any;
  };
  progressData: {
    prs: any[];
    weeklyVolume: any[];
    totalWorkouts: number;
  };
  availableExercises: any[];
  selectedExerciseId: number | null;
  exerciseProgress: any;
  consistencyData: any;
  bodyMeasurements: BodyMeasurementDTO[];
  initialTab?: 'general' | 'musculacion' | 'powerlifting' | 'crossfit' | 'exercise' | 'corporal';
}

export function ProgressClient({
  advancedData,
  progressData,
  availableExercises,
  selectedExerciseId,
  exerciseProgress,
  consistencyData,
  bodyMeasurements,
  initialTab = 'general',
}: ProgressClientProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'musculacion' | 'powerlifting' | 'crossfit' | 'exercise' | 'corporal'>(initialTab);

  const tabs = [
    { id: 'general', label: 'General', icon: BarChart3, color: 'text-blue-600' },
    { id: 'musculacion', label: 'Musculación', icon: Dumbbell, color: 'text-purple-600' },
    { id: 'powerlifting', label: 'Powerlifting (Big 3)', icon: Award, color: 'text-orange-600' },
    { id: 'crossfit', label: 'CrossFit & Hyrox', icon: Zap, color: 'text-pink-600' },
    { id: 'exercise', label: 'Por Ejercicio', icon: LineChart, color: 'text-emerald-600' },
    { id: 'corporal', label: 'Corporal', icon: Scale, color: 'text-sky-600' },
  ];

  return (
    <div className="space-y-6">
      {/* ─── NAVEGACIÓN POR PESTAÑAS ─── */}
      <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800/80 p-1 rounded-2xl border border-gray-200/80 dark:border-gray-700 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-xs'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? tab.color : 'text-gray-400 dark:text-gray-500'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─── CONTENIDO DE CADA PESTAÑA ─── */}

      {/* 1. TAB GENERAL */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          <ProgressGeneralStats general={advancedData.general} />

          {/* Récords Personales (Top 5 PRs) */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Récords Personales (Top PRs)</h3>
            </div>

            {progressData.prs.length === 0 ? (
              <Card className="bg-gray-50/50 border-dashed dark:bg-gray-800/30 dark:border-gray-700">
                <CardContent className="py-6 text-center text-xs text-gray-400">
                  Aún no hay récords registrados.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {progressData.prs.map((pr, index) => (
                  <Card key={index} className="border-l-4 border-l-yellow-400 dark:bg-gray-900 border-gray-200 dark:border-gray-700 shadow-2xs">
                    <CardContent className="p-3.5 space-y-1">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 truncate">{pr.exerciseName}</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-black text-gray-900 dark:text-gray-100 tabular-nums">{pr.weight} kg</span>
                        <span className="text-xs text-gray-500">× {pr.reps} reps</span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {new Date(pr.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Mapa de Calor y Consistencia */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Consistencia y Registro Diario</h3>
            </div>
            <ConsistencyHeatmap data={consistencyData} />
          </section>
        </div>
      )}

      {/* 2. TAB MUSCULACIÓN */}
      {activeTab === 'musculacion' && (
        <ProgressMusculacion musculacion={advancedData.musculacion} />
      )}

      {/* 3. TAB POWERLIFTING */}
      {activeTab === 'powerlifting' && (
        <ProgressPowerlifting powerlifting={advancedData.powerlifting} />
      )}

      {/* 4. TAB CROSSFIT & HYROX */}
      {activeTab === 'crossfit' && (
        <ProgressCrossfitCardio
          crossfit={advancedData.crossfit}
          hyroxCardio={advancedData.hyroxCardio}
        />
      )}

      {/* 6. TAB CORPORAL (peso, composición y perímetros) */}
      {activeTab === 'corporal' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-sky-600" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
              Seguimiento Corporal
            </h3>
          </div>

          <ProgressCorporal measurements={bodyMeasurements} />
        </div>
      )}

      {/* 5. TAB POR EJERCICIO (Analítica individual) */}
      {activeTab === 'exercise' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <LineChart className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
              Progresión Detallada por Ejercicio
            </h3>
          </div>

          <ExerciseProgressChart
            availableExercises={availableExercises}
            selectedExerciseId={selectedExerciseId}
            data={exerciseProgress}
          />
        </div>
      )}
    </div>
  );
}
