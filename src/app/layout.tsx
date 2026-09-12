import { ClerkProvider, UserButton, SignInButton, SignUpButton } from '@clerk/nextjs';
import { Inter } from 'next/font/google';
import { Sidebar } from '@/components/layout/sidebar';
import { auth } from '@clerk/nextjs/server';
import { Button } from '@/components/ui/button';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  const isAuthenticated = !!userId;

  return (
    <ClerkProvider>
      <html lang="es" className={inter.variable}>
        <body className="antialiased bg-gray-50 font-sans">
          {isAuthenticated ? (
            // Layout con Sidebar para usuarios autenticados
            <div className="flex h-screen overflow-hidden">
              <Sidebar />

              <div className="flex-1 flex flex-col overflow-hidden">
                <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                  <h1 className="text-xl font-semibold text-gray-900">
                    Workout Manager
                  </h1>
                  <UserButton />
                </header>

                <main className="flex-1 overflow-y-auto p-6 pb-24 lg:pb-6">
                  {children}
                </main>
              </div>
            </div>
          ) : (
            // Layout simple para usuarios no autenticados
            <div className="min-h-screen">
              <header className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                  <h1 className="text-xl font-semibold text-gray-900">
                    Workout Manager
                  </h1>
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
        </body>
      </html>
    </ClerkProvider>
  );
}