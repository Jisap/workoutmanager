'use client';

import gsap from 'gsap';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode
} from 'react';

interface RouteTransitionContextValue {
  notifyReady: () => void;
  runCoverTransition: (href: string) => void;
  navigate: (href: string) => void;
}

const RouteTransitionContext = createContext<RouteTransitionContextValue | null>(null);

export function useRouteTransition() {
  return useContext(RouteTransitionContext);
}

// Navegación programática con cortina (p. ej. tras guardar un formulario).
// Misma ruta → push nativo; distinta ruta → cortina. Fuera del provider,
// push nativo directamente.
export function useTransitionNavigate() {
  const ctx = useRouteTransition();
  const router = useRouter();
  return useCallback(
    (href: string) => {
      if (ctx) ctx.navigate(href);
      else router.push(href);
    },
    [ctx, router]
  );
}

// Reset de scroll instantáneo: solo se usa bajo la cortina (opaca) o en
// ramas de fallback, nunca a la vista.
function resetScroll() {
  document.getElementById('wm-main')?.scrollTo({ top: 0 });
  window.scrollTo(0, 0);
}

const COVER_OUT_DURATION = 0.55;
const READY_TIMEOUT_MS = 3000;

// Transición entre vistas con cortina GSAP.
//
// Secuencia: <TransitionLink> cancela la navegación nativa (onNavigate) y
// llama a runCoverTransition → la cortina cubre la pantalla → el push ocurre
// con scroll desactivado y el scroll se resetea de forma invisible → la
// cortina espera a que la PÁGINA REAL se monte (<PageReady />, nunca en
// loading.tsx) y solo entonces revela. Así nunca se ve el skeleton ni hay
// saltos de scroll, y es el único sistema de animación entre vistas.
export function RouteTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(false);
  const readyRef = useRef(false);

  const clearSafetyTimeout = () => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const finishTransition = useCallback(() => {
    clearSafetyTimeout();
    activeRef.current = false;
  }, []);

  // Señal de "contenido listo": reanuda la cortina si estaba en espera.
  const notifyReady = useCallback(() => {
    readyRef.current = true;
    const tl = timelineRef.current;
    if (activeRef.current && tl && tl.paused()) {
      clearSafetyTimeout();
      tl.play();
    }
  }, []);

  const runCoverTransition = useCallback(
    (href: string) => {
      if (activeRef.current) return;
      const overlay = overlayRef.current;
      const panel = panelRef.current;
      const bar = barRef.current;
      if (!overlay || !panel || !bar) {
        router.push(href, { scroll: false });
        resetScroll();
        return;
      }

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        router.push(href, { scroll: false });
        resetScroll();
        return;
      }

      activeRef.current = true;
      readyRef.current = false;

      // La cortina parte YA cubriendo (sin viaje desde abajo): así ningún
      // frame puede mostrar el contenido nuevo antes que ella, aunque el
      // pintado se retrase por saturación del hilo principal.
      gsap.set(overlay, { visibility: 'visible', pointerEvents: 'auto', opacity: 0 });
      gsap.set(panel, { yPercent: 0 });
      gsap.set(bar, { scaleX: 0 });

      // La navegación arranca en la misma tarea del clic, bajo la cortina.
      router.push(href, { scroll: false });

      const tl = gsap.timeline({ onComplete: () => finishTransition() });
      timelineRef.current = tl;

      tl.to(overlay, { opacity: 1, duration: 0.15, ease: 'power1.out' })
        // La barra avanza al 85% durante la espera y se remata al revelar.
        .fromTo(
          bar,
          { scaleX: 0 },
          { scaleX: 0.85, duration: 0.5, ease: 'power1.out' },
          0
        )
        // Espera al contenido real (PageReady) antes de revelar. El scroll
        // se resetea aquí, con la cortina ya opaca, para que la página
        // anterior no salte a la vista durante el fundido.
        .call(() => {
          resetScroll();
          if (!readyRef.current) {
            // Red de seguridad: revelar aunque la página nunca avise.
            timeoutRef.current = setTimeout(() => notifyReady(), READY_TIMEOUT_MS);
            tl.pause();
          }
        })
        // Revelado: la cortina sale por arriba y el contenido entra.
        // Se anima #wm-main (existe en la rama autenticada); sin él, la
        // cortina sola ya es la transición.
        .to(panel, {
          yPercent: -100,
          duration: COVER_OUT_DURATION,
          ease: 'expo.inOut'
        })
        .to(bar, { scaleX: 1, duration: 0.45, ease: 'power1.inOut' }, '<');
      const revealTarget = document.getElementById('wm-main');
      if (revealTarget) {
        tl.fromTo(
          revealTarget,
          { opacity: 0, y: 18 },
          {
            opacity: 1,
            y: 0,
            duration: 0.5,
            ease: 'expo.out',
            clearProps: 'opacity,transform',
            // Sin esto, GSAP aplicaría opacity:0 al crear la timeline y la
            // página anterior desaparecería antes de que la cortina opaque.
            immediateRender: false
          },
          '-=0.3'
        );
      }
      tl.set(overlay, { visibility: 'hidden', pointerEvents: 'none', opacity: 0 })
        .set(bar, { scaleX: 0 })
        .set(panel, { yPercent: 0 });
    },
    [finishTransition, notifyReady, router]
  );

  // Limpieza al desmontar el layout (prácticamente nunca, pero correcto).
  useEffect(() => {
    return () => {
      clearSafetyTimeout();
      timelineRef.current?.kill();
      timelineRef.current = null;
    };
  }, []);

  const navigate = useCallback(
    (href: string) => {
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        router.push(href);
        return;
      }
      if (url.origin !== window.location.origin) {
        router.push(href);
        return;
      }
      // Misma ruta (cambios de query): push nativo; distinta ruta: cortina.
      if (url.pathname === window.location.pathname) {
        router.push(url.pathname + url.search + url.hash);
        return;
      }
      runCoverTransition(url.pathname + url.search + url.hash);
    },
    [router, runCoverTransition]
  );

  // Valor memoizado: si el provider re-renderiza, PageReady no debe
  // re-ejecutar su efecto (reavisar "listo" levantaría la cortina antes).
  const value = useMemo(
    () => ({ notifyReady, runCoverTransition, navigate }),
    [notifyReady, runCoverTransition, navigate]
  );

  return (
    <RouteTransitionContext.Provider value={value}>
      {children}
      <div ref={overlayRef} className="invisible fixed inset-0 z-[90]" aria-hidden>
        <div
          ref={panelRef}
          style={{ transform: 'translateY(0%)' }}
          className="flex h-full w-full flex-col items-center justify-center gap-5 bg-gray-950"
        >
          <Image
            src="/logo-workout-manager.png"
            alt=""
            width={96}
            height={64}
            priority
            className="h-12 w-auto object-contain"
            draggable={false}
          />
          <div className="h-1 w-44 overflow-hidden rounded-full bg-white/15">
            <div
              ref={barRef}
              style={{ transform: 'scaleX(0)' }}
              className="h-full w-full origin-left bg-white/90"
            />
          </div>
        </div>
      </div>
    </RouteTransitionContext.Provider>
  );
}

// Marca que la página REAL terminó de montar. Se coloca al inicio de cada
// page.tsx (nunca en loading.tsx) para que la cortina solo revele contenido.
export function PageReady() {
  const ctx = useContext(RouteTransitionContext);
  useEffect(() => {
    ctx?.notifyReady();
  }, [ctx]);
  return null;
}
