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
  BarChart3,
  Zap,
  Target,
  Shield,
  Sparkles,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  Flame,
  Award,
  Layers
} from 'lucide-react';
import { InteractiveHeroShowcase } from '@/components/landing/interactive-hero-showcase';
import { LandingFAQ } from '@/components/landing/landing-faq';

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect('/dashboard');
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-zinc-950 text-zinc-50 selection:bg-blue-500/30 selection:text-blue-100 overflow-x-hidden">
      {/* Dynamic Ambient Background Elements */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#27272a15_1px,transparent_1px),linear-gradient(to_bottom,#27272a15_1px,transparent_1px)] bg-[size:36px_36px] [mask-image:radial-gradient(ellipse_70%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        
        {/* Radial Top Aura */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-blue-600/20 via-cyan-500/10 to-transparent blur-[120px] rounded-full" />
        <div className="absolute top-[30%] -left-40 w-[500px] h-[500px] bg-blue-600/10 blur-[140px] rounded-full" />
        <div className="absolute top-[60%] -right-40 w-[500px] h-[500px] bg-emerald-600/10 blur-[140px] rounded-full" />
      </div>

      <main className="flex-1 space-y-28 sm:space-y-36 py-12 md:py-20">
        {/* ========================================================================= */}
        {/* HERO SECTION */}
        {/* ========================================================================= */}
        <section className="mx-auto flex max-w-6xl flex-col items-center space-y-8 px-4 text-center">
          {/* Top Floating Badge */}
          <div className="inline-flex items-center gap-2.5 rounded-full border border-blue-500/30 bg-zinc-900/80 px-4 py-1.5 backdrop-blur-xl shadow-lg shadow-blue-500/10 hover:border-blue-500/50 transition-all duration-300">
            <Image
              src="/logo-workout-manager.png"
              alt="Workout Manager"
              width={48}
              height={32}
              priority
              className="h-5 w-auto object-contain"
            />
            <span className="h-3 w-px bg-zinc-700" />
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold tracking-wide text-zinc-200">
              Workout Manager 2.0 <span className="text-blue-400 font-normal ml-1">· Sistema de Alto Rendimiento</span>
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="max-w-4xl text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight text-white leading-[1.1]">
            El sistema operativo para tu{' '}
            <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent drop-shadow-sm">
              progreso y fuerza.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="max-w-2xl text-base sm:text-lg md:text-xl text-zinc-400 leading-relaxed font-normal">
            Una plataforma de registro y análisis biométrico diseñada para atletas exigentes. 
            Calcula tu 1RM en tiempo real, controla el RPE, el tempo y domina la sobrecarga progresiva sin fricción.
          </p>

          {/* CTA Button Group */}
          <div className="flex flex-col items-center gap-3.5 pt-2 sm:flex-row">
            <SignUpButton mode="modal">
              <Button 
                size="lg" 
                className="h-13 cursor-pointer rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-8 text-base font-semibold text-white shadow-[0_0_30px_-5px_rgba(37,99,235,0.5)] transition-all hover:from-blue-500 hover:to-blue-400 hover:shadow-[0_0_40px_-5px_rgba(37,99,235,0.7)] hover:scale-[1.02] active:scale-[0.98]"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Comenzar gratis
              </Button>
            </SignUpButton>
            
            <SignInButton mode="modal">
              <Button
                size="lg"
                variant="ghost"
                className="h-13 cursor-pointer rounded-xl border border-zinc-800 bg-zinc-900/60 px-7 text-base font-medium text-zinc-300 backdrop-blur-md transition-all hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
              >
                Acceder a mi cuenta
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </SignInButton>
          </div>

          {/* Metric Badges Ticker */}
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 pt-4 text-xs font-mono text-zinc-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Algoritmos Epley / Brzycki</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-400" />
              <span>100% Sin Publicidad</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-cyan-400" />
              <span>Sincronización en la Nube</span>
            </div>
          </div>

          {/* Interactive Live Product Showcase Widget */}
          <div className="w-full pt-8">
            <InteractiveHeroShowcase />
          </div>
        </section>

        {/* ========================================================================= */}
        {/* THREE CORE PILLARS */}
        {/* ========================================================================= */}
        <section className="mx-auto max-w-6xl px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-400 mb-3">
              Ingeniería del Entrenamiento
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-100">
              Diseñado para eliminar la ambigüedad de tus levantamientos
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="relative group rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-sm transition-all duration-300 hover:border-blue-500/40 hover:bg-zinc-900/70">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-4 group-hover:scale-110 transition-transform">
                <Target className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-zinc-100 mb-2">Precisión Biomecánica</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Registra variables reales: tempo bajo tensión (ej. 3-1-X-0), RPE, escala RIR y cálculo de 1RM dinámico al instante.
              </p>
            </div>

            <div className="relative group rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-sm transition-all duration-300 hover:border-cyan-500/40 hover:bg-zinc-900/70">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mb-4 group-hover:scale-110 transition-transform">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-zinc-100 mb-2">Cero Fricción en Sala</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Interfaz táctil optimizada para registrar series con una sola mano entre descansos, con cronómetro automático y auto-completado.
              </p>
            </div>

            <div className="relative group rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-sm transition-all duration-300 hover:border-emerald-500/40 hover:bg-zinc-900/70">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-zinc-100 mb-2">Sobrecarga Progresiva</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Mapea el tonelaje acumulado y el volumen por grupo muscular semana a semana para garantizar avances continuos sin estancamiento.
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* BENTO GRID FEATURES 2.0 */}
        {/* ========================================================================= */}
        <section className="mx-auto max-w-6xl px-4">
          <div className="mb-12 text-center sm:text-left">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-100 sm:text-4xl">
              Arquitectura modular de entrenamiento
            </h2>
            <p className="mt-2 text-base text-zinc-400">
              Módulos construidos específicamente para capturar cada variable del rendimiento.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:grid-rows-2">
            {/* Feature 1: Large Span 2 */}
            <Card className="group md:col-span-2 border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-900/70 hover:border-zinc-700 transition-all duration-300 backdrop-blur-sm overflow-hidden">
              <CardHeader>
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
                      <Dumbbell className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-xl text-zinc-100">Registro de Alta Fidelidad</CardTitle>
                  </div>
                  <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-mono text-[11px]">
                    En tiempo real
                  </Badge>
                </div>
                <CardDescription className="text-zinc-400 text-sm leading-relaxed">
                  No te limites a registrar peso y repeticiones. Controla RPE, cadencia de movimiento, notas técnicas y descansos programados con cronómetro inteligente.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/60 pb-3 text-xs font-mono">
                    <span className="text-zinc-400">Ejercicio: <strong className="text-zinc-200">Sentadilla Trasera</strong></span>
                    <span className="text-blue-400">Tempo: 3-0-1-0</span>
                    <span className="text-emerald-400">1RM Est: 165 kg</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {['Musculación', 'Powerlifting', 'Halterofilia', 'Hyrox', 'Cross Training'].map((tag) => (
                      <Badge key={tag} variant="secondary" className="bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700 border-zinc-700 text-xs py-1">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Feature 2: Analytics & Trends */}
            <Card className="group border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-900/70 hover:border-zinc-700 transition-all duration-300 backdrop-blur-sm">
              <CardHeader>
                <div className="mb-3 flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-xl text-zinc-100">Analítica & Carga</CardTitle>
                </div>
                <CardDescription className="text-zinc-400 text-sm leading-relaxed">
                  Gráficas de progresión de tonelaje mensual, volumen por grupo muscular y prevención de sobreentrenamiento.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg bg-zinc-950/60 p-3 border border-zinc-800 text-xs font-mono space-y-2">
                  <div className="flex justify-between text-zinc-400">
                    <span>Sobrecarga mensual:</span>
                    <span className="text-emerald-400 font-bold">+18.5%</span>
                  </div>
                  <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full rounded-full w-[78%]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Feature 3: Routine Engine */}
            <Card className="group border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-900/70 hover:border-zinc-700 transition-all duration-300 backdrop-blur-sm">
              <CardHeader>
                <div className="mb-3 flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-xl text-zinc-100">Motor de Plantillas</CardTitle>
                </div>
                <CardDescription className="text-zinc-400 text-sm leading-relaxed">
                  Crea, edita y clona tus rutinas completas en un clic. Olvídate de reescribir ejercicios cada semana.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-1.5 text-xs font-mono text-zinc-400">
                  <div className="rounded bg-zinc-950/60 p-2 border border-zinc-800 flex items-center justify-between">
                    <span>PPL Hypertrophy (6D)</span>
                    <span className="text-blue-400 text-[10px]">Activa</span>
                  </div>
                  <div className="rounded bg-zinc-950/60 p-2 border border-zinc-800 flex items-center justify-between">
                    <span>Hyrox Race Engine</span>
                    <span className="text-zinc-500 text-[10px]">Guardada</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Feature 4: Large Span 2 */}
            <Card className="group md:col-span-2 border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-900/70 hover:border-zinc-700 transition-all duration-300 backdrop-blur-sm">
              <CardHeader>
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                      <Clock className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-xl text-zinc-100">Control de Densidad & Descanso</CardTitle>
                  </div>
                  <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-400 font-mono text-[11px]">
                    Cronómetro Integrado
                  </Badge>
                </div>
                <CardDescription className="text-zinc-400 text-sm leading-relaxed">
                  Temporizadores automáticos entre series de fuerza o descansos cortos en hipertrofia. Mantén el foco en la sesión sin consultar apps externas.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between rounded-xl bg-zinc-950/60 p-4 border border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 font-mono font-bold text-sm">
                      90s
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-zinc-200">Auto-Timer Activo</div>
                      <div className="text-xs text-zinc-400 font-mono">Optimiza el tiempo bajo tensión</div>
                    </div>
                  </div>
                  <div className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                    Recuperación Óptima
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* COMPARISON TABLE: WORKOUT MANAGER VS OTHERS */}
        {/* ========================================================================= */}
        <section className="mx-auto max-w-5xl px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 mb-3">
              ¿Por qué cambiar?
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-100">
              Workout Manager vs Métodos Tradicionales
            </h2>
            <p className="mt-2 text-zinc-400 text-sm sm:text-base">
              Compara la precisión de un sistema dedicado frente a notas manuales o apps genéricas.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-sm shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/80">
                    <th className="p-4 sm:p-5 font-semibold text-zinc-300">Funcionalidad</th>
                    <th className="p-4 sm:p-5 font-bold text-blue-400 bg-blue-500/5 border-x border-blue-500/20">
                      Workout Manager
                    </th>
                    <th className="p-4 sm:p-5 font-medium text-zinc-400">Bloc de Notas</th>
                    <th className="p-4 sm:p-5 font-medium text-zinc-400">Apps Tradicionales</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono text-xs sm:text-sm">
                  {[
                    {
                      feature: 'Cálculo de 1RM en tiempo real (Epley/Brzycki)',
                      wm: true,
                      notes: false,
                      apps: 'Limitado / De pago',
                    },
                    {
                      feature: 'Registro de RPE, Tempo (3-1-X-0) y RIR',
                      wm: true,
                      notes: 'Manual y desordenado',
                      apps: false,
                    },
                    {
                      feature: 'Gráficas de tonelaje & sobrecarga progresiva',
                      wm: true,
                      notes: false,
                      apps: 'Suscripción cara',
                    },
                    {
                      feature: 'Soporte híbrido (Culturismo, Power, Hyrox)',
                      wm: true,
                      notes: false,
                      apps: 'Solo rutinas básicas',
                    },
                    {
                      feature: 'Experiencia limpia sin anuncios ni interrupciones',
                      wm: true,
                      notes: true,
                      apps: false,
                    },
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-zinc-900/40 transition-colors">
                      <td className="p-4 sm:p-5 font-sans font-medium text-zinc-200">{row.feature}</td>
                      <td className="p-4 sm:p-5 bg-blue-500/5 border-x border-blue-500/20 font-bold text-emerald-400">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          <span>Incluido</span>
                        </div>
                      </td>
                      <td className="p-4 sm:p-5 text-zinc-400 font-sans">
                        {typeof row.notes === 'boolean' ? (
                          row.notes ? (
                            <CheckCircle2 className="h-4 w-4 text-zinc-400" />
                          ) : (
                            <XCircle className="h-4 w-4 text-zinc-600" />
                          )
                        ) : (
                          row.notes
                        )}
                      </td>
                      <td className="p-4 sm:p-5 text-zinc-400 font-sans">
                        {typeof row.apps === 'boolean' ? (
                          row.apps ? (
                            <CheckCircle2 className="h-4 w-4 text-zinc-400" />
                          ) : (
                            <XCircle className="h-4 w-4 text-zinc-600" />
                          )
                        ) : (
                          row.apps
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* FREQUENTLY ASKED QUESTIONS (FAQ) */}
        {/* ========================================================================= */}
        <section className="mx-auto max-w-5xl px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-400 mb-3">
              Preguntas Frecuentes
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-100">
              Todo lo que necesitas saber
            </h2>
            <p className="mt-2 text-zinc-400 text-sm sm:text-base">
              Respuestas directas para atletas y entrenadores.
            </p>
          </div>

          <LandingFAQ />
        </section>

        {/* ========================================================================= */}
        {/* FINAL PREMIUM CALL TO ACTION (CTA) */}
        {/* ========================================================================= */}
        <section className="mx-auto max-w-4xl px-4">
          <div className="relative rounded-3xl border border-blue-500/30 bg-gradient-to-b from-zinc-900/90 via-zinc-900/70 to-zinc-950 p-8 sm:p-14 text-center overflow-hidden shadow-2xl backdrop-blur-xl">
            {/* Top gradient glowing border light */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent" />
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/20 blur-[100px] rounded-full pointer-events-none" />

            {/* Brand Logo icon in CTA */}
            <div className="flex justify-center mb-6">
              <div className="flex items-center justify-center p-3 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-lg">
                <Image
                  src="/logo-workout-manager.png"
                  alt="Workout Manager"
                  width={64}
                  height={40}
                  className="h-8 w-auto object-contain"
                />
              </div>
            </div>

            <h3 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Deja de adivinar.<br />
              <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                Empieza a registrar con precisión.
              </span>
            </h3>

            <p className="mx-auto mt-4 max-w-lg text-sm sm:text-base text-zinc-400 leading-relaxed">
              Configura tu primera rutina estructurada en menos de 60 segundos.
              Sin costes ocultos, sin tarjetas de crédito, 100% enfocado en tus marcas.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
              <SignUpButton mode="modal">
                <Button 
                  size="lg" 
                  className="h-13 w-full sm:w-auto cursor-pointer rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-8 text-base font-semibold text-white shadow-[0_0_25px_-5px_rgba(37,99,235,0.6)] transition-all hover:from-blue-500 hover:to-blue-400 hover:shadow-[0_0_35px_-5px_rgba(37,99,235,0.8)] hover:scale-[1.02]"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Crear cuenta gratuita
                </Button>
              </SignUpButton>
              
              <SignInButton mode="modal">
                <Button
                  size="lg"
                  variant="ghost"
                  className="h-13 w-full sm:w-auto cursor-pointer rounded-xl border border-zinc-800 bg-zinc-900/60 px-7 text-base font-medium text-zinc-300 backdrop-blur-md transition-all hover:bg-zinc-800 hover:text-white"
                >
                  Iniciar sesión
                </Button>
              </SignInButton>
            </div>
          </div>
        </section>
      </main>

      {/* ========================================================================= */}
      {/* FOOTER */}
      {/* ========================================================================= */}
      <footer className="border-t border-zinc-900 bg-zinc-950/80 py-10 text-center text-sm text-zinc-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Image
              src="/logo-workout-manager.png"
              alt="Workout Manager"
              width={36}
              height={24}
              className="h-6 w-auto object-contain opacity-80"
            />
            <span className="font-semibold text-zinc-300 text-sm">Workout Manager</span>
          </div>

          <p className="text-xs text-zinc-500">
            © {new Date().getFullYear()} Workout Manager. Construido para atletas y progresión continua.
          </p>

          <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
            <span>Sistemas 100% operativos</span>
          </div>
        </div>
      </footer>
    </div>
  );
}