// Paquetes, membresías y tarjetas de regalo: lo que el cliente pagó por adelantado y va usando.
import type { Prisma } from '@prisma/client';
import { db } from './db';
import { parseJson } from './format';

export type Credit = { serviceId: string; name: string; total: number; used: number };
export type PlanItem = { serviceId: string; qty: number };
export const KIND_LABEL: Record<string, string> = { PAQUETE: 'Paquete', MEMBRESIA: 'Membresía', REGALO: 'Tarjeta de regalo' };
export const MEMBERSHIP_DAYS = 30;
export const GIFT_DAYS = 365;

const ALPH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
/** Código de tarjeta de regalo, fácil de dictar: XXXX-XXXX (sin 0/O ni 1/I). */
export function giftCode() {
  const b = crypto.getRandomValues(new Uint8Array(8));
  let s = ''; for (const x of b) s += ALPH[x % ALPH.length];
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}
export function normCode(s: string) {
  const t = s.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return t.length === 8 ? `${t.slice(0, 4)}-${t.slice(4)}` : t;
}

export function credits(p: { credits: string }) { return parseJson<Credit[]>(p.credits, []); }
export function prepaidState(p: { status: string; expiresAt: Date | null; kind: string; balance: number; credits: string }, now = new Date()) {
  if (p.status === 'ANULADO') return 'ANULADO';
  if (p.expiresAt && p.expiresAt < now) return 'VENCIDO';
  if (p.kind === 'REGALO' ? p.balance <= 0 : p.kind === 'PAQUETE' && credits(p).every(c => c.used >= c.total)) return 'AGOTADO';
  return 'ACTIVO';
}
export const STATE_TONE: Record<string, string> = { ACTIVO: 'bg-[#ECFDF5] text-[#065F46]', AGOTADO: 'bg-surface-container text-on-surface-variant', VENCIDO: 'bg-[#FFF7ED] text-[#9A3412]', ANULADO: 'bg-[#FFF1F2] text-danger' };

/** Paquetes y membresías vigentes de un cliente (para la caja y su ficha). */
export async function customerWallet(businessId: string, customerId: string) {
  const list = await db.prepaid.findMany({ where: { businessId, customerId, kind: { in: ['PAQUETE', 'MEMBRESIA'] }, status: { not: 'ANULADO' } }, orderBy: { createdAt: 'desc' } });
  return list.filter(p => prepaidState(p) === 'ACTIVO').map(p => ({ id: p.id, kind: p.kind, name: p.name, discountPct: p.discountPct, expiresAt: p.expiresAt?.toISOString() || null, credits: credits(p) }));
}
export type Wallet = Awaited<ReturnType<typeof customerWallet>>;

type Tx = Prisma.TransactionClient;
/** Descuenta sesiones del paquete o membresía. Lanza error si ya no le quedan. */
export async function useCredit(tx: Tx, o: { businessId: string; prepaidId: string; customerId: string | null; serviceId: string; quantity: number; saleId: string; amount: number; userName: string }) {
  const p = await tx.prepaid.findFirst({ where: { id: o.prepaidId, businessId: o.businessId } });
  if (!p || p.customerId !== o.customerId || prepaidState(p) !== 'ACTIVO') throw new Error('El paquete o la membresía ya no está vigente.');
  const cs = credits(p); const c = cs.find(x => x.serviceId === o.serviceId);
  if (!c || c.total - c.used < o.quantity) throw new Error(`A "${p.name}" no le quedan sesiones de ese servicio.`);
  c.used += o.quantity;
  const n = await tx.prepaid.updateMany({ where: { id: p.id, credits: p.credits }, data: { credits: JSON.stringify(cs) } });
  if (!n.count) throw new Error('El paquete cambió mientras cobrabas. Intenta de nuevo.');
  await tx.prepaidMove.create({ data: { businessId: o.businessId, prepaidId: p.id, type: 'USO', amount: o.amount, serviceId: o.serviceId, saleId: o.saleId, userName: o.userName, note: `${o.quantity} × ${c.name}` } });
}

/** Paga con saldo de tarjeta de regalo. */
export async function useGift(tx: Tx, o: { businessId: string; code: string; amount: number; saleId: string; userName: string }) {
  const p = await tx.prepaid.findFirst({ where: { code: normCode(o.code), businessId: o.businessId, kind: 'REGALO' } });
  if (!p) throw new Error('Tarjeta de regalo no encontrada.');
  const st = prepaidState(p);
  if (st !== 'ACTIVO') throw new Error(`La tarjeta de regalo está ${st.toLowerCase()}.`);
  const n = await tx.prepaid.updateMany({ where: { id: p.id, balance: { gte: o.amount } }, data: { balance: { decrement: o.amount } } });
  if (!n.count) throw new Error(`La tarjeta de regalo solo tiene $${p.balance.toLocaleString('es-CO')} de saldo.`);
  await tx.prepaidMove.create({ data: { businessId: o.businessId, prepaidId: p.id, type: 'USO', amount: o.amount, saleId: o.saleId, userName: o.userName } });
  return p.code!;
}

/** Al anular una venta, devuelve las sesiones y el saldo que se usaron en ella. */
export async function revertPrepaid(tx: Tx, businessId: string, saleId: string, userName: string) {
  const moves = await tx.prepaidMove.findMany({ where: { businessId, saleId, type: 'USO' } });
  for (const m of moves) {
    const p = await tx.prepaid.findFirst({ where: { id: m.prepaidId } }); if (!p) continue;
    if (p.kind === 'REGALO') await tx.prepaid.update({ where: { id: p.id }, data: { balance: { increment: m.amount } } });
    else {
      const cs = credits(p); const c = cs.find(x => x.serviceId === m.serviceId);
      const q = Number((m.note || '').split(' × ')[0]) || 1;
      if (c) { c.used = Math.max(0, c.used - q); await tx.prepaid.update({ where: { id: p.id }, data: { credits: JSON.stringify(cs) } }); }
    }
    await tx.prepaidMove.create({ data: { businessId, prepaidId: p.id, type: 'REVERSO', amount: m.amount, saleId, serviceId: m.serviceId, note: m.note, userName } });
  }
}
