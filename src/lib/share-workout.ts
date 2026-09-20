// Formateadores y salidas para compartir entrenamientos.
//
// Todo es lado cliente y parte de los datos que ya tiene el historial
// (WorkoutHistoryItem es compatible estructuralmente con ShareableWorkout):
// resumen de texto (portapapeles), Markdown descargable (.md) y tarjeta
// imagen (canvas PNG 1080×1350, apta para redes + Web Share API).
import { formatModalitySummary } from './modality-utils';
import type { ModalityConfig } from './db/schema';

export interface ShareableSet {
  setNumber: number;
  weight: number | null;
  repCount: number | null;
  distance?: number | null;
  durationSeconds?: number | null;
  formatted?: string;
}

export interface ShareableExercise {
  name: string;
  setsCount: number;
  maxWeight: number;
  repsSummary?: string;
  sets?: ShareableSet[];
}

export interface ShareableWorkout {
  name: string;
  typeName: string;
  modality?: string | null;
  modalityConfig?: ModalityConfig | null;
  startTime: Date | string;
  totalTimeSeconds: number | null;
  notes: string | null;
  totalVolume: number;
  totalSets: number;
  exercisesSummary: ShareableExercise[];
}

export function formatWorkoutDate(startTime: Date | string): string {
  return new Date(startTime).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export function formatWorkoutDuration(totalTimeSeconds: number | null): string {
  return totalTimeSeconds ? `${Math.round(totalTimeSeconds / 60)} min` : '—';
}

export function formatWorkoutVolume(totalVolume: number): string {
  if (totalVolume <= 0) return '0 kg';
  if (totalVolume >= 1000) return `${(totalVolume / 1000).toFixed(1)} t`;
  return `${Math.round(totalVolume)} kg`;
}

function exerciseOneLiner(ex: ShareableExercise): string {
  return ex.repsSummary || `${ex.setsCount} ${ex.setsCount === 1 ? 'serie' : 'series'}`;
}

// Resumen de texto plano (portapapeles, WhatsApp, Telegram…).
export function formatWorkoutText(w: ShareableWorkout): string {
  const lines = [
    `💪 ${w.name}`,
    `📅 ${formatWorkoutDate(w.startTime)} · ${w.typeName}${
      w.modality ? ` · ${w.modality}` : ''
    }`,
    `⏱ ${formatWorkoutDuration(w.totalTimeSeconds)} · 🏋️ ${formatWorkoutVolume(
      w.totalVolume
    )} · ${w.totalSets} ${w.totalSets === 1 ? 'serie' : 'series'}`
  ];
  if (w.exercisesSummary.length > 0) {
    lines.push('', ...w.exercisesSummary.map((ex) => `• ${ex.name} — ${exerciseOneLiner(ex)}`));
  }
  if (w.notes?.trim()) lines.push('', `📝 ${w.notes.trim()}`);
  return lines.join('\n');
}

// Documento Markdown descargable.
export function formatWorkoutMarkdown(w: ShareableWorkout): string {
  const lines = [
    `# ${w.name}`,
    '',
    `**${w.typeName}**${w.modality ? ` · ${w.modality}` : ''} · ${formatWorkoutDate(
      w.startTime
    )}`,
    '',
    `- ⏱ Duración: ${formatWorkoutDuration(w.totalTimeSeconds)}`,
    `- 🏋️ Volumen: ${formatWorkoutVolume(w.totalVolume)}`,
    `- 🔁 Series: ${w.totalSets} en ${w.exercisesSummary.length} ${
      w.exercisesSummary.length === 1 ? 'ejercicio' : 'ejercicios'
    }`,
    ''
  ];
  if (w.exercisesSummary.length > 0) {
    lines.push('## Ejercicios', '');
    for (const ex of w.exercisesSummary) {
      lines.push(`- **${ex.name}** — ${exerciseOneLiner(ex)}`);
      if (ex.sets && ex.sets.length > 0) {
        const detail = ex.sets
          .map((s) => s.formatted || `S${s.setNumber}: ${s.repCount ?? 0} reps`)
          .join(' · ');
        lines.push(`  - ${detail}`);
      }
    }
    lines.push('');
  }
  if (w.notes?.trim()) lines.push(`> ${w.notes.trim()}`, '');
  lines.push('---', '_Compartido desde Workout Manager_');
  return lines.join('\n');
}

export function workoutShareFilename(w: ShareableWorkout, ext: string): string {
  const slug =
    w.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'entreno';
  const d = new Date(w.startTime);
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(
    d.getDate()
  ).padStart(2, '0')}`;
  return `${slug}-${stamp}.${ext}`;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

function truncateEnd(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) {
    out = out.slice(0, -1);
  }
  return `${out}…`;
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth || !current) {
      current = next;
    } else {
      lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) {
        const rest = words.slice(words.indexOf(word)).join(' ');
        lines.push(truncateEnd(ctx, `${current} ${rest}`.trim(), maxWidth));
        return lines;
      }
    }
  }
  if (current && lines.length < maxLines) lines.push(truncateEnd(ctx, current, maxWidth));
  return lines;
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.rect(x, y, w, h);
  }
}

// Tarjeta 1080×1350 lista para redes. Usa las fuentes ya cargadas en el
// documento (Inter) con fallback del sistema.
export async function renderWorkoutCard(w: ShareableWorkout): Promise<HTMLCanvasElement> {
  try {
    await document.fonts.ready;
  } catch {
    // Sin Font Loading API: se dibuja con la pila de fallback.
  }
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas no disponible');

  const FONT = '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif';
  const PAD = 90;
  const CONTENT = W - PAD * 2;

  // Fondo + resplandor superior.
  ctx.fillStyle = '#0A0F1E';
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, -120, 60, W / 2, -120, 700);
  glow.addColorStop(0, 'rgba(59, 130, 246, 0.28)');
  glow.addColorStop(1, 'rgba(59, 130, 246, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, 620);

  ctx.textBaseline = 'alphabetic';

  // Cabecera de marca + fecha.
  ctx.font = `600 30px ${FONT}`;
  ctx.fillStyle = '#64748B';
  ctx.fillText('W O R K O U T   M A N A G E R', PAD, 108);
  const dateLabel = formatWorkoutDate(w.startTime).toUpperCase();
  ctx.textAlign = 'right';
  ctx.fillText(dateLabel, W - PAD, 108);
  ctx.textAlign = 'left';

  // Acento.
  ctx.fillStyle = '#3B82F6';
  roundRectPath(ctx, PAD, 138, 120, 8, 4);
  ctx.fill();

  // Título (máx. 2 líneas).
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `800 68px ${FONT}`;
  const titleLines = wrapLines(ctx, w.name, CONTENT, 2);
  titleLines.forEach((line, i) => ctx.fillText(line, PAD, 232 + i * 80));

  // Meta: tipo · modalidad · duración.
  const modality =
    w.modality != null && w.modality !== ''
      ? ` · ${formatModalitySummary(w.modality, w.modalityConfig)}`
      : '';
  ctx.font = `500 34px ${FONT}`;
  ctx.fillStyle = '#94A3B8';
  ctx.fillText(
    truncateEnd(ctx, `${w.typeName}${modality} · ${formatWorkoutDuration(w.totalTimeSeconds)}`, CONTENT),
    PAD,
    232 + (titleLines.length - 1) * 80 + 62
  );

  // KPIs.
  const kpiY = 470;
  const kpiW = (CONTENT - 36) / 3;
  const kpiH = 150;
  const kpis = [
    { value: formatWorkoutDuration(w.totalTimeSeconds), label: 'DURACIÓN' },
    { value: formatWorkoutVolume(w.totalVolume), label: 'VOLUMEN' },
    { value: String(w.totalSets), label: w.totalSets === 1 ? 'SERIE' : 'SERIES' }
  ];
  kpis.forEach((kpi, i) => {
    const x = PAD + i * (kpiW + 18);
    ctx.fillStyle = '#131C33';
    roundRectPath(ctx, x, kpiY, kpiW, kpiH, 28);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `800 58px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(truncateEnd(ctx, kpi.value, kpiW - 40), x + kpiW / 2, kpiY + 82);
    ctx.fillStyle = '#64748B';
    ctx.font = `600 25px ${FONT}`;
    ctx.fillText(kpi.label, x + kpiW / 2, kpiY + 124);
    ctx.textAlign = 'left';
  });

  // Ejercicios (máx. 5 + contador).
  ctx.fillStyle = '#64748B';
  ctx.font = `600 28px ${FONT}`;
  const exCount = w.exercisesSummary.length;
  ctx.fillText(
    `E J E R C I C I O S   ·   ${exCount}`,
    PAD,
    692
  );
  const shown = w.exercisesSummary.slice(0, 5);
  ctx.font = `700 36px ${FONT}`;
  shown.forEach((ex, i) => {
    const y = 762 + i * 88;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(truncateEnd(ctx, `${i + 1}. ${ex.name}`, 560), PAD, y);
    ctx.fillStyle = '#94A3B8';
    ctx.font = `500 31px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText(truncateEnd(ctx, exerciseOneLiner(ex), 330), W - PAD, y);
    ctx.textAlign = 'left';
    ctx.font = `700 36px ${FONT}`;
  });
  let footerY = 762 + (shown.length - 1) * 88 + 62;
  if (exCount > shown.length) {
    ctx.fillStyle = '#64748B';
    ctx.font = `500 31px ${FONT}`;
    ctx.fillText(`+ ${exCount - shown.length} ${exCount - shown.length === 1 ? 'ejercicio más' : 'ejercicios más'}`, PAD, footerY);
    footerY += 52;
  }

  // Notas (1 línea si hay hueco).
  if (w.notes?.trim() && footerY < 1160) {
    ctx.fillStyle = '#94A3B8';
    ctx.font = `italic 500 30px ${FONT}`;
    ctx.fillText(truncateEnd(ctx, `“${w.notes.trim()}”`, CONTENT), PAD, footerY);
  }

  // Pie.
  ctx.fillStyle = '#475569';
  ctx.font = `600 26px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('Registrado con Workout Manager', W / 2, 1290);
  ctx.textAlign = 'left';

  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('No se pudo generar la imagen'));
    }, 'image/png');
  });
}

// Web Share API con archivos (móvil). Devuelve true si el sistema tomó el
// archivo (o el usuario canceló), false si hay que recurrir a descarga.
export async function shareImageFile(file: File, title: string, text: string): Promise<boolean> {
  try {
    const nav = navigator as Navigator & {
      canShare?: (data: { files: File[] }) => boolean;
      share?: (data: { files: File[]; title?: string; text?: string }) => Promise<void>;
    };
    if (typeof nav.canShare === 'function' && typeof nav.share === 'function') {
      if (nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title, text });
        return true;
      }
      return false;
    }
    return false;
  } catch {
    // AbortError (cancelado por el usuario) también cae aquí: no molestar.
    return true;
  }
}
