'use client';

import { useState } from 'react';
import { useTransitionNavigate } from '@/components/layout/route-transition';
import { setLastTypeId } from '@/lib/last-type';
import { Play, PencilRuler, Trophy } from 'lucide-react';

interface SimpleType {
  id: number;
  name: string;
  description: string | null;
}

export function StartFreshSection({ types }: { types: SimpleType[] }) {
  const navigate = useTransitionNavigate();
  const [typeId, setTypeId] = useState<number>(types[0]?.id ?? 1);
  if (types.length === 0) return null;

  return (
    <div className="space-y-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/90 dark:border-gray-700 p-4 sm:p-5 shadow-xs">
      <div>
        <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-600" />
          Empezar de cero
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Vacío para registrar sobre la marcha, o diseña una plantilla para otro día. Los WODs
          (Fran, Cindy…) se cargan dentro con un toque.
        </p>
      </div>

      {/* Selector de tipo único (antes: dos grids duplicados) */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 py-1">
        {types.map((t) => {
          const active = t.id === typeId;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTypeId(t.id)}
              className={`px-3.5 h-9 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 border transition-all cursor-pointer ${
                active
                  ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-900 dark:border-gray-100'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-400'
              }`}
            >
              {t.name}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => {
            setLastTypeId(typeId);
            navigate(`/workouts/log?mode=free&typeId=${typeId}`);
          }}
          className="flex items-center gap-3 p-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white transition-all cursor-pointer min-h-11 text-left"
        >
          <span className="p-2.5 rounded-xl bg-white/20 shrink-0">
            <Play className="w-5 h-5 fill-current" />
          </span>
          <span>
            <span className="block font-bold text-sm">Entrenar ahora</span>
            <span className="block text-xs text-blue-100">Vacío o con WOD dentro</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            setLastTypeId(typeId);
            navigate(`/workouts/log?mode=new-template&typeId=${typeId}`);
          }}
          className="flex items-center gap-3 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/50 hover:border-purple-300 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition-all cursor-pointer min-h-11 text-left"
        >
          <span className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 shrink-0">
            <PencilRuler className="w-5 h-5" />
          </span>
          <span>
            <span className="block font-bold text-sm text-gray-900 dark:text-gray-100">
              Diseñar plantilla
            </span>
            <span className="block text-xs text-gray-500 dark:text-gray-400">
              Para entrenar otro día
            </span>
          </span>
        </button>
      </div>

      <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
        <Trophy className="w-3.5 h-3.5" />
        ¿Buscas un WOD? Entra en “Entrenar ahora” y usa el bloque naranja de WODs oficiales.
      </p>
    </div>
  );
}
