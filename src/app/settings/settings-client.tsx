'use client';

import { useState, useEffect, useTransition } from 'react';
import {
  User,
  Target,
  Dumbbell,
  Tag,
  Settings,
  Trash2,
  Pencil,
  Check,
  X,
  Plus,
  AlertTriangle,
  ChevronRight,
  Flame,
  Zap,
  Heart,
  Activity,
  BarChart2,
  Scale,
  Calendar,
  Star,
  LogOut,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SignOutButton } from '@clerk/nextjs';
import { renameCustomExercise, deleteCustomExercise } from './actions';
import { createCustomExercise } from '@/app/workouts/actions';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface CustomExercise {
  id: number;
  name: string;
  categoryName: string;
  usageCount: number;
}

export interface WorkoutType {
  id: number;
  name: string;
  description: string | null;
}

export interface ExerciseCategory {
  id: number;
  name: string;
  type: string | null;
}

export interface UserProfile {
  firstName: string | null;
  lastName: string | null;
  email: string;
  imageUrl: string;
  totalWorkouts: number;
  customExercises: number;
  memberSince: Date | string | null;
}

interface SettingsClientProps {
  profile: UserProfile;
  customExercises: CustomExercise[];
  workoutTypes: WorkoutType[];
  categories: ExerciseCategory[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Local-storage key helpers
// ─────────────────────────────────────────────────────────────────────────────
const LS_GOAL = 'wm_weekly_goal';
const LS_UNIT = 'wm_unit';
const LS_NOTES = 'wm_goal_notes';

// ─────────────────────────────────────────────────────────────────────────────
// Section wrapper
// ─────────────────────────────────────────────────────────────────────────────
function Section({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-gray-200">
      <CardHeader className="pb-3 border-b border-gray-100 bg-gray-50/60 rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg text-blue-600 shrink-0">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold text-gray-900">{title}</CardTitle>
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-5">{children}</CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Profile section
// ─────────────────────────────────────────────────────────────────────────────
function ProfileSection({ profile }: { profile: UserProfile }) {
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Usuario';
  const memberDate = profile.memberSince
    ? new Date(profile.memberSince).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
    : 'Reciente';

  return (
    <Section
      icon={User}
      title="Mi Perfil"
      subtitle="Información de tu cuenta en Workout Manager"
    >
      <div className="flex items-center gap-4">
        {profile.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.imageUrl}
            alt={fullName}
            className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 shadow-sm"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xl font-bold border-2 border-blue-200">
            {fullName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-bold text-gray-900 text-base truncate">{fullName}</p>
          <p className="text-sm text-gray-500 truncate">{profile.email}</p>
          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Activo desde {memberDate}
          </p>
        </div>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100">
        <div className="text-center">
          <p className="text-2xl font-black text-gray-900 tabular-nums">{profile.totalWorkouts}</p>
          <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Entrenos</p>
        </div>
        <div className="text-center border-x border-gray-100">
          <p className="text-2xl font-black text-gray-900 tabular-nums">{profile.customExercises}</p>
          <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Ejercicios custom</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-black text-blue-600">
            <Star className="w-5 h-5 mx-auto" />
          </p>
          <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mt-0.5">Perfil Clerk</p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs text-gray-400 flex items-center gap-1">
          <ChevronRight className="w-3 h-3 shrink-0" />
          Para editar tu perfil, haz clic en tu avatar en la barra superior.
        </p>
        <SignOutButton>
          <Button variant="outline" size="sm" className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 shrink-0">
            <LogOut className="w-3.5 h-3.5 mr-1.5" />
            Cerrar Sesión
          </Button>
        </SignOutButton>
      </div>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Goals section
// ─────────────────────────────────────────────────────────────────────────────
function GoalsSection() {
  const [goal, setGoal] = useState(3);
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const storedGoal = localStorage.getItem(LS_GOAL);
    const storedNotes = localStorage.getItem(LS_NOTES);
    if (storedGoal) setGoal(parseInt(storedGoal, 10));
    if (storedNotes) setNotes(storedNotes);
  }, []);

  const handleSave = () => {
    localStorage.setItem(LS_GOAL, String(goal));
    localStorage.setItem(LS_NOTES, notes);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!mounted) return <div className="h-32 animate-pulse bg-gray-100 rounded-lg" />;

  return (
    <Section
      icon={Target}
      title="Objetivos"
      subtitle="Define tu meta semanal de entrenamiento"
    >
      <div className="space-y-5">
        {/* Meta semanal visual */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-3">
            Días de entrenamiento por semana
          </label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((day) => (
              <button
                key={day}
                onClick={() => setGoal(day)}
                className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${
                  day <= goal
                    ? 'bg-blue-600 text-white shadow-sm scale-105'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Meta actual:{' '}
            <span className="font-bold text-blue-600">
              {goal} día{goal !== 1 ? 's' : ''} / semana
            </span>
          </p>
        </div>

        {/* Llama visual de la racha */}
        <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-100 rounded-xl">
          <Flame className="w-4 h-4 text-orange-500 shrink-0" />
          <p className="text-xs text-orange-800">
            Esta meta se usa como referencia en tu mapa de consistencia del Dashboard.
          </p>
        </div>

        {/* Notas de objetivo */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            Nota de objetivo (opcional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej: Preparación para triatlón, perder 5kg antes de junio..."
            rows={2}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition"
          />
        </div>

        <Button
          onClick={handleSave}
          className={`w-full text-sm transition-all ${saved ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {saved ? (
            <>
              <Check className="w-4 h-4 mr-1.5" />
              ¡Guardado!
            </>
          ) : (
            'Guardar Objetivos'
          )}
        </Button>
      </div>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Custom exercises section
// ─────────────────────────────────────────────────────────────────────────────
function CustomExercisesSection({
  initialExercises,
  categories,
}: {
  initialExercises: CustomExercise[];
  categories: ExerciseCategory[];
}) {
  const [exercises, setExercises] = useState(initialExercises);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  // New exercise form
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategoryId, setNewCategoryId] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleStartEdit = (ex: CustomExercise) => {
    setEditingId(ex.id);
    setEditName(ex.name);
  };

  const handleSaveEdit = (id: number) => {
    if (!editName.trim()) return;
    startTransition(async () => {
      await renameCustomExercise(id, editName.trim());
      setExercises((prev) =>
        prev.map((ex) => (ex.id === id ? { ...ex, name: editName.trim() } : ex))
      );
      setEditingId(null);
    });
  };

  const handleDelete = (id: number) => {
    setDeletingId(id);
    startTransition(async () => {
      await deleteCustomExercise(id);
      setExercises((prev) => prev.filter((ex) => ex.id !== id));
      setDeletingId(null);
      setConfirmDeleteId(null);
    });
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setIsCreating(true);
    try {
      const result = await createCustomExercise({
        name: newName.trim(),
        categoryId: newCategoryId ? parseInt(newCategoryId, 10) : null,
      });
      if (result.success && result.exercise) {
        const cat = categories.find((c) => c.id === result.exercise!.categoryId);
        setExercises((prev) => [
          ...prev,
          {
            id: result.exercise!.id,
            name: result.exercise!.name,
            categoryName: cat?.name ?? 'Sin categoría',
            usageCount: 0,
          },
        ]);
        setNewName('');
        setNewCategoryId('');
        setShowNewForm(false);
      }
    } catch {
      alert('Error al crear el ejercicio');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Section
      icon={Dumbbell}
      title="Mis Ejercicios Personalizados"
      subtitle={`${exercises.length} ejercicio${exercises.length !== 1 ? 's' : ''} creado${exercises.length !== 1 ? 's' : ''}`}
    >
      <div className="space-y-3">
        {exercises.length === 0 && !showNewForm && (
          <div className="text-center py-8 text-gray-400 text-sm">
            <Dumbbell className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>Aún no has creado ejercicios personalizados.</p>
          </div>
        )}

        {/* Exercise list */}
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {exercises.map((ex) => (
            <div
              key={ex.id}
              className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl border border-gray-200/80 group"
            >
              {editingId === ex.id ? (
                /* Edit mode */
                <>
                  <input
                    className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit(ex.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveEdit(ex.id)}
                    disabled={isPending}
                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="p-1.5 text-gray-400 hover:bg-gray-200 rounded-lg transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : confirmDeleteId === ex.id ? (
                /* Confirm delete */
                <>
                  <span className="flex-1 text-xs text-red-600 font-medium">
                    ¿Eliminar «{ex.name}»? Esta acción no se puede deshacer.
                  </span>
                  <button
                    onClick={() => handleDelete(ex.id)}
                    disabled={deletingId === ex.id}
                    className="px-2 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                  >
                    {deletingId === ex.id ? '...' : 'Sí, eliminar'}
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="p-1.5 text-gray-400 hover:bg-gray-200 rounded-lg transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                /* Normal mode */
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{ex.name}</p>
                    <p className="text-[10px] text-gray-400">
                      {ex.categoryName}
                      {ex.usageCount > 0 && ` · usado ${ex.usageCount} ${ex.usageCount === 1 ? 'vez' : 'veces'}`}
                    </p>
                  </div>
                  <button
                    onClick={() => handleStartEdit(ex)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition opacity-0 group-hover:opacity-100"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(ex.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        {/* New exercise form */}
        {showNewForm ? (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
            <input
              type="text"
              placeholder="Nombre del ejercicio…"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400/40 bg-white"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <select
              value={newCategoryId}
              onChange={(e) => setNewCategoryId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/40"
            >
              <option value="">Sin categoría</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={isCreating || !newName.trim()}
                className="flex-1 text-xs bg-blue-600 hover:bg-blue-700"
              >
                {isCreating ? 'Creando…' : 'Crear ejercicio'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setShowNewForm(false); setNewName(''); setNewCategoryId(''); }}
                className="text-xs"
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNewForm(true)}
            className="w-full text-xs gap-1.5 border-dashed hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50"
          >
            <Plus className="w-3.5 h-3.5" />
            Añadir ejercicio personalizado
          </Button>
        )}
      </div>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Workout types section
// ─────────────────────────────────────────────────────────────────────────────
const TYPE_ICONS: Record<string, React.ElementType> = {
  muscu: Dumbbell,
  fuerza: Dumbbell,
  gym: Dumbbell,
  crossfit: Zap,
  wod: Zap,
  funcional: Zap,
  cardio: Heart,
  correr: Heart,
  run: Heart,
  hyrox: Flame,
  hybrid: Flame,
  yoga: Activity,
  stretch: Activity,
  movilidad: Activity,
};

const TYPE_COLORS: Record<string, string> = {
  muscu: 'bg-blue-100 text-blue-700 border-blue-200',
  fuerza: 'bg-blue-100 text-blue-700 border-blue-200',
  gym: 'bg-blue-100 text-blue-700 border-blue-200',
  crossfit: 'bg-orange-100 text-orange-700 border-orange-200',
  wod: 'bg-orange-100 text-orange-700 border-orange-200',
  funcional: 'bg-orange-100 text-orange-700 border-orange-200',
  cardio: 'bg-pink-100 text-pink-700 border-pink-200',
  correr: 'bg-pink-100 text-pink-700 border-pink-200',
  run: 'bg-pink-100 text-pink-700 border-pink-200',
  hyrox: 'bg-purple-100 text-purple-700 border-purple-200',
  hybrid: 'bg-purple-100 text-purple-700 border-purple-200',
  yoga: 'bg-teal-100 text-teal-700 border-teal-200',
};

function getTypeIcon(name: string): React.ElementType {
  const lower = name.toLowerCase();
  for (const [key, icon] of Object.entries(TYPE_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return BarChart2;
}

function getTypeColor(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, color] of Object.entries(TYPE_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return 'bg-gray-100 text-gray-700 border-gray-200';
}

function WorkoutTypesSection({ workoutTypes }: { workoutTypes: WorkoutType[] }) {
  return (
    <Section
      icon={Tag}
      title="Tipos de Entrenamiento"
      subtitle="Categorías disponibles para clasificar tus sesiones"
    >
      <div className="grid grid-cols-2 gap-2">
        {workoutTypes.map((type) => {
          const Icon = getTypeIcon(type.name);
          const colorClass = getTypeColor(type.name);
          return (
            <div
              key={type.id}
              className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold ${colorClass}`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <div className="min-w-0">
                <p className="truncate font-bold">{type.name}</p>
                {type.description && (
                  <p className="truncate opacity-70 font-normal mt-0.5">{type.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
        <ChevronRight className="w-3 h-3" />
        Los tipos de entrenamiento son globales del sistema. Próximamente podrás crear los tuyos.
      </p>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Preferences section
// ─────────────────────────────────────────────────────────────────────────────
function PreferencesSection() {
  const [unit, setUnit] = useState<'kg' | 'lb'>('kg');
  const [saved, setSaved] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(LS_UNIT);
    if (stored === 'kg' || stored === 'lb') setUnit(stored);
  }, []);

  const handleSave = () => {
    localStorage.setItem(LS_UNIT, unit);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!mounted) return <div className="h-24 animate-pulse bg-gray-100 rounded-lg" />;

  return (
    <Section
      icon={Settings}
      title="Preferencias"
      subtitle="Configuración general de la aplicación"
    >
      <div className="space-y-5">
        {/* Units */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-2">
            Unidad de peso
          </label>
          <div className="flex gap-2">
            {(['kg', 'lb'] as const).map((u) => (
              <button
                key={u}
                onClick={() => setUnit(u)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                  unit === u
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Scale className="w-4 h-4 inline mr-1.5" />
                {u === 'kg' ? 'Kilogramos (kg)' : 'Libras (lb)'}
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={handleSave}
          className={`w-full text-sm transition-all ${saved ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {saved ? (
            <>
              <Check className="w-4 h-4 mr-1.5" />
              ¡Guardado!
            </>
          ) : (
            'Guardar Preferencias'
          )}
        </Button>

        {/* Danger zone */}
        <div className="pt-4 border-t border-gray-100">
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1">
              <p className="text-xs font-bold text-red-800">Zona de peligro</p>
              <p className="text-xs text-red-700">
                Para eliminar tu cuenta o exportar todos tus datos, utiliza el panel de usuario de Clerk
                (botón en la esquina superior derecha).
              </p>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export function SettingsClient({
  profile,
  customExercises,
  workoutTypes,
  categories,
}: SettingsClientProps) {
  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24">
      <ProfileSection profile={profile} />
      <GoalsSection />
      <CustomExercisesSection initialExercises={customExercises} categories={categories} />
      <WorkoutTypesSection workoutTypes={workoutTypes} />
      <PreferencesSection />
    </div>
  );
}
