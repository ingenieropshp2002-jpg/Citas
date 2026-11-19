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
import { AccessButton } from './AccessButton';
import { RecordForm } from './RecordForm';
import { Drawer } from '@/components/ui/Drawer';
import { ConfirmButton } from '@/components/ui/Confirm';
import { FORMULA_FIELDS, parseFormula } from '@/lib/ficha';
import { deleteRecord } from '../../_actions/ficha';

export default async function Cliente({ params }: { params: Promise<{ id: string }> }) {
  const { business: b, staffId, user } = await requireBusiness('clientes');
  const c = await db.customer.findFirst({ where: { id: (await params).id, businessId: b.id }, include: { appointments: { include: { staff: true, services: { include: { service: true } } }, orderBy: { start: 'desc' } }, sales: { include: { items: true }, orderBy: { createdAt: 'desc' } } } });
  if (!c) notFound();
  const [records, photos, me] = await Promise.all([
    db.clientRecord.findMany({ where: { customerId: c.id, businessId: b.id }, orderBy: [{ date: 'desc' }, { createdAt: 'desc' }] }),
    db.customerPhoto.findMany({ where: { customerId: c.id, businessId: b.id }, select: { id: true, recordId: true, kind: true }, orderBy: { createdAt: 'asc' } }),
    staffId ? db.staff.findFirst({ where: { id: staffId }, select: { name: true } }) : null
  ]);
  const lastFormula = records.map(r => ({ r, f: parseFormula(r.formula) })).find(x => x.f);
  const visits = c.appointments.filter(a => a.start <= new Date() && !['CANCELADA', 'NO_ASISTIO'].includes(a.status)).slice(0, 15).map(a => ({ id: a.id, label: `${fechaCorta(a.start)} · ${a.services.map(s => s.service.name).join(', ')}`, service: a.services.map(s => s.service.name).join(', '), staff: a.staff.name, date: new Date(a.start.getTime() - 5 * 3600_000).toISOString().slice(0, 10) }));
  const noShows = c.appointments.filter(a => a.status === 'NO_ASISTIO').length;
  const products = c.sales.flatMap(s => s.items).filter(i => i.kind === 'PRODUCTO');
  return (
    <>
      <PageHeader eyebrow="Ficha del cliente" title={c.name} subtitle={parseJson<string[]>(c.tags, []).join(' · ')}
        actions={<>{c.phone && <a href={waLink(c.phone, `Hola ${c.name.split(' ')[0]}, `)} target="_blank" rel="noreferrer" className="btn-ghost btn-sm"><Icon name="chat" className="text-[18px] text-[#059669]" />WhatsApp</a>}<AccessButton id={c.id} /><Link href="/admin/agenda?nueva=1" className="btn-primary btn-sm"><Icon name="add" className="text-[18px]" />Agendar</Link></>} />
      {c.allergies && <p role="alert" className="mb-4 p-3 rounded-2xl bg-[#FFF1F2] text-danger font-label-lg flex items-center gap-2"><Icon name="warning" />Alergias y contraindicaciones: {c.allergies}</p>}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <Stat label="Gasto total" value={cop(c.totalSpent)} icon="payments" tone="gold" />
        <Stat label="Visitas" value={String(c.visits)} icon="event_repeat" />
        <Stat label="Puntos" value={c.points.toLocaleString('es-CO')} icon="loyalty" hint="Programa de fidelización" />
        <Stat label="Inasistencias" value={String(noShows)} icon="event_busy" tone={noShows ? 'danger' : 'default'} />
      </div>
      <div className="grid xl:grid-cols-3 gap-4 mt-4">
        <section className="card p-5 xl:col-span-2">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="h-section">Ficha técnica</h2>
            <Drawer title={`Nueva ficha · ${c.name}`} trigger={<><Icon name="add" className="text-[18px]" />Registrar visita</>}><RecordForm customerId={c.id} visits={visits} staffName={me?.name || user.name} /></Drawer>
          </div>
          {records.length === 0 && <p className="text-on-surface-variant">Aún no hay fichas. Registra la fórmula de color, las notas y las fotos de antes y después de cada visita.</p>}
          <ol className="space-y-4">{records.map(r => {
            const f = parseFormula(r.formula); const ph = photos.filter(p => p.recordId === r.id);
            return (
              <li key={r.id} className="rounded-2xl border border-parchment p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0"><p className="font-label-lg">{fechaCorta(r.date)}{r.service ? ` · ${r.service}` : ''}</p><p className="font-body-sm text-on-surface-variant">{[r.staffName, r.createdBy && r.createdBy !== r.staffName ? `registró ${r.createdBy}` : null].filter(Boolean).join(' · ')}</p></div>
                  <ConfirmButton action={deleteRecord} title="¿Borrar esta ficha?" text="Se borran también sus fotos." confirmLabel="Borrar" className="btn-ghost btn-sm text-danger" fields={<input type="hidden" name="id" value={r.id} />}><Icon name="delete" className="text-[18px]" /></ConfirmButton>
                </div>
                {f && <dl className="mt-3 grid sm:grid-cols-2 gap-x-4 gap-y-1 p-3 rounded-xl bg-secondary-fixed/25">{FORMULA_FIELDS.filter(([k]) => f[k]).map(([k, l]) => <div key={k} className="flex gap-2"><dt className="text-on-surface-variant shrink-0">{l}:</dt><dd className="font-label-lg">{f[k]}</dd></div>)}</dl>}
                {r.notes && <p className="mt-2 whitespace-pre-line">{r.notes}</p>}
                {ph.length > 0 && <div className="mt-3 grid grid-cols-2 gap-3">{(['ANTES', 'DESPUES'] as const).map(k => { const list = ph.filter(p => p.kind === k); return list.length ? (
                  <div key={k}><p className="font-label-sm tracking-widest text-on-surface-variant mb-1">{k === 'ANTES' ? 'ANTES' : 'DESPUÉS'}</p><div className="flex flex-wrap gap-2">{list.map(p => <a key={p.id} href={`/api/ficha/foto/${p.id}`} target="_blank" rel="noreferrer"><img src={`/api/ficha/foto/${p.id}`} alt={k === 'ANTES' ? 'Antes' : 'Después'} loading="lazy" className="w-28 h-28 object-cover rounded-xl border border-parchment" /></a>)}</div></div>
                ) : <div key={k} />; })}</div>}
              </li>
            );
          })}</ol>
        </section>
        <section className="card p-5">
          <h2 className="h-section mb-3">Última fórmula</h2>
          {lastFormula ? <><p className="font-body-sm text-on-surface-variant mb-2">{fechaCorta(lastFormula.r.date)}{lastFormula.r.staffName ? ` · ${lastFormula.r.staffName}` : ''}</p><dl className="space-y-1">{FORMULA_FIELDS.filter(([k]) => lastFormula.f![k]).map(([k, l]) => <div key={k} className="flex justify-between gap-3"><dt className="text-on-surface-variant">{l}</dt><dd className="font-label-lg text-right">{lastFormula.f![k]}</dd></div>)}</dl></> : <p className="text-on-surface-variant">Sin fórmulas registradas.</p>}
        </section>
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
