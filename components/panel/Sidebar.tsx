'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { logout } from '@/app/login/actions';
import { PushToggle, dropPushOnThisDevice } from '@/components/panel/PushToggle';
import { switchSede } from '@/app/admin/_actions/sedes';

export const NAV = [
  ['/admin', 'space_dashboard', 'Inicio', null], ['/admin/agenda', 'calendar_month', 'Agenda', 'agenda'], ['/admin/fila', 'pending_actions', 'Fila y huecos', 'agenda'], ['/admin/espera', 'hourglass_top', 'Lista de espera', 'agenda'], ['/admin/calendario', 'event', 'Google Calendar', null], ['/admin/recordatorios', 'notifications_active', 'Recordatorios', 'agenda'], ['/admin/abonos', 'account_balance', 'Abonos', 'agenda'], ['/admin/clientes', 'groups', 'Clientes', 'clientes'],
  ['/admin/servicios', 'content_cut', 'Servicios', 'servicios'], ['/admin/equipo', 'badge', 'Equipo', 'equipo'], ['/admin/caja', 'point_of_sale', 'Caja / POS', 'caja'], ['/admin/paquetes', 'redeem', 'Paquetes y regalos', 'caja'],
  ['/admin/inventario', 'inventory_2', 'Inventario', 'inventario'], ['/admin/facturacion', 'receipt_long', 'Facturación DIAN', 'facturacion'], ['/admin/gastos', 'request_quote', 'Gastos', 'gastos'],
  ['/admin/fidelizacion', 'loyalty', 'Fidelización', 'fidelizacion'], ['/admin/marketing', 'campaign', 'Marketing', 'marketing'], ['/admin/resenas', 'reviews', 'Reseñas', 'marketing'], ['/admin/instagram', 'photo_camera', 'Instagram', 'marketing'],
  ['/admin/metricas', 'insights', 'Métricas', 'reportes'], ['/admin/reportes', 'monitoring', 'Reportes', 'reportes'], ['/admin/academia', 'school', 'Academia', null], ['/admin/app', 'install_mobile', 'Tu app', 'configuracion'], ['/admin/sedes', 'storefront', 'Sedes', 'configuracion'], ['/admin/suscripcion', 'workspace_premium', 'Suscripción', 'configuracion'], ['/admin/seguridad', 'shield_lock', 'Seguridad', null], ['/admin/configuracion', 'settings', 'Configuración', 'configuracion']
] as const;

export function Sidebar({ business, user, perms, lowStock, sedes = [] }: { sedes?: { id: string; name: string }[]; business: { id?: string; name: string; slug: string; plan: string }; user: { name: string; avatar: string | null }; perms: string[] | 'ALL'; lowStock: number }) {
  const p = usePathname(); const [open, setOpen] = useState(false);
  const items = NAV.filter(n => !n[3] || perms === 'ALL' || perms.includes(n[3]));
  const nav = (
    <nav className="flex flex-col gap-0.5 flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
      {items.map(([href, icon, label]) => {
        const on = href === '/admin' ? p === '/admin' : p.startsWith(href);
        return (
          <Link key={href} href={href} onClick={() => setOpen(false)} className={`flex items-center gap-3 h-10 shrink-0 px-3 rounded-xl font-label-lg text-label-lg transition ${on ? 'bg-white/10 text-white' : 'text-white/65 hover:text-white hover:bg-white/5'}`}>
            <Icon name={icon} fill={on} className={`text-[20px] ${on ? 'text-secondary-fixed' : ''}`} />{label}
            {href === '/admin/inventario' && lowStock > 0 && <span className="ml-auto px-1.5 rounded-full bg-danger text-white text-[11px] font-bold">{lowStock}</span>}
          </Link>
        );
      })}
    </nav>
  );
  const head = (
    <div className="px-2 mb-6">
      <Link href="/admin" className="flex items-center gap-2"><span className="w-9 h-9 rounded-lg bg-secondary-fixed text-primary-container flex items-center justify-center font-headline-sm italic">R</span><div className="min-w-0"><p className="font-title-md text-title-md text-white truncate">{business.name}</p><p className="font-label-sm text-label-sm text-secondary-fixed uppercase tracking-wider">Plan {business.plan}</p></div></Link>
      {sedes.length > 1 && <form action={switchSede} className="mt-3"><label className="sr-only" htmlFor="sede">Sede</label><select id="sede" name="id" defaultValue={business.id} onChange={e => e.currentTarget.form?.requestSubmit()} className="w-full h-9 rounded-lg bg-white/10 text-white border border-white/15 px-2 font-label-md [&>option]:text-on-surface">{sedes.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></form>}
    </div>
  );
  const foot = (
    <div className="shrink-0 mt-3 pt-3 border-t border-white/10 flex items-center gap-2 px-2">
      <span className="w-9 h-9 rounded-full bg-secondary-fixed overflow-hidden flex items-center justify-center text-primary-container font-bold">{user.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : user.name[0]}</span>
      <div className="min-w-0 flex-1"><p className="text-white font-label-lg truncate">{user.name}</p><Link href={`/negocio/${business.slug}`} target="_blank" className="text-white/60 font-label-sm hover:text-secondary-fixed">Ver mi página ↗</Link></div>
      <ThemeToggle className="!text-white hover:!bg-white/10" />
    </div>
  );
  const salir = (
    <form action={logout} onSubmit={async e => { e.preventDefault(); await Promise.race([dropPushOnThisDevice(), new Promise(r => setTimeout(r, 2500))]); await logout(); }} className="mt-1 shrink-0"><button type="submit" className="w-full flex items-center gap-3 h-11 px-3 rounded-xl font-label-lg text-label-lg text-white/65 hover:text-white hover:bg-white/5 transition"><Icon name="logout" className="text-[20px]" />Cerrar sesión</button></form>
  );
  return (
    <>
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-primary-container dark:bg-[#07111c] p-4 flex-col z-40">{head}{nav}<PushToggle />{foot}{salir}</aside>
      <header className="lg:hidden fixed top-0 inset-x-0 h-14 z-40 bg-primary-container dark:bg-[#07111c] text-white flex items-center justify-between px-margin">
        <button onClick={() => setOpen(true)} aria-label="Menú" className="w-10 h-10 -ml-2 flex items-center justify-center"><Icon name="menu" /></button>
        <span className="font-title-md truncate">{business.name}</span>
        <Link href="/admin/agenda?nueva=1" aria-label="Nueva cita" className="w-10 h-10 -mr-2 flex items-center justify-center"><Icon name="add_circle" className="text-secondary-fixed" /></Link>
      </header>
      {open && <div className="lg:hidden fixed inset-0 z-50 bg-black/40" onClick={() => setOpen(false)}><aside className="w-72 h-full bg-primary-container dark:bg-[#07111c] p-4 flex flex-col overflow-y-auto" onClick={e => e.stopPropagation()}>{head}{nav}<PushToggle />{foot}{salir}</aside></div>}
    </>
  );
}
