import { ClerkProvider, UserButton, SignInButton, SignUpButton } from '@clerk/nextjs';
import { Sidebar } from '@/components/layout/sidebar';
import { auth } from '@clerk/nextjs/server';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import './globals.css';
import { Oswald, Inter, JetBrains_Mono } from 'next/font/google';
import Script from 'next/script';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Toaster } from '@/components/ui/toast';

const headline = Oswald({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-headline',
});
const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono'
});

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  const isAuthenticated = !!userId;

  return (
    <html lang="es" suppressHydrationWarning className={`${inter.variable} ${headline.variable} ${mono.variable}`}>
      <body className="antialiased bg-gray-50 font-sans dark:bg-gray-950 dark:text-gray-100">
        <Script
          id="wm-theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('wm_theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
        <ClerkProvider>
          <ThemeProvider>
            {isAuthenticated ? (
              // Layout con Sidebar para usuarios autenticados
              <div className="flex h-screen overflow-hidden">
                <Sidebar />

                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Header visible únicamente en móvil */}
                  <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between dark:bg-gray-900 dark:border-gray-800">
                    <div className="flex items-center gap-2.5">
                      <Image
                        src="/logo-workout-manager.png"
                        alt="Workout Manager"
                        width={36}
                        height={24}
                        className="h-7 w-auto object-contain"
                      />
                      <span className="font-bold text-gray-900 text-base dark:text-gray-100">
                        Workout Manager
                      </span>
                    </div>

                    <UserButton />
                  </header>

                  <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 lg:pb-6 animate-in fade-in duration-200">
                    {children}
                  </main>
                </div>
              </div>
            ) : (
              // Layout simple para usuarios no autenticados
              <div className="min-h-screen">
                <header className="bg-white border-b border-gray-200 px-6 py-4 dark:bg-gray-900 dark:border-gray-800">
                  <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Image
                        src="/logo-workout-manager.png"
                        alt="Workout Manager"
                        width={120}
                        height={80}
                        priority
                        className="h-10 w-auto object-contain"
                      />
                      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        Workout Manager
                      </h1>
                    </div>
                    <div className="flex items-center gap-3">
                      <SignInButton mode="modal">
                        <Button variant="ghost">Iniciar Sesión</Button>
                      </SignInButton>
                      <SignUpButton mode="modal">
                        <Button>Registrarse</Button>
                      </SignUpButton>
                    </div>
                  </div>
                </header>

                <main className="max-w-7xl mx-auto p-6">
                  {children}
                </main>
              </div>
            )}
            {/* Notificaciones globales (sobreviven a la navegación: el layout no se desmonta) */}
            <Toaster />
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}