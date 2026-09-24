'use client';

import { useTransitionNavigate } from '@/components/layout/route-transition';
import { Dumbbell, Flame, Play, PencilRuler } from 'lucide-react';

interface SimpleType {
  id: number;
  name: string;
  description: string | null;
}

function pickTypeId(types: SimpleType[], keywords: string[], fallbackIndex: number): number {
  const lower = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const kw of keywords) {
    const found = types.find((t) => lower(t.name).includes(kw));
    if (found) return found.id;
  }
  return types[fallbackIndex]?.id ?? types[0]?.id ?? 1;
}

export function NewWorkoutOnboarding({ types }: { types: SimpleType[] }) {
  const navigate = useTransitionNavigate();
  if (types.length === 0) return null;

  const crossfitId = pickTypeId(types, ['crossfit', 'funcional', 'wod'], 0);
  const strengthId = pickTypeId(types, ['muscu', 'fuerza', 'gym'], 0);

  const cards = [
    {
      name: 'Fran',
      scheme: '21-15-9',
      desc: 'Thrusters + dominadas. El benchmark por excelencia.',
      icon: Flame,
      accent: 'bg-orange-500',
      action: () => navigate(`/workouts/log?mode=free&typeId=${crossfitId}`),
      cta: 'Hacer Fran',
      hint: 'Dentro del logger lo cargas en “WODs” con un toque',
    },
    {
      name: 'Cindy',
      scheme: 'AMRAP 20′',
      desc: 'Dominadas, flexiones y sentadillas. Solo peso corporal.',
      icon: Flame,
      accent: 'bg-emerald-600',
      action: () => navigate(`/workouts/log?mode=free&typeId=${crossfitId}`),
      cta: 'Hacer Cindy',
      hint: 'Dentro del logger lo cargas en “WODs” con un toque',
    },
    {
      name: 'Push Day vacío',
      scheme: 'Fuerza',
      desc: 'Pecho, hombro y tríceps. Empieza vacío y registra sobre la marcha.',
      icon: Dumbbell,
      accent: 'bg-blue-600',
      action: () => navigate(`/workouts/log?mode=free&typeId=${strengthId}`),
      cta: 'Empezar vacío',
      hint: 'Sin plantilla: añade ejercicios cuando quieras',
    },
  ];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/90 dark:border-gray-700 shadow-xs p-4 sm:p-5 space-y-4">
      <div>
        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
          Empieza aquí
        </p>
        <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mt-0.5">
          Aún no tienes sesiones: prueba con una de estas
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Los WODs se cargan dentro del entrenamiento con un toque. Elige y entrena.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <button
              key={c.name}
              type="button"
              onClick={c.action}
              className="p-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/50 hover:border-blue-300 hover:shadow-xs transition-all text-left cursor-pointer flex flex-col gap-2 min-h-11"
            >
              <div className="flex items-center gap-2">
                <span className={`p-2 rounded-xl text-white ${c.accent}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <div>
                  <p className="font-bold text-sm text-gray-900 dark:text-gray-100">{c.name}</p>
                  <p className="text-[11px] font-mono font-bold text-gray-500">{c.scheme}</p>
                </div>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{c.desc}</p>
              <span className="mt-auto inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-300">
                <Play className="w-3.5 h-3.5 fill-current" /> {c.cta} →
              </span>
              <span className="text-[11px] text-gray-400">{c.hint}</span>
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
        <PencilRuler className="w-3.5 h-3.5" />
        ¿Prefieres diseñar primero? Lo tienes abajo en “Empezar de cero”.
      </p>
    </div>
  );
}
