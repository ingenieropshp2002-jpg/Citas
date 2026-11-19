'use server';
import { earnPoints, revertPoints } from '@/lib/loyalty';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
import { computeLine, summarize } from '@/lib/tax';
import { consumeSupplies, moveStock } from '@/lib/inventory';
import { creditNote, issueForSale, transmit, Buyer } from '@/lib/dian/issue';
import { customerWallet, revertPrepaid, useCredit, useGift } from '@/lib/prepago';

const int = (v: unknown, d = 0) => { const n = Number(String(v ?? '').replace(/[^\d.-]/g, '')); return Number.isFinite(n) ? Math.round(n) : d; };

export async function openCash(_: unknown, fd: FormData) {
  const { business, user } = await requireBusiness('caja');
  const open = await db.cashSession.findFirst({ where: { businessId: business.id, closedAt: null } });
  if (open) return { error: 'Ya hay una caja abierta.' };
  await db.cashSession.create({ data: { businessId: business.id, terminal: String(fd.get('terminal') || 'CAJA-01'), cashierName: user.name, openingAmount: int(fd.get('openingAmount')) } });
  revalidatePath('/admin/caja');
  return { ok: true };
}

export async function closeCash(_: unknown, fd: FormData) {
  const { business } = await requireBusiness('caja');
  const s = await db.cashSession.findFirst({ where: { businessId: business.id, closedAt: null }, include: { sales: { where: { status: 'PAGADA' }, include: { payments: true } } } });
  if (!s) return { error: 'No hay caja abierta.' };
  const prepaidCash = await db.prepaidMove.aggregate({ where: { businessId: business.id, cashSessionId: s.id, type: { in: ['VENTA', 'RENOVACION'] }, method: 'EFECTIVO' }, _sum: { amount: true } });
  const cash = s.sales.flatMap(x => x.payments).filter(p => p.method === 'EFECTIVO').reduce((a, p) => a + p.amount, 0) + (prepaidCash._sum.amount || 0);
  const expected = s.openingAmount + cash; const counted = int(fd.get('countedCash'));
  await db.cashSession.update({ where: { id: s.id }, data: { closedAt: new Date(), expectedCash: expected, countedCash: counted, difference: counted - expected, notes: String(fd.get('notes') || '') || null } });
  revalidatePath('/admin/caja');
  return { ok: true, expected, difference: counted - expected };
}

export type CartItem = { kind: 'SERVICIO' | 'PRODUCTO'; id: string; quantity: number; unitPrice: number; discount: number; staffId?: string | null; prepaidId?: string | null };
export type CheckoutInput = {
  items: CartItem[]; customerId?: string | null; appointmentId?: string | null; tip: number; couponCode?: string;
  payments: { method: string; amount: number; received?: number; ref?: string }[];
  wantsInvoice: boolean; buyer?: Buyer | null;
};

export async function checkout(input: CheckoutInput) {
  const { business, user } = await requireBusiness('caja');
  const session = await db.cashSession.findFirst({ where: { businessId: business.id, closedAt: null } });
  if (!session) return { error: 'Abre la caja antes de cobrar.' };
  if (!input.items.length) return { error: 'Agrega al menos un ítem.' };

  // Precios y tasas se toman de la base de datos (no del navegador)
  const lines = [] as any[];
  for (const it of input.items) {
    const qty = Math.max(0.001, Number(it.quantity));
    if (it.kind === 'SERVICIO') {
      const s = await db.service.findFirst({ where: { id: it.id, businessId: business.id } });
      if (!s) return { error: 'Servicio no encontrado' };
      const staff = it.staffId ? await db.staff.findFirst({ where: { id: it.staffId, businessId: business.id } }) : null;
      const unitPrice = it.unitPrice > 0 ? int(it.unitPrice) : s.price; // permite precio ajustado (p. ej. cabello largo)
      const c = computeLine({ unitPrice, quantity: qty, discount: int(it.discount), taxRate: s.taxRate });
      lines.push({ prepaidId: it.prepaidId || null, kind: 'SERVICIO', serviceId: s.id, staffId: staff?.id, description: s.name, code: 'S-' + s.id.slice(-6).toUpperCase(), unit: 'E48', quantity: qty, unitPrice, discount: int(it.discount), taxRate: s.taxRate, ...c, commission: staff ? Math.round(c.base * (s.commissionPct ?? staff.commissionPct) / 100) : 0 });
    } else {
      const p = await db.product.findFirst({ where: { id: it.id, businessId: business.id } });
      if (!p) return { error: 'Producto no encontrado' };
      if (p.stock < qty) return { error: `Stock insuficiente de ${p.name} (disponible: ${p.stock}).` };
      const c = computeLine({ unitPrice: p.price, quantity: qty, discount: int(it.discount), taxRate: p.taxRate });
      const seller = it.staffId ? await db.staff.findFirst({ where: { id: it.staffId, businessId: business.id }, select: { id: true, productCommissionPct: true } }) : null;
      lines.push({ kind: 'PRODUCTO', productId: p.id, staffId: seller?.id || null, description: p.name, code: p.sku, unit: p.unit === 'UND' ? '94' : p.unit, quantity: qty, unitPrice: p.price, discount: int(it.discount), taxRate: p.taxRate, ...c, commission: seller ? Math.round(c.base * seller.productCommissionPct / 100) : 0 });
    }
  }
  // Cupón: se reparte como descuento proporcional en las líneas (afecta la base del IVA)
  let couponCode: string | undefined;
  if (input.couponCode) {
    const cp = await db.coupon.findFirst({ where: { businessId: business.id, code: input.couponCode.toUpperCase(), active: true } });
    if (!cp || (cp.validUntil && cp.validUntil < new Date()) || (cp.maxUses && cp.uses >= cp.maxUses)) return { error: 'Cupón no válido' };
    const gross = lines.reduce((a, l) => a + l.total, 0);
    const disc = cp.type === 'PORCENTAJE' ? Math.round(gross * cp.value / 100) : Math.min(cp.value, gross);
    let left = disc;
    lines.forEach((l, i) => { const d = i === lines.length - 1 ? left : Math.round(disc * l.total / gross); left -= d; const c = computeLine({ unitPrice: l.unitPrice, quantity: l.quantity, discount: l.discount + d, taxRate: l.taxRate }); Object.assign(l, { discount: l.discount + d, ...c, commission: l.base > 0 ? Math.round(l.commission * c.base / l.base) : 0 }); });
    couponCode = cp.code;
  }
  const sum = summarize(lines);
  const tip = Math.max(0, int(input.tip));
  const total = sum.total + tip;
  // Servicios que se descuentan de un paquete o membresía: ya estaban pagados por adelantado.
  if (lines.some(l => l.prepaidId) && !input.customerId) return { error: 'Elige el cliente para usar su paquete.' };
  const covered = new Map<string, number>();
  for (const l of lines) if (l.prepaidId) covered.set(l.prepaidId, (covered.get(l.prepaidId) || 0) + l.total);
  const coveredTotal = [...covered.values()].reduce((a, v) => a + v, 0);
  const pays = input.payments.filter(p => int(p.amount) > 0);
  if (pays.some(p => p.method === 'REGALO' && !String(p.ref || '').trim())) return { error: 'Escribe el código de la tarjeta de regalo.' };
  const paid = pays.reduce((a, p) => a + int(p.amount), 0);
  if (paid + coveredTotal !== total) return { error: `Los pagos (${paid + coveredTotal}) no suman el total (${total}).` };
  const discountTotal = lines.reduce((a, l) => a + l.discount, 0);

  let sale;
  try { sale = await db.$transaction(async tx => {
    const last = await tx.sale.findFirst({ where: { businessId: business.id }, orderBy: { number: 'desc' } });
    const sale = await tx.sale.create({ data: {
      businessId: business.id, number: (last?.number || 0) + 1, customerId: input.customerId || null, cashSessionId: session.id, cashierName: user.name,
      subtotal: sum.subtotal, discount: discountTotal, taxTotal: sum.taxTotal, tip, total, couponCode,
      items: { create: lines.map(l => ({ kind: l.kind, serviceId: l.serviceId, productId: l.productId, staffId: l.staffId, description: l.description, code: l.code, unit: l.unit, quantity: l.quantity, unitPrice: l.unitPrice, discount: l.discount, taxRate: l.taxRate, base: l.base, taxAmount: l.taxAmount, total: l.total, commission: l.commission })) },
      payments: { create: [
        ...pays.map(p => ({ businessId: business.id, method: p.method, amount: int(p.amount), providerRef: p.method === 'REGALO' ? String(p.ref).trim().toUpperCase() : null, received: p.method === 'EFECTIVO' ? int(p.received || p.amount) : null, change: p.method === 'EFECTIVO' ? Math.max(0, int(p.received || p.amount) - int(p.amount)) : null })),
        ...[...covered].map(([id, amount]) => ({ businessId: business.id, method: 'PAQUETE', amount, providerRef: id }))
      ] }
    } });
    for (const l of lines.filter(l => l.prepaidId)) await useCredit(tx, { businessId: business.id, prepaidId: l.prepaidId, customerId: input.customerId || null, serviceId: l.serviceId, quantity: Math.round(l.quantity), saleId: sale.id, amount: l.total, userName: user.name });
    for (const p of pays.filter(p => p.method === 'REGALO')) await useGift(tx, { businessId: business.id, code: String(p.ref), amount: int(p.amount), saleId: sale.id, userName: user.name });
    for (const l of lines.filter(l => l.kind === 'PRODUCTO')) await moveStock(tx, { businessId: business.id, productId: l.productId, type: 'VENTA', quantity: -l.quantity, reference: `Venta #${sale.number}`, userName: user.name });
    if (couponCode) await tx.coupon.updateMany({ where: { businessId: business.id, code: couponCode }, data: { uses: { increment: 1 } } });
    if (input.appointmentId) {
      const a = await tx.appointment.findFirst({ where: { id: input.appointmentId, businessId: business.id }, include: { services: true } });
      if (a) {
        if (a.status !== 'COMPLETADA') await consumeSupplies(tx, business.id, a.services.map(s => s.serviceId), a.code);
        await tx.appointment.update({ where: { id: a.id }, data: { status: 'COMPLETADA', saleId: sale.id } });
      }
    }
    if (input.customerId) {
      await tx.customer.update({ where: { id: input.customerId }, data: { totalSpent: { increment: total }, visits: { increment: 1 }, lastVisit: new Date() } });
      await earnPoints(tx, business, input.customerId, total - tip - coveredTotal, sale.id, sale.number);
    }
    return sale;
  }); } catch (e) { return { error: (e as Error).message }; }

  // Documento electrónico (POS o factura). Si falla (p. ej. sin resolución), la venta queda registrada y se puede emitir luego.
  let docError: string | undefined;
  try { await issueForSale(sale.id, { buyer: input.buyer, wantsInvoice: input.wantsInvoice }); } catch (e) { docError = (e as Error).message; }
  revalidatePath('/admin/caja'); revalidatePath('/admin/inventario');
  return { ok: true, saleId: sale.id, docError };
}

export async function emitPending(saleId: string, wantsInvoice: boolean) {
  const { business } = await requireBusiness('facturacion');
  const sale = await db.sale.findFirst({ where: { id: saleId, businessId: business.id }, include: { documents: true, customer: true } });
  if (!sale) return { error: 'Venta no encontrada' };
  if (sale.documents.some(d => d.docType !== 'NC')) return { error: 'La venta ya tiene documento electrónico.' };
  const buyer = sale.customer?.docNumber ? { docType: sale.customer.docType, docNumber: sale.customer.docNumber, name: sale.customer.name, email: sale.customer.email, phone: sale.customer.phone } : null;
  try { await issueForSale(sale.id, { buyer, wantsInvoice }); } catch (e) { return { error: (e as Error).message }; }
  revalidatePath(`/admin/caja/ventas/${saleId}`);
  return { ok: true };
}

export async function voidSale(saleId: string, reason: string) {
  const { business, user } = await requireBusiness('caja');
  const sale = await db.sale.findFirst({ where: { id: saleId, businessId: business.id }, include: { items: true, documents: true } });
  if (!sale || sale.status === 'ANULADA') return { error: 'Venta no encontrada o ya anulada.' };
  if (!reason.trim()) return { error: 'Indica el motivo de la anulación.' };
  const doc = sale.documents.find(d => d.docType !== 'NC');
  if (doc) { try { await creditNote(doc.id, reason); } catch (e) { return { error: (e as Error).message }; } }
  await db.$transaction(async tx => {
    for (const it of sale.items.filter(i => i.productId)) await moveStock(tx, { businessId: business.id, productId: it.productId!, type: 'DEVOLUCION', quantity: it.quantity, reference: `Anulación venta #${sale.number}`, userName: user.name, note: reason });
    await tx.sale.update({ where: { id: sale.id }, data: { status: 'ANULADA' } });
    await tx.payment.updateMany({ where: { saleId: sale.id }, data: { status: 'REEMBOLSADO' } });
    if (sale.customerId) await tx.customer.update({ where: { id: sale.customerId }, data: { totalSpent: { decrement: sale.total } } });
    await revertPoints(tx, business.id, sale.id);
    await revertPrepaid(tx, business.id, sale.id, user.name);
  });
  revalidatePath(`/admin/caja/ventas/${saleId}`); revalidatePath('/admin/facturacion');
  return { ok: true };
}

export async function retransmit(docId: string) {
  const { business } = await requireBusiness('facturacion');
  const d = await db.electronicDocument.findFirst({ where: { id: docId, businessId: business.id } });
  if (!d) return { error: 'Documento no encontrado' };
  await transmit(d.id);
  revalidatePath('/admin/facturacion');
  return { ok: true };
}

/** Paquetes y membresías vigentes del cliente elegido en la caja. */
export async function posWallet(customerId: string) {
  const { business } = await requireBusiness('caja');
  return customerWallet(business.id, customerId);
}
