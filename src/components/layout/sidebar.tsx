'use client';

import { TransitionLink as Link } from '@/components/layout/transition-link';
import { useLinkStatus } from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Home, Dumbbell, BarChart3, Settings, Plus, LogOut, Bookmark, Loader2, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SignOutButton, useUser } from '@clerk/nextjs';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Entrenamientos', href: '/workouts', icon: Dumbbell },
  { name: 'Progreso', href: '/progress', icon: BarChart3 },
  { name: 'Configuración', href: '/settings', icon: Settings },
];

// Icono de navegación que se convierte en spinner mientras la ruta destino carga.
// Debe renderizarse dentro de un <Link> (usa useLinkStatus).
function NavIcon({ Icon, className }: { Icon: LucideIcon; className?: string }) {
  const { pending } = useLinkStatus();
  if (pending) return <Loader2 className={cn(className, 'animate-spin')} />;
  return <Icon className={className} />;
}

// Spinner en línea para los botones de acción (sin sustituir su icono).
function LinkPendingSpinner({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <Loader2 className={cn('animate-spin', className)} />;
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, isLoaded } = useUser();

  return (
    <>
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-white border-r border-gray-200 dark:bg-gray-900 dark:border-gray-800 dark:text-gray-100">
        {/* Brand Header */}
        <div className="p-5 border-b border-gray-100 flex items-center gap-3 dark:border-gray-800">
          <Image
            src="/logo-workout-manager.png"
            alt="Workout Manager"
            width={40}
            height={26}
            priority
            className="h-8 w-auto object-contain"
          />
          <div>
            <span className="font-bold text-gray-900 text-sm tracking-tight block dark:text-gray-100">Workout Manager</span>
            <span className="text-[11px] text-gray-400 font-medium block dark:text-gray-500">Entrena & Progresa</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-between overflow-y-auto">
          <div className="px-4 py-4 space-y-4">
            {/* Navegación principal */}
            <nav className="space-y-1.5">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center px-3.5 py-2.5 text-sm font-medium rounded-xl transition-all',
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs dark:bg-blue-900/20 dark:text-blue-400'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100'
                    )}
                  >
                    <NavIcon Icon={Icon} className={cn('w-4 h-4 mr-3', isActive ? 'text-blue-600' : 'text-gray-400 dark:text-gray-500')} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* Botones de acción rápida */}
            <div className="space-y-2 pt-1">
              <Link
                href="/workouts/new"
                className="flex items-center justify-center w-full px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-sm hover:shadow transition-all"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Entrenamiento
                <LinkPendingSpinner className="w-4 h-4 ml-2" />
              </Link>

              <Link
                href="/workouts/log?mode=new-template"
                className="flex items-center justify-center w-full px-4 py-2 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200/80 rounded-xl transition-all shadow-2xs dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800 dark:hover:bg-purple-900/30"
              >
                <Bookmark className="w-3.5 h-3.5 mr-1.5 text-purple-600" />
                Nueva Plantilla
                <LinkPendingSpinner className="w-3.5 h-3.5 ml-1.5 text-purple-600" />
              </Link>
            </div>
          </div>

          {/* Footer de Usuario y Cerrar Sesión */}
          <div className="p-4 border-t border-gray-100 bg-gray-50/70 space-y-2 dark:border-gray-800 dark:bg-gray-800/70">
            {isLoaded && user && (
              <div className="flex items-center gap-3 p-2 rounded-xl bg-white border border-gray-200/80 shadow-2xs dark:bg-gray-800/50 dark:border-gray-700">
                {user.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.imageUrl}
                    alt={user.fullName || 'Usuario'}
                    className="w-8 h-8 rounded-full object-cover border border-gray-200 shrink-0 dark:border-gray-700"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0 dark:bg-blue-900/30 dark:text-blue-400">
                    {(user.firstName || user.username || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-gray-900 truncate dark:text-gray-100">
                    {user.fullName || user.firstName || 'Mi Cuenta'}
                  </p>
                  <p className="text-[10px] text-gray-500 truncate dark:text-gray-400">
                    {user.primaryEmailAddress?.emailAddress}
                  </p>
                </div>
              </div>
            )}

            <SignOutButton>
              <button
                type="button"
                className="flex items-center justify-center w-full px-3 py-2 text-xs font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent transition-colors cursor-pointer dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/20"
              >
                <LogOut className="w-3.5 h-3.5 mr-2" />
                Cerrar sesión
              </button>
            </SignOutButton>
          </div>
        </div>
      </aside>

      {/* Bottom Navigation Mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-50 shadow-lg dark:bg-gray-900 dark:border-gray-800">
        <div className="flex items-center justify-around">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex flex-col items-center px-3 py-1.5 text-[11px] font-medium transition-colors',
                  isActive ? 'text-blue-600 font-bold' : 'text-gray-500 hover:text-gray-900'
                )}
              >
                <NavIcon Icon={Icon} className="w-5 h-5 mb-0.5" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}