import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
import { PageHeader, Stat } from '@/components/panel/PageHeader';
import { ActionForm } from '@/components/ui/ActionForm';
import { StatusBadge } from '@/components/ui/Status';
import { Icon } from '@/components/ui/Icon';
import { saveCustomer } from '../../_actions/catalog';
import { CustomerFields } from '../fields';
import { cop, fechaCorta, hm, parseJson, time12 } from '@/lib/format';
import { waLink } from '@/lib/notify';

export default async function Cliente({ params }: { params: Promise<{ id: string }> }) {
  const { business: b } = await requireBusiness('clientes');
  const c = await db.customer.findFirst({ where: { id: (await params).id, businessId: b.id }, include: { appointments: { include: { staff: true, services: { include: { service: true } } }, orderBy: { start: 'desc' } }, sales: { include: { items: true }, orderBy: { createdAt: 'desc' } } } });
  if (!c) notFound();
  const noShows = c.appointments.filter(a => a.status === 'NO_ASISTIO').length;
  const products = c.sales.flatMap(s => s.items).filter(i => i.kind === 'PRODUCTO');
  return (
    <>
      <PageHeader eyebrow="Ficha del cliente" title={c.name} subtitle={parseJson<string[]>(c.tags, []).join(' · ')}
        actions={<>{c.phone && <a href={waLink(c.phone, `Hola ${c.name.split(' ')[0]}, `)} target="_blank" rel="noreferrer" className="btn-ghost btn-sm"><Icon name="chat" className="text-[18px] text-[#059669]" />WhatsApp</a>}<Link href="/panel/agenda?nueva=1" className="btn-primary btn-sm"><Icon name="add" className="text-[18px]" />Agendar</Link></>} />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <Stat label="Gasto total" value={cop(c.totalSpent)} icon="payments" tone="gold" />
        <Stat label="Visitas" value={String(c.visits)} icon="event_repeat" />
        <Stat label="Ticket promedio" value={cop(c.visits ? c.totalSpent / c.visits : 0)} icon="receipt" />
        <Stat label="Inasistencias" value={String(noShows)} icon="event_busy" tone={noShows ? 'danger' : 'default'} />
      </div>
      <div className="grid xl:grid-cols-3 gap-4 mt-4">
        <section className="card p-5 xl:col-span-2">
          <h2 className="h-section mb-3">Historial de citas</h2>
          <ul className="divide-y divide-parchment">{c.appointments.map(a => (
            <li key={a.id} className="py-3 flex items-center gap-3">
              <div className="w-20 font-label-md text-label-md text-on-surface-variant">{fechaCorta(a.start)}<br />{time12(hm(a.start))}</div>
              <div className="flex-1 min-w-0"><p className="font-label-lg truncate">{a.services.map(s => s.service.name).join(', ')}</p><p className="font-body-sm text-on-surface-variant">{a.staff.name}</p></div>
              <span className="tnum">{cop(a.total)}</span><StatusBadge status={a.status} />
            </li>
          ))}</ul>
          {c.appointments.length === 0 && <p className="text-on-surface-variant">Sin citas registradas.</p>}
          {products.length > 0 && <><h3 className="font-title-md text-title-md mt-6 mb-2">Productos comprados</h3><div className="flex flex-wrap gap-2">{products.map(p => <span key={p.id} className="px-2 py-1 rounded-lg bg-surface-container font-label-md">{p.description} ×{p.quantity}</span>)}</div></>}
        </section>
        <section className="card p-5">
          <h2 className="h-section mb-3">Datos y notas</h2>
          <ActionForm action={saveCustomer}><CustomerFields c={c} /><button className="btn-primary w-full">Guardar cambios</button></ActionForm>
        </section>
      </div>
    </>
  );
}
