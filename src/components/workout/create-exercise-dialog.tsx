'use client';

import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createCustomExercise } from '@/app/workouts/actions';

export interface Category {
  id: number;
  name: string;
}

interface CreateExerciseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  onExerciseCreated: (exercise: { id: number; name: string; categoryId: number | null }) => void;
}

export function CreateExerciseDialog({
  open,
  onOpenChange,
  categories,
  onExerciseCreated,
}: CreateExerciseDialogProps) {
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);

  const categoryItems = useMemo(
    () =>
      categories.map((cat) => ({
        value: cat.id.toString(),
        label: cat.name,
      })),
    [categories]
  );

  const handleCreate = async () => {
    if (!name.trim()) return;

    setIsCreating(true);
    try {
      const result = await createCustomExercise({
        name: name.trim(),
        categoryId: categoryId ? parseInt(categoryId, 10) : null,
      });

      if (result.success && result.exercise) {
        onExerciseCreated({
          id: result.exercise.id,
          name: result.exercise.name,
          categoryId: result.exercise.categoryId,
        });
        setName('');
        setCategoryId('');
        onOpenChange(false);
      }
    } catch (error) {
      console.error(error);
      alert('Error al crear el ejercicio');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear Nuevo Ejercicio</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="exercise-name">Nombre del ejercicio</Label>
            <Input
              id="exercise-name"
              placeholder="Ej: Press Landmine, Hack Squat..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Categoría (opcional)</Label>
            <Select
              items={categoryItems}
              value={categoryId}
              onValueChange={(val: string | null) => setCategoryId(val || '')}
            >
              <SelectTrigger>
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