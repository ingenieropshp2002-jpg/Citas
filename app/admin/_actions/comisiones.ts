'use server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
import { pendingCommissions } from '@/lib/comisiones';

const day = (v: FormDataEntryValue | null) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : '');

/** Liquidar: registra el pago de las comisiones pendientes del período y las marca como pagadas. */
export async function liquidarComisiones(_: unknown, fd: FormData) {
  const { business, user } = await requireBusiness('equipo');
  const staffId = String(fd.get('staffId') || ''); const from = day(fd.get('from')); const to = day(fd.get('to'));
  if (!staffId || !from || !to || from > to) return { error: 'Revisa el período.' };
  const [p] = await pendingCommissions(business.id, from, to, staffId);
  if (!p || !p.itemIds.length) return { error: 'No hay comisiones pendientes en ese período.' };
  const adjustment = Math.round(Number(String(fd.get('adjustment') || '0').replace(/[^\d-]/g, '')) || 0);
  const total = p.total + adjustment;
  if (total < 0) return { error: 'El descuento no puede ser mayor que lo que se va a pagar.' };
  await db.$transaction(async tx => {
    const payout = await tx.commissionPayout.create({ data: {
      businessId: business.id, staffId, staffName: p.name, fromDate: from, toDate: to, servicesCount: p.servicesCount, servicesBase: p.servicesBase,
      servicesCommission: p.servicesCommission, productsCommission: p.productsCommission, tips: p.tips, adjustment, total,
      method: String(fd.get('method') || 'EFECTIVO'), notes: String(fd.get('notes') || '').trim().slice(0, 300) || null, createdBy: user.name
    } });
    // Solo se marcan las que siguen pendientes (si otra persona liquidó al tiempo, no se paga dos veces).
    const r = await tx.saleItem.updateMany({ where: { id: { in: p.itemIds }, payoutId: null }, data: { payoutId: payout.id } });
    if (r.count !== p.itemIds.length) throw new Error('Estas comisiones ya se liquidaron. Recarga la página.');
  });
  revalidatePath('/admin/equipo/comisiones'); revalidatePath('/admin/equipo');
  return { ok: true };
}

/** Anular una liquidación: las comisiones vuelven a quedar pendientes. */
export async function anularLiquidacion(fd: FormData) {
  const { business } = await requireBusiness('equipo');
  const id = String(fd.get('id') || '');
  const p = await db.commissionPayout.findFirst({ where: { id, businessId: business.id } });
  if (!p) return { error: 'No encontrada.' };
  await db.$transaction([db.saleItem.updateMany({ where: { payoutId: id }, data: { payoutId: null } }), db.commissionPayout.delete({ where: { id } })]);
  revalidatePath('/admin/equipo/comisiones');
  return { ok: true };
}
