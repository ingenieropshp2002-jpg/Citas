import Link from 'next/link';
import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
import { PageHeader } from '@/components/panel/PageHeader';
import { POS } from '@/components/panel/POS';
import { ActionForm } from '@/components/ui/ActionForm';
import { Drawer } from '@/components/ui/Drawer';
import { Icon } from '@/components/ui/Icon';
import { closeCash, openCash } from '../_actions/pos';
import { getConfig } from '@/lib/dian/issue';
import { cop, hm, METHOD_LABEL, time12 } from '@/lib/format';

export const metadata = { title: 'Caja' };
export default async function Caja({ searchParams }: { searchParams: Promise<{ cita?: string }> }) {
  const { business: b } = await requireBusiness('caja');
  const sp = await searchParams;
  const session = await db.cashSession.findFirst({ where: { businessId: b.id, closedAt: null }, include: { sales: { include: { payments: true } } } });
  if (!session) {
    const last = await db.cashSession.findFirst({ where: { businessId: b.id }, orderBy: { openedAt: 'desc' } });
    return (
      <>
        <PageHeader eyebrow="Punto de venta" title="Caja" actions={<Link href="/admin/caja/ventas" className="btn-ghost btn-sm">Ventas</Link>} />
        <div className="card-raised p-6 max-w-md">
          <Icon name="point_of_sale" className="text-secondary text-[36px]" />
          <h2 className="font-headline-sm text-headline-sm mt-2">Abrir caja</h2>
          <p className="text-on-surface-variant mb-4">Registra la base de efectivo para empezar a cobrar.</p>
          <ActionForm action={openCash} success="Caja abierta">
            <label className="block"><span className="label">Caja / terminal</span><input name="terminal" defaultValue={last?.terminal || 'CAJA-01'} className="input" /></label>
            <label className="block"><span className="label">Base en efectivo (COP)</span><input name="openingAmount" type="number" min={0} step={1000} defaultValue={200000} className="input" /></label>
            <button className="btn-primary w-full">Abrir caja</button>
          </ActionForm>
          {last?.closedAt && <p className="font-body-sm text-on-surface-variant mt-4">Último cierre: esperado {cop(last.expectedCash || 0)}, contado {cop(last.countedCash || 0)}, diferencia {cop(last.difference || 0)}.</p>}
        </div>
      </>
    );
  }
  const [services, products, staff, customers, cfg] = await Promise.all([
    db.service.findMany({ where: { businessId: b.id, active: true }, include: { staff: true }, orderBy: { name: 'asc' } }),
    db.product.findMany({ where: { businessId: b.id, active: true, kind: { in: ['VENTA', 'AMBOS'] } }, orderBy: { name: 'asc' } }),
    db.staff.findMany({ where: { businessId: b.id, active: true } }),
    db.customer.findMany({ where: { businessId: b.id }, select: { id: true, name: true, phone: true, docType: true, docNumber: true, email: true } }),
    getConfig(b.id)
  ]);
  let preset;
  if (sp.cita) {
    const a = await db.appointment.findFirst({ where: { id: sp.cita, businessId: b.id, saleId: null }, include: { services: true } });
    if (a) preset = { appointmentId: a.id, customerId: a.customerId, lines: a.services.map(s => ({ serviceId: s.serviceId, staffId: a.staffId, price: s.price })), deposit: a.depositStatus === 'PAGADO' ? a.depositAmount : 0, depositMethod: a.paymentMethod || 'NEQUI' };
  }
  const valid = session.sales.filter(s => s.status === 'PAGADA');
  const byMethod = valid.flatMap(s => s.payments).reduce<Record<string, number>>((a, p) => ({ ...a, [p.method]: (a[p.method] || 0) + p.amount }), {});
  const expected = session.openingAmount + (byMethod.EFECTIVO || 0);
  return (
    <>
      <PageHeader eyebrow={`${session.terminal} · abierta ${time12(hm(session.openedAt))} por ${session.cashierName}`} title="Caja" subtitle={`${valid.length} ventas · ${cop(valid.reduce((a, s) => a + s.total, 0))}`}
        actions={<>
          <Link href="/admin/caja/ventas" className="btn-ghost btn-sm"><Icon name="receipt" className="text-[18px]" />Ventas</Link>
          <Drawer title="Cierre de caja (arqueo)" triggerClass="btn-outline btn-sm" trigger={<><Icon name="lock" className="text-[18px]" />Cerrar caja</>}>
            <dl className="space-y-1 mb-4 tnum">
              <div className="flex justify-between"><dt>Base inicial</dt><dd>{cop(session.openingAmount)}</dd></div>
              {Object.entries(byMethod).map(([m, v]) => <div key={m} className="flex justify-between"><dt>{METHOD_LABEL[m] || m}</dt><dd>{cop(v)}</dd></div>)}
              <div className="flex justify-between font-title-md border-t border-parchment pt-1"><dt>Efectivo esperado en caja</dt><dd>{cop(expected)}</dd></div>
            </dl>
            <ActionForm action={closeCash} success="Caja cerrada">
              <label className="block"><span className="label">Efectivo contado</span><input name="countedCash" type="number" min={0} className="input" required /></label>
              <label className="block"><span className="label">Observaciones</span><textarea name="notes" className="input" rows={2} /></label>
              <button className="btn-primary w-full">Cerrar caja</button>
            </ActionForm>
          </Drawer>
        </>} />
      <POS posLimit={cfg.uvtValue * cfg.posMaxUvt} preset={preset}
        services={services.map(s => ({ id: s.id, name: s.name, price: s.price, taxRate: s.taxRate, category: s.category, staffIds: s.staff.map(x => x.staffId) }))}
        products={products.map(p => ({ id: p.id, name: p.name, price: p.price, taxRate: p.taxRate, stock: p.stock, sku: p.sku, barcode: p.barcode, category: p.category }))}
        staff={staff.map(s => ({ id: s.id, name: s.name }))} customers={customers} />
    </>
  );
}
