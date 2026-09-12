import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { SignInButton, SignUpButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dumbbell, TrendingUp, Calendar, Zap } from 'lucide-react';

export default async function Home() {
  const { userId } = await auth();

  // Si está autenticado, redirigir al dashboard
  if (userId) {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-12 py-12">
      {/* Hero Section */}
      <div className="text-center space-y-6">
        <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
          Tu Entrenamiento, <span className="text-blue-600">Bajo Control</span>
        </h2>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Registra, analiza y mejora tu progreso en el gimnasio.
          Desde musculación tradicional hasta CrossFit y Hyrox.
        </p>
        <div className="flex items-center justify-center gap-4 pt-4">
          <SignUpButton mode="modal">
            <Button size="lg" className="px-8">
              Empezar Gratis
            </Button>
          </SignUpButton>
          <SignInButton mode="modal">
            <Button size="lg" variant="outline" className="px-8">
              Ya tengo cuenta
            </Button>
          </SignInButton>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        <Card>
          <CardHeader>
            <Dumbbell className="w-10 h-10 text-blue-600 mb-2" />
            <CardTitle>Registra Todo</CardTitle>
            <CardDescription>
              Series, repeticiones, peso, tiempo. Cada detalle de tu entrenamiento queda guardado.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <TrendingUp className="w-10 h-10 text-blue-600 mb-2" />
            <CardTitle>Analiza tu Progreso</CardTitle>
            <CardDescription>
              Gráficos de fuerza, volumen y consistencia. Visualiza tu evolución semana a semana.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <Calendar className="w-10 h-10 text-blue-600 mb-2" />
            <CardDescription>
              Plantillas reutilizables para tus rutinas favoritas. Ahorra tiempo configurando.
            </CardDescription>
            <CardTitle>Guarda tus Rutinas</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* CTA Final */}
      <Card className="max-w-3xl mx-auto bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <CardContent className="pt-6 text-center space-y-4">
          <Zap className="w-12 h-12 text-blue-600 mx-auto" />
          <h3 className="text-2xl font-bold text-gray-900">
            Empieza Hoy Mismo
          </h3>
          <p className="text-gray-600">
            Crea tu cuenta gratis y comienza a trackear tus entrenamientos en menos de 2 minutos.
          </p>
          <SignUpButton mode="modal">
            <Button size="lg" className="mt-4">
              Crear Cuenta Gratis
            </Button>
          </SignUpButton>
        </CardContent>
      </Card>
    </div>
  );
}