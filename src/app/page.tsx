
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { SignInButton, SignUpButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Dumbbell, TrendingUp, Calendar, Zap } from 'lucide-react';

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-16 py-14">
      {/* Hero */}
      <div className="mx-auto max-w-3xl space-y-6 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
          Tu entrenamiento, bajo control
        </h1>
        <p className="mx-auto max-w-xl text-lg leading-relaxed text-slate-600">
          Registra, analiza y mejora tu progreso en el gimnasio. Desde
          musculación tradicional hasta CrossFit y Hyrox.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <SignUpButton mode="modal">
            <Button size="lg" className="rounded-full bg-blue-700 px-8 hover:bg-blue-800">
              Empezar gratis
            </Button>
          </SignUpButton>
          <SignInButton mode="modal">
            <Button
              size="lg"
              variant="outline"
              className="rounded-full border-slate-300 px-8 text-slate-700 hover:bg-slate-50"
            >
              Ya tengo cuenta
            </Button>
          </SignInButton>
        </div>
      </div>

      {/* Features */}
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="border-slate-200 shadow-sm transition-shadow hover:shadow-md">
          <CardHeader>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50">
              <Dumbbell className="h-5 w-5 text-blue-700" />
            </div>
            <CardTitle className="text-lg">Registra todo</CardTitle>
            <CardDescription className="leading-relaxed">
              Series, repeticiones, peso, tiempo. Cada detalle de tu
              entrenamiento queda guardado.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-slate-200 shadow-sm transition-shadow hover:shadow-md">
          <CardHeader>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50">
              <TrendingUp className="h-5 w-5 text-blue-700" />
            </div>
            <CardTitle className="text-lg">Analiza tu progreso</CardTitle>
            <CardDescription className="leading-relaxed">
              Gráficas de fuerza, volumen y consistencia. Visualiza tu
              evolución semana a semana.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-slate-200 shadow-sm transition-shadow hover:shadow-md">
          <CardHeader>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50">
              <Calendar className="h-5 w-5 text-blue-700" />
            </div>
            <CardTitle className="text-lg">Guarda tus rutinas</CardTitle>
            <CardDescription className="leading-relaxed">
              Plantillas reutilizables para tus rutinas favoritas. Ahorra
              tiempo configurando.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* CTA final */}
      <Card className="mx-auto max-w-3xl border-blue-100 bg-gradient-to-br from-blue-50 to-white">
        <CardContent className="space-y-4 pt-8 pb-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-700">
            <Zap className="h-7 w-7 text-white" />
          </div>
          <h3 className="text-2xl font-semibold text-slate-900">
            Empieza hoy mismo
          </h3>
          <p className="mx-auto max-w-md text-slate-600">
            Crea tu cuenta gratis y comienza a trackear tus entrenamientos en
            menos de 2 minutos.
          </p>
          <SignUpButton mode="modal">
            <Button size="lg" className="mt-2 rounded-full bg-blue-700 px-8 hover:bg-blue-800">
              Crear cuenta gratis
            </Button>
          </SignUpButton>
        </CardContent>
      </Card>
    </div>
  );
}