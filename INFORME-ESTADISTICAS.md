# Informe de análisis — Sugerencias de nuevas estadísticas

## Estado actual de la analítica

La app tiene 5 pestañas en `/progress`:

- **General**: días entrenados, rachas, carga acumulada, horas, recuperación, distribución semanal, heatmap de consistencia y top PRs.
- **Musculación**: volumen total, series, grupos musculares, balance PPL.
- **Powerlifting**: 1RM/3RM/5RM estimados, carga real máx, SBD total.
- **CrossFit & Hyrox**: nº de WODs, sesiones, minutos de cardio, distribución por modalidad, mejores tiempos For Time, historiales.
- **Por Ejercicio**: curvas de 1RM/volumen/reps, PRs, tabla Rep-Max, historial de sesiones.

## Datos que ya se capturan pero NO se usan en stats

Oportunidades de mayor valor (cero cambios de UX, solo agregar cálculo):

1. **`isRx`** en cada serie (`src/lib/db/schema.ts:109`) — jamás se consulta. Es la métrica estrella de CrossFit para medir progreso real (Rx vs Scaled).
2. **`distance` y `durationSeconds`** por serie (`schema.ts:106-107`) — se guardan pero ninguna estadística los agrega (distancia total, tiempo en cardio por sesión).
3. **`weeklyVolume`** ya se calcula en `getProgressData` (`src/app/workouts/actions.ts:475`) **pero no se renderiza en ninguna UI** — volumen semanal listo para graficar.
4. **`rpe`** solo alimenta la recuperación; se podría usar para intensidad media y detectar sobreentrenamiento.
5. **`modalityConfig`** (repScheme, intervalos, rounds) se guarda pero solo se resume en texto; no hay agregados por modalidad (p.ej. tiempo medio de AMRAPs de X min).
6. **`endTime`** existe pero solo se usa `totalTimeSeconds`; no se compara tiempo real vs time cap.
7. El tipo **Funcional** y **Calistenia** están en el seed (`src/lib/db/Seed.ts:14-22`) pero ni siquiera tienen pestaña en progress.

## Propuestas por tipo de entrenamiento

### 1. Musculación
- **Volumen semanal por grupo muscular** (línea de tiempo) — el dato clave de periodización que no existe.
- **Frecuencia semanal por grupo** (cuántos días tocas pecho/pierna/etc.) — crítico para diseñar splits.
- **Zonas de repeticiones**: % de series en Fuerza (<6 reps), Hipertrofia (6-12), Resistencia (>12) — se puede calcular hoy con `repCount`.
- **Intensidad relativa** (% del 1RM estimado usado por serie) y peso medio ponderado.
- **Series efectivas al fallo / RIR**: usando `rpe` para inferir aproximación al fallo.
- **Detección de deload/meseta**: cruzar volumen semanal y RPE medio; alertar si el volumen sube pero el RPE también (fatiga).
- **Densidad**: volumen por minuto de sesión.
- **Asimetrías**: comparar mancuerna vs barra por grupo (simple de mapear).

### 2. Powerlifting
- **Evolución 1RM en el tiempo** por movimiento (gráfica) — hoy solo hay récords, no tendencia.
- **Coeficientes de rendimiento** (Wilks/DOTS/IPF GL): comparar SBD con estándares según peso/sexo — requiere capturar **peso corporal** (campo nuevo).
- **Proporción S:B:D** e indicador de "levantamiento atrasado" (p.ej. otro pasa el 80% de esfuerzo).
- **Volumen pesado vs volumen total**: tonelaje ≥80% del 1RM (indica si el mesociclo es de fuerza o hipertrofia).
- **Fallos en series** (drop-off entre serie 1 y última): calidad de las working sets.
- **RPE medio por movimiento** y comparación 1RM estimado real vs calculado.

### 3. CrossFit
- **% de WODs en Rx** (`isRx`) a lo largo del tiempo — el progreso más representativo.
- **Benchmarks**: si entrenas el mismo WOD más de una vez, mostrar deltas de tiempo/rondas (ya tienes `name` para agrupar: Fran, Cindy, Murph…).
- **PBs monostructurales**: mejor tiempo en Running/Remo/Ski/Bike con `distance`+`durationSeconds`.
- **AMRAP**: comparar rondas/resoluciones de AMRAPs iguales o del mismo time cap (gráfica "rondas vs intentos").
- **Cumplimiento vs cap**: % de WODs terminados dentro del time cap (`totalTimeSeconds` vs `timeCapMinutes`).
- **Reps por minuto** (work-rate/densidad por modalidad).
- **Levantamiento olímpico**: 1RM estimado de Snatch y C&J (fórmula Epley), hoy solo se contempla el Big 3.

### 4. Hyrox
- **Desglose por estación vs carrera**: aunque el registro ahora sea global, separar running de estaciones (requiere registrar cada segmento).
- **Pacing**: delta entre el primer y el último tramo de run.
- **Progresión por evento**: comparar tiempos del mismo Hyrox entre ediciones.
- **Ranking estimado** por división edad/sexo (requiere peso corporal/edad/sexo del perfil).

### 5. Cardio / Endurance
- **Kilómetros acumulados** (running/cycling/rowing) sumando `distance` de cada serie.
- **Ritmo medio** (pace/km) y evolución en el tiempo por ejercicio.
- **Volumen por zona estimada**: duración total con RPE bajo (zona 2) vs alto (umbral).
- **PBs por distancia**: mejor 5k, 10k, remo 2k… inferidos al agrupar por `name`.

### 6. Funcional
- **PBs Kettlebell**: 1RM estimado de Swing/Snatch/Clean con la misma fórmula Epley.
- **Volumen de carga funcional** (kg totales mover/arrastrar) con `distance` de Farmer/Sled.
- **Tiempo distribuido por modalidad/estación** para valorar demandas metabólicas.

### 7. Calistenia
- **Skill tracker**: tabla de habilidades desbloqueadas (dominadas, muscle-ups, HSPU, pistol) con su mejor marca de reps.
- **PBs por movimiento** (máx reps en 1 serie / en 1 min / en 5 min).
- **Frecuencia y volumen por grupo** (Gymnastics ya existe como categoría).
- **Progresión de dificultad**: jumps → negatives → full → weighted.

## Propuestas transversales por modalidad (intervalos)

- **Récord por WOD/modality**: mejor tiempo/rondas de "todos los AMRAP 10′", "todos los EMOM 16′" etc., agrupando por `name` o por `modalityConfig` similar.
- **Cumplimiento de estructura**: EMOM completado vs dejado (reps faltantes), rondas incompletas de TABATA/HIIT.
- **Densidad kg/min y reps/min por modalidad** para comparar estímulos.

## Prioridad sugerida (esfuerzo/beneficio)

1. **Zero-código-visual (alta)** — `weeklyVolume` sin renderizar, agregar `isRx`, `distance`, `durationSeconds` a los resúmenes.
2. **Alta (bajo esfuerzo)** — evolución 1RM que ya se calcula por ejercicio, benchmarks por nombre de WOD, zona de reps en musculación, PBs de KB.
3. **Media (requiere nuevo campo)** — peso corporal (Wilks/DOTS, intensidad relativa), separar estaciones Hyrox, ritmo/kilometraje preciso, edad/sexo del perfil.