'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
const ITEMS = [['/superadmin', 'dashboard', 'Resumen'], ['/superadmin/negocios', 'storefront', 'Negocios'], ['/superadmin/usuarios', 'group', 'Usuarios'], ['/superadmin/whatsapp', 'chat', 'WhatsApp'], ['/superadmin/pagos', 'payments', 'Pagos'], ['/superadmin/ia', 'smart_toy', 'Asistente IA'], ['/superadmin/ajustes', 'tune', 'Ajustes de la app'], ['/superadmin/base-de-datos', 'database', 'Base de datos'], ['/admin/seguridad', 'shield_lock', 'Mi seguridad (2 pasos)']] as const;
export function AdminNav() {
  const p = usePathname();
  return (
    <nav aria-label="Superadmin" className="max-w-[1400px] mx-auto px-margin flex gap-1 overflow-x-auto no-scrollbar">
      {ITEMS.map(([href, icon, label]) => {
        const on = href === '/superadmin' ? p === '/superadmin' : p.startsWith(href);
        return <Link key={href} href={href} aria-current={on ? 'page' : undefined} className={`flex items-center gap-2 h-11 px-3 border-b-2 whitespace-nowrap font-label-lg text-label-lg transition-colors ${on ? 'border-secondary-fixed text-white' : 'border-transparent text-white/60 hover:text-white'}`}><Icon name={icon} fill={on} className="text-[20px]" />{label}</Link>;
      })}
    </nav>
  );
}
