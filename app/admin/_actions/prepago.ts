'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
import { credits, GIFT_DAYS, giftCode, MEMBERSHIP_DAYS, prepaidState, type Credit, type PlanItem } from '@/lib/prepago';
import { parseJson } from '@/lib/format';

const int = (v: unknown, d = 0) => { const n = Number(String(v ?? '').replace(/[^\d-]/g, '')); return Number.isFinite(n) && String(v ?? '').trim() !== '' ? Math.round(n) : d; };
const METHODS = ['EFECTIVO', 'TARJETA', 'NEQUI', 'DAVIPLATA', 'TRANSFERENCIA', 'PSE'];
const DAY = 86400_000;

/** Caja abierta (si el pago es en efectivo, es obligatoria para que cuadre el arqueo). */
async function cashFor(businessId: string, method: string) {
  const s = await db.cashSession.findFirst({ where: { businessId, closedAt: null }, select: { id: true } });
  if (method === 'EFECTIVO' && !s) throw new Error('Abre la caja para recibir pagos en efectivo.');
  return s?.id || null;
}

export async function savePlan(_: unknown, fd: FormData) {
  const { business } = await requireBusiness('caja');
  const id = String(fd.get('id') || '');
  const kind = fd.get('kind') === 'MEMBRESIA' ? 'MEMBRESIA' : 'PAQUETE';
  const services = await db.service.findMany({ where: { businessId: business.id }, select: { id: true } });
  const items: PlanItem[] = services.map(s => ({ serviceId: s.id, qty: Math.min(100, Math.max(0, int(fd.get(`qty_${s.id}`)))) })).filter(x => x.qty > 0);
  const data = {
    kind, name: String(fd.get('name') || '').trim().slice(0, 80), description: String(fd.get('description') || '').trim().slice(0, 300) || null,
    price: Math.max(0, int(fd.get('price'))), items: JSON.stringify(items),
    validityDays: kind === 'MEMBRESIA' ? MEMBERSHIP_DAYS : Math.min(730, Math.max(1, int(fd.get('validityDays'), 90))),
    discountPct: Math.min(100, Math.max(0, int(fd.get('discountPct')))), active: fd.get('active') !== null || !id
  };
  if (!data.name || !data.price) return { error: 'Escribe el nombre y el precio.' };
  if (!items.length && !data.discountPct) return { error: kind === 'PAQUETE' ? 'Indica cuántas sesiones de cada servicio incluye.' : 'Incluye sesiones o un % de descuento.' };
  if (id) await db.prepaidPlan.updateMany({ where: { id, businessId: business.id }, data });
  else await db.prepaidPlan.create({ data: { ...data, businessId: business.id } });
  revalidatePath('/admin/paquetes');
  return { ok: true };
}

async function planCredits(businessId: string, items: string): Promise<Credit[]> {
  const list = parseJson<PlanItem[]>(items, []);
  const svcs = await db.service.findMany({ where: { businessId, id: { in: list.map(i => i.serviceId) } }, select: { id: true, name: true } });
  return list.flatMap(i => { const s = svcs.find(x => x.id === i.serviceId); return s ? [{ serviceId: s.id, name: s.name, total: i.qty, used: 0 }] : []; });
}

/** Vende un paquete o una membresía a un cliente. */
export async function sellPlan(_: unknown, fd: FormData) {
  const { business, user } = await requireBusiness('caja');
  const plan = await db.prepaidPlan.findFirst({ where: { id: String(fd.get('planId')), businessId: business.id, active: true } });
  if (!plan) return { error: 'Plan no encontrado.' };
  const customer = await db.customer.findFirst({ where: { id: String(fd.get('customerId') || ''), businessId: business.id }, select: { id: true, name: true } });
  if (!customer) return { error: 'Elige el cliente.' };
  const method = METHODS.includes(String(fd.get('method'))) ? String(fd.get('method')) : 'EFECTIVO';
  let cash: string | null; try { cash = await cashFor(business.id, method); } catch (e) { return { error: (e as Error).message }; }
  const now = new Date();
  const cs = await planCredits(business.id, plan.items); // fuera de la transacción: en Workers hay una sola conexión
  const p = await db.$transaction(async tx => {
    const p = await tx.prepaid.create({ data: {
      businessId: business.id, kind: plan.kind, planId: plan.id, customerId: customer.id, name: plan.name, price: plan.price,
      credits: JSON.stringify(cs), discountPct: plan.discountPct, startsAt: now,
      expiresAt: new Date(now.getTime() + (plan.kind === 'MEMBRESIA' ? MEMBERSHIP_DAYS : plan.validityDays) * DAY)
    } });
    await tx.prepaidMove.create({ data: { businessId: business.id, prepaidId: p.id, type: 'VENTA', amount: plan.price, method, cashSessionId: cash, userName: user.name, note: customer.name } });
    await tx.customer.update({ where: { id: customer.id }, data: { totalSpent: { increment: plan.price } } });
    return p;
  });
  revalidatePath('/admin/paquetes'); revalidatePath('/admin/caja');
  redirect(`/admin/paquetes/${p.id}`);
}

/** Vende una tarjeta de regalo con saldo en dinero. */
export async function sellGift(_: unknown, fd: FormData) {
  const { business, user } = await requireBusiness('caja');
  const amount = int(fd.get('amount'));
  if (amount < 10000) return { error: 'El valor mínimo es $10.000.' };
  if (amount > 5_000_000) return { error: 'El valor máximo es $5.000.000.' };
  const method = METHODS.includes(String(fd.get('method'))) ? String(fd.get('method')) : 'EFECTIVO';
  let cash: string | null; try { cash = await cashFor(business.id, method); } catch (e) { return { error: (e as Error).message }; }
  const t = (k: string, n = 80) => String(fd.get(k) || '').trim().slice(0, n) || null;
  const days = Math.min(730, Math.max(30, int(fd.get('days'), GIFT_DAYS)));
  let p = null;
  for (let i = 0; i < 5 && !p; i++) {
    const code = giftCode();
    if (await db.prepaid.findFirst({ where: { code }, select: { id: true } })) continue;
    p = await db.$transaction(async tx => {
      const p = await tx.prepaid.create({ data: {
        businessId: business.id, kind: 'REGALO', code, name: `Tarjeta de regalo ${code}`, price: amount, balance: amount,
        buyerName: t('buyerName'), recipientName: t('recipientName'), recipientPhone: (t('recipientPhone', 20) || '').replace(/\D/g, '') || null, message: t('message', 300),
        expiresAt: new Date(Date.now() + days * DAY)
      } });
      await tx.prepaidMove.create({ data: { businessId: business.id, prepaidId: p.id, type: 'VENTA', amount, method, cashSessionId: cash, userName: user.name, note: p.buyerName } });
      return p;
    });
  }
  if (!p) return { error: 'No se pudo generar el código. Intenta de nuevo.' };
  revalidatePath('/admin/paquetes'); revalidatePath('/admin/caja');
  redirect(`/admin/paquetes/${p.id}`);
}

/** Renueva la membresía un mes más: se cobra de nuevo y las sesiones vuelven a empezar. */
export async function renewMembership(_: unknown, fd: FormData) {
  const { business, user } = await requireBusiness('caja');
  const p = await db.prepaid.findFirst({ where: { id: String(fd.get('id')), businessId: business.id, kind: 'MEMBRESIA' } });
  if (!p || p.status === 'ANULADO') return { error: 'Membresía no encontrada.' };
  const plan = p.planId ? await db.prepaidPlan.findFirst({ where: { id: p.planId } }) : null;
  const price = plan?.price ?? p.price;
  const method = METHODS.includes(String(fd.get('method'))) ? String(fd.get('method')) : 'EFECTIVO';
  let cash: string | null; try { cash = await cashFor(business.id, method); } catch (e) { return { error: (e as Error).message }; }
  const base = Math.max(Date.now(), p.expiresAt?.getTime() || 0);
  const cs = plan ? await planCredits(business.id, plan.items) : credits(p).map(c => ({ ...c, used: 0 }));
  await db.$transaction([
    db.prepaid.update({ where: { id: p.id }, data: { credits: JSON.stringify(cs), price, discountPct: plan?.discountPct ?? p.discountPct, startsAt: new Date(Math.max(Date.now(), p.expiresAt?.getTime() || 0)), expiresAt: new Date(base + MEMBERSHIP_DAYS * DAY), status: 'ACTIVO' } }),
    db.prepaidMove.create({ data: { businessId: business.id, prepaidId: p.id, type: 'RENOVACION', amount: price, method, cashSessionId: cash, userName: user.name } }),
    ...(p.customerId ? [db.customer.update({ where: { id: p.customerId }, data: { totalSpent: { increment: price } } })] : [])
  ]);
  revalidatePath(`/admin/paquetes/${p.id}`); revalidatePath('/admin/caja');
  return { ok: true, message: 'Membresía renovada por 30 días' };
}

export async function voidPrepaid(fd: FormData) {
  const { business, user } = await requireBusiness('caja');
  const p = await db.prepaid.findFirst({ where: { id: String(fd.get('id')), businessId: business.id } });
  if (!p || prepaidState(p) === 'ANULADO') return { error: 'No encontrado.' };
  const reason = String(fd.get('reason') || '').trim().slice(0, 200);
  if (!reason) return { error: 'Escribe el motivo.' };
  await db.$transaction([
    db.prepaid.update({ where: { id: p.id }, data: { status: 'ANULADO' } }),
    db.prepaidMove.create({ data: { businessId: business.id, prepaidId: p.id, type: 'ANULACION', note: reason, userName: user.name } })
  ]);
  revalidatePath(`/admin/paquetes/${p.id}`); revalidatePath('/admin/paquetes');
  return { ok: true };
}
