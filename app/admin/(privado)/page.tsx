import Link from 'next/link';
import { db } from '@/lib/db';
import { PageHeader, Stat } from '@/components/panel/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { cop, fechaCorta } from '@/lib/format';
import { subscriptionState } from '@/lib/subscription';
import { getSettings } from '@/lib/settings';
import { StateChip } from './StateChip';

export const metadata = { title: 'Resumen' };
export default async function AdminHome() {
  const since = new Date(Date.now() - 30 * 86400000);
  const [businesses, users, clients, appts30, sales30, s] = await Promise.all([
    db.business.findMany({ orderBy: { createdAt: 'desc' }, select: { id: true, name: true, slug: true, createdAt: true, subscriptionStatus: true, trialEndsAt: true, paidUntil: true, plan: true } }),
    db.user.count(), db.user.count({ where: { role: 'CLIENT' } }),
    db.appointment.count({ where: { createdAt: { gte: since } } }),
    db.sale.aggregate({ where: { createdAt: { gte: since }, status: { not: 'ANULADA' } }, _sum: { total: true } }),
    getSettings()
  ]);
  const st = businesses.map(b => subscriptionState(b).state);
  const mrr = businesses.filter((b, i) => st[i] === 'ACTIVA' && b.paidUntil).reduce((a, b) => a + (s.plans.find(p => p.id === b.plan)?.price || 0), 0);
  return (
    <>
      <PageHeader eyebrow="Plataforma" title="Resumen" subtitle="Todo lo que pasa en la app, en un vistazo." />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <Stat label="Negocios" value={String(businesses.length)} icon="storefront" hint={`${st.filter(x => x === 'PRUEBA').length} en prueba · ${st.filter(x => x === 'GRACIA').length} en gracia · ${st.filter(x => x === 'VENCIDA').length} suspendidos`} />
        <Stat label="Ingreso mensual por planes" value={cop(mrr)} icon="payments" tone="gold" hint="Negocios con pago al día" />
        <Stat label="Usuarios" value={String(users)} icon="group" hint={`${clients} clientes`} />
        <Stat label="Citas (30 días)" value={String(appts30)} icon="event_available" hint={`Ventas en negocios: ${cop(sales30._sum.total || 0)}`} />
      </div>
      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        <section className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3"><h2 className="h-section">Negocios recientes</h2><Link href="/admin/negocios" className="font-label-md text-secondary">Ver todos</Link></div>
          <ul className="divide-y divide-parchment">{businesses.slice(0, 8).map((b, i) => (
            <li key={b.id}><Link href={`/admin/negocios/${b.id}`} className="py-3 flex items-center gap-3 hover:bg-surface-container-low -mx-2 px-2 rounded-lg transition-colors">
              <span className="flex-1 min-w-0"><span className="block font-label-lg truncate">{b.name}</span><span className="font-body-sm text-on-surface-variant">Desde {fechaCorta(b.createdAt)}</span></span>
              <StateChip state={st[i]} /><Icon name="chevron_right" className="text-on-surface-variant" /></Link></li>
          ))}</ul>
        </section>
        <section className="card p-5 space-y-2">
          <h2 className="h-section mb-1">Accesos rápidos</h2>
          {[['/admin/ajustes', 'badge', 'Cambiar nombre, logo y textos de la app'], ['/admin/ajustes#planes', 'sell', 'Editar planes y precios'], ['/admin/usuarios', 'manage_accounts', 'Buscar o editar un usuario'], ['/admin/negocios', 'storefront', 'Activar o suspender negocios']].map(([h, i, l]) => (
            <Link key={h} href={h} className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors"><Icon name={i} className="text-secondary" /><span className="font-label-lg">{l}</span></Link>
          ))}
        </section>
      </div>
    </>
  );
}

