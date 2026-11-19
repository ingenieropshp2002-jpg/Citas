import Link from 'next/link';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
import { PageHeader } from '@/components/panel/PageHeader';
import { ActionForm } from '@/components/ui/ActionForm';
import { Submit } from '@/components/ui/Submit';
import { Icon } from '@/components/ui/Icon';
import { Empty } from '@/components/ui/Empty';
import { Drawer } from '@/components/ui/Drawer';
import { cop, addDays, ymd, METHOD_LABEL } from '@/lib/format';
import { pendingCommissions } from '@/lib/comisiones';
import { liquidarComisiones } from '../../_actions/comisiones';

export const metadata = { title: 'Comisiones' };
const ok = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '');
function presets(today: string) {
  const [y, m, d] = today.split('-').map(Number);
  const pad = (n: number) => String(n).padStart(2, '0');
  const mStart = `${y}-${pad(m)}-01`; const mEnd = addDays(`${m === 12 ? y + 1 : y}-${pad(m === 12 ? 1 : m + 1)}-01`, -1);
  const pm = m === 1 ? 12 : m - 1; const py = m === 1 ? y - 1 : y;
  const pmStart = `${py}-${pad(pm)}-01`; const pmEnd = addDays(mStart, -1);
  const q1 = d <= 15;
  return [
    { k: 'quincena', label: 'Esta quincena', from: q1 ? mStart : `${y}-${pad(m)}-16`, to: q1 ? `${y}-${pad(m)}-15` : mEnd },
    { k: 'quincena-pasada', label: 'Quincena pasada', from: q1 ? `${py}-${pad(pm)}-16` : mStart, to: q1 ? pmEnd : `${y}-${pad(m)}-15` },
    { k: 'mes', label: 'Este mes', from: mStart, to: mEnd },
    { k: 'mes-pasado', label: 'Mes pasado', from: pmStart, to: pmEnd }
  ];
}

export default async function Comisiones({ searchParams }: { searchParams: Promise<{ desde?: string; hasta?: string; p?: string }> }) {
  const { business: b, perms, staffId } = await requireBusiness();
  const manager = perms === 'ALL' || perms.includes('equipo');
  if (!manager && !staffId) redirect('/admin');
  const sp = await searchParams; const today = ymd(new Date());
  const ps = presets(today); const pick = ps.find(x => x.k === sp.p) || ps[0];
  const from = ok(sp.desde) || pick.from; const to = ok(sp.hasta) || pick.to;
  const [rows, history] = await Promise.all([
    pendingCommissions(b.id, from, to, manager ? null : staffId),
    db.commissionPayout.findMany({ where: { businessId: b.id, ...(manager ? {} : { staffId: staffId! }) }, orderBy: { createdAt: 'desc' }, take: 20 })
  ]);
  const total = rows.reduce((a, r) => a + r.total, 0);
  const custom = !!(ok(sp.desde) || ok(sp.hasta));
  return (
    <>
      <PageHeader eyebrow="Equipo" title={manager ? 'Comisiones y liquidación' : 'Mis comisiones'} subtitle={`Del ${from} al ${to} · pendiente por pagar: ${cop(total)}`} actions={manager ? <Link href="/admin/equipo" className="btn-ghost btn-sm"><Icon name="badge" className="text-[16px]" />Equipo</Link> : undefined} />
      <div className="flex flex-wrap items-end gap-2 mb-4">
        {ps.map(x => <Link key={x.k} href={`?p=${x.k}`} className={`btn-sm ${!custom && x.k === pick.k ? 'btn-primary' : 'btn-outline'}`}>{x.label}</Link>)}
        <form className="flex items-end gap-2 ml-auto"><label><span className="label">Desde</span><input type="date" name="desde" defaultValue={from} className="input !h-9" /></label><label><span className="label">Hasta</span><input type="date" name="hasta" defaultValue={to} className="input !h-9" /></label><button className="btn-outline btn-sm h-9">Ver</button></form>
      </div>
      <p className="mb-3 font-body-sm text-on-surface-variant">Se calcula con las ventas pagadas en Caja: servicios con el % del profesional (o el % propio del servicio), productos con su % de productos, y la propina repartida según los servicios de cada uno. Lo que ya se liquidó no se vuelve a contar.</p>
      {rows.every(r => !r.itemIds.length) ? <div className="card"><Empty icon="payments" title="No hay comisiones pendientes" text="Cuando se cobren servicios en Caja con un profesional asignado, aparecerán aquí." /></div> : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.filter(r => r.itemIds.length).map(r => (
            <div key={r.staffId} className="card p-5 flex flex-col">
              <div className="flex items-center gap-3">
                {r.photo ? <img src={r.photo} alt="" className="w-11 h-11 rounded-full object-cover border-2" style={{ borderColor: r.color }} /> : <span className="w-11 h-11 rounded-full text-white flex items-center justify-center font-title-md" style={{ background: r.color }}>{r.name[0]}</span>}
                <div className="min-w-0"><p className="font-title-lg text-title-lg truncate">{r.name}</p><p className="font-body-sm text-on-surface-variant">{r.servicesCount} servicios · {r.productsCount} productos</p></div>
              </div>
              <dl className="mt-4 space-y-1 tnum font-body-md flex-1">
                <div className="flex justify-between"><dt className="text-on-surface-variant">Servicios ({cop(r.servicesBase)} sin IVA)</dt><dd>{cop(r.servicesCommission)}</dd></div>
                <div className="flex justify-between"><dt className="text-on-surface-variant">Productos ({cop(r.productsBase)} sin IVA)</dt><dd>{cop(r.productsCommission)}</dd></div>
                <div className="flex justify-between"><dt className="text-on-surface-variant">Propinas</dt><dd>{cop(r.tips)}</dd></div>
                <div className="flex justify-between pt-2 border-t border-parchment font-title-md"><dt>Total a pagar</dt><dd>{cop(r.total)}</dd></div>
              </dl>
              {manager && <div className="mt-4"><Drawer title={`Liquidar a ${r.name}`} triggerClass="btn-primary btn-sm w-full" trigger={<><Icon name="payments" className="text-[16px]" />Liquidar {cop(r.total)}</>}>
                <ActionForm action={liquidarComisiones} success="Liquidación registrada.">
                  <input type="hidden" name="staffId" value={r.staffId} /><input type="hidden" name="from" value={from} /><input type="hidden" name="to" value={to} />
                  <p className="font-body-md">Período del <b>{from}</b> al <b>{to}</b>. Comisiones y propinas: <b className="tnum">{cop(r.total)}</b>.</p>
                  <label className="block"><span className="label">Ajuste (bono positivo, o anticipo / descuento negativo)</span><input name="adjustment" inputMode="numeric" className="input" placeholder="0 o -50000" /></label>
                  <label className="block"><span className="label">Cómo se le pagó</span><select name="method" className="input">{['EFECTIVO', 'TRANSFERENCIA', 'NEQUI', 'DAVIPLATA'].map(m => <option key={m} value={m}>{METHOD_LABEL[m] || m}</option>)}</select></label>
                  <label className="block"><span className="label">Nota (opcional)</span><input name="notes" className="input" maxLength={300} /></label>
                  <Submit className="btn-primary w-full">Registrar pago</Submit>
                </ActionForm>
              </Drawer></div>}
            </div>
          ))}
        </div>
      )}
      <section className="card overflow-hidden mt-6">
        <h2 className="h-section p-4 border-b border-parchment">Liquidaciones anteriores</h2>
        {history.length === 0 ? <p className="p-4 text-on-surface-variant">Aún no hay liquidaciones.</p> : (
          <ul className="divide-y divide-parchment">{history.map(h => (
            <li key={h.id}><Link href={`/admin/equipo/comisiones/${h.id}`} className="p-3 px-4 flex flex-wrap items-center gap-3 hover:bg-surface-container-low">
              <Icon name="receipt_long" className="text-secondary" /><span className="flex-1 min-w-[160px]"><b>{h.staffName}</b> · {h.fromDate} a {h.toDate}</span>
              <span className="font-body-sm text-on-surface-variant">{METHOD_LABEL[h.method] || h.method}</span><span className="tnum font-title-md">{cop(h.total)}</span></Link></li>
          ))}</ul>
        )}
      </section>
    </>
  );
}
