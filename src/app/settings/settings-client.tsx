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
  Sun,
  Moon,
  Palette,
  Layers,
  FolderPlus,
  Lock,
  Folder,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SignOutButton } from '@clerk/nextjs';
import {
  renameCustomExercise,
  deleteCustomExercise,
  createExerciseCategory,
  renameExerciseCategory,
  deleteExerciseCategory,
} from './actions';
import { createCustomExercise } from '@/app/workouts/actions';
import { notify } from '@/lib/notify';
import { useTheme } from '@/components/ThemeProvider';

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
  isCustom?: boolean;
  exerciseCount?: number;
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
    <Card className="border-gray-200 dark:border-gray-800">
      <CardHeader className="pb-3 border-b border-gray-100 bg-gray-50/60 rounded-t-xl dark:border-gray-800 dark:bg-gray-800/60">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg text-blue-600 shrink-0">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold text-gray-900 dark:text-gray-100">{title}</CardTitle>
            {subtitle && <p className="text-xs text-gray-500 mt-0.5 dark:text-gray-400">{subtitle}</p>}
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
            className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 shadow-sm dark:border-gray-700"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xl font-bold border-2 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800">
            {fullName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-bold text-gray-900 text-base truncate dark:text-gray-100">{fullName}</p>
          <p className="text-sm text-gray-500 truncate dark:text-gray-400">{profile.email}</p>
          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1 dark:text-gray-500">
            <Calendar className="w-3 h-3" />
            Activo desde {memberDate}
          </p>
        </div>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
        <div className="text-center">
          <p className="text-2xl font-black text-gray-900 tabular-nums dark:text-gray-100">{profile.totalWorkouts}</p>
          <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider dark:text-gray-500">Entrenos</p>
        </div>
        <div className="text-center border-x border-gray-100 dark:border-gray-800">
          <p className="text-2xl font-black text-gray-900 tabular-nums dark:text-gray-100">{profile.customExercises}</p>
          <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider dark:text-gray-500">Ejercicios custom</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-black text-blue-600">
            <Star className="w-5 h-5 mx-auto" />
          </p>
          <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mt-0.5 dark:text-gray-500">Perfil Clerk</p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 dark:border-gray-800">
        <p className="text-xs text-gray-400 flex items-center gap-1 dark:text-gray-500">
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
  const [goal, setGoal] = useState(() => {
    if (typeof window === 'undefined') return 3;
    const stored = localStorage.getItem(LS_GOAL);
    const n = stored ? parseInt(stored, 10) : 3;
    return Number.isNaN(n) ? 3 : n;
  });
  const [notes, setNotes] = useState(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(LS_NOTES) ?? '';
  });
  const [saved, setSaved] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const handleSave = () => {
    localStorage.setItem(LS_GOAL, String(goal));
    localStorage.setItem(LS_NOTES, notes);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!mounted) return <div className="h-32 animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg" />;

  return (
    <Section
      icon={Target}
      title="Objetivos"
      subtitle="Define tu meta semanal de entrenamiento"
    >
      <div className="space-y-5">
        {/* Meta semanal visual */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-3 dark:text-gray-300">
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
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2 dark:text-gray-400">
            Meta actual:{' '}
            <span className="font-bold text-blue-600">
              {goal} día{goal !== 1 ? 's' : ''} / semana
            </span>
          </p>
        </div>

        {/* Llama visual de la racha */}
        <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-100 rounded-xl dark:bg-orange-900/20 dark:border-orange-800/60">
          <Flame className="w-4 h-4 text-orange-500 shrink-0" />
          <p className="text-xs text-orange-800 dark:text-orange-300">
            Esta meta se usa como referencia en tu mapa de consistencia del Dashboard.
          </p>
        </div>

        {/* Notas de objetivo */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5 dark:text-gray-300">
            Nota de objetivo (opcional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej: Preparación para triatlón, perder 5kg antes de junio..."
            rows={2}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
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
      try {
        await renameCustomExercise(id, editName.trim());
        setExercises((prev) =>
          prev.map((ex) => (ex.id === id ? { ...ex, name: editName.trim() } : ex))
        );
        setEditingId(null);
        notify.success('Ejercicio actualizado', `"${editName.trim()}"`);
      } catch (err) {
        console.error(err);
        notify.errorFrom(err, 'Error al renombrar el ejercicio');
      }
    });
  };

  const handleDelete = (id: number) => {
    setDeletingId(id);
    startTransition(async () => {
      try {
        const target = exercises.find((ex) => ex.id === id);
        await deleteCustomExercise(id);
        setExercises((prev) => prev.filter((ex) => ex.id !== id));
        setDeletingId(null);
        setConfirmDeleteId(null);
        notify.success('Ejercicio eliminado', target ? `"${target.name}"` : undefined);
      } catch (err) {
        console.error(err);
        notify.errorFrom(err, 'Error al eliminar el ejercicio');
      }
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
        notify.success('Ejercicio creado', `"${result.exercise!.name}"`);
      }
    } catch (err) {
      console.error(err);
      notify.errorFrom(err, 'Error al crear el ejercicio');
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
          <div className="text-center py-8 text-gray-400 text-sm dark:text-gray-500">
            <Dumbbell className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>Aún no has creado ejercicios personalizados.</p>
          </div>
        )}

        {/* Exercise list */}
        <div className="space-y-2 max-h-72 lg:max-h-96 overflow-y-auto pr-1">
          {exercises.map((ex) => (
            <div
              key={ex.id}
              className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl border border-gray-200/80 group dark:bg-gray-800/50 dark:border-gray-700"
            >
              {editingId === ex.id ? (
                /* Edit mode */
                <>
                  <input
                    className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400/40 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
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
                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition dark:hover:bg-emerald-900/20"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="p-1.5 text-gray-400 hover:bg-gray-200 rounded-lg transition dark:hover:bg-gray-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : confirmDeleteId === ex.id ? (
                /* Confirm delete */
                <>
                  <span className="flex-1 text-xs text-red-600 font-medium dark:text-red-400">
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
                    className="p-1.5 text-gray-400 hover:bg-gray-200 rounded-lg transition dark:hover:bg-gray-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                /* Normal mode */
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate dark:text-gray-100">{ex.name}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">
                      {ex.categoryName}
                      {ex.usageCount > 0 && ` · usado ${ex.usageCount} ${ex.usageCount === 1 ? 'vez' : 'veces'}`}
                    </p>
                  </div>
                  <button
                    onClick={() => handleStartEdit(ex)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition opacity-0 group-hover:opacity-100 dark:hover:bg-blue-900/20"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(ex.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100 dark:hover:bg-red-900/20"
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
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-2 dark:bg-blue-900/20 dark:border-blue-800">
            <input
              type="text"
              placeholder="Nombre del ejercicio…"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400/40 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <select
              value={newCategoryId}
              onChange={(e) => setNewCategoryId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/40 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
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
// 3.5. Categories section
// ─────────────────────────────────────────────────────────────────────────────
function CategoriesSection({
  initialCategories,
}: {
  initialCategories: ExerciseCategory[];
}) {
  const [categories, setCategories] = useState<ExerciseCategory[]>(initialCategories);
  const [filter, setFilter] = useState<'all' | 'custom' | 'system'>('all');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  // New category form
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('Fuerza');
  const [isCreating, setIsCreating] = useState(false);

  // Sync state if props change
  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  const customCount = categories.filter((c) => c.isCustom).length;
  const systemCount = categories.filter((c) => !c.isCustom).length;

  const filteredCategories = categories.filter((c) => {
    if (filter === 'custom') return c.isCustom;
    if (filter === 'system') return !c.isCustom;
    return true;
  });

  const handleStartEdit = (cat: ExerciseCategory) => {
    setEditingId(cat.id);
    setEditName(cat.name);
  };

  const handleSaveEdit = (id: number) => {
    if (!editName.trim()) return;
    startTransition(async () => {
      try {
        await renameExerciseCategory(id, editName.trim());
        setCategories((prev) =>
          prev.map((c) => (c.id === id ? { ...c, name: editName.trim() } : c))
        );
        setEditingId(null);
        notify.success('Categoría actualizada', `"${editName.trim()}"`);
      } catch (err) {
        console.error(err);
        notify.errorFrom(err, 'Error al renombrar la categoría');
      }
    });
  };

  const handleDelete = (id: number) => {
    setDeletingId(id);
    startTransition(async () => {
      try {
        const target = categories.find((c) => c.id === id);
        await deleteExerciseCategory(id);
        setCategories((prev) => prev.filter((c) => c.id !== id));
        setDeletingId(null);
        setConfirmDeleteId(null);
        notify.success('Categoría eliminada', target ? `"${target.name}"` : undefined);
      } catch (err) {
        console.error(err);
        notify.errorFrom(err, 'Error al eliminar la categoría');
      }
    });
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setIsCreating(true);
    try {
      const result = await createExerciseCategory({
        name: newName.trim(),
        type: newType.trim() || 'Fuerza',
      });
      if (result.success && result.category) {
        setCategories((prev) => [...prev, result.category]);
        setNewName('');
        setNewType('Fuerza');
        setShowNewForm(false);
        notify.success('Categoría creada', `"${result.category.name}"`);
      }
    } catch (err) {
      console.error(err);
      notify.errorFrom(err, 'Error al crear la categoría');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Section
      icon={Layers}
      title="Categorías de Ejercicios"
      subtitle={`${categories.length} categorías (${customCount} personalizada${customCount !== 1 ? 's' : ''}, ${systemCount} base)`}
    >
      <div className="space-y-4">
        {/* Filtros rápidos */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 text-xs font-semibold dark:bg-gray-800 dark:border-gray-700">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filter === 'all'
                  ? 'bg-white text-gray-900 shadow-xs dark:bg-gray-700 dark:text-gray-100'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              Todas ({categories.length})
            </button>
            <button
              onClick={() => setFilter('custom')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filter === 'custom'
                  ? 'bg-white text-gray-900 shadow-xs dark:bg-gray-700 dark:text-gray-100'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              Personalizadas ({customCount})
            </button>
            <button
              onClick={() => setFilter('system')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filter === 'system'
                  ? 'bg-white text-gray-900 shadow-xs dark:bg-gray-700 dark:text-gray-100'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              Sistema ({systemCount})
            </button>
          </div>

          {!showNewForm && (
            <Button
              size="sm"
              onClick={() => setShowNewForm(true)}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Nueva Categoría
            </Button>
          )}
        </div>

        {/* Lista de Categorías */}
        <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden dark:divide-gray-800 dark:border-gray-800 max-h-80 lg:max-h-[28rem] overflow-y-auto">
          {filteredCategories.map((cat) => (
            <div
              key={cat.id}
              className={`flex items-center gap-2 p-3 transition-colors group ${
                cat.isCustom ? 'hover:bg-purple-50/40 dark:hover:bg-purple-950/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'
              }`}
            >
              {editingId === cat.id ? (
                /* Edit mode */
                <>
                  <input
                    type="text"
                    value={editName}
                    className="flex-1 px-2.5 py-1 text-xs border border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400/40 bg-white dark:bg-gray-700 dark:text-gray-100"
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit(cat.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveEdit(cat.id)}
                    disabled={isPending}
                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition dark:hover:bg-emerald-900/20"
                    title="Guardar cambios"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="p-1.5 text-gray-400 hover:bg-gray-200 rounded-lg transition dark:hover:bg-gray-700"
                    title="Cancelar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : confirmDeleteId === cat.id ? (
                /* Confirm delete */
                <>
                  <span className="flex-1 text-xs text-red-600 font-medium dark:text-red-400">
                    ¿Eliminar «{cat.name}»? Sus ejercicios quedarán sin categoría.
                  </span>
                  <button
                    onClick={() => handleDelete(cat.id)}
                    disabled={deletingId === cat.id}
                    className="px-2 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                  >
                    {deletingId === cat.id ? '...' : 'Sí, eliminar'}
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="p-1.5 text-gray-400 hover:bg-gray-200 rounded-lg transition dark:hover:bg-gray-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                /* Normal display mode */
                <>
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <Folder className={`w-4 h-4 shrink-0 ${cat.isCustom ? 'text-purple-600' : 'text-blue-500'}`} />
                    <span className="text-sm font-semibold text-gray-900 truncate dark:text-gray-100">
                      {cat.name}
                    </span>
                    <span
                      className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        cat.isCustom
                          ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
                          : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                      }`}
                    >
                      {cat.isCustom ? 'Custom' : 'Sistema'}
                    </span>
                    {cat.type && (
                      <span className="text-[11px] text-gray-400 dark:text-gray-500">
                        · {cat.type}
                      </span>
                    )}
                  </div>

          <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-400 font-medium tabular-nums dark:text-gray-500">
                      {cat.exerciseCount ?? 0} {cat.exerciseCount === 1 ? 'ejercicio' : 'ejercicios'}
                    </span>

                    {cat.isCustom ? (
                      <>
                        <button
                          onClick={() => handleStartEdit(cat)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition opacity-0 group-hover:opacity-100 dark:hover:bg-blue-900/20"
                          title="Renombrar categoría"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(cat.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100 dark:hover:bg-red-900/20"
                          title="Eliminar categoría"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <span className="p-1.5 text-gray-300 dark:text-gray-600" title="Categoría base del sistema">
                        <Lock className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* New category form */}
        {showNewForm && (
          <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl space-y-3 dark:bg-purple-950/20 dark:border-purple-800">
            <div className="flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-purple-600" />
              <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100">Nueva Categoría Personalizada</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Nombre (ej. Kettlebell, Pliometría, Isométrico)..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400/40 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/40 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              >
                <option value="Fuerza">Tipo: Fuerza / Musculación</option>
                <option value="Cardio">Tipo: Cardio / Resistencia</option>
                <option value="CrossFit">Tipo: CrossFit / WOD</option>
                <option value="Funcional">Tipo: Funcional / HIIT</option>
                <option value="Movilidad">Tipo: Movilidad / Flexibilidad</option>
                <option value="Otro">Tipo: General / Otro</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={isCreating || !newName.trim()}
                className="flex-1 text-xs bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isCreating ? 'Guardando…' : 'Crear Categoría'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowNewForm(false);
                  setNewName('');
                  setNewType('Fuerza');
                }}
                className="text-xs"
              >
                Cancelar
              </Button>
            </div>
          </div>
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
  muscu: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60',
  fuerza: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60',
  gym: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60',
  crossfit: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/60',
  wod: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/60',
  funcional: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/60',
  cardio: 'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-800/60',
  correr: 'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-800/60',
  run: 'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-800/60',
  hyrox: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60',
  hybrid: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60',
  yoga: 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/60',
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
  return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
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
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 flex items-center gap-1">
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
  const [unit, setUnit] = useState<'kg' | 'lb'>(() => {
    if (typeof window === 'undefined') return 'kg';
    const stored = localStorage.getItem(LS_UNIT);
    return stored === 'kg' || stored === 'lb' ? stored : 'kg';
  });
  const [saved, setSaved] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const handleSave = () => {
    localStorage.setItem(LS_UNIT, unit);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!mounted) return <div className="h-24 animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg" />;

  return (
    <Section
      icon={Settings}
      title="Preferencias"
      subtitle="Configuración general de la aplicación"
    >
      <div className="space-y-5">
        {/* Units */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-2 dark:text-gray-300">
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
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700'
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
        <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl dark:bg-red-900/20 dark:border-red-800">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1">
              <p className="text-xs font-bold text-red-800 dark:text-red-200">Zona de peligro</p>
              <p className="text-xs text-red-700 dark:text-red-300/80">
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
// 6. Theme section
// ─────────────────────────────────────────────────────────────────────────────
function ThemeSection() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Sin este guard, el servidor renderiza el tema claro y el cliente el guardado
  // (localStorage), produciendo hydration mismatch en las clases del icono.
  if (!mounted) return <div className="h-24 animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg" />;

  return (
    <Section
      icon={Palette}
      title="Tema"
      subtitle="Personaliza la apariencia de la aplicación"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {theme === 'dark' ? (
            <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-yellow-400">
              <Moon className="w-5 h-5" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center text-yellow-600">
              <Sun className="w-5 h-5" />
            </div>
          )}
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
              {theme === 'dark' ? 'Modo Oscuro' : 'Modo Claro'}
            </p>
            <p className="text-xs text-gray-500">
              {theme === 'dark'
                ? 'Colores oscuros para reducir la fatiga visual'
                : 'Colores claros para una lectura cómoda'}
            </p>
          </div>
        </div>
        <button
          onClick={toggleTheme}
          className="relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer shrink-0"
          style={{ backgroundColor: theme === 'dark' ? '#1d4ed8' : '#d1d5db' }}
          title={`Cambiar a ${theme === 'dark' ? 'modo claro' : 'modo oscuro'}`}
        >
          <div
            className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 flex items-center justify-center ${
              theme === 'dark' ? 'translate-x-7' : 'translate-x-0'
            }`}
          >
            {theme === 'dark' ? (
              <Moon className="w-2.5 h-2.5 text-blue-600" />
            ) : (
              <Sun className="w-2.5 h-2.5 text-yellow-600" />
            )}
          </div>
        </button>
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
    <div className="max-w-2xl lg:max-w-6xl mx-auto pb-24 grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
      {/* Columna principal (ancha): perfil y gestión de datos */}
      <div className="space-y-6 lg:col-span-3 min-w-0">
        <ProfileSection profile={profile} />
        <CustomExercisesSection initialExercises={customExercises} categories={categories} />
        <CategoriesSection initialCategories={categories} />
      </div>
      {/* Columna secundaria (estrecha): objetivos y preferencias */}
      <div className="space-y-6 lg:col-span-2 min-w-0">
        <GoalsSection />
        <WorkoutTypesSection workoutTypes={workoutTypes} />
        <PreferencesSection />
        <ThemeSection />
      </div>
    </div>
  );
}
