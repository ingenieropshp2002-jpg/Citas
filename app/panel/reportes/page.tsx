import Link from 'next/link';
import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
import { PageHeader, Stat } from '@/components/panel/PageHeader';
import { addDays, cop, fromBogota, METHOD_LABEL, ymd } from '@/lib/format';

export const metadata = { title: 'Reportes' };
export default async function Reportes({ searchParams }: { searchParams: Promise<{ desde?: string; hasta?: string }> }) {
  const { business: b } = await requireBusiness('reportes');
  const sp = await searchParams;
  const hasta = sp.hasta || ymd(new Date()); const desde = sp.desde || addDays(hasta, -29);
  const range = { gte: fromBogota(desde), lt: fromBogota(addDays(hasta, 1)) };
  const [sales, appts, staff] = await Promise.all([
    db.sale.findMany({ where: { businessId: b.id, status: 'PAGADA', createdAt: range }, include: { items: true, payments: true } }),
    db.appointment.findMany({ where: { businessId: b.id, start: range } }),
    db.staff.findMany({ where: { businessId: b.id } })
  ]);
  const items = sales.flatMap(s => s.items);
  const gross = sales.reduce((a, s) => a + s.total - s.tip, 0);
  const tax = sales.reduce((a, s) => a + s.taxTotal, 0);
  const tips = sales.reduce((a, s) => a + s.tip, 0);
  const svc = items.filter(i => i.kind === 'SERVICIO'); const prod = items.filter(i => i.kind === 'PRODUCTO');
  const group = <T,>(arr: T[], k: (x: T) => string, v: (x: T) => number) => Object.entries(arr.reduce<Record<string, { n: number; v: number }>>((m, x) => { const key = k(x); m[key] = { n: (m[key]?.n || 0) + 1, v: (m[key]?.v || 0) + v(x) }; return m; }, {})).sort((a, b) => b[1].v - a[1].v);
  const topSvc = group(svc, i => i.description, i => i.total).slice(0, 8);
  const topProd = group(prod, i => i.description, i => i.total).slice(0, 8);
  const byMethod = group(sales.flatMap(s => s.payments), p => p.method, p => p.amount);
  const done = appts.filter(a => ['COMPLETADA', 'NO_ASISTIO'].includes(a.status));
  const noShow = appts.filter(a => a.status === 'NO_ASISTIO').length;
  const cancel = appts.filter(a => a.status === 'CANCELADA').length;
  const perf = staff.map(s => { const its = items.filter(i => i.staffId === s.id); const ap = appts.filter(a => a.staffId === s.id); return { s, sales: its.reduce((a, i) => a + i.total, 0), com: its.reduce((a, i) => a + i.commission, 0), services: its.filter(i => i.kind === 'SERVICIO').length, noShow: ap.filter(a => a.status === 'NO_ASISTIO').length, appts: ap.length }; }).sort((a, b) => b.sales - a.sales);
  const maxPerf = Math.max(...perf.map(p => p.sales), 1);
  const Bars = ({ rows }: { rows: [string, { n: number; v: number }][] }) => { const m = Math.max(...rows.map(r => r[1].v), 1); return <ul className="space-y-2.5">{rows.map(([k, x]) => <li key={k}><div className="flex justify-between font-label-md"><span className="truncate pr-2">{METHOD_LABEL[k] || k} <span className="text-on-surface-variant font-normal">×{x.n}</span></span><span className="tnum">{cop(x.v)}</span></div><div className="h-2 mt-1 rounded-full bg-surface-container"><div className="h-full rounded-full bg-primary-container dark:bg-primary" style={{ width: `${x.v / m * 100}%` }} /></div></li>)}</ul>; };
  const csv = `/api/reportes/ventas?desde=${desde}&hasta=${hasta}`;
  return (
    <>
      <PageHeader eyebrow="Análisis" title="Reportes" actions={<form className="flex flex-wrap gap-2 items-end"><label><span className="label">Desde</span><input type="date" name="desde" defaultValue={desde} className="input !h-10" /></label><label><span className="label">Hasta</span><input type="date" name="hasta" defaultValue={hasta} className="input !h-10" /></label><button className="btn-primary btn-sm h-10">Aplicar</button><Link href={csv} className="btn-ghost btn-sm h-10">Exportar CSV</Link></form>} />
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
        <Stat label="Ventas (sin propinas)" value={cop(gross)} icon="payments" tone="gold" hint={`${sales.length} ventas`} />
        <Stat label="Ticket promedio" value={cop(sales.length ? gross / sales.length : 0)} icon="receipt" />
        <Stat label="IVA generado" value={cop(tax)} icon="account_balance" />
        <Stat label="Propinas" value={cop(tips)} icon="volunteer_activism" />
        <Stat label="Tasa de inasistencia" value={`${done.length ? Math.round(noShow / done.length * 100) : 0}%`} icon="event_busy" tone="danger" hint={`${noShow} no asistieron · ${cancel} canceladas`} />
      </div>
      <div className="grid xl:grid-cols-3 gap-4 mt-4">
        <section className="card p-5"><h2 className="h-section mb-3">Servicios más vendidos</h2><Bars rows={topSvc} /></section>
        <section className="card p-5"><h2 className="h-section mb-3">Productos más vendidos</h2>{topProd.length ? <Bars rows={topProd} /> : <p className="text-on-surface-variant">Sin ventas de productos.</p>}</section>
        <section className="card p-5"><h2 className="h-section mb-3">Medios de pago</h2><Bars rows={byMethod} /></section>
      </div>
      <section className="card p-5 mt-4 overflow-x-auto">
        <h2 className="h-section mb-3">Rendimiento por profesional</h2>
        <table className="table"><thead><tr><th>Profesional</th><th className="w-1/3">Ventas</th><th className="text-right">Servicios</th><th className="text-right">Comisión</th><th className="text-right">Citas</th><th className="text-right">Inasistencias</th></tr></thead>
          <tbody>{perf.map(p => <tr key={p.s.id}><td className="font-label-lg">{p.s.name}</td><td><div className="flex items-center gap-2"><div className="h-2 flex-1 rounded-full bg-surface-container"><div className="h-full rounded-full bg-gold" style={{ width: `${p.sales / maxPerf * 100}%` }} /></div><span className="tnum w-24 text-right">{cop(p.sales)}</span></div></td><td className="text-right tnum">{p.services}</td><td className="text-right tnum">{cop(p.com)}</td><td className="text-right tnum">{p.appts}</td><td className="text-right tnum">{p.noShow}</td></tr>)}</tbody></table>
      </section>
    </>
  );
}
