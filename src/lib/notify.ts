// Fachada única para notificaciones toast.
// Desacopla los call sites de la API de Base UI: si algún día cambia el
// sistema de toasts, solo se toca este archivo.
// Las Server Actions no pueden pintar UI: devuelven `{ success }` o lanzan,
// y el componente cliente notifica aquí el resultado.

import { toast } from '@/components/ui/toast';

export type NotifyKind = 'success' | 'error' | 'info' | 'warning';

function show(kind: NotifyKind, title: string, description?: string): string {
  return toast.add({ title, description, type: kind });
}

function messageOf(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export const notify = {
  success: (title: string, description?: string) => show('success', title, description),
  error: (title: string, description?: string) => show('error', title, description),
  info: (title: string, description?: string) => show('info', title, description),
  warning: (title: string, description?: string) => show('warning', title, description),
  /** Atajo para `catch`: usa el mensaje del Error si existe. */
  errorFrom: (error: unknown, fallback: string, title = 'Algo salió mal') =>
    show('error', title, messageOf(error, fallback)),
};
