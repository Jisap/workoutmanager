
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import { SignInButton, SignUpButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dumbbell,
  TrendingUp,
  Calendar,
  Activity,
  Clock,
  ChevronRight,
  BarChart3
} from 'lucide-react';

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect('/dashboard');
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-zinc-950 text-zinc-50 selection:bg-emerald-500/30">
      {/* Fondo sutil de malla técnica */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      <main className="flex-1 space-y-24 py-20 md:py-32">
        <section className="mx-auto flex max-w-5xl flex-col items-center space-y-8 px-4 text-center">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-zinc-800 bg-zinc-900/80 py-1.5 px-3 backdrop-blur-md shadow-sm">
            <Image
              src="/logo-workout-manager.png"
              alt="Workout Manager"
              width={48}
              height={32}
              priority
              className="h-5 w-auto object-contain"
            />
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            <span className="text-xs font-medium text-zinc-300">v2.0 disponible</span>
          </div>

          <h1 className="text-5xl font-bold tracking-tight text-white md:text-7xl lg:text-8xl">
            El sistema operativo<br />
            <span className="text-zinc-500">para tu progreso físico.</span>
          </h1>

          <p className="max-w-2xl text-lg text-zinc-400 md:text-xl leading-relaxed">
            Una herramienta de registro y análisis diseñada para la precisión.
            Desde la periodización en halterofilia hasta el control de volumen en hipertrofia y Hyrox.
          </p>

          <div className="flex flex-col items-center gap-4 pt-4 sm:flex-row">
            <SignUpButton mode="modal">
              <Button size="lg" className="h-12 rounded-lg bg-zinc-50 px-8 text-base font-semibold text-zinc-950 transition-all hover:bg-zinc-200">
                Iniciar registro
              </Button>
            </SignUpButton>
            <SignInButton mode="modal">
              <Button
                size="lg"
                variant="ghost"
                className="h-12 rounded-lg px-8 text-base font-medium text-zinc-400 transition-all hover:bg-zinc-900 hover:text-zinc-50"
              >
                Acceder al dashboard
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </SignInButton>
          </div>

          {/* Mockup de datos para demostrar sofisticación inmediata */}
          <div className="mt-12 w-full max-w-3xl rounded-xl border border-zinc-800 bg-zinc-900/50 p-2 backdrop-blur-sm">
            <div className="flex items-center justify-between rounded-lg bg-zinc-950 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-900 border border-zinc-800">
                  <BarChart3 className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-zinc-200">Volumen Semanal</p>
                  <p className="text-xs text-zinc-500 font-mono">PIERNA · SEMANA 42</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold font-mono text-emerald-400">14,250 <span className="text-sm text-zinc-500">kg</span></p>
                <p className="text-xs text-emerald-500/80 font-mono">↑ 8.4% vs. semana anterior</p>
              </div>
            </div>
          </div>
        </section>

        {/* Bento Grid Features: Estructura, modularidad y detalle */}
        <section className="mx-auto max-w-6xl px-4">
          <div className="mb-12">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">Arquitectura de entrenamiento</h2>
            <p className="mt-2 text-zinc-500">Módulos diseñados para capturar cada variable relevante.</p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:grid-rows-2">
            {/* Feature 1: Grande, abarca 2 columnas */}
            <Card className="group md:col-span-2 border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900/60 transition-all duration-300">
              <CardHeader>
                <div className="mb-2 flex items-center gap-2">
                  <Dumbbell className="h-5 w-5 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
                  <CardTitle className="text-lg text-zinc-100">Registro de alta fidelidad</CardTitle>
                </div>
                <CardDescription className="text-zinc-500">
                  No solo peso y repeticiones. Registra RPE, tempo (ej. 3-1-X-0), tiempo de descanso y 1RM estimado en tiempo real.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mt-2">
                  {['Musculación', 'Halterofilia', 'Hyrox'].map((tag) => (
                    <Badge key={tag} variant="secondary" className="bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border-zinc-700">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Feature 2: Análisis */}
            <Card className="group border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900/60 transition-all duration-300">
              <CardHeader>
                <div className="mb-2 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-zinc-400 group-hover:text-blue-400 transition-colors" />
                  <CardTitle className="text-lg text-zinc-100">Analítica</CardTitle>
                </div>
                <CardDescription className="text-zinc-500">
                  Gráficas de progresión de carga y volumen mensual. Detecta estancamientos antes de que ocurran.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 3: Rutinas */}
            <Card className="group border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900/60 transition-all duration-300">
              <CardHeader>
                <div className="mb-2 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-zinc-400 group-hover:text-violet-400 transition-colors" />
                  <CardTitle className="text-lg text-zinc-100">Plantillas</CardTitle>
                </div>
                <CardDescription className="text-zinc-500">
                  Guarda y clona bloques de entrenamiento. Configura una vez, ejecuta infinitamente.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 4: Grande, abarca 2 columnas */}
            <Card className="group md:col-span-2 border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900/60 transition-all duration-300">
              <CardHeader>
                <div className="mb-2 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-zinc-400 group-hover:text-amber-400 transition-colors" />
                  <CardTitle className="text-lg text-zinc-100">Control de densidad</CardTitle>
                </div>
                <CardDescription className="text-zinc-500">
                  Cronómetros integrados por serie. Optimiza el tiempo bajo tensión y la recuperación entre bloques de cardio o fuerza.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        {/* CTA Final: Minimalista y directo */}
        <section className="mx-auto max-w-3xl px-4 text-center">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 md:p-12 relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

            <Activity className="mx-auto h-8 w-8 text-zinc-300 mb-6" />
            <h3 className="text-2xl font-bold tracking-tight text-zinc-50 md:text-3xl">
              Deja de adivinar. Empieza a medir.
            </h3>
            <p className="mx-auto mt-4 max-w-md text-zinc-400">
              Configura tu primera rutina estructurada en menos de 120 segundos.
              Sin compromisos, sin tarjetas de crédito.
            </p>
            <div className="mt-8 flex justify-center">
              <SignUpButton mode="modal">
                <Button size="lg" className="h-12 rounded-lg bg-emerald-600 px-8 text-base font-semibold text-white shadow-[0_0_20px_-5px_rgba(16,185,129,0.3)] transition-all hover:bg-emerald-500 hover:shadow-[0_0_25px_-5px_rgba(16,185,129,0.5)]">
                  Crear cuenta gratuita
                </Button>
              </SignUpButton>
            </div>
          </div>
        </section>
      </main>

      {/* Footer minimalista */}
      <footer className="border-t border-zinc-900 py-8 text-center text-sm text-zinc-600">
        <p>© {new Date().getFullYear()} Workout Manager. Construido para la progresión.</p>
      </footer>
    </div>
  );
}