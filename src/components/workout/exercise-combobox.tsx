'use client';

import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Plus, Search } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type ExerciseOption = {
  value: string; // exercise id as string
  label: string;
  categoryId?: number | null;
  categoryName?: string;
};

interface ExerciseComboboxProps {
  options: ExerciseOption[];
  value: string;
  onChange: (value: string) => void;
  onCreateNew?: () => void;
  placeholder?: string;
  className?: string;
}

export function ExerciseCombobox({
  options,
  value,
  onChange,
  onCreateNew,
  placeholder = 'Seleccionar ejercicio…',
  className,
}: ExerciseComboboxProps) {
  const [open, setOpen] = useState(false);

  const selected = options.find((o) => o.value === value);

  // Agrupar por categoría, preservando orden original
  const grouped = useMemo(() => {
    const map = new Map<string, ExerciseOption[]>();
    for (const opt of options) {
      const key = opt.categoryName ?? 'Sin categoría';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(opt);
    }
    return Array.from(map.entries()); // [['Fuerza', [...]], ['Cardio', [...]]]
  }, [options]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          'flex items-center gap-2 font-semibold text-gray-900 bg-transparent border-none cursor-pointer hover:opacity-70 transition-opacity text-left min-w-0',
          !selected && 'text-gray-400 font-normal',
          className,
        )}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <ChevronsUpDown className="h-3.5 w-3.5 text-gray-400 shrink-0" />
      </PopoverTrigger>

      <PopoverContent className="w-72 p-0 shadow-lg" align="start">
        <Command>
          <div className="flex items-center border-b px-3">
            <Search className="h-4 w-4 shrink-0 text-gray-400 mr-2" />
            <CommandInput
              placeholder="Buscar ejercicio…"
              className="border-none focus:ring-0 h-10 text-sm"
            />
          </div>
          <CommandList className="max-h-64 overflow-y-auto">
            <CommandEmpty className="py-4 text-center text-sm text-gray-500">
              Sin resultados.
            </CommandEmpty>

            {grouped.map(([category, items], i) => (
              <span key={category}>
                {i > 0 && <CommandSeparator />}
                <CommandGroup heading={category}>
                  {items.map((opt) => (
                    <CommandItem
                      key={opt.value}
                      value={opt.label}
                      onSelect={() => {
                        onChange(opt.value);
                        setOpen(false);
                      }}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4 text-blue-600 shrink-0',
                          value === opt.value ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      {opt.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </span>
            ))}
          </CommandList>

          {onCreateNew && (
            <>
              <CommandSeparator />
              <div className="p-1">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onCreateNew();
                  }}
                  className="w-full flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  <Plus className="h-4 w-4 shrink-0" />
                  Crear nuevo ejercicio
                </button>
              </div>
            </>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
