'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Dumbbell, BarChart3, Settings, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Entrenamientos', href: '/workouts', icon: Dumbbell },
  { name: 'Progreso', href: '/progress', icon: BarChart3 },
  { name: 'Configuración', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-white border-r border-gray-200">
        <div className="flex-1 flex flex-col overflow-y-auto">
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Botón de nuevo entrenamiento */}
          <div className="p-4 border-t border-gray-200">
            <Link
              href="/workouts/new"
              className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nuevo Entrenamiento
            </Link>
          </div>
        </div>
      </aside>

      {/* Bottom Navigation Mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-50">
        <div className="flex items-center justify-around">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex flex-col items-center px-3 py-2 text-xs font-medium transition-colors',
                  isActive ? 'text-blue-600' : 'text-gray-600'
                )}
              >
                <Icon className="w-6 h-6 mb-1" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}