'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock,
  Copy,
  ChevronDown,
  Search,
  Check,
  Play,
  Dumbbell,
  Calendar,
  Sparkles,
  Layers,
  Flame,
  FileText,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface SetDetailPreview {
  setNumber: number;
  weight: number | null;
  repCount: number | null;
  rpe: number | null;
  distance: number | null;
  durationSeconds: number | null;
}

export interface WorkoutExercisePreview {
  name: string;
  orderIndex: number;
  sets: SetDetailPreview[];
  maxWeight: number;
  volume: number;
}

export interface TemplateExercisePreview {
  name: string;
  orderIndex: number;
  targetReps: number | null;
  targetWeight: number | null;
  targetDistance: number | null;
  timeCapSeconds: number | null;
}

export interface SerializedWorkout {
  id: number;
  name: string;
  notes: string | null;
  startTime: Date | string;
  totalTimeSeconds: number | null;
  typeId: number;
  typeName?: string;
  totalVolume: number;
  totalSetsCount: number;
  exercises: WorkoutExercisePreview[];
}

export interface SerializedTemplate {
  id: number;
  name: string;
  description: string | null;
  typeId: number | null;
  typeName?: string;
  createdAt: Date | string;
  exercises: TemplateExercisePreview[];
}

interface WorkoutQuickSelectorProps {
  recentWorkouts: SerializedWorkout[];
  templates: SerializedTemplate[];
}

type TabType = 'recent' | 'templates';

export function WorkoutQuickSelector({
  recentWorkouts,
  templates,
}: WorkoutQuickSelectorProps) {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const hasRecents = recentWorkouts.length > 0;
  const hasTemplates = templates.length > 0;

  if (!hasRecents && !hasTemplates) {
    return null;
  }

  const [activeTab, setActiveTab] = useState<TabType>(hasRecents ? 'recent' : 'templates');
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFullExerciseList, setShowFullExerciseList] = useState(true);

  // Elemento seleccionado actualmente en el combobox
  const [selectedId, setSelectedId] = useState<number | null>(() => {
    if (activeTab === 'recent' && hasRecents) return recentWorkouts[0].id;
    if (activeTab === 'templates' && hasTemplates) return templates[0].id;
    return null;
  });

  // Cerrar al hacer clic fuera del combobox
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lista filtrada según pestaña y búsqueda
  const currentList = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (activeTab === 'recent') {
      return recentWorkouts.filter((w) => {
        return (
          w.name.toLowerCase().includes(q) ||
          (w.typeName && w.typeName.toLowerCase().includes(q)) ||
          w.exercises.some((e) => e.name.toLowerCase().includes(q))
        );
      });
    } else {
      return templates.filter((t) => {
        return (
          t.name.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          (t.typeName && t.typeName.toLowerCase().includes(q)) ||
          t.exercises.some((e) => e.name.toLowerCase().includes(q))
        );
      });
    }
  }, [activeTab, searchQuery, recentWorkouts, templates]);

  // Obtener el objeto seleccionado
  const selectedRecent = activeTab === 'recent' ? recentWorkouts.find((w) => w.id === selectedId) : null;
  const selectedTemplate = activeTab === 'templates' ? templates.find((t) => t.id === selectedId) : null;

  const handleSelect = (id: number) => {
    setSelectedId(id);
    setIsOpen(false);
  };

  const handleStartWorkout = () => {
    if (activeTab === 'recent' && selectedId) {
      router.push(`/workouts/log?mode=repeat&workoutId=${selectedId}`);
    } else if (activeTab === 'templates' && selectedId) {
      router.push(`/workouts/log?mode=template&templateId=${selectedId}`);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200/90 p-4 sm:p-5 shadow-xs space-y-4">
      {/* 1. HEADER Y SELECTOR DE PESTAÑAS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Repetir o Cargar Rutina
          </span>
          <h2 className="text-base font-bold text-gray-900 mt-0.5">
            Elige una sesión previa o plantilla
          </h2>
        </div>

        {/* Pestañas: Recientes vs Plantillas */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl self-start sm:self-auto">
          {hasRecents && (
            <button
              onClick={() => {
                setActiveTab('recent');
                setSelectedId(recentWorkouts[0]?.id ?? null);
                setSearchQuery('');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'recent'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Recientes ({recentWorkouts.length})</span>
            </button>
          )}

          {hasTemplates && (
            <button
              onClick={() => {
                setActiveTab('templates');
                setSelectedId(templates[0]?.id ?? null);
                setSearchQuery('');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'templates'
                  ? 'bg-white text-purple-600 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Plantillas ({templates.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. COMBOBOX DESPLEGABLE CON BUSCADOR */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between gap-3 px-3.5 py-3 bg-gray-50/90 hover:bg-gray-100/90 border border-gray-200 rounded-xl text-left transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`p-2.5 rounded-xl shrink-0 ${
                activeTab === 'recent' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
              }`}
            >
              {activeTab === 'recent' ? <Clock className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold text-sm text-gray-900 truncate">
                  {activeTab === 'recent'
                    ? selectedRecent?.name || 'Selecciona un entrenamiento reciente'
                    : selectedTemplate?.name || 'Selecciona una plantilla'}
                </p>
                {activeTab === 'recent' && selectedRecent?.typeName && (
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-gray-200/80 text-gray-700 rounded-md">
                    {selectedRecent.typeName}
                  </span>
                )}
                {activeTab === 'templates' && selectedTemplate?.typeName && (
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-purple-100 text-purple-800 rounded-md">
                    {selectedTemplate.typeName}
                  </span>
                )}
              </div>

              <p className="text-xs text-gray-500 truncate mt-0.5">
                {activeTab === 'recent' && selectedRecent ? (
                  <>
                    {new Date(selectedRecent.startTime).toLocaleDateString('es-ES', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                    {selectedRecent.totalTimeSeconds ? ` • ⏱️ ${Math.round(selectedRecent.totalTimeSeconds / 60)} min` : ''}
                    {selectedRecent.totalVolume > 0 ? ` • 🏋️ ${selectedRecent.totalVolume.toLocaleString('es-ES')} kg` : ''}
                    {` • 📋 ${selectedRecent.exercises.length} ejercicios`}
                  </>
                ) : activeTab === 'templates' && selectedTemplate ? (
                  <>
                    {selectedTemplate.description || 'Plantilla de entrenamiento'}
                    {` • 📋 ${selectedTemplate.exercises.length} ejercicios configurados`}
                  </>
                ) : (
                  'Toca para desplegar la lista'
                )}
              </p>
            </div>
          </div>

          <ChevronDown
            className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Menú Desplegable con Buscador interno */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-gray-200 shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Buscador dentro del Combobox */}
            <div className="p-2.5 border-b border-gray-100 bg-gray-50/70">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder={
                    activeTab === 'recent'
                      ? 'Buscar en historial por nombre, ejercicio o modalidad...'
                      : 'Buscar plantilla por nombre o ejercicio...'
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  autoFocus
                />
              </div>
            </div>

            {/* Lista con scroll máximo controlado */}
            <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
              {currentList.length === 0 ? (
                <div className="p-5 text-center text-xs text-gray-500">
                  No se encontraron resultados para &quot;{searchQuery}&quot;
                </div>
              ) : (
                currentList.map((item) => {
                  const isSelected = item.id === selectedId;
                  const isRecentItem = activeTab === 'recent';
                  const recentItem = item as SerializedWorkout;
                  const templateItem = item as SerializedTemplate;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(item.id)}
                      className={`w-full text-left px-3.5 py-3 flex items-center justify-between text-xs transition-colors ${
                        isSelected
                          ? isRecentItem
                            ? 'bg-blue-50 text-blue-900 font-semibold'
                            : 'bg-purple-50 text-purple-900 font-semibold'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-2">
                          {isSelected && (
                            <Check
                              className={`w-3.5 h-3.5 shrink-0 ${
                                isRecentItem ? 'text-blue-600' : 'text-purple-600'
                              }`}
                            />
                          )}
                          <span className="truncate font-bold text-gray-900">{item.name}</span>
                          {item.typeName && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-gray-100 text-gray-600 font-medium">
                              {item.typeName}
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-gray-400 mt-1 truncate">
                          {isRecentItem ? (
                            <>
                              {new Date(recentItem.startTime).toLocaleDateString('es-ES', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                              })}
                              {recentItem.totalTimeSeconds
                                ? ` • ${Math.round(recentItem.totalTimeSeconds / 60)} min`
                                : ''}
                              {recentItem.totalVolume > 0
                                ? ` • ${recentItem.totalVolume.toLocaleString('es-ES')} kg`
                                : ''}
                            </>
                          ) : (
                            templateItem.description || 'Plantilla personalizada'
                          )}
                          {item.exercises.length > 0 && ` • ${item.exercises.length} ejercicios`}
                        </p>
                      </div>

                      <span className="text-[10px] text-gray-400 shrink-0 text-right max-w-[140px] truncate">
                        {item.exercises.map((e) => e.name).slice(0, 2).join(', ')}
                        {item.exercises.length > 2 ? '...' : ''}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. TARJETA DETALLADA DE ENTRENAMIENTO O PLANTILLA SELECCIONADA */}
      {((activeTab === 'recent' && selectedRecent) || (activeTab === 'templates' && selectedTemplate)) && (
        <div className="bg-gray-50/90 rounded-2xl p-4 sm:p-5 border border-gray-200/90 space-y-4 animate-in fade-in duration-200">
          {/* Header de la tarjeta con Botón de Iniciar destacado */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200/80">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-gray-900">
                  {activeTab === 'recent' ? selectedRecent?.name : selectedTemplate?.name}
                </h3>
                {(activeTab === 'recent' ? selectedRecent?.typeName : selectedTemplate?.typeName) && (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                    {activeTab === 'recent' ? selectedRecent?.typeName : selectedTemplate?.typeName}
                  </span>
                )}
              </div>

              <p className="text-xs text-gray-500 mt-0.5">
                {activeTab === 'recent' && selectedRecent ? (
                  <>
                    Completado el{' '}
                    <strong className="text-gray-700">
                      {new Date(selectedRecent.startTime).toLocaleDateString('es-ES', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </strong>
                  </>
                ) : activeTab === 'templates' && selectedTemplate ? (
                  selectedTemplate.description || 'Plantilla guardada para entrenar'
                ) : (
                  ''
                )}
              </p>
            </div>

            <Button
              onClick={handleStartWorkout}
              size="sm"
              className={`gap-2 text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all active:scale-[0.98] ${
                activeTab === 'recent'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Iniciar este entrenamiento</span>
            </Button>
          </div>

          {/* 4 KPIs Clave del Entrenamiento */}
          {activeTab === 'recent' && selectedRecent && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-white p-2.5 rounded-xl border border-gray-200/80">
                <span className="text-[11px] font-medium text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-blue-500" /> Duración
                </span>
                <p className="text-sm font-bold text-gray-900 mt-0.5 tabular-nums">
                  {selectedRecent.totalTimeSeconds
                    ? `${Math.round(selectedRecent.totalTimeSeconds / 60)} min`
                    : '—'}
                </p>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-gray-200/80">
                <span className="text-[11px] font-medium text-gray-400 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-amber-500" /> Volumen
                </span>
                <p className="text-sm font-bold text-gray-900 mt-0.5 tabular-nums">
                  {selectedRecent.totalVolume > 0
                    ? `${selectedRecent.totalVolume.toLocaleString('es-ES')} kg`
                    : '0 kg'}
                </p>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-gray-200/80">
                <span className="text-[11px] font-medium text-gray-400 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-purple-500" /> Series
                </span>
                <p className="text-sm font-bold text-gray-900 mt-0.5 tabular-nums">
                  {selectedRecent.totalSetsCount} series
                </p>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-gray-200/80">
                <span className="text-[11px] font-medium text-gray-400 flex items-center gap-1">
                  <Dumbbell className="w-3 h-3 text-emerald-500" /> Ejercicios
                </span>
                <p className="text-sm font-bold text-gray-900 mt-0.5 tabular-nums">
                  {selectedRecent.exercises.length}
                </p>
              </div>
            </div>
          )}

          {/* Notas si existen */}
          {activeTab === 'recent' && selectedRecent?.notes && (
            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900">
              <span className="font-semibold flex items-center gap-1 mb-0.5">
                <FileText className="w-3.5 h-3.5" /> Notas de la sesión:
              </span>
              <p className="italic text-amber-800">{selectedRecent.notes}</p>
            </div>
          )}

          {/* DESGLOSE DETALLADO DE EJERCICIOS Y SERIES */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <Dumbbell className="w-3.5 h-3.5 text-gray-500" /> Desglose de Ejercicios
              </span>
              <span className="text-xs text-gray-500">
                {activeTab === 'recent'
                  ? `${selectedRecent?.exercises.length} ejercicios registrados`
                  : `${selectedTemplate?.exercises.length} ejercicios configurados`}
              </span>
            </div>

            {/* Lista de Ejercicios */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {activeTab === 'recent' && selectedRecent ? (
                selectedRecent.exercises.map((ex, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white rounded-xl border border-gray-200/80 space-y-1.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                        <span className="text-[10px] w-4 h-4 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        {ex.name}
                      </span>
                      {ex.maxWeight > 0 && (
                        <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                          Máx: {ex.maxWeight} kg
                        </span>
                      )}
                    </div>

                    {/* Series individuales */}
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {ex.sets.map((s, sIdx) => (
                        <span
                          key={sIdx}
                          className="px-2 py-0.5 text-[11px] rounded-md bg-gray-50 border border-gray-200 text-gray-700 font-medium tabular-nums"
                        >
                          {s.weight ? `${s.weight}kg × ` : ''}
                          {s.repCount ? `${s.repCount} reps` : s.distance ? `${s.distance}m` : `${s.durationSeconds}s`}
                          {s.rpe ? <span className="text-gray-400 text-[10px]"> (RPE {s.rpe})</span> : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              ) : activeTab === 'templates' && selectedTemplate ? (
                selectedTemplate.exercises.map((ex, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white rounded-xl border border-gray-200/80 flex items-center justify-between shadow-2xs"
                  >
                    <span className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                      <span className="text-[10px] w-4 h-4 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      {ex.name}
                    </span>

                    <div className="text-xs text-gray-600 font-medium">
                      {ex.targetWeight ? (
                        <span className="text-purple-700 font-semibold">{ex.targetWeight} kg</span>
                      ) : null}
                      {ex.targetReps ? ` • ${ex.targetReps} reps` : ''}
                      {ex.timeCapSeconds ? ` • Cap: ${ex.timeCapSeconds}s` : ''}
                      {!ex.targetWeight && !ex.targetReps && !ex.timeCapSeconds ? (
                        <span className="text-gray-400">Sin objetivos específicos</span>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
