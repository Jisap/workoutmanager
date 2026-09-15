'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Dumbbell, BarChart3, Settings, Plus, LogOut, Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SignOutButton, useUser } from '@clerk/nextjs';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Entrenamientos', href: '/workouts', icon: Dumbbell },
  { name: 'Progreso', href: '/progress', icon: BarChart3 },
  { name: 'Configuración', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, isLoaded } = useUser();

  return (
    <>
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-white border-r border-gray-200">
        {/* Brand Header */}
        <div className="p-5 border-b border-gray-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
            <Dumbbell className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-gray-900 text-sm tracking-tight block">Workout Manager</span>
            <span className="text-[11px] text-gray-400 font-medium block">Entrena & Progresa</span>
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
                        ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    )}
                  >
                    <Icon className={cn('w-4 h-4 mr-3', isActive ? 'text-blue-600' : 'text-gray-400')} />
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
              </Link>

              <Link
                href="/workouts/log?mode=new-template"
                className="flex items-center justify-center w-full px-4 py-2 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200/80 rounded-xl transition-all shadow-2xs"
              >
                <Bookmark className="w-3.5 h-3.5 mr-1.5 text-purple-600" />
                Nueva Plantilla
              </Link>
            </div>
          </div>

          {/* Footer de Usuario y Cerrar Sesión */}
          <div className="p-4 border-t border-gray-100 bg-gray-50/70 space-y-2">
            {isLoaded && user && (
              <div className="flex items-center gap-3 p-2 rounded-xl bg-white border border-gray-200/80 shadow-2xs">
                {user.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.imageUrl}
                    alt={user.fullName || 'Usuario'}
                    className="w-8 h-8 rounded-full object-cover border border-gray-200 shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                    {(user.firstName || user.username || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-gray-900 truncate">
                    {user.fullName || user.firstName || 'Mi Cuenta'}
                  </p>
                  <p className="text-[10px] text-gray-500 truncate">
                    {user.primaryEmailAddress?.emailAddress}
                  </p>
                </div>
              </div>
            )}

            <SignOutButton>
              <button
                type="button"
                className="flex items-center justify-center w-full px-3 py-2 text-xs font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 mr-2" />
                Cerrar sesión
              </button>
            </SignOutButton>
          </div>
        </div>
      </aside>

      {/* Bottom Navigation Mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-50 shadow-lg">
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
                <Icon className="w-5 h-5 mb-0.5" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}