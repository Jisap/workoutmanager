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
    return Array.from(map.entries());
  }, [options]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          'flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100 bg-transparent border-none cursor-pointer hover:opacity-75 transition-opacity text-left min-w-0',
          !selected && 'text-gray-400 dark:text-gray-500 font-normal',
          className,
        )}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <ChevronsUpDown className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500 shrink-0" />
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0 shadow-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-xl overflow-hidden" align="start">
        <Command className="bg-transparent">
          <div className="flex items-center border-b border-gray-100 dark:border-gray-800 px-3 bg-gray-50/50 dark:bg-gray-800/30">
            <Search className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500 mr-2" />
            <CommandInput
              placeholder="Buscar ejercicio…"
              className="border-none focus:ring-0 h-10 text-sm bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
          </div>
          <CommandList className="max-h-64 overflow-y-auto p-1.5 no-scrollbar">
            <CommandEmpty className="py-6 text-center text-xs text-gray-500 dark:text-gray-400">
              Sin resultados para la búsqueda.
            </CommandEmpty>

            {grouped.map(([category, items], i) => (
              <span key={category}>
                {i > 0 && <CommandSeparator className="my-1 border-gray-100 dark:border-gray-800" />}
                <CommandGroup 
                  heading={category}
                  className="**:[[cmdk-group-heading]]:text-gray-500 dark:**:[[cmdk-group-heading]]:text-gray-400 **:[[cmdk-group-heading]]:font-semibold **:[[cmdk-group-heading]]:uppercase **:[[cmdk-group-heading]]:text-[10px] **:[[cmdk-group-heading]]:tracking-wider **:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:py-1"
                >
                  {items.map((opt) => {
                    const isSelected = value === opt.value;
                    return (
                      <CommandItem
                        key={opt.value}
                        value={opt.label}
                        onSelect={() => {
                          onChange(opt.value);
                          setOpen(false);
                        }}
                        className={cn(
                          "cursor-pointer px-2.5 py-2 text-xs sm:text-sm rounded-lg transition-colors flex items-center justify-between",
                          "text-gray-800 dark:text-gray-200",
                          "hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100",
                          "data-[selected=true]:bg-blue-50 data-[selected=true]:text-blue-900 dark:data-[selected=true]:bg-blue-950/70 dark:data-[selected=true]:text-blue-200",
                          "aria-selected:bg-blue-50 aria-selected:text-blue-900 dark:aria-selected:bg-blue-950/70 dark:aria-selected:text-blue-200",
                          isSelected && "font-semibold text-blue-600 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/40"
                        )}
                      >
                        <span className="truncate">{opt.label}</span>
                        <Check
                          className={cn(
                            'ml-2 h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0',
                            isSelected ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </span>
            ))}
          </CommandList>

          {onCreateNew && (
            <>
              <CommandSeparator className="border-gray-100 dark:border-gray-800" />
              <div className="p-1.5 bg-gray-50/50 dark:bg-gray-800/30">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onCreateNew();
                  }}
                  className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors cursor-pointer"
                >
                  <Plus className="h-4 w-4 shrink-0" />
                  <span>Crear nuevo ejercicio</span>
                </button>
              </div>
            </>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
