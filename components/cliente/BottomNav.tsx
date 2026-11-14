'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
const ITEMS = [['/', 'home', 'Inicio'], ['/buscar', 'search', 'Explorar'], ['/mis-citas', 'calendar_month', 'Mis citas'], ['/perfil', 'person', 'Perfil']] as const;
export function BottomNav() {
  const p = usePathname();
  if (p.startsWith('/reservar') || p.startsWith('/negocio')) return null; // estas vistas tienen su propia barra de acción
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur-xl border-t border-primary-container/5 pb-safe">
      <div className="grid grid-cols-4 h-16">
        {ITEMS.map(([href, icon, label]) => {
          const on = href === '/' ? p === '/' : p.startsWith(href);
          return (
            <Link key={href} href={href} className={`flex flex-col items-center justify-center gap-0.5 font-label-sm text-label-sm ${on ? 'text-primary-container dark:text-primary' : 'text-on-surface-variant'}`}>
              <span className={`px-4 py-0.5 rounded-full ${on ? 'bg-secondary-fixed/60' : ''}`}><Icon name={icon} fill={on} className="text-[22px]" /></span>{label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
