import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { PageHeader, Stat } from '@/components/panel/PageHeader';
import { fechaCorta } from '@/lib/format';
import { isPlatformAdmin, subscriptionState } from '@/lib/subscription';
import { adminSetSubscription } from '../_actions/subscription';

export const metadata = { title: 'Administración' };
// Solo para los correos en ADMIN_EMAILS: ver todos los negocios y activar o extender su suscripción a mano.
export default async function Admin() {
  const user = await requireUser('/panel/admin');
  if (!isPlatformAdmin(user.email)) redirect('/panel');
  const list = await db.business.findMany({ orderBy: { createdAt: 'desc' }, include: { owner: { select: { name: true, email: true, phone: true } } } });
  const rows = list.map(b => ({ b, s: subscriptionState(b) }));
  const BTN = [['ACTIVAR_30', 'Activar 30 días'], ['EXTENDER_PRUEBA', '+14 días de prueba'], ['ACTIVAR_SIEMPRE', 'Activar sin vencimiento'], ['SUSPENDER', 'Suspender']];
  return (
    <>
      <PageHeader eyebrow="Plataforma" title="Negocios registrados" />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
        <Stat label="Negocios" value={String(rows.length)} icon="storefront" />
        <Stat label="En prueba" value={String(rows.filter(r => r.s.state === 'PRUEBA').length)} icon="hourglass_top" />
        <Stat label="Activos" value={String(rows.filter(r => r.s.state === 'ACTIVA').length)} icon="verified" tone="gold" />
        <Stat label="Vencidos" value={String(rows.filter(r => r.s.state === 'VENCIDA').length)} icon="block" tone="danger" />
      </div>
      <section className="card p-5 overflow-x-auto">
        <table className="table"><thead><tr><th>Negocio</th><th>Dueño</th><th>Registro</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>{rows.map(({ b, s }) => (
            <tr key={b.id}><td><p className="font-label-lg">{b.name}</p><a className="font-body-sm text-secondary" href={`/negocio/${b.slug}`} target="_blank" rel="noreferrer">/negocio/{b.slug}</a></td>
              <td><p>{b.owner.name}</p><p className="font-body-sm text-on-surface-variant">{b.owner.email || b.owner.phone}</p></td>
              <td>{fechaCorta(b.createdAt)}</td>
              <td>{s.state === 'PRUEBA' ? `Prueba · ${s.daysLeft} días` : s.state === 'ACTIVA' ? `Activo${b.paidUntil ? ` hasta ${fechaCorta(b.paidUntil)}` : ''} · ${b.plan}` : 'Vencido'}</td>
              <td><div className="flex flex-wrap gap-1">{BTN.map(([a, l]) => <form key={a} action={adminSetSubscription}><input type="hidden" name="id" value={b.id} /><input type="hidden" name="action" value={a} /><button className={`btn-sm ${a === 'SUSPENDER' ? 'btn-ghost text-danger' : 'btn-ghost'}`}>{l}</button></form>)}</div></td></tr>
          ))}</tbody></table>
      </section>
    </>
  );
}
