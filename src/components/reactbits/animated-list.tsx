'use client';

import { useEffect, useRef } from 'react';
import { TransitionLink as Link } from '@/components/layout/transition-link';
import { motion, useReducedMotion } from 'motion/react';
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  Dumbbell,
  Layers,
  Repeat2,
  Weight,
  Zap
} from 'lucide-react';
import { cn } from 'cn';

export interface AnimatedListItem {
  id: string;
  title: string;
  /** @deprecated Usa `typeLabel` en su lugar. Se mantiene por compatibilidad. */
  subtitle?: string;
  /** @deprecated Usa los campos ricos (`dateLabel`, `durationLabel`, …). */
  meta?: string;
  /** Etiqueta principal (p. ej. tipo de entrenamiento: "Fuerza"). */
  typeLabel?: string;
  /** Modalidad (p. ej. "AMRAP", "For Time"). */
  modalityLabel?: string | null;
  /** Fecha ya formateada (p. ej. "lun, 12 may"). */
  dateLabel?: string;
  /** Duración ya formateada (p. ej. "52 min"). */
  durationLabel?: string;
  exercisesCount?: number;
  setsCount?: number;
  /** Volumen ya formateado (p. ej. "4,2 t" o "850 kg"). */
  volumeLabel?: string;
  /** Vista previa de ejercicios (p. ej. "Press banca · Sentadilla · +2"). */
  exercisesPreview?: string;
  /** Enlace opcional al envolver la tarjeta. */
  href?: string;
}

interface AnimatedListProps {
  items: AnimatedListItem[];
  delay?: number;
  enableArrowNavigation?: boolean;
  className?: string;
  itemClassName?: string;
}

interface Accent {
  bubble: string;
  badge: string;
  dot: string;
}

const ACCENTS: Accent[] = [
  {
    bubble: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
    badge:
      'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300',
    dot: 'bg-blue-500'
  },
  {
    bubble: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
    badge:
      'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300',
    dot: 'bg-violet-500'
  },
  {
    bubble: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    badge:
      'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
    dot: 'bg-emerald-500'
  },
  {
    bubble: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    badge:
      'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
    dot: 'bg-amber-500'
  },
  {
    bubble: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
    badge:
      'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300',
    dot: 'bg-rose-500'
  },
  {
    bubble: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300',
    badge:
      'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300',
    dot: 'bg-cyan-500'
  }
];

function accentFor(label?: string | null): Accent {
  if (!label) return ACCENTS[0];
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  }
  return ACCENTS[hash % ACCENTS.length];
}

function Stat({
  icon: Icon,
  value,
  label
}: {
  icon: typeof Layers;
  value: string;
  label: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
      <p className="truncate text-xs text-gray-600 dark:text-gray-300">
        <span className="font-semibold text-gray-900 dark:text-gray-100">{value}</span>{' '}
        <span className="text-gray-500 dark:text-gray-400">{label}</span>
      </p>
    </div>
  );
}

function ItemCard({
  item,
  itemClassName
}: {
  item: AnimatedListItem;
  itemClassName: string;
}) {
  const typeLabel = item.typeLabel ?? item.subtitle;
  const accent = accentFor(typeLabel);
  const hasRichData =
    item.typeLabel !== undefined ||
    item.modalityLabel !== undefined ||
    item.dateLabel !== undefined ||
    item.durationLabel !== undefined ||
    item.exercisesCount !== undefined ||
    item.setsCount !== undefined ||
    item.volumeLabel !== undefined ||
    item.exercisesPreview !== undefined;

  return (
    <article
      className={cn(
        'group relative flex w-full items-start gap-3 rounded-xl border border-gray-200',
        'bg-gray-50/70 p-3.5 text-left transition-all duration-200',
        'hover:-translate-y-px hover:border-gray-300 hover:bg-white',
        'hover:shadow-[0_10px_28px_-14px_rgba(0,0,0,0.3)]',
        'dark:border-gray-800 dark:bg-gray-800/40 dark:hover:border-gray-700 dark:hover:bg-gray-800/80',
        itemClassName
      )}
    >
      <span
        aria-hidden
        className={cn(
          'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform',
          'group-hover:scale-105',
          accent.bubble
        )}
      >
        <Dumbbell className="h-5 w-5" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
            {item.title}
          </h3>
          {item.dateLabel ? (
            <span className="flex shrink-0 items-center gap-1 text-[11px] whitespace-nowrap text-gray-500 dark:text-gray-400">
              <CalendarDays className="h-3.5 w-3.5" />
              {item.dateLabel}
            </span>
          ) : null}
        </div>

        {hasRichData ? (
          <>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {typeLabel ? (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
                    accent.badge
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', accent.dot)} />
                  {typeLabel}
                </span>
              ) : null}
              {item.modalityLabel ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-300">
                  <Zap className="h-3 w-3 text-amber-500" />
                  {item.modalityLabel}
                </span>
              ) : null}
              {item.durationLabel ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-300">
                  <Clock3 className="h-3 w-3 text-sky-500" />
                  {item.durationLabel}
                </span>
              ) : null}
            </div>

            <div className="mt-2 grid grid-cols-3 gap-2 rounded-lg border border-gray-200/70 bg-white px-2.5 py-2 dark:border-gray-700/60 dark:bg-gray-900/60">
              <Stat
                icon={Layers}
                value={item.exercisesCount != null ? String(item.exercisesCount) : '—'}
                label={item.exercisesCount === 1 ? 'ejercicio' : 'ejercicios'}
              />
              <Stat
                icon={Repeat2}
                value={item.setsCount != null ? String(item.setsCount) : '—'}
                label={item.setsCount === 1 ? 'serie' : 'series'}
              />
              <Stat
                icon={Weight}
                value={item.volumeLabel ?? '—'}
                label="volumen"
              />
            </div>

            {item.exercisesPreview ? (
              <p className="mt-1.5 truncate text-[11px] text-gray-500 dark:text-gray-400">
                {item.exercisesPreview}
              </p>
            ) : null}
          </>
        ) : (
          <>
            {item.subtitle ? (
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{item.subtitle}</p>
            ) : null}
            {item.meta ? (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{item.meta}</p>
            ) : null}
          </>
        )}
      </div>

      {item.href ? (
        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-gray-300 transition-all group-hover:translate-x-0.5 group-hover:text-gray-500 dark:text-gray-600 dark:group-hover:text-gray-300" />
      ) : null}
    </article>
  );
}

export function AnimatedList({
  items,
  delay = 0,
  enableArrowNavigation = false,
  className = '',
  itemClassName = ''
}: AnimatedListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!enableArrowNavigation) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!['ArrowDown', 'ArrowUp'].includes(e.key)) return;
      const container = containerRef.current;
      if (!container) return;
      const focusable = Array.from(container.querySelectorAll<HTMLElement>('[tabindex]'));
      const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
      const nextIndex =
        e.key === 'ArrowDown'
          ? (currentIndex + 1) % focusable.length
          : (currentIndex - 1 + focusable.length) % focusable.length;
      focusable[nextIndex]?.focus();
      e.preventDefault();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enableArrowNavigation]);

  return (
    <div ref={containerRef} className={className}>
      {items.map((item, index) => (
        <motion.div
          key={item.id}
          id={item.id}
          tabIndex={enableArrowNavigation ? 0 : undefined}
          className="relative py-1 first:pt-0 last:pb-0"
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 14 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{
            delay: (index * delay) / 1000,
            duration: 0.45,
            ease: 'easeOut'
          }}
        >
          {item.href ? (
            <Link
              href={item.href}
              aria-label={item.title}
              className="block rounded-xl focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
            >
              <ItemCard item={item} itemClassName={itemClassName} />
            </Link>
          ) : (
            <ItemCard item={item} itemClassName={itemClassName} />
          )}
        </motion.div>
      ))}
    </div>
  );
}
