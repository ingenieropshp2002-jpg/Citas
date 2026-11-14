'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export const NAV = [
  ['/panel', 'space_dashboard', 'Dashboard', null], ['/panel/agenda', 'calendar_month', 'Agenda', 'agenda'], ['/panel/recordatorios', 'notifications_active', 'Recordatorios', 'agenda'], ['/panel/clientes', 'groups', 'Clientes', 'clientes'],
  ['/panel/servicios', 'content_cut', 'Servicios', 'servicios'], ['/panel/equipo', 'badge', 'Equipo', 'equipo'], ['/panel/caja', 'point_of_sale', 'Caja / POS', 'caja'],
  ['/panel/inventario', 'inventory_2', 'Inventario', 'inventario'], ['/panel/facturacion', 'receipt_long', 'Facturación DIAN', 'facturacion'], ['/panel/gastos', 'request_quote', 'Gastos', 'gastos'],
  ['/panel/fidelizacion', 'loyalty', 'Fidelización', 'fidelizacion'], ['/panel/marketing', 'campaign', 'Marketing', 'marketing'],
  ['/panel/reportes', 'monitoring', 'Reportes', 'reportes'], ['/panel/academia', 'school', 'Academia', null], ['/panel/suscripcion', 'workspace_premium', 'Suscripción', 'configuracion'], ['/panel/configuracion', 'settings', 'Configuración', 'configuracion']
] as const;

export function Sidebar({ business, user, perms, lowStock }: { business: { name: string; slug: string; plan: string }; user: { name: string; avatar: string | null }; perms: string[] | 'ALL'; lowStock: number }) {
  const p = usePathname(); const [open, setOpen] = useState(false);
  const items = NAV.filter(n => !n[3] || perms === 'ALL' || perms.includes(n[3]));
  const nav = (
    <nav className="flex flex-col gap-0.5">
      {items.map(([href, icon, label]) => {
        const on = href === '/panel' ? p === '/panel' : p.startsWith(href);
        return (
          <Link key={href} href={href} onClick={() => setOpen(false)} className={`flex items-center gap-3 h-11 px-3 rounded-xl font-label-lg text-label-lg transition ${on ? 'bg-white/10 text-white' : 'text-white/65 hover:text-white hover:bg-white/5'}`}>
            <Icon name={icon} fill={on} className={`text-[20px] ${on ? 'text-secondary-fixed' : ''}`} />{label}
            {href === '/panel/inventario' && lowStock > 0 && <span className="ml-auto px-1.5 rounded-full bg-danger text-white text-[11px] font-bold">{lowStock}</span>}
          </Link>
        );
      })}
    </nav>
  );
  const head = (
    <div className="px-2 mb-6">
      <Link href="/panel" className="flex items-center gap-2"><span className="w-9 h-9 rounded-lg bg-secondary-fixed text-primary-container flex items-center justify-center font-headline-sm italic">R</span><div className="min-w-0"><p className="font-title-md text-title-md text-white truncate">{business.name}</p><p className="font-label-sm text-label-sm text-secondary-fixed uppercase tracking-wider">Plan {business.plan}</p></div></Link>
    </div>
  );
  const foot = (
    <div className="mt-auto pt-4 border-t border-white/10 flex items-center gap-2 px-2">
      <span className="w-9 h-9 rounded-full bg-secondary-fixed overflow-hidden flex items-center justify-center text-primary-container font-bold">{user.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : user.name[0]}</span>
      <div className="min-w-0 flex-1"><p className="text-white font-label-lg truncate">{user.name}</p><Link href={`/negocio/${business.slug}`} target="_blank" className="text-white/60 font-label-sm hover:text-secondary-fixed">Ver mi página ↗</Link></div>
      <ThemeToggle className="!text-white hover:!bg-white/10" />
    </div>
  );
  return (
    <>
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-primary-container dark:bg-[#07111c] p-4 flex-col z-40">{head}{nav}{foot}</aside>
      <header className="lg:hidden fixed top-0 inset-x-0 h-14 z-40 bg-primary-container text-white flex items-center justify-between px-margin">
        <button onClick={() => setOpen(true)} aria-label="Menú" className="w-10 h-10 -ml-2 flex items-center justify-center"><Icon name="menu" /></button>
        <span className="font-title-md truncate">{business.name}</span>
        <Link href="/panel/agenda?nueva=1" aria-label="Nueva cita" className="w-10 h-10 -mr-2 flex items-center justify-center"><Icon name="add_circle" className="text-secondary-fixed" /></Link>
      </header>
      {open && <div className="lg:hidden fixed inset-0 z-50 bg-black/40" onClick={() => setOpen(false)}><aside className="w-72 h-full bg-primary-container p-4 flex flex-col overflow-y-auto" onClick={e => e.stopPropagation()}>{head}{nav}{foot}</aside></div>}
    </>
  );
}
