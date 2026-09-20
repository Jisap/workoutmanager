'use client';

import NextLink, { type LinkProps } from 'next/link';
import {
  useRef,
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactNode
} from 'react';
import { useRouteTransition } from './route-transition';

type TransitionLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  'href' | 'onClick' | 'onNavigate'
> &
  LinkProps & {
    children: ReactNode;
    onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
    onNavigate?: (e: { preventDefault: () => void }) => void;
  };

interface ClickSnapshot {
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  target: string | null;
  hasDownload: boolean;
}

// Sustituto directo de next/link con cortina GSAP entre vistas.
//
// Usa el hook oficial onNavigate de Next 16 para cancelar la navegación
// nativa y ejecutarla bajo la cortina (sin hijacks globales ni dobles
// navegaciones). Se degrada a <Link> normal cuando: clic modificado,
// nueva pestaña, descarga, URL externa, ancla local, cambio solo de
// query/hash, reduced-motion o fuera del provider.
export function TransitionLink({ href, onClick, onNavigate: onNavigateProp, ...rest }: TransitionLinkProps) {
  const transition = useRouteTransition();
  const snapshotRef = useRef<ClickSnapshot | null>(null);

  return (
    <NextLink
      href={href}
      onClick={(e) => {
        const anchor = e.currentTarget;
        snapshotRef.current = {
          button: e.button,
          metaKey: e.metaKey,
          ctrlKey: e.ctrlKey,
          shiftKey: e.shiftKey,
          altKey: e.altKey,
          target: anchor.getAttribute('target'),
          hasDownload: anchor.hasAttribute('download')
        };
        onClick?.(e);
      }}
      onNavigate={(nav) => {
        onNavigateProp?.(nav);
        const snap = snapshotRef.current;
        snapshotRef.current = null;
        if (!transition) return;
        if (!snap || snap.button !== 0) return;
        if (snap.metaKey || snap.ctrlKey || snap.shiftKey || snap.altKey) return;
        if (snap.target === '_blank' || snap.hasDownload) return;
        if (typeof href !== 'string' || href.length === 0 || href.startsWith('#')) return;

        let url: URL;
        try {
          url = new URL(href, window.location.href);
        } catch {
          return;
        }
        if (url.origin !== window.location.origin) return;
        if (url.pathname === window.location.pathname && url.search === window.location.search) {
          // Ancla en la misma página: dejar que Next resuelva el scroll.
          if (url.hash) return;
          // Misma página (p. ej. pinchar la sección activa del sidebar):
          // no recargar los datos — solo volver arriba con scroll suave.
          nav.preventDefault();
          document.getElementById('wm-main')?.scrollTo({ top: 0, behavior: 'smooth' });
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
        // Misma ruta con distinta query (pestañas ?tab=, modal ?open=…): nativo.
        if (url.pathname === window.location.pathname) return;

        nav.preventDefault();
        transition.runCoverTransition(url.pathname + url.search + url.hash);
      }}
      {...rest}
    />
  );
}
