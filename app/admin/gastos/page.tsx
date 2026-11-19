import Link from 'next/link';
import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
import { PageHeader, Stat } from '@/components/panel/PageHeader';
import { ActionForm } from '@/components/ui/ActionForm';
import { Drawer } from '@/components/ui/Drawer';
import { ConfirmButton } from '@/components/ui/Confirm';
import { Empty } from '@/components/ui/Empty';
import { Icon } from '@/components/ui/Icon';
import { cop, fechaCorta, fromBogota, MESES, METHOD_LABEL, ymd } from '@/lib/format';
import { EXPENSE_CATEGORIES } from '@/lib/expenses';
import { deleteExpense, saveExpense } from '../_actions/expenses';

export const metadata = { title: 'Gastos' };
const pad = (n: number) => String(n).padStart(2, '0');
export default async function Gastos({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { business: b } = await requireBusiness('gastos');
  const today = ymd(new Date());
  const mes = /^\d{4}-\d{2}$/.test((await searchParams).mes || '') ? (await searchParams).mes! : today.slice(0, 7);
  const [y, m] = mes.split('-').map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${pad(m + 1)}`; const prev = m === 1 ? `${y - 1}-12` : `${y}-${pad(m - 1)}`;
  const range = { gte: fromBogota(`${mes}-01`), lt: fromBogota(`${next}-01`) };
  const [expenses, sales] = await Promise.all([
    db.expense.findMany({ where: { businessId: b.id, date: range }, orderBy: { date: 'desc' } }),
    db.sale.findMany({ where: { businessId: b.id, status: 'PAGADA', createdAt: range }, select: { total: true, tip: true } })
  ]);
  const income = sales.reduce((a, s) => a + s.total - s.tip, 0);
  const spent = expenses.reduce((a, e) => a + e.amount, 0);
  const profit = income - spent;
  const byCat = Object.entries(expenses.reduce<Record<string, number>>((acc, e) => { acc[e.category] = (acc[e.category] || 0) + e.amount; return acc; }, {})).sort((a, c) => c[1] - a[1]);
  const max = Math.max(...byCat.map(c => c[1]), 1);
  return (
    <>
      <PageHeader eyebrow="Finanzas" title="Gastos" subtitle={`${MESES[m - 1][0].toUpperCase() + MESES[m - 1].slice(1)} de ${y}`} actions={<>
        <Link href={`/admin/gastos?mes=${prev}`} className="btn-ghost btn-sm" aria-label="Mes anterior"><Icon name="chevron_left" /></Link>
        <Link href={`/admin/gastos?mes=${next}`} className="btn-ghost btn-sm" aria-label="Mes siguiente"><Icon name="chevron_right" /></Link>
        <Drawer title="Registrar gasto" trigger={<><Icon name="add" className="text-[18px]" />Nuevo gasto</>}>
          <ActionForm action={saveExpense} resetOnSuccess success="Gasto registrado">
            <div className="grid grid-cols-2 gap-3">
              <label><span className="label">Fecha</span><input type="date" name="date" defaultValue={today} className="input" required /></label>
              <label><span className="label">Valor</span><input name="amount" inputMode="numeric" className="input" placeholder="$ 0" required /></label>
            </div>
            <label className="block"><span className="label">Categoría</span><select name="category" className="input">{Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <label className="block"><span className="label">Descripción</span><input name="description" className="input" placeholder="Ej. Arriendo de noviembre" required /></label>
            <div className="grid grid-cols-2 gap-3">
              <label><span className="label">Medio de pago</span><select name="method" className="input">{['EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'NEQUI', 'DAVIPLATA', 'PSE'].map(k => <option key={k} value={k}>{METHOD_LABEL[k]}</option>)}</select></label>
              <label><span className="label">Proveedor (opcional)</span><input name="supplier" className="input" /></label>
            </div>
            <label className="block"><span className="label">N.º de factura o soporte (opcional)</span><input name="receipt" className="input" /></label>
            <button className="btn-primary w-full">Guardar gasto</button>
          </ActionForm>
        </Drawer>
      </>} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <Stat label="Ingresos del mes" value={cop(income)} icon="trending_up" hint={`${sales.length} ventas en caja (sin propinas)`} />
        <Stat label="Gastos del mes" value={cop(spent)} icon="trending_down" tone="danger" hint={`${expenses.length} registros`} />
        <Stat label="Utilidad" value={cop(profit)} icon="savings" tone={profit >= 0 ? 'gold' : 'danger'} hint={income ? `Margen ${Math.round(profit / income * 100)}%` : 'Ingresos − gastos'} />
      </div>
      <div className="grid xl:grid-cols-3 gap-4">
        <section className="card p-5 xl:col-span-2 overflow-x-auto">
          <h2 className="h-section mb-3">Movimientos</h2>
          {expenses.length === 0 ? <Empty icon="request_quote" title="Sin gastos este mes" text="Registra arriendo, servicios, nómina, insumos y demás para conocer tu utilidad real." /> : (
            <table className="table"><thead><tr><th>Fecha</th><th>Descripción</th><th>Categoría</th><th>Pago</th><th className="text-right">Valor</th><th /></tr></thead>
              <tbody>{expenses.map(e => (
                <tr key={e.id}><td className="whitespace-nowrap">{fechaCorta(e.date)}</td><td><p className="font-label-lg">{e.description}</p>{(e.supplier || e.receipt) && <p className="font-body-sm text-on-surface-variant">{[e.supplier, e.receipt && `Soporte ${e.receipt}`].filter(Boolean).join(' · ')}</p>}</td>
                  <td>{EXPENSE_CATEGORIES[e.category] || e.category}</td><td>{METHOD_LABEL[e.method] || e.method}</td><td className="text-right tnum">{cop(e.amount)}</td>
                  <td><ConfirmButton action={deleteExpense} title="¿Eliminar este gasto?" text={`${e.description} · ${cop(e.amount)}`} confirmLabel="Eliminar" className="btn-ghost btn-sm" fields={<input type="hidden" name="id" value={e.id} />}><Icon name="delete" className="text-[18px] text-danger" /></ConfirmButton></td></tr>
              ))}</tbody></table>
          )}
        </section>
        <section className="card p-5">
          <h2 className="h-section mb-3">Gastos por categoría</h2>
          {byCat.length ? <ul className="space-y-2.5">{byCat.map(([k, v]) => <li key={k}><div className="flex justify-between font-label-md"><span>{EXPENSE_CATEGORIES[k] || k}</span><span className="tnum">{cop(v)}</span></div><div className="h-2 mt-1 rounded-full bg-surface-container"><div className="h-full rounded-full bg-danger/70" style={{ width: `${v / max * 100}%` }} /></div></li>)}</ul> : <p className="text-on-surface-variant">Aún no hay gastos.</p>}
          <p className="mt-4 font-body-sm text-on-surface-variant">Las compras de productos registradas como entrada de inventario no se suman aquí automáticamente; regístralas como gasto cuando las pagues.</p>
        </section>
      </div>
    </>
  );
}
