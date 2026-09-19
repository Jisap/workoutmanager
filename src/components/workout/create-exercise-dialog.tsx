'use client';

import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createCustomExercise, createCustomCategory } from '@/app/workouts/actions';
import { notify } from '@/lib/notify';
import { Plus, Check, X, FolderPlus } from 'lucide-react';

export interface Category {
  id: number;
  name: string;
  type?: string | null;
}

interface CreateExerciseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  onExerciseCreated: (exercise: { id: number; name: string; categoryId: number | null; categoryType?: string | null }) => void;
}

export function CreateExerciseDialog({
  open,
  onOpenChange,
  categories: initialCategories,
  onExerciseCreated,
}: CreateExerciseDialogProps) {
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);

  // Dynamic category list to support adding new ones on the fly
  const [categoryList, setCategoryList] = useState<Category[]>(initialCategories);

  // Inline category creation state
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  useEffect(() => {
    setCategoryList(initialCategories);
  }, [initialCategories]);

  const categoryItems = useMemo(
    () =>
      categoryList.map((cat) => ({
        value: cat.id.toString(),
        label: cat.name,
      })),
    [categoryList]
  );

  const handleInlineCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    setIsCreatingCategory(true);
    try {
      const result = await createCustomCategory({
        name: newCategoryName.trim(),
        type: 'Fuerza',
      });
      if (result.success && result.category) {
        const created = { id: result.category.id, name: result.category.name };
        setCategoryList((prev) => [...prev, created]);
        setCategoryId(created.id.toString());
        setNewCategoryName('');
        setIsAddingCategory(false);
        notify.success('Categoría creada', `"${created.name}"`);
      }
    } catch (err) {
      console.error(err);
      notify.errorFrom(err, 'Error al crear la categoría');
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) return;

    setIsCreating(true);
    try {
      const result = await createCustomExercise({
        name: name.trim(),
        categoryId: categoryId ? parseInt(categoryId, 10) : null,
      });

      if (result.success && result.exercise) {
        const newCategoryId = result.exercise.categoryId;
        onExerciseCreated({
          id: result.exercise.id,
          name: result.exercise.name,
          categoryId: newCategoryId,
          categoryType: initialCategories.find((c) => c.id === newCategoryId)?.type ?? null,
        });
        setName('');
        setCategoryId('');
        setIsAddingCategory(false);
        onOpenChange(false);
        notify.success('Ejercicio creado', `"${result.exercise.name}"`);
      }
    } catch (error) {
      console.error(error);
      notify.errorFrom(error, 'Error al crear el ejercicio');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Ejercicio</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="exercise-name">Nombre del ejercicio</Label>
            <Input
              id="exercise-name"
              placeholder="Ej: Press Landmine, Hack Squat, Kettlebell Clean..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="category">Categoría (opcional)</Label>
              {!isAddingCategory && (
                <button
                  type="button"
                  onClick={() => setIsAddingCategory(true)}
                  className="text-[11px] text-purple-600 hover:text-purple-700 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  Nueva categoría
                </button>
              )}
            </div>

            {isAddingCategory ? (
              <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2 animate-in fade-in zoom-in-95 duration-150 dark:bg-purple-950/20 dark:border-purple-800">
                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900 dark:text-purple-200">
                  <FolderPlus className="w-3.5 h-3.5 text-purple-600" />
                  <span>Crear nueva categoría inline</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Input
                    placeholder="Ej. Kettlebell, Pliometría, Isométricos..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="h-8 text-xs bg-white dark:bg-gray-800"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleInlineCreateCategory();
                      }
                      if (e.key === 'Escape') setIsAddingCategory(false);
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleInlineCreateCategory}
                    disabled={isCreatingCategory || !newCategoryName.trim()}
                    className="h-8 px-2.5 text-xs bg-purple-600 hover:bg-purple-700 text-white shrink-0"
                  >
                    <Check className="w-3.5 h-3.5 mr-1" />
                    {isCreatingCategory ? '...' : 'Crear'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsAddingCategory(false);
                      setNewCategoryName('');
                    }}
                    className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <Select
                items={categoryItems}
                value={categoryId}
                onValueChange={(val: string | null) => setCategoryId(val || '')}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sin categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categoryItems.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={isCreating || !name.trim()}>
            {isCreating ? 'Creando...' : 'Crear Ejercicio'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}