# 🏋️‍♂️ Workout Manager

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle-ORM-C5F74F?logo=drizzle)](https://orm.drizzle.team/)
[![Neon](https://img.shields.io/badge/Database-Neon_Postgres-00E599?logo=postgresql)](https://neon.tech/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

> **Workout Manager** es una aplicación web moderna, rápida y escalable para la gestión, seguimiento y análisis detallado de rutinas de entrenamiento. Permite crear plantillas, registrar series con métricas avanzadas (peso, repeticiones, RPE, distancia) y visualizar el progreso con estadísticas globales.

---

## ✨ Características Principales

- 🔐 **Autenticación Segura** — Integración completa con **Clerk** (Sign-in / Sign-up).
- 📝 **Gestión de Entrenamientos** — Creación, edición y ejecución de sesiones en tiempo real.
- 📚 **Plantillas y Categorías** — Rutinas reutilizables y ejercicios organizados por categorías personalizadas.
- 📊 **Seguimiento de Progreso** — Dashboard con estadísticas globales y análisis de rendimiento histórico.
- 🎯 **Métricas Detalladas** — Registro preciso por serie: repeticiones, peso, distancia, duración, RPE y notas.
- 🎨 **UI Moderna y Accesible** — Construida con **Shadcn UI**, **Base UI** y **Tailwind v4**, con modo oscuro/claro nativo.
- ⚡ **Rendimiento Optimizado** — App Router de Next.js 16, Server Components y tipografía **Geist**.

---

## 🛠️ Stack Tecnológico

| Categoría             | Tecnologías                                                                              |
| :-------------------- | :--------------------------------------------------------------------------------------- |
| **Frontend**          | Next.js 16 (App Router), React 19, TypeScript                                            |
| **Estilos y UI**      | Tailwind CSS v4, Shadcn UI, `@base-ui/react`, `lucide-react`, `class-variance-authority` |
| **Base de Datos**     | Neon (PostgreSQL Serverless)                                                             |
| **ORM y Migraciones** | Drizzle ORM, `drizzle-kit`                                                               |
| **Autenticación**     | Clerk (`@clerk/nextjs`)                                                                  |
| **Herramientas**      | ESLint 9, PostCSS, `tsx` (scripts de seed)                                               |

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
# Generar migraciones (si modificaste el esquema)
npm run db:generate

# Aplicar cambios a la base de datos
npm run db:push

# (Opcional) Poblar con datos de prueba
npm run db:seed
```

### 5. Iniciar el servidor de desarrollo
```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador. 🚀

---

## 📁 Estructura del Proyecto

```
workoutmanager/
├── drizzle/                  # Migraciones y metadatos (Drizzle)
├── public/                   # Archivos estáticos (imágenes, iconos, fuentes)
├── src/
│   ├── app/                  # Rutas y páginas (Next.js App Router)
│   │   ├── dashboard/        # Vista principal del usuario
│   │   ├── progress/         # Estadísticas globales y gráficos
│   │   ├── settings/         # Configuración y categorías personalizadas
│   │   ├── workouts/         # Gestión y ejecución de entrenamientos
│   │   ├── sign-in/          # Rutas de Clerk
│   │   └── page.tsx          # Landing
│   ├── components/           # Componentes UI reutilizables (Shadcn, Base UI)
│   ├── lib/
│   │   ├── db/               # Configuración Drizzle ORM y scripts de seed
│   │   └── utils.ts          # Utilidades (clsx, tailwind-merge)
│   └── middleware.ts         # Middleware Next.js (protección de rutas Clerk)
├── components.json           # Configuración Shadcn UI
├── drizzle.config.ts         # Configuración Drizzle Kit
├── next.config.ts            # Configuración Next.js
├── package.json              # Dependencias y scripts
├── postcss.config.mjs        # Configuración PostCSS / Tailwind v4
└── tsconfig.json             # Configuración TypeScript
```

---

## 📜 Licencia

Este proyecto es de código abierto bajo la licencia [MIT](./LICENSE).