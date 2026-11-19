import Link from 'next/link';
import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
import { PageHeader, Stat } from '@/components/panel/PageHeader';
import { ActionForm } from '@/components/ui/ActionForm';
import { Drawer } from '@/components/ui/Drawer';
import { Empty } from '@/components/ui/Empty';
import { Icon } from '@/components/ui/Icon';
import { cop, fechaCorta, parseJson } from '@/lib/format';
import { credits, KIND_LABEL, normCode, prepaidState, STATE_TONE, type PlanItem } from '@/lib/prepago';
import { savePlan, sellGift, sellPlan } from '../_actions/prepago';

export const metadata = { title: 'Paquetes y regalos' };
const PAY = [['EFECTIVO', 'Efectivo'], ['TARJETA', 'Datáfono'], ['NEQUI', 'Nequi'], ['DAVIPLATA', 'Daviplata'], ['TRANSFERENCIA', 'Transferencia']];
const Method = () => <label className="block"><span className="label">Cómo pagó</span><select name="method" className="input">{PAY.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>;

type Svc = { id: string; name: string; price: number };
type Plan = { id: string; kind: string; name: string; description: string | null; price: number; items: string; validityDays: number; discountPct: number; active: boolean };
function PlanFields({ p, services }: { p?: Plan; services: Svc[] }) {
  const items = parseJson<PlanItem[]>(p?.items, []);
  return (
    <>
      {p && <input type="hidden" name="id" value={p.id} />}
      <label className="block"><span className="label">Tipo</span><select name="kind" defaultValue={p?.kind || 'PAQUETE'} className="input"><option value="PAQUETE">Paquete de sesiones (se paga una vez)</option><option value="MEMBRESIA">Membresía mensual (se renueva cada mes)</option></select></label>
      <label className="block"><span className="label">Nombre *</span><input name="name" defaultValue={p?.name} className="input" required maxLength={80} placeholder="5 cortes por el precio de 4 · Club Bella" /></label>
      <label className="block"><span className="label">Descripción</span><input name="description" defaultValue={p?.description || ''} className="input" maxLength={300} /></label>
      <div className="grid grid-cols-3 gap-3">
        <label><span className="label">Precio *</span><input name="price" type="number" min={0} step={1000} defaultValue={p?.price} className="input" required /></label>
        <label><span className="label">Vigencia paquete (días)</span><input name="validityDays" type="number" min={1} max={730} defaultValue={p?.validityDays || 90} className="input" /></label>
        <label><span className="label">% descuento</span><input name="discountPct" type="number" min={0} max={100} defaultValue={p?.discountPct || 0} className="input" /></label>
      </div>
      <p className="font-body-sm text-on-surface-variant">La membresía dura 30 días por cada pago. El % de descuento se aplica en caja a los demás servicios y productos mientras esté vigente.</p>
      <fieldset className="rounded-2xl border border-parchment p-3">
        <legend className="px-1 font-label-lg">Sesiones incluidas</legend>
        <ul className="space-y-1.5 max-h-64 overflow-y-auto">{services.map(s => (
          <li key={s.id} className="flex items-center gap-2"><span className="flex-1 min-w-0 truncate">{s.name} <span className="text-on-surface-variant font-body-sm">{cop(s.price)}</span></span><input name={`qty_${s.id}`} type="number" min={0} max={100} defaultValue={items.find(i => i.serviceId === s.id)?.qty || ''} placeholder="0" className="input !h-8 w-20" /></li>
        ))}</ul>
      </fieldset>
      {p && <label className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={p.active} className="accent-primary-container" />Disponible para la venta</label>}
    </>
  );
}

export default async function Paquetes({ searchParams }: { searchParams: Promise<{ tipo?: string; q?: string }> }) {
  const { business: b } = await requireBusiness('caja');
  const sp = await searchParams;
  const tipo = ['PAQUETE', 'MEMBRESIA', 'REGALO'].includes(sp.tipo || '') ? sp.tipo! : '';
  const q = (sp.q || '').trim();
  const [plans, services, customers, sold] = await Promise.all([
    db.prepaidPlan.findMany({ where: { businessId: b.id }, orderBy: [{ active: 'desc' }, { kind: 'asc' }, { price: 'asc' }] }),
    db.service.findMany({ where: { businessId: b.id, active: true }, select: { id: true, name: true, price: true }, orderBy: { name: 'asc' } }),
    db.customer.findMany({ where: { businessId: b.id }, select: { id: true, name: true, phone: true }, orderBy: { name: 'asc' } }),
    db.prepaid.findMany({
      where: { businessId: b.id, ...(tipo ? { kind: tipo } : {}), ...(q ? { OR: [{ code: normCode(q) }, { recipientName: { contains: q, mode: 'insensitive' } }, { buyerName: { contains: q, mode: 'insensitive' } }, { name: { contains: q, mode: 'insensitive' } }] } : {}) },
      orderBy: { createdAt: 'desc' }, take: 100
    })
  ]);
  const custName = new Map(customers.map(c => [c.id, c.name]));
  const active = sold.filter(p => prepaidState(p) === 'ACTIVO');
  const giftBalance = active.filter(p => p.kind === 'REGALO').reduce((a, p) => a + p.balance, 0);
  const svcName = new Map(services.map(s => [s.id, s.name]));
  return (
    <>
      <PageHeader eyebrow="Ventas" title="Paquetes, membresías y regalos" subtitle="Se venden aquí y se usan en Caja al cobrar"
        actions={<>
          <Drawer title="Nuevo paquete o membresía" triggerClass="btn-outline btn-sm" trigger={<><Icon name="add" className="text-[18px]" />Nuevo plan</>}><ActionForm action={savePlan} resetOnSuccess><PlanFields services={services} /><button className="btn-primary w-full">Crear plan</button></ActionForm></Drawer>
          <Drawer title="Vender tarjeta de regalo" trigger={<><Icon name="redeem" className="text-[18px]" />Tarjeta de regalo</>}>
            <ActionForm action={sellGift}>
              <label className="block"><span className="label">Valor *</span><input name="amount" type="number" min={10000} step={10000} defaultValue={100000} className="input" required /></label>
              <div className="grid grid-cols-2 gap-3">
                <label><span className="label">De parte de</span><input name="buyerName" className="input" maxLength={80} /></label>
                <label><span className="label">Para</span><input name="recipientName" className="input" maxLength={80} /></label>
                <label><span className="label">Celular de quien la recibe</span><input name="recipientPhone" inputMode="numeric" className="input" /></label>
                <label><span className="label">Vence en (días)</span><input name="days" type="number" min={30} max={730} defaultValue={365} className="input" /></label>
              </div>
              <label className="block"><span className="label">Mensaje</span><textarea name="message" rows={2} maxLength={300} className="input" placeholder="¡Feliz cumpleaños! Consiéntete 💛" /></label>
              <Method />
              <p className="font-body-sm text-on-surface-variant">El saldo se usa en Caja con el método «Tarjeta de regalo». El documento electrónico se emite cuando se usa.</p>
              <button className="btn-primary w-full">Vender y generar código</button>
            </ActionForm>
          </Drawer>
        </>} />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <Stat label="Paquetes activos" value={String(active.filter(p => p.kind === 'PAQUETE').length)} icon="inventory" />
        <Stat label="Membresías activas" value={String(active.filter(p => p.kind === 'MEMBRESIA').length)} icon="workspace_premium" tone="gold" />
        <Stat label="Tarjetas de regalo activas" value={String(active.filter(p => p.kind === 'REGALO').length)} icon="redeem" />
        <Stat label="Saldo por redimir" value={cop(giftBalance)} icon="savings" hint="En tarjetas de regalo" />
      </div>

      <section className="mt-4">
        <h2 className="h-section mb-3">Planes a la venta</h2>
        {plans.length === 0 ? <div className="card"><Empty icon="inventory" title="Aún no hay planes" text="Crea un paquete (ej.: 5 cortes por el precio de 4) o una membresía mensual (ej.: 2 cortes al mes + 10% en productos)." /></div> : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">{plans.map(p => {
            const items = parseJson<PlanItem[]>(p.items, []);
            const value = items.reduce((a, i) => a + (services.find(s => s.id === i.serviceId)?.price || 0) * i.qty, 0);
            return (
              <article key={p.id} className={`card p-5 flex flex-col ${p.active ? '' : 'opacity-60'}`}>
                <div className="flex items-start justify-between gap-2"><span className="font-label-sm tracking-widest text-secondary">{KIND_LABEL[p.kind].toUpperCase()}</span>{!p.active && <span className="font-label-sm text-on-surface-variant">No disponible</span>}</div>
                <h3 className="font-headline-sm text-headline-sm mt-1">{p.name}</h3>
                {p.description && <p className="text-on-surface-variant font-body-sm">{p.description}</p>}
                <p className="font-title-lg text-title-lg tnum mt-2">{cop(p.price)}{p.kind === 'MEMBRESIA' && <span className="font-body-sm text-on-surface-variant"> / mes</span>}</p>
                {value > p.price && <p className="font-label-md text-[#065F46]">El cliente ahorra {cop(value - p.price)}</p>}
                <ul className="mt-2 space-y-0.5 font-body-sm flex-1">{items.map(i => <li key={i.serviceId}>• {i.qty} × {svcName.get(i.serviceId) || 'Servicio'}</li>)}{p.discountPct > 0 && <li>• {p.discountPct}% de descuento en lo demás</li>}<li className="text-on-surface-variant">{p.kind === 'MEMBRESIA' ? 'Vigencia: 30 días por pago' : `Vigencia: ${p.validityDays} días`}</li></ul>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <Drawer title={`Editar · ${p.name}`} triggerClass="btn-ghost btn-sm" trigger={<><Icon name="edit" className="text-[16px]" />Editar</>}><ActionForm action={savePlan}><PlanFields p={p} services={services} /><button className="btn-primary w-full">Guardar</button></ActionForm></Drawer>
                  {p.active && <Drawer title={`Vender · ${p.name}`} trigger={<><Icon name="sell" className="text-[16px]" />Vender</>}>
                    <ActionForm action={sellPlan}>
                      <input type="hidden" name="planId" value={p.id} />
                      <p>Total a cobrar: <b className="tnum">{cop(p.price)}</b></p>
                      <label className="block"><span className="label">Cliente *</span><select name="customerId" className="input" required defaultValue=""><option value="" disabled>Elige el cliente</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ''}</option>)}</select></label>
                      <Method />
                      <button className="btn-primary w-full">Registrar venta</button>
                    </ActionForm>
                  </Drawer>}
                </div>
              </article>
            );
          })}</div>
        )}
      </section>

      <section className="card p-5 mt-4">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <h2 className="h-section mr-auto">Vendidos</h2>
          {[['', 'Todos'], ['PAQUETE', 'Paquetes'], ['MEMBRESIA', 'Membresías'], ['REGALO', 'Regalos']].map(([k, l]) => <Link key={k} href={`/admin/paquetes${k ? `?tipo=${k}` : ''}`} className={`chip ${tipo === k ? 'chip-on' : ''}`}>{l}</Link>)}
          <form className="flex gap-2">{tipo && <input type="hidden" name="tipo" value={tipo} />}<input name="q" defaultValue={q} className="input !h-9 w-48" placeholder="Código o nombre" /><button className="btn-outline btn-sm h-9">Buscar</button></form>
        </div>
        {sold.length === 0 ? <p className="text-on-surface-variant">Nada por aquí todavía.</p> : (
          <ul className="divide-y divide-parchment">{sold.map(p => {
            const st = prepaidState(p); const cs = credits(p);
            const who = p.kind === 'REGALO' ? [p.recipientName && `Para ${p.recipientName}`, p.buyerName && `de ${p.buyerName}`].filter(Boolean).join(' ') : custName.get(p.customerId || '') || '';
            const left = p.kind === 'REGALO' ? `Saldo ${cop(p.balance)} de ${cop(p.price)}` : cs.map(c => `${c.total - c.used}/${c.total} ${c.name}`).join(' · ') || `${p.discountPct}% de descuento`;
            return (
              <li key={p.id}><Link href={`/admin/paquetes/${p.id}`} className="py-3 flex flex-wrap items-center gap-3 hover:bg-surface-container-low -mx-2 px-2 rounded-xl">
                <Icon name={p.kind === 'REGALO' ? 'redeem' : p.kind === 'MEMBRESIA' ? 'workspace_premium' : 'inventory'} className="text-secondary" />
                <div className="flex-1 min-w-[200px]"><p className="font-label-lg">{p.kind === 'REGALO' ? <span className="tracking-widest">{p.code}</span> : p.name}{who && <span className="text-on-surface-variant font-body-sm"> · {who}</span>}</p><p className="font-body-sm text-on-surface-variant">{left}</p></div>
                <span className="font-body-sm text-on-surface-variant">{p.expiresAt ? `Vence ${fechaCorta(p.expiresAt)}` : ''}</span>
                <span className={`px-2 py-0.5 rounded-full font-label-sm ${STATE_TONE[st]}`}>{st.charAt(0) + st.slice(1).toLowerCase()}</span>
              </Link></li>
            );
          })}</ul>
        )}
      </section>
    </>
  );
}
