// Comisiones del equipo: lo que le toca a cada profesional por servicios, ventas de productos y propinas, y su liquidación.
import { db } from './db';
import { fromBogota } from './format';

export type StaffCommission = {
  staffId: string; name: string; color: string; photo: string | null;
  servicesCount: number; servicesBase: number; servicesCommission: number;
  productsCount: number; productsBase: number; productsCommission: number;
  tips: number; total: number; itemIds: string[];
};

/** Comisiones pendientes por pagar (no liquidadas) de ventas pagadas entre dos fechas (AAAA-MM-DD, hora Colombia). */
export async function pendingCommissions(businessId: string, from: string, to: string, staffId?: string | null) {
  const items = await db.saleItem.findMany({
    where: { payoutId: null, staffId: staffId ? staffId : { not: null }, sale: { businessId, status: 'PAGADA', createdAt: { gte: fromBogota(from), lte: fromBogota(to, '23:59') } } },
    include: { sale: { select: { id: true, tip: true, items: { select: { kind: true, base: true, staffId: true } } } } }
  });
  const staff = await db.staff.findMany({ where: { businessId, ...(staffId ? { id: staffId } : {}) }, orderBy: { name: 'asc' }, select: { id: true, name: true, color: true, photo: true, active: true } });
  const out = new Map<string, StaffCommission>();
  for (const s of staff) out.set(s.id, { staffId: s.id, name: s.name, color: s.color, photo: s.photo, servicesCount: 0, servicesBase: 0, servicesCommission: 0, productsCount: 0, productsBase: 0, productsCommission: 0, tips: 0, total: 0, itemIds: [] });
  for (const it of items) {
    const o = out.get(it.staffId!); if (!o) continue;
    o.itemIds.push(it.id);
    if (it.kind === 'SERVICIO') {
      o.servicesCount += Math.round(it.quantity); o.servicesBase += it.base; o.servicesCommission += it.commission;
      // La propina de la venta se reparte entre los profesionales según el valor de los servicios que hizo cada uno.
      const svcBase = it.sale.items.filter(x => x.kind === 'SERVICIO' && x.staffId).reduce((a, x) => a + x.base, 0);
      if (it.sale.tip > 0 && svcBase > 0) o.tips += Math.round(it.sale.tip * it.base / svcBase);
    } else { o.productsCount += Math.round(it.quantity); o.productsBase += it.base; o.productsCommission += it.commission; }
  }
  const list = [...out.values()].map(o => ({ ...o, total: o.servicesCommission + o.productsCommission + o.tips }));
  return list.filter(o => o.itemIds.length || staff.find(s => s.id === o.staffId)?.active);
}
