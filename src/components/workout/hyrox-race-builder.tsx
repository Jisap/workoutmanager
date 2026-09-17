'use client';

import React, { useState } from 'react';
import {
  Flame,
  Zap,
  Timer,
  Trophy,
  Dumbbell,
  CheckCircle2,
  Sparkles,
  Layers,
} from 'lucide-react';
import { AvailableExercise } from '@/app/workouts/log/workout-logger-client';

export type HyroxDivision = 'open-men' | 'open-women' | 'pro-men' | 'pro-women' | 'doubles';
export type HyroxPresetType = 'full' | 'half' | 'power' | 'engine';

interface HyroxPresetConfig {
  name: string;
  description: string;
  icon: React.ElementType;
  segmentsCount: number;
}

const PRESET_OPTIONS: Record<HyroxPresetType, HyroxPresetConfig> = {
  full: {
    name: 'Carrera Oficial Completa (16 Tramos)',
    description: '8 × 1km Running + 8 Estaciones en el orden oficial reglamentario',
    icon: Trophy,
    segmentsCount: 16,
  },
  half: {
    name: 'Media Simulación (Half Hyrox)',
    description: '4 × 1km Running alternado con 4 Estaciones principales',
    icon: Zap,
    segmentsCount: 8,
  },
  power: {
    name: 'Bloque de Fuerza & Trineos (Power)',
    description: 'Sled Push, Sled Pull, Farmers Carry y Sandbag Lunges',
    icon: Dumbbell,
    segmentsCount: 4,
  },
  engine: {
    name: 'Bloque Ergómetros & Metabólico (Engine)',
    description: 'Running, SkiErg, Remo, Burpees y Wall Balls',
    icon: Timer,
    segmentsCount: 6,
  },
};

const DIVISION_OPTIONS: { id: HyroxDivision; label: string; sub: string; badge: string }[] = [
  { id: 'open-men', label: 'Open Masculino', sub: 'Estándar Oficial Men', badge: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' },
  { id: 'open-women', label: 'Open Femenino', sub: 'Estándar Oficial Women', badge: 'bg-pink-100 text-pink-800 dark:bg-pink-950/60 dark:text-pink-300' },
  { id: 'pro-men', label: 'Pro Masculino', sub: 'Cargas Máximas Pro Men', badge: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300' },
  { id: 'pro-women', label: 'Pro Femenino', sub: 'Cargas Máximas Pro Women', badge: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300' },
  { id: 'doubles', label: 'Doubles / Parejas', sub: 'Relevos Compartidos', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' },
];

interface HyroxStationSpec {
  searchQuery: string[];
  defaultName: string;
  distance: number | null;
  reps: number | null;
  getWeight: (div: HyroxDivision) => number | null;
  notes: string;
}

const OFFICIAL_STATIONS_SPECS: HyroxStationSpec[] = [
  {
    searchQuery: ['running (1000m)', 'running', 'carrera', 'correr'],
    defaultName: 'Running (1000m)',
    distance: 1000,
    reps: 0,
    getWeight: () => null,
    notes: '1 km Run en pista / ritmo continuo',
  },
  {
    searchQuery: ['skierg (1000m)', 'skierg', 'ski erg', 'ski'],
    defaultName: 'SkiErg (1000m)',
    distance: 1000,
    reps: 0,
    getWeight: () => null,
    notes: 'Estación 1: 1000m SkiErg',
  },
  {
    searchQuery: ['sled push', 'trineo empuje', 'empuje de trineo'],
    defaultName: 'Sled Push',
    distance: 50,
    reps: 0,
    getWeight: (div) => {
      if (div === 'open-men' || div === 'pro-women' || div === 'doubles') return 152;
      if (div === 'open-women') return 102;
      if (div === 'pro-men') return 202;
      return 152;
    },
    notes: 'Estación 2: 4 × 12.5m (50m total)',
  },
  {
    searchQuery: ['sled pull', 'trineo tracción', 'arrastre de trineo'],
    defaultName: 'Sled Pull',
    distance: 50,
    reps: 0,
    getWeight: (div) => {
      if (div === 'open-men' || div === 'pro-women' || div === 'doubles') return 103;
      if (div === 'open-women') return 78;
      if (div === 'pro-men') return 153;
      return 103;
    },
    notes: 'Estación 3: 4 × 12.5m con cuerda (50m total)',
  },
  {
    searchQuery: ['burpee broad jump', 'burpee salto', 'burpees', 'burpee'],
    defaultName: 'Burpees Broad Jump',
    distance: 80,
    reps: 0,
    getWeight: () => null,
    notes: 'Estación 4: 80m salto en longitud',
  },
  {
    searchQuery: ['remo (1000m)', 'remo', 'rowing', 'rower'],
    defaultName: 'Remo (1000m)',
    distance: 1000,
    reps: 0,
    getWeight: () => null,
    notes: 'Estación 5: 1000m Concept2 Rower',
  },
  {
    searchQuery: ['farmer carry', 'farmers carry', 'paseo del granjero'],
    defaultName: 'Farmer Carry',
    distance: 200,
    reps: 0,
    getWeight: (div) => {
      if (div === 'open-men' || div === 'pro-women' || div === 'doubles') return 48; // 2x24kg
      if (div === 'open-women') return 32; // 2x16kg
      if (div === 'pro-men') return 64; // 2x32kg
      return 48;
    },
    notes: 'Estación 6: 200m (2 Kettlebells)',
  },
  {
    searchQuery: ['sandbag carry', 'sandbag lunges', 'zancadas saco', 'zancadas'],
    defaultName: 'Sandbag Lunges',
    distance: 100,
    reps: 0,
    getWeight: (div) => {
      if (div === 'open-men' || div === 'pro-women' || div === 'doubles') return 20;
      if (div === 'open-women') return 10;
      if (div === 'pro-men') return 30;
      return 20;
    },
    notes: 'Estación 7: 100m zancadas con saco a hombro',
  },
  {
    searchQuery: ['wall balls', 'wall ball', 'balon medicinal'],
    defaultName: 'Wall Balls',
    distance: 0,
    reps: 100,
    getWeight: (div) => {
      if (div === 'open-men' || div === 'pro-women' || div === 'doubles') return 6;
      if (div === 'open-women') return 4;
      if (div === 'pro-men') return 9;
      return 6;
    },
    notes: 'Estación 8: 100 reps (75 reps en Open Women)',
  },
];

export interface HyroxGeneratedExercise {
  id: string;
  exerciseId: number;
  name: string;
  sets: {
    id: string;
    repCount: number;
    weight: number | null;
    distance: number | null;
    durationSeconds: number | null;
    isCompleted: boolean;
  }[];
}

interface HyroxRaceBuilderProps {
  availableExercises: AvailableExercise[];
  onApplyPreset: (presetTitle: string, exercisesList: HyroxGeneratedExercise[]) => void;
}

export function HyroxRaceBuilder({ availableExercises, onApplyPreset }: HyroxRaceBuilderProps) {
  const [selectedDivision, setSelectedDivision] = useState<HyroxDivision>('open-men');
  const [selectedPreset, setSelectedPreset] = useState<HyroxPresetType>('full');
  const [isApplied, setIsApplied] = useState(false);

  // Helper para buscar ID de ejercicio existente en la BD o usar el primero
  const findExerciseId = (queryList: string[]): { id: number; name: string } => {
    for (const q of queryList) {
      const match = availableExercises.find((ex) =>
        ex.name.toLowerCase().includes(q.toLowerCase())
      );
      if (match) return { id: match.id, name: match.name };
    }
    const fallback = availableExercises[0] || { id: 1, name: 'Ejercicio' };
    return { id: fallback.id, name: queryList[0] };
  };

  const handleGenerate = () => {
    const runSpec = OFFICIAL_STATIONS_SPECS[0]; // Running (1000m)
    const stations = OFFICIAL_STATIONS_SPECS.slice(1); // 8 stations

    let sequence: HyroxStationSpec[] = [];

    if (selectedPreset === 'full') {
      // 8 veces [1km Run + Estación i]
      for (let i = 0; i < 8; i++) {
        sequence.push(runSpec);
        sequence.push(stations[i]);
      }
    } else if (selectedPreset === 'half') {
      // 4 tramos: Run + Ski, Run + Sled Push, Run + Remo, Run + Wall Balls
      const halfStations = [stations[0], stations[1], stations[4], stations[7]];
      for (let i = 0; i < 4; i++) {
        sequence.push(runSpec);
        sequence.push(halfStations[i]);
      }
    } else if (selectedPreset === 'power') {
      // Sled Push, Sled Pull, Farmers, Sandbag
      sequence = [stations[1], stations[2], stations[5], stations[6]];
    } else if (selectedPreset === 'engine') {
      // Run, Ski, Run, Remo, Burpees, Wall Balls
      sequence = [runSpec, stations[0], runSpec, stations[4], stations[3], stations[7]];
    }

    // Mapear cada spec a LocalExercise
    const generated = sequence.map((spec, idx) => {
      const exFound = findExerciseId(spec.searchQuery);
      const wVal = spec.getWeight(selectedDivision);
      const repsVal = spec.defaultName.includes('Wall Balls') && selectedDivision === 'open-women' ? 75 : spec.reps || 0;

      return {
        id: crypto.randomUUID(),
        exerciseId: exFound.id,
        name: `${idx + 1}. ${exFound.name}`,
        sets: [
          {
            id: crypto.randomUUID(),
            repCount: repsVal,
            weight: wVal,
            distance: spec.distance,
            durationSeconds: null,
            isCompleted: false,
          },
        ],
      };
    });

    const divisionObj = DIVISION_OPTIONS.find((d) => d.id === selectedDivision);
    const presetObj = PRESET_OPTIONS[selectedPreset];
    const title = `Hyrox ${presetObj.name.split('(')[0].trim()} · ${divisionObj?.label}`;

    onApplyPreset(title, generated);
    setIsApplied(true);
    setTimeout(() => setIsApplied(false), 3000);
  };

  return (
    <div className="bg-gradient-to-br from-purple-50/90 via-indigo-50/40 to-white dark:from-purple-950/30 dark:via-gray-900/60 dark:to-gray-900 border border-purple-200/90 dark:border-purple-800/60 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-200/60 dark:border-purple-800/40 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-600 text-white shadow-xs">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                Generador de Carrera & Plantillas Hyrox
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-200 dark:bg-purple-900 text-purple-900 dark:text-purple-200">
                1-Click Preset
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Genera automáticamente los bloques ordenados con distancias y cargas reglamentarias.
            </p>
          </div>
        </div>

        {/* Botón de acción principal */}
        <button
          type="button"
          onClick={handleGenerate}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-2 shrink-0 ${
            isApplied
              ? 'bg-emerald-600 text-white'
              : 'bg-purple-600 hover:bg-purple-700 text-white active:scale-98'
          }`}
        >
          {isApplied ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>¡Secuencia Cargada!</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Cargar Plantilla Hyrox</span>
            </>
          )}
        </button>
      </div>

      {/* 1. Selector de División / Categoría Oficial */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-gray-800 dark:text-gray-200">
          <span className="flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-purple-600" />
            1. Selecciona División Oficial (Pesos Reglamentados)
          </span>
          <span className="text-[11px] text-gray-400 font-normal">
            Auto-rellena kg de trineos, kettlebells y balón
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {DIVISION_OPTIONS.map((div) => {
            const isSelected = selectedDivision === div.id;
            return (
              <button
                key={div.id}
                type="button"
                onClick={() => setSelectedDivision(div.id)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-purple-600 text-white border-purple-700 shadow-xs ring-2 ring-purple-300 dark:ring-purple-900'
                    : 'bg-white dark:bg-gray-800/90 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:border-purple-300'
                }`}
              >
                <div className="font-bold text-xs truncate">{div.label}</div>
                <div className={`text-[10px] mt-0.5 truncate ${isSelected ? 'text-purple-100' : 'text-gray-400'}`}>
                  {div.sub}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Selector de Formato de Sesión */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between text-xs font-bold text-gray-800 dark:text-gray-200">
          <span className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-purple-600" />
            2. Formato de Entrenamiento
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {(Object.keys(PRESET_OPTIONS) as HyroxPresetType[]).map((pKey) => {
            const preset = PRESET_OPTIONS[pKey];
            const Icon = preset.icon;
            const isSelected = selectedPreset === pKey;
            return (
              <button
                key={pKey}
                type="button"
                onClick={() => setSelectedPreset(pKey)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                  isSelected
                    ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 text-purple-900 dark:text-purple-200 shadow-2xs'
                    : 'bg-white dark:bg-gray-800/80 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-purple-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-purple-600' : 'text-gray-400'}`} />
                    <span>{preset.name.split('(')[0]}</span>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                    {preset.segmentsCount} tramos
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2">
                  {preset.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
