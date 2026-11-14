import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { ClientHeader } from '@/components/cliente/Header';
import { Icon } from '@/components/ui/Icon';
import { logout } from '@/app/login/actions';
export const metadata = { title: 'Mi perfil' };
export default async function Perfil() {
  const u = await requireUser('/perfil');
  const owns = await db.business.count({ where: { ownerId: u.id } }) + await db.staff.count({ where: { userId: u.id } });
  return (
    <>
      <ClientHeader title="Mi perfil" />
      <main className="pt-20 px-margin max-w-xl mx-auto pb-10">
        <div className="card-raised p-6 flex items-center gap-4">
          <span className="w-16 h-16 rounded-full bg-secondary-fixed overflow-hidden flex items-center justify-center font-headline-sm">{u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : u.name[0]}</span>
          <div><h1 className="font-headline-sm text-headline-sm">{u.name}</h1><p className="text-on-surface-variant">{u.email || ''} {u.phone ? `· +57 ${u.phone}` : ''}</p></div>
        </div>
        <div className="card mt-4 divide-y divide-parchment">
          {[['/mis-citas', 'calendar_month', 'Mis citas'], ['/buscar', 'search', 'Explorar negocios'], ['/panel', 'storefront', owns ? 'Ir al panel de mi negocio' : 'Registrar mi negocio']].map(([h, i, l]) => (
            <Link key={h} href={h} className="flex items-center gap-3 p-4 hover:bg-surface-container-low"><Icon name={i} className="text-secondary" /><span className="flex-1 font-title-md text-title-md">{l}</span><Icon name="chevron_right" className="text-outline" /></Link>
          ))}
        </div>
        <form action={logout} className="mt-4"><button className="btn-danger w-full"><Icon name="logout" className="text-[18px]" />Cerrar sesión</button></form>
      </main>
    </>
  );
}
