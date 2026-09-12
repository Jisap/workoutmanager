'use client';

import { useMemo } from 'react';
import { Flame, Calendar, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface ConsistencyData {
  dailyCounts: Record<string, number>;
  currentStreak: number;
  longestStreak: number;
  totalWorkouts: number;
  avgPerWeek: number;
}

interface ConsistencyHeatmapProps {
  data: ConsistencyData;
}

export function ConsistencyHeatmap({ data }: ConsistencyHeatmapProps) {
  // Generar los últimos 365 días
  const days = useMemo(() => {
    const result = [];
    const today = new Date();
    for (let i = 364; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      result.push({
        date: d,
        dateKey,
        count: data.dailyCounts[dateKey] || 0,
      });
    }
    return result;
  }, [data.dailyCounts]);

  // Función para determinar el color según la intensidad
  const getColor = (count: number) => {
    if (count === 0) return 'bg-gray-100';
    if (count === 1) return 'bg-green-300';
    if (count === 2) return 'bg-green-500';
    return 'bg-green-700';
  };

  return (
    <div className="space-y-6">
      {/* KPIs de Consistencia */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-orange-100 rounded-full text-orange-600">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-orange-600 uppercase">Racha Actual</p>
              <p className="text-2xl font-black text-gray-900 tabular-nums">
                {data.currentStreak} <span className="text-sm font-medium text-gray-500">días</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-full text-blue-600">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Racha Más Larga</p>
              <p className="text-2xl font-black text-gray-900 tabular-nums">
                {data.longestStreak} <span className="text-sm font-medium text-gray-500">días</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-full text-purple-600">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Promedio Semanal</p>
              <p className="text-2xl font-black text-gray-900 tabular-nums">
                {data.avgPerWeek} <span className="text-sm font-medium text-gray-500">días</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Heatmap Grid */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900">Actividad de los últimos 12 meses</h3>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <span>Menos</span>
              <div className="w-3 h-3 rounded-sm bg-gray-100" />
              <div className="w-3 h-3 rounded-sm bg-green-300" />
              <div className="w-3 h-3 rounded-sm bg-green-500" />
              <div className="w-3 h-3 rounded-sm bg-green-700" />
              <span>Más</span>
            </div>
          </div>

          {/* Grid de 53 semanas x 7 días */}
          <div className="overflow-x-auto">
            <div className="flex gap-1 min-w-max">
              {Array.from({ length: 53 }).map((_, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-1">
                  {Array.from({ length: 7 }).map((_, dayIndex) => {
                    // Calcular el índice global en el array de 365 días
                    // Empezamos desde el final para alinear con la semana actual
                    const globalIndex = 364 - (weekIndex * 7 + (6 - dayIndex));
                    const day = days[globalIndex];

                    if (!day) return <div key={dayIndex} className="w-3 h-3 rounded-sm" />;

                    return (
                      <div
                        key={dayIndex}
                        className={`w-3 h-3 rounded-sm ${getColor(day.count)} transition-colors hover:ring-2 hover:ring-gray-400 cursor-pointer relative group`}
                        title={`${day.date.toLocaleDateString('es-ES')}: ${day.count} entrenamiento(s)`}
                      >
                        {/* Tooltip personalizado */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                          <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                            {day.count} entrenamientos el {day.date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-4 text-center">
            Cada cuadrado representa un día. El color se intensifica con la cantidad de entrenamientos.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}