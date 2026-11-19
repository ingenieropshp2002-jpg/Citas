import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
import { PageHeader } from '@/components/panel/PageHeader';
import { ActionForm } from '@/components/ui/ActionForm';
import { ConfirmButton } from '@/components/ui/Confirm';
import { Drawer } from '@/components/ui/Drawer';
import { Icon } from '@/components/ui/Icon';
import { cop, fechaCorta, hm, METHOD_LABEL, time12 } from '@/lib/format';
import { waLink } from '@/lib/notify';
import { credits, KIND_LABEL, prepaidState, STATE_TONE } from '@/lib/prepago';
import { renewMembership, voidPrepaid } from '../../_actions/prepago';
import { PrintButton } from '../../equipo/comisiones/[id]/PrintButton';

const MOVE: Record<string, string> = { VENTA: 'Venta', RENOVACION: 'Renovación', USO: 'Uso', REVERSO: 'Devuelto por anulación de venta', ANULACION: 'Anulado' };

export default async function Prepago({ params }: { params: Promise<{ id: string }> }) {
  const { business: b } = await requireBusiness('caja');
  const p = await db.prepaid.findFirst({ where: { id: (await params).id, businessId: b.id } });
  if (!p) notFound();
  const [moves, customer] = await Promise.all([
    db.prepaidMove.findMany({ where: { prepaidId: p.id }, orderBy: { createdAt: 'desc' } }),
    p.customerId ? db.customer.findFirst({ where: { id: p.customerId }, select: { id: true, name: true, phone: true } }) : null
  ]);
  const sales = await db.sale.findMany({ where: { id: { in: moves.map(m => m.saleId).filter(Boolean) as string[] } }, select: { id: true, number: true } });
  const st = prepaidState(p); const cs = credits(p);
  const link = `${(process.env.APP_URL || '').replace(/\/$/, '')}/regalo/${p.code}`;
  const gift = p.kind === 'REGALO';
  const share = gift ? `🎁 ${p.recipientName ? `Hola ${p.recipientName}, ` : ''}${p.buyerName ? `${p.buyerName} te regaló` : 'Tienes'} una tarjeta de regalo de ${cop(p.price)} en ${b.name}.${p.message ? ` "${p.message}"` : ''} Código: ${p.code}. Míralo aquí: ${link}` : '';
  return (
    <>
      <div className="flex items-center justify-between mb-4 print:hidden"><Link href="/admin/paquetes" className="btn-ghost btn-sm">← Paquetes y regalos</Link>
        <div className="flex gap-2">
          {gift && <PrintButton />}
          {gift && st === 'ACTIVO' && <a href={waLink(p.recipientPhone, share)} target="_blank" rel="noreferrer" className="btn-outline btn-sm"><Icon name="chat" className="text-[16px] text-[#059669]" />Enviar por WhatsApp</a>}
          {p.kind === 'MEMBRESIA' && st !== 'ANULADO' && <Drawer title="Renovar membresía" trigger={<><Icon name="autorenew" className="text-[16px]" />Renovar</>}><ActionForm action={renewMembership}><input type="hidden" name="id" value={p.id} /><p>Se cobra un mes más y las sesiones vuelven a empezar.</p><label className="block"><span className="label">Cómo pagó</span><select name="method" className="input">{['EFECTIVO', 'TARJETA', 'NEQUI', 'DAVIPLATA', 'TRANSFERENCIA'].map(m => <option key={m} value={m}>{METHOD_LABEL[m]}</option>)}</select></label><button className="btn-primary w-full">Renovar</button></ActionForm></Drawer>}
          {st !== 'ANULADO' && <ConfirmButton action={voidPrepaid} title="¿Anular?" text="Ya no se podrá usar. Si devuelves dinero, regístralo en Gastos." confirmLabel="Anular" fields={<><input type="hidden" name="id" value={p.id} /><label className="block"><span className="label">Motivo</span><input name="reason" className="input" required maxLength={200} /></label></>}>Anular</ConfirmButton>}
        </div>
      </div>
      <PageHeader eyebrow={KIND_LABEL[p.kind]} title={gift ? `Tarjeta ${p.code}` : p.name} subtitle={customer ? `Cliente: ${customer.name}` : undefined} />
      <div className="grid xl:grid-cols-3 gap-4">
        <section className="xl:col-span-2 space-y-4">
          {gift ? (
            <div className="rounded-3xl p-6 bg-gradient-to-br from-primary-container to-[#0b2537] text-white shadow-sheet max-w-lg">
              <div className="flex items-center justify-between"><span className="font-label-sm tracking-[.3em] text-secondary-fixed">TARJETA DE REGALO</span><Icon name="redeem" className="text-secondary-fixed" /></div>
              <p className="font-headline-md text-headline-md mt-4">{b.name}</p>
              <p className="font-display-sm text-[40px] leading-tight tnum mt-2">{cop(p.balance)}</p>
              {p.balance !== p.price && <p className="text-white/70 font-body-sm">de {cop(p.price)}</p>}
              {p.message && <p className="mt-3 italic text-white/90">“{p.message}”</p>}
              <div className="mt-5 flex items-end justify-between gap-3"><div><p className="text-white/60 font-label-sm">{p.recipientName ? `Para ${p.recipientName}` : ''}{p.buyerName ? ` · de ${p.buyerName}` : ''}</p><p className="text-white/60 font-label-sm">{p.expiresAt ? `Válida hasta ${fechaCorta(p.expiresAt)}` : ''}</p></div><p className="font-title-lg tracking-[.2em] text-secondary-fixed">{p.code}</p></div>
            </div>
          ) : (
            <div className="card p-5">
              <h2 className="h-section mb-3">Sesiones</h2>
              {cs.length === 0 ? <p className="text-on-surface-variant">Sin sesiones incluidas.</p> : <ul className="space-y-3">{cs.map(c => (
                <li key={c.serviceId}><div className="flex justify-between"><span>{c.name}</span><span className="tnum font-label-lg">{c.total - c.used} de {c.total} disponibles</span></div><div className="h-2 rounded-full bg-surface-container mt-1 overflow-hidden"><div className="h-full bg-secondary" style={{ width: `${Math.min(100, (c.used / Math.max(1, c.total)) * 100)}%` }} /></div></li>
              ))}</ul>}
              {p.discountPct > 0 && <p className="mt-4 font-label-lg flex items-center gap-2"><Icon name="percent" className="text-secondary" />{p.discountPct}% de descuento en caja mientras esté vigente</p>}
            </div>
          )}
          <div className="card p-5 print:hidden">
            <h2 className="h-section mb-3">Movimientos</h2>
            <ul className="divide-y divide-parchment">{moves.map(m => { const s = sales.find(x => x.id === m.saleId); return (
              <li key={m.id} className="py-2.5 flex flex-wrap items-center gap-3">
                <span className="w-28 font-body-sm text-on-surface-variant">{fechaCorta(m.createdAt)} {time12(hm(m.createdAt))}</span>
                <span className="flex-1 min-w-[160px]">{MOVE[m.type] || m.type}{m.note ? ` · ${m.note}` : ''}{s && <> · <Link href={`/admin/caja/ventas/${s.id}`} className="text-secondary">venta #{s.number}</Link></>}{m.method ? ` · ${METHOD_LABEL[m.method] || m.method}` : ''}</span>
                {m.amount > 0 && <span className={`tnum ${m.type === 'USO' ? 'text-on-surface-variant' : 'font-label-lg'}`}>{m.type === 'USO' ? '−' : ''}{cop(m.amount)}</span>}
              </li>
            ); })}</ul>
          </div>
        </section>
        <section className="card p-5 h-fit print:hidden">
          <dl className="space-y-2">
            <div className="flex justify-between"><dt className="text-on-surface-variant">Estado</dt><dd><span className={`px-2 py-0.5 rounded-full font-label-sm ${STATE_TONE[st]}`}>{st.charAt(0) + st.slice(1).toLowerCase()}</span></dd></div>
            <div className="flex justify-between"><dt className="text-on-surface-variant">Valor pagado</dt><dd className="tnum">{cop(p.price)}</dd></div>
            <div className="flex justify-between"><dt className="text-on-surface-variant">Desde</dt><dd>{fechaCorta(p.startsAt)}</dd></div>
            {p.expiresAt && <div className="flex justify-between"><dt className="text-on-surface-variant">Vence</dt><dd>{fechaCorta(p.expiresAt)}</dd></div>}
            {customer && <div className="flex justify-between"><dt className="text-on-surface-variant">Cliente</dt><dd><Link href={`/admin/clientes/${customer.id}`} className="text-secondary">{customer.name}</Link></dd></div>}
          </dl>
          <p className="font-body-sm text-on-surface-variant mt-4">{gift ? 'Para usarla: en Caja, elige el pago «Tarjeta de regalo» y escribe el código.' : 'Para usarlo: en Caja, elige al cliente y marca «Usar paquete» en el servicio.'}</p>
        </section>
      </div>
    </>
  );
}
