import Link from 'next/link';
import { db } from '@/lib/db';
import { PageHeader } from '@/components/panel/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { fechaCorta } from '@/lib/format';
import { subscriptionState } from '@/lib/subscription';
import { adminSetSubscription } from '@/app/panel/_actions/subscription';
import { impersonateAction } from '@/app/admin/actions';
import { StateChip } from '../StateChip';

export const metadata = { title: 'Negocios' };
export default async function Negocios({ searchParams }: { searchParams: Promise<{ q?: string; estado?: string }> }) {
  const { q = '', estado = '' } = await searchParams;
  const list = await db.business.findMany({
    where: q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { slug: { contains: q, mode: 'insensitive' } }, { city: { contains: q, mode: 'insensitive' } }, { owner: { email: { contains: q, mode: 'insensitive' } } }] } : {},
    orderBy: { createdAt: 'desc' }, include: { owner: { select: { id: true, name: true, email: true, phone: true } }, _count: { select: { appointments: true, customers: true } } }
  });
  const rows = list.map(b => ({ b, s: subscriptionState(b) })).filter(r => !estado || r.s.state === estado);
  const BTN = [['ACTIVAR_30', '+30 días'], ['EXTENDER_PRUEBA', '+ prueba'], ['ACTIVAR_SIEMPRE', 'Sin vencimiento'], ['SUSPENDER', 'Suspender']];
  return (
    <>
      <PageHeader eyebrow="Plataforma" title="Negocios" subtitle={`${rows.length} ${rows.length === 1 ? 'negocio' : 'negocios'}`} />
      <form className="flex flex-wrap gap-2 mb-3">
        <input name="q" defaultValue={q} placeholder="Buscar por nombre, enlace, ciudad o correo del dueño" className="input flex-1 min-w-[220px]" />
        <select name="estado" defaultValue={estado} className="input !w-auto"><option value="">Todos</option><option value="PRUEBA">En prueba</option><option value="ACTIVA">Activos</option><option value="VENCIDA">Vencidos</option></select>
        <button className="btn-ghost">Buscar</button>
      </form>
      <section className="card overflow-x-auto">
        <table className="table min-w-[860px]"><thead><tr><th>Negocio</th><th>Dueño</th><th>Actividad</th><th>Suscripción</th><th className="text-right">Acciones</th></tr></thead>
          <tbody>{rows.map(({ b, s }) => (
            <tr key={b.id} className="hover:bg-surface-container-low/60 transition-colors">
              <td><Link href={`/admin/negocios/${b.id}`} className="font-label-lg hover:underline">{b.name}</Link><a className="block font-body-sm text-secondary" href={`/negocio/${b.slug}`} target="_blank" rel="noreferrer">/negocio/{b.slug} ↗</a>{!b.active && <span className="font-label-sm text-danger">Oculto</span>}</td>
              <td><p>{b.owner.name}</p><p className="font-body-sm text-on-surface-variant">{b.owner.email || b.owner.phone}</p></td>
              <td className="font-body-sm"><p>{b._count.appointments} citas · {b._count.customers} clientes</p><p className="text-on-surface-variant">Desde {fechaCorta(b.createdAt)}</p></td>
              <td><StateChip state={s.state} /><p className="font-body-sm text-on-surface-variant mt-1">{s.state === 'PRUEBA' ? `${s.daysLeft} días restantes` : s.state === 'ACTIVA' ? (b.paidUntil ? `Hasta ${fechaCorta(b.paidUntil)} · ${b.plan}` : `Sin vencimiento · ${b.plan}`) : 'Sin acceso al panel'}</p></td>
              <td><div className="flex flex-wrap justify-end gap-1">
                {BTN.map(([a, l]) => <form key={a} action={adminSetSubscription}><input type="hidden" name="id" value={b.id} /><input type="hidden" name="action" value={a} /><button className={`btn-ghost btn-sm ${a === 'SUSPENDER' ? 'text-danger' : ''}`}>{l}</button></form>)}
                <form action={impersonateAction}><input type="hidden" name="userId" value={b.owner.id} /><button className="btn-ghost btn-sm" title="Abre el panel de este negocio como su dueño"><Icon name="login" className="text-[16px]" />Entrar</button></form>
                <Link href={`/admin/negocios/${b.id}`} className="btn-primary btn-sm"><Icon name="edit" className="text-[16px]" />Editar</Link>
              </div></td>
            </tr>
          ))}</tbody></table>
        {!rows.length && <p className="p-6 text-center text-on-surface-variant">No hay negocios con ese filtro.</p>}
      </section>
    </>
  );
}
