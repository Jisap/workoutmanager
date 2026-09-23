# Informe UX — Workout Manager
*Análisis desde el punto de vista del usuario. Fecha: 2026-09-23*
*Alcance: dashboard, crear, logger, historial, progreso, ajustes, navegación móvil y landing.*
*Excluido a petición: temporizadores de ejecución.*

## Resumen ejecutivo

La app es funcionalmente muy completa (modalidades, WODs, RPE, medidas, compartir), pero el core-loop — **entrenar en el gimnasio con una mano y con prisa** — es lo más friccionado: ~10-12 toques para 1 ejercicio simple, campos vacíos, guardar no fijo y errores silenciosos.

Prioridad: 1) reducir fricción en el logger, 2) simplificar empezar/repetir, 3) hacer móvil realmente usable en entreno.

---

## 1. Momento de entrenar (logger `/workouts/log`) — Prioridad máxima

**Cómo funciona hoy:** `log/page.tsx` resuelve `mode=free|new-template|template|repeat|resume|edit` y `workout-logger-client.tsx` (~2217 líneas) permite añadir ejercicios, editar series en vista compacta/desglosada, elegir modalidad y finalizar con diálogo (nombre, tiempo, score AMRAP/EMOM, guardar como plantilla).

**Fricciones:**

- **Sin memoria en modo libre:** crea 1 ejercicio arbitrario `availableExercisesList[0]` con `repCount:0, weight:null`. Obliga a abrir `ExerciseCombobox` (abrir+escribir+seleccionar) y rellenar todo de cero. `repeat/template` sí trae valores previos. Falta `último: 80kg x 8` como hint clicable.
- **Vista compacta peligrosa:** `updateAllSetsField()` sobrescribe todas las series al editar Reps/Kg. Para pirámide hay que pulsar `Desglosar` por ejercicio. Debería ser edición por serie por defecto.
- **RPE fantasma:** existe en `LocalSet`, se copia y se guarda, la landing promete “Controla RPE”, pero no hay `<Input rpe>` visible. O se muestra o se quita la promesa.
- **Barra no fija:** acciones top + barra bottom `bg-gray-50/90` no sticky. En Hyrox de 16 tramos (`pb-32`) hay que scrollear para guardar. Con teclado móvil los `h-8/h-9` quedan tapados.
- **Campos que aparecen/desaparecen:** `showTimeField` por `includes('run','remo','sled','carry'...) + isCardio`. Cambiar de ejercicio limpia `weight/distance` sin aviso.
- **Errores silenciosos:** `parseDurationInput` ignora `4-30` sin avisar. Necesita parse tolerante `m:ss` + feedback.
- **Score AMRAP/EMOM tardío:** solo se pide en el diálogo final. Hay que recordarlo durante el WOD. Pedirlo arriba/durante.
- **WOD reemplaza sin merge:** `pendingWod` dice “Sustituirá los N ejercicios” sin opción de añadir.
- **Nombres confusos:** `typeName + templateName + directTemplateName`, `makeUniqueName ${base} · 23 sept`, regex `cleanBaseName` puede mutilar nombres con `·`.
- **Modalidad forzada:** `requiresModality` por `includes('crossfit','hyrox'...)` fuerza `For Time` aunque sea fuerza.

**Mejoras propuestas:**
1. Pre-rellenar última marca + 1 toque para repetirla.
2. RPE visible o eliminar claim.
3. Edición por serie por defecto, inputs `h-11` mínimo.
4. Barra `Guardar / Finalizar` sticky con `safe-area`.
5. Validación con mensaje en duración y no borrar datos al ocultar campos.
6. Score AMRAP/EMOM visible durante el entreno.
7. Dialog WOD con `Reemplazar / Añadir`.

## 2. Empezar (`/workouts/new`) — Sobrecarga mental

**Hoy:** 3 bloques: `WorkoutQuickSelector` (tabs `recent|templates`, buscador, filtro, tabla `pageSize=5` + detalle), `Planificar plantilla -> /log?mode=new-template`, `Libre en directo -> /log?mode=free`.

**Fricciones:**
- 4 conceptos: Repetir vs Plantilla vs Diseñar vs En directo. Modos expuestos en URL.
- Si `!hasRecents && !hasTemplates` retorna `null`: novato solo ve dos grids idénticos. Falta onboarding.
- Filtro mal etiquetado: dice “modalidad” pero filtra `typeName`. Buscador dice modalidad pero nunca la busca.
- Tabla poco móvil: `Métricas hidden md`, `Ejercicios hidden lg`. En móvil solo Nombre+Fecha+iconos.
- Descubribilidad: clic en fila selecciona + `scrollIntoView` sin affordance.
- Borrador vs finalizado solo por color ámbar/verde + `border-l-4`.

**Mejoras:**
1. Reducir a 2 caminos: `Repetir algo / Empezar vacío o WOD`.
2. Onboarding con `Fran, Cindy, Push Day vacío` si no hay datos.
3. Arreglar filtro/buscador para incluir `modality` real.
4. Vista tarjetas mobile-first.
5. Badge `Sin finalizar` + `Continuar` explícito, no solo color.

## 3. Historial (`/workouts`) — Mucha info, poca acción

**Hoy:** `getWorkoutsOverview(200)` + tabs `history|templates`, toolbar (search deferred, 3 filtros, vista tabla/cards), paginación 10, modales dynamic.

**Fricciones:**
- 7 controles apilados antes de la lista. Tabla 8 cols con `overflow-x-auto` obliga scroll horizontal en móvil.
- Fila `onClick -> setSelectedWorkout` abre modal accidentalmente.
- 5 botones por fila, en móvil 5 iconos juntos.
- Cards agrupan por mes después de paginar: `Xkg en esta página` engañoso.
- Modal detalle `max-w-xl` con 6 decisiones: Eliminar, Editar, Plantilla, Compartir, Cerrar, Repetir.
- Editar solo `name+notes`. Corregir `80->82.5kg` exige ir al logger, no descubrible.
- Borrado sin undo. `saveAsTemplate` te saca a tab plantillas perdiendo contexto.
- Deep-link `?open=` no sobrevive a recarga.

**Mejoras:**
1. Jerarquía: `Repetir` primario, resto en overflow.
2. Edición inline de serie + undo al borrar (30s).
3. Filtros colapsables en móvil, cards por defecto en móvil.
4. Mantener contexto tras guardar plantilla, deep-link persistente.

## 4. Dashboard (`/dashboard`) — No empuja a entrenar

**Hoy:** Server Component con 4 cards (`Totales, Racha, Frecuencia, Peso` + `CountUp`), `ConsistencyHeatmap` y `AnimatedList` recientes con `?open=id`.

**Fricciones:**
- Sin `Continuar borrador`. Muestra `Sin tiempo` sin acción.
- Repetir = 3 clics mínimo.
- `Entrenamientos Totales / Días activos` confunde.
- `delta30d` y aviso peso solo condicionales, CTA `Ver evolución` en texto pequeño.
- Preview `slice(0,2)+N más`, volumen `t vs kg` inconsistente, `modality` crudo sin `formatModalitySummary()`.
- `GoalsSection` promete uso en mapa pero heatmap no lee `wm_weekly_goal`.
- Heatmap duplicado en dashboard y progreso.

**Mejoras:**
1. Hero-action: `Continuar / Empezar hoy` arriba.
2. `Repetir` en 1 clic desde reciente.
3. Conectar meta semanal a heatmap o quitarla.
4. Unificar formato volumen y modalidad.

## 5. Progreso (`/progress`) — Potente pero intimidante

**Hoy:** Tabs `general|musculacion|powerlifting|crossfit|exercise|corporal`, pesadas en dynamic. General = stats + PRs + heatmap. Exercise = chart. Corporal = peso vs volumen + historial.

**Fricciones:**
- 6 tabs en `overflow-x-auto`, cambio no actualiza URL. Compartir/back rompe.
- General: `recovery{ready|almost|recovering}` opaco, sin comparativa vs meta.
- PRs sin link a sesión.
- Heatmap celdas `w-3.5 h-3.5` (14px) intocables, tooltip hover inútil en touch. Clic en vacío lleva a `/workouts/new` en vez de `/log` directo.
- Por ejercicio: ~10 controles (buscador, categoría, onlyWithLogs, 1M/3M/6M/1A, tendencia, volumen, borradores, comparar). Botones aparecen/desaparecen según datos. SVG `700x260 min-w-520` con scroll, hover sin touch.
- Corporal: exige `2 pesos + volumen 60d` o vacío. Selector 8 métricas con disabled presentes. Tabla 10 cols `min-w-640`. Dialog 9 inputs sin `solo peso`, solo pre-rellena altura. Sin editar, solo borrar+recrear.

**Mejoras:**
1. URL por tab (`?tab=` sincronizado).
2. Simplificar Por Ejercicio a: elige -> ves si subes. Comparar como avanzado colapsado.
3. Gráficas táctiles, sin scroll horizontal.
4. PRs enlazados a sesión, modo rápido `Solo peso` + editar medición.

## 6. Ajustes (`/settings`) — Prometen lo que no hacen

**Hoy:** Grid `lg:5`: Perfil, Ejercicios, Categorías + Objetivos, Tipos, Preferencias, Tema. Objetivos/unidad en `localStorage`.

**Fricciones:**
- Perfil read-only con hint “avatar arriba” pero `sidebar.tsx` no tiene `UserButton`, solo `SignOut`.
- Objetivo 1-7 en `localStorage`: no cross-device, no enlazado, no notifica.
- `Pencil|Trash opacity-0 group-hover` invisibles en táctil/teclado.
- Crear categoría pide Tipo hardcodeado desconectado de `workoutTypes`. Eliminar deja `sin categoría`.
- Tipos solo lectura, `Piernas` cae a gris. `Próximamente...` dead-end.
- Preferencia `kg|lb` sin efecto: todo hardcodea `kg, m, m:ss`.
- Zona peligro deriva a panel Clerk inexistente.

**Mejoras:**
1. Quitar o implementar de verdad `lb`, tipos custom, meta semanal.
2. Acciones siempre visibles en táctil, reasignar al borrar categoría.
3. Corregir hints de navegación a Clerk.

## 7. Navegación / Móvil — Crítico para gimnasio

**Hoy:** `Sidebar` desktop `w-64` + móvil `fixed bottom-0` 4 iconos. Sin `safe-area`.

**Fricciones:**
- Activo `pathname===href` exacto: en `/workouts/new|/log` nada resalta.
- Desktop 2 CTAs, móvil ninguno. Hay que ir `Dashboard->Nuevo` o header.
- `Nueva Plantilla -> /log?mode=new-template` sin `typeId` cae a `id=1`.
- `pb-20|pb-24|pb-32` inconsistente, dashboard sin `pb` queda bajo nav.
- Feedback solo `Loader2`, sin skeleton.

**Mejoras:**
1. Botón central `+` en bottom nav -> `/log?mode=free`.
2. Active state por prefijo `/workouts`.
3. `safe-area-inset-bottom` + `pb` consistente.
4. Pasar `typeId` siempre al crear plantilla.

## 8. Catálogos y utilidades

- `formatModalitySummary` sin config retorna crudo. Defaults `HIIT sets:3 vs TABATA sets:1` inconsistentes, sin validación `rounds 0`.
- `OFFICIAL_WODS[24]` solo `rx-men|rx-women` sin scaled/% — excluye novatos. `WOD_CATEGORY_LABELS girl:The Girls` en inglés en UI española.
- `searchQueries includes + fallbackName` riesgo duplicados. `reps:0 + ladder[21,15,9]` puede crear series `0 reps`. Sin catálogo Hyrox equivalente.

## 9. Landing (`/`)

- Promete `RPE, %1RM, sin fricción con una sola mano` que el logger no cumple.
- Efectos `Magnet, ClickSpark, StarBorder, GlareHover` sin `prefers-reduced-motion`, riesgo perf móvil.
- Tabla comparativa con claims absolutos vs gaps reales (`lb`, `RPE`).
- Auth solo modal, sin fallback. Mock vs logger real genera mismatch.

---

## Priorización sugerida

**Quick wins (semana 1):**
1. Pre-rellenar última marca + `Continuar` en dashboard.
2. Barra guardar/finalizar sticky + inputs `h-11`.
3. CTA `+` en bottom nav móvil.
4. Arreglar textos que mienten (filtro modalidad, RPE, lb, meta).

**Medio plazo:**
1. Simplificar `/new` a Repetir / Empezar.
2. Edición inline + undo en historial.
3. Progreso con URL, táctil y `solo peso`.
4. WODs con Scaled, no solo Rx.
