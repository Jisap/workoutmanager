# 🏋️‍♂️ Workout Manager

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle-ORM-C5F74F?logo=drizzle)](https://orm.drizzle.team/)
[![Neon](https://img.shields.io/badge/Database-Neon_Postgres-00E599?logo=postgresql)](https://neon.tech/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

> **Workout Manager** es una aplicación web moderna, rápida y escalable para la gestión, seguimiento y análisis detallado de rutinas de entrenamiento. Permite crear plantillas, registrar series con métricas avanzadas (peso, repeticiones, RPE, distancia, duración, Rx) y visualizar el progreso con estadísticas por modalidad, además de llevar un seguimiento de medidas corporales.

---

## ✨ Características Principales

- 🔐 **Autenticación Segura** — Integración completa con **Clerk** (Sign-in / Sign-up, modal y rutas).
- 📝 **Gestión de Entrenamientos** — Creación, edición y ejecución de sesiones en tiempo real, con historial y clonado a plantilla.
- 🏋️ **Modalidades de Entrenamiento** — Soporte para AMRAP, For Time, EMOM, AFAP, TABATA, HIIT, Chipper y Ladder, con configuración y resumen por modalidad.
- 🏆 **Catálogo de WODs Oficiales** — Girls, Héroes y clásicos con prescripción Rx (hombres/mujeres) listos para cargar en un clic (`src/lib/wods-catalog.ts`).
- 📚 **Plantillas y Categorías** — Rutinas reutilizables, 7 tipos de entrenamiento y ejercicios organizados por categorías personalizadas (propias o globales).
- 📊 **Seguimiento de Progreso** — Dashboard con racha, frecuencia semanal y heatmap de consistencia; pestañas de General, Musculación, Powerlifting, CrossFit/Cardio, Por Ejercicio y Corporal.
- 🎯 **Métricas Detalladas** — Registro preciso por serie: repeticiones, peso, distancia, duración, RPE, marca Rx/Scaled y notas; cálculo de 1RM estimado (fórmula Epley).
- ⚖️ **Medidas Corporales** — Peso, % de grasa, masa muscular, IMC y perímetros con curva de evolución y lectura peso vs volumen entrenado.
- 🎨 **UI Moderna y Accesible** — Construida con **Shadcn UI**, **Base UI** y **Tailwind v4**, con modo oscuro/claro (ThemeProvider propio con persistencia en `localStorage`).
- 🎬 **Transiciones entre Vistas** — Cortina GSAP con logo al cambiar de página (ver [convenciones](#-convenciones-de-navegación)).
- 🔗 **Deep-link al Detalle** — Las tarjetas del dashboard abren el modal de detalle del historial (`/workouts?open=<id>`).
- 📤 **Compartir Entrenamientos** — Desde el modal de detalle: copiar resumen, descargar Markdown o tarjeta imagen (PNG 1080×1350) con Web Share en móvil.
- ⚡ **Rendimiento Optimizado** — App Router de Next.js 16, Server Components y tipografías **Oswald + Inter + JetBrains Mono**.

---

## 🛠️ Stack Tecnológico

| Categoría             | Tecnologías                                                                                              |
| :-------------------- | :------------------------------------------------------------------------------------------------------- |
| **Frontend**          | Next.js 16 (App Router), React 19, TypeScript                                                            |
| **Estilos y UI**      | Tailwind CSS v4, Shadcn UI (estilo `base-nova`), `@base-ui/react`, `lucide-react`, `class-variance-authority`, `tw-animate-css`, `cmdk`, `motion`, `gsap` |
| **Base de Datos**     | Neon (PostgreSQL Serverless)                                                                             |
| **ORM y Migraciones** | Drizzle ORM, `drizzle-kit` (`@neondatabase/serverless` + `postgres`)                                     |
| **Autenticación**     | Clerk (`@clerk/nextjs`)                                                                                  |
| **Herramientas**      | ESLint 9, PostCSS (`@tailwindcss/postcss`), `tsx` + `dotenv`/`dotenv-cli` (script de seed)                |

---

## 📋 Requisitos Previos

- [Node.js](https://nodejs.org/) **v20 o superior**
- [npm](https://www.npmjs.com/) / [pnpm](https://pnpm.io/) / [yarn](https://yarnpkg.com/) / [bun](https://bun.sh/)
- Una cuenta en [Neon](https://neon.tech/) (base de datos)
- Una cuenta en [Clerk](https://clerk.com/) (autenticación)

---

## 🚀 Instalación y Configuración

### 1. Clonar el repositorio
```bash
git clone https://github.com/Jisap/workoutmanager.git
cd workoutmanager
```

### 2. Instalar dependencias
```bash
npm install
# o: pnpm install / yarn install / bun install
```

### 3. Configurar variables de entorno
Crea un archivo `.env.local` en la raíz del proyecto:

```bash
# Base de Datos (Neon PostgreSQL)
DATABASE_URL="postgresql://user:password@ep-xyz.region.aws.neon.tech/dbname?sslmode=require"

# Autenticación (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
```

> 💡 Las claves de Clerk las encuentras en el dashboard → **API Keys**.

### 4. Configurar la base de datos
```bash
# Generar migraciones (si modificaste el esquema en src/lib/db/schema.ts)
npm run db:generate

# Aplicar cambios a la base de datos
npm run db:push

# Poblar con el catálogo base: 7 tipos de entrenamiento, 15 categorías y ~100 ejercicios
npm run db:seed
```

> 💡 `drizzle.config.ts` y el seed leen `.env.local` (y como alternativa `.env`).

### 5. Iniciar el servidor de desarrollo
```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador. 🚀

### 6. Otros comandos útiles
```bash
npm run build   # Compilar para producción
npm run start   # Servir la build de producción
npm run lint    # Ejecutar ESLint
```

---

## 📁 Estructura del Proyecto

```
workoutmanager/
├── drizzle/                  # Migraciones y metadatos (Drizzle)
├── public/                   # Archivos estáticos (logos, iconos)
├── src/
│   ├── app/                  # Rutas y páginas (Next.js App Router)
│   │   ├── dashboard/        # Vista principal (rachas, heatmap, recientes, peso)
│   │   ├── progress/         # Analítica: general, musculación, powerlifting,
│   │   │                     # crossfit/cardio, por ejercicio y corporal + actions
│   │   ├── settings/         # Perfil, ejercicios/categorías personalizadas + actions
│   │   ├── workouts/         # Historial, plantillas, creación (new/) y registro (log/) + actions
│   │   ├── sign-in/          # Ruta de inicio de sesión (Clerk)
│   │   ├── sign-up/          # Ruta de registro (Clerk)
│   │   ├── layout.tsx        # Layout raíz (Clerk, Sidebar, ThemeProvider, fuentes,
│   │   │                     # transición de rutas, Toaster)
│   │   └── page.tsx          # Landing pública
│   ├── components/           # Componentes reutilizables
│   │   ├── landing/          # Showcase interactivo y FAQ de la landing
│   │   ├── layout/           # Sidebar, cortina de transición (route-transition.tsx)
│   │   │                     # y enlaces con transición (transition-link.tsx)
│   │   ├── reactbits/        # Lista animada y contador animado del dashboard
│   │   ├── ui/               # Componentes Shadcn/Base UI
│   │   ├── workout/          # Creador de ejercicios, picker de WODs, builder Hyrox,
│   │   │                     # panel de modalidad y combobox de ejercicios
│   │   └── ThemeProvider.tsx # Tema claro/oscuro con persistencia (wm_theme)
│   ├── lib/
│   │   ├── db/               # schema.ts, index.ts y Seed.ts (Drizzle ORM)
│   │   ├── modality-utils.ts # Resumen y duración estimada por modalidad
│   │   ├── wods-catalog.ts   # Catálogo de WODs oficiales con Rx H/M
│   │   └── utils.ts          # Utilidades (clsx, tailwind-merge)
│   └── middleware.ts         # Middleware de Clerk (las páginas verifican sesión con auth())
├── components.json           # Configuración Shadcn UI
├── drizzle.config.ts         # Configuración Drizzle Kit (lee .env.local / .env)
├── next.config.ts            # Configuración Next.js (optimizePackageImports,
│                             # staleTimes del router cache: dynamic 30 s)
├── package.json              # Dependencias y scripts
├── postcss.config.mjs        # Configuración PostCSS / Tailwind v4
└── tsconfig.json             # Configuración TypeScript (alias @/* → ./src/*)
```

## 🧭 Convenciones de Navegación

Las transiciones entre páginas usan una cortina GSAP (`src/components/layout/route-transition.tsx`). Reglas a respetar:

1. **Enlaces internos** — Usa `TransitionLink` (`@/components/layout/transition-link`, misma API que `next/link`). Solo anima al cambiar de ruta; misma página hace scroll suave, cambios de query (`?tab=`, `?open=`) van nativos.
2. **Páginas nuevas** — Añade `<PageReady />` al inicio del JSX de cada `page.tsx` autenticada (nunca en `loading.tsx`): la cortina solo se levanta con contenido real. Sin él, la cortina espera al timeout (3 s).
3. **Navegación programática** — Usa `useTransitionNavigate()` en lugar de `router.push` (misma API, respeta las reglas anteriores).

Además, `staleTimes.dynamic: 30` en `next.config.ts` sirve las revisitas desde la caché del router (las mutaciones invalidan vía `revalidatePath`, sin datos obsoletos).

## 🗄️ Modelo de Datos

Tablas principales en `src/lib/db/schema.ts`: `workout_types`, `exercise_categories`, `exercises`, `workout_templates`, `template_exercises`, `workouts`, `workout_exercises`, `sets` (dato atómico: reps, peso, distancia, duración, RPE, Rx, notas) y `body_measurements` (peso, composición y perímetros).

El esquema incluye 14 índices btree sobre las rutas calientes (`workouts(userId, startTime)`, `workoutExercises(workoutId)`, `sets(workoutExerciseId)`, etc.). Tras modificar el esquema, genera la migración con `npm run db:generate` y aplícala con `npm run db:push`.

---

## 📜 Licencia

Este proyecto es de código abierto bajo la licencia [MIT](./LICENSE).