'use client';

import { useEffect, useState } from 'react';

// Respeta `prefers-reduced-motion` del SO (punto 9 del informe: los efectos
// de la landing no lo tenían en cuenta). Seguro en SSR (devuelve false).
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
