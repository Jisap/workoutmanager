'use client';

import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface AnimatedListItem {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
}

interface AnimatedListProps {
  items: AnimatedListItem[];
  delay?: number;
  enableArrowNavigation?: boolean;
  className?: string;
  itemClassName?: string;
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
      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>('[tabindex]')
      );
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
          className="relative flex items-center gap-4 py-2 px-3"
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 14 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{
            delay: (index * delay) / 1000,
            duration: 0.45,
            ease: 'easeOut'
          }}
        >
          <article
            className={`flex flex-1 flex-col items-start gap-1 rounded-lg border border-neutral-800 p-3 text-left transition-transform hover:translate-x-0.5 dark:text-neutral-200 ${itemClassName}`}
          >
            <h2 className="text-md leading-4 font-medium">{item.title}</h2>
            {item.subtitle ? (
              <p className="text-xs leading-4 opacity-60">{item.subtitle}</p>
            ) : null}
            {item.meta ? (
              <p className="mt-2 text-xs leading-4 opacity-60">{item.meta}</p>
            ) : null}
          </article>
        </motion.div>
      ))}
    </div>
  );
}