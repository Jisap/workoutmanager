// Último tipo de entrenamiento usado (punto 7 del informe: los enlaces
// directos a `mode=new-template` caían siempre a `typeId=1`).
// Vive en localStorage: sin esquema nuevo y funciona sin sesión.
const LS_LAST_TYPE = 'wm_last_type_id';

export function getLastTypeId(): number | null {
  if (typeof window === 'undefined') return null;
  const n = parseInt(localStorage.getItem(LS_LAST_TYPE) ?? '', 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function setLastTypeId(id: number): void {
  if (typeof window === 'undefined') return;
  if (Number.isInteger(id) && id > 0) {
    try {
      localStorage.setItem(LS_LAST_TYPE, String(id));
    } catch {
      // almacenamiento no disponible: se sigue con el fallback
    }
  }
}

/** URL de "nueva plantilla" con el último tipo usado (o sin typeId si no hay). */
export function newTemplateHref(): string {
  const last = getLastTypeId();
  return last ? `/workouts/log?mode=new-template&typeId=${last}` : '/workouts/log?mode=new-template';
}
