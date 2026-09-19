'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface CountUpProps {
  to: number;
  from?: number;
  duration?: number;
  delay?: number;
  separator?: string;
  startOnMount?: boolean;
  className?: string;
}

export function CountUp({
  to,
  from = 0,
  duration = 2000,
  delay = 0,
  separator = ',',
  startOnMount = true,
  className = ''
}: CountUpProps) {
  const countRef = useRef<HTMLSpanElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const isVisibleRef = useRef(false);

  const decimals = Math.max(
    (String(to).split('.')[1] || '').length,
    (String(from).split('.')[1] || '').length
  );

  const startAnimation = () => {
    if (isVisibleRef.current) return;
    isVisibleRef.current = true;
    animationRef.current = requestAnimationFrame(update);
  };

  const stopAnimation = () => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  };

  const update = (currentTime: number) => {
    if (startTimeRef.current === null) {
      startTimeRef.current = currentTime;
    }
    const elapsed = currentTime - startTimeRef.current - delay;
    const progress = Math.min(Math.max(elapsed / duration, 0), 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = from + (to - from) * eased;
    const next = progress < 1 ? current : to;
    if (countRef.current) {
      countRef.current.textContent = formatNumber(next);
    }
    if (progress < 1) {
      animationRef.current = requestAnimationFrame(update);
    }
  };

  const formatNumber = (value: number) => {
    const [int, dec] = value.toFixed(decimals).split('.');
    const formattedInt = separator
      ? int.replace(/\B(?=(\d{3})+(?!\d))/g, separator)
      : int;
    return dec ? `${formattedInt}.${dec}` : formattedInt;
  };

  useEffect(() => {
    if (startOnMount) {
      startAnimation();
    }
    return () => stopAnimation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startOnMount, to, duration, delay, separator, from]);

  useEffect(() => {
    if (!startOnMount) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            startAnimation();
          }
        });
      },
      { threshold: 0 }
    );
    if (countRef.current) {
      observer.observe(countRef.current);
    }
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startOnMount]);

  return (
    <span
      ref={countRef}
      className={cn('tabular-nums', className)}
      title={String(to)}
    >
      {formatNumber(from)}
    </span>
  );
}