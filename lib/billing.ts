// Renovación automática de la suscripción de cada negocio.
// - Wompi: la tarjeta queda guardada como fuente de pago y el cron la cobra cuando vence el plan o la prueba.
// - Mercado Pago: suscripción (preapproval); Mercado Pago cobra solo y avisa por el webhook.
// - Simulado: igual que Wompi pero el cobro se aprueba solo (para probar sin llaves).
import { db } from './db';
import { getSettings, yearPrice } from './settings';
import { getPay, mpAuthorizedPayment, mpPreapproval, wompiCharge } from './payments';
import { pushToUsers } from './push';

export const MAX_FAILS = 3;
const RETRY_MS = 20 * 3600e3; // un intento al día como máximo
const AHEAD_MS = 12 * 3600e3; // se cobra 12 h antes de que venza

/** Fecha en que vence lo que tiene pagado (o la prueba). */
export function dueDate(b: { subscriptionStatus: string; trialEndsAt: Date | null; paidUntil: Date | null }) {
  if (b.paidUntil && (!b.trialEndsAt || b.paidUntil >= b.trialEndsAt)) return b.paidUntil;
  if (b.subscriptionStatus === 'PRUEBA' && b.trialEndsAt) return b.trialEndsAt;
  return b.paidUntil || b.trialEndsAt || new Date();
}

export async function priceFor(planId: string, period: string) {
  const plan = (await getSettings()).plans.find(p => p.id === planId);
  if (!plan) return null;
  return { plan, anual: period === 'ANUAL', amount: period === 'ANUAL' ? yearPrice(plan) : plan.price };
}

/** Cobra ya a la tarjeta guardada (Wompi o simulado). Devuelve el estado del intento. */
export async function chargeNow(businessId: string) {
  const b = await db.business.findUnique({ where: { id: businessId } });
  if (!b || !b.autoRenew || !b.billingRef || !['WOMPI', 'SIMULADO'].includes(b.billingProvider || '')) return { status: 'SIN_TARJETA' };
  const p = await priceFor(b.plan, b.billingPeriod);
  if (!p) return { status: 'SIN_PLAN' };
  const pay = await db.payment.create({ data: { businessId: b.id, method: 'AUTOMATICO', amount: p.amount, status: 'PENDIENTE', provider: b.billingProvider!, providerRef: null } });
  const reference = `SUB-${p.plan.id}${p.anual ? '.A' : ''}_${pay.id}`;
  await db.business.update({ where: { id: b.id }, data: { billingLastTryAt: new Date() } });
  const { settlePayment } = await import('@/app/(cliente)/reservar/actions');
  if (b.billingProvider === 'SIMULADO') { await settlePayment(reference, !b.billingCard?.endsWith('0002'), `SIM-${pay.id}`); return { status: b.billingCard?.endsWith('0002') ? 'DECLINED' : 'APPROVED' }; }
  const r = await wompiCharge({ sourceId: b.billingRef, amount: p.amount, reference, email: b.billingEmail || '' });
  if (r.id) await db.payment.update({ where: { id: pay.id }, data: { providerRef: r.id } });
  if (r.status === 'APPROVED') await settlePayment(reference, true, r.id || undefined);
  else if (r.status !== 'PENDING') { await db.business.update({ where: { id: b.id }, data: { billingError: (r.message || 'La tarjeta fue rechazada.').slice(0, 300) } }); await settlePayment(reference, false, r.id || undefined); }
  return { status: r.status };
}

/** Lo llama el cron: cobra las suscripciones con renovación automática que vencen en las próximas horas. */
export async function chargeDueSubscriptions() {
  const soon = new Date(Date.now() + AHEAD_MS);
  const list = await db.business.findMany({ where: { autoRenew: true, parentId: null, billingProvider: { in: ['WOMPI', 'SIMULADO'] }, billingFails: { lt: MAX_FAILS }, OR: [{ billingLastTryAt: null }, { billingLastTryAt: { lt: new Date(Date.now() - RETRY_MS) } }] }, select: { id: true, subscriptionStatus: true, trialEndsAt: true, paidUntil: true } });
  let n = 0;
  for (const b of list) {
    if (dueDate(b) > soon) continue;
    try { await chargeNow(b.id); n++; } catch (e) { console.error('[cobro]', b.id, e); await chargeFailed(b.id, 'No se pudo conectar con la pasarela.'); }
  }
  return n;
}

/** Cobro rechazado: suma el intento y avisa al dueño. Después de 3 rechazos deja de intentar. */
export async function chargeFailed(businessId: string, why: string) {
  const b = await db.business.update({ where: { id: businessId }, data: { billingFails: { increment: 1 }, billingError: why.slice(0, 300) }, select: { ownerId: true, billingFails: true, name: true } });
  const last = b.billingFails >= MAX_FAILS;
  await pushToUsers([b.ownerId], { title: last ? '⚠️ No pudimos renovar tu plan' : '⚠️ Tu pago fue rechazado', body: last ? `Intentamos cobrar ${MAX_FAILS} veces sin éxito. Actualiza tu tarjeta para que ${b.name} no se suspenda.` : `${why} Lo intentaremos de nuevo mañana. Puedes cambiar la tarjeta en Suscripción.`, url: '/admin/suscripcion', tag: `cobro-${businessId}` }).catch(() => null);
}


// ───── Mercado Pago ─────
/** Webhook subscription_preapproval: el dueño autorizó o canceló la suscripción en Mercado Pago. */
export async function mpPreapprovalChanged(id: string) {
  const p = await mpPreapproval(id);
  if (!p?.external_reference?.startsWith('SUBR-')) return;
  const businessId = p.external_reference.slice(5);
  const b = await db.business.findUnique({ where: { id: businessId }, select: { id: true, billingRef: true } });
  if (!b || (b.billingRef && b.billingRef !== p.id)) return;
  if (p.status === 'authorized') await db.business.update({ where: { id: b.id }, data: { autoRenew: true, billingProvider: 'MERCADOPAGO', billingRef: p.id, billingCard: 'Mercado Pago', billingEmail: p.payer_email || undefined, billingFails: 0, billingError: null } });
  if (p.status === 'cancelled' || p.status === 'paused') await db.business.update({ where: { id: b.id }, data: { autoRenew: false, billingError: p.status === 'paused' ? 'La suscripción quedó pausada en Mercado Pago.' : null } });
}

/** Webhook subscription_authorized_payment: Mercado Pago cobró (o intentó cobrar) una cuota. */
export async function mpRecurringPayment(authorizedId: string) {
  const a = await mpAuthorizedPayment(authorizedId);
  if (!a?.preapproval_id) return;
  const b = await db.business.findFirst({ where: { billingRef: a.preapproval_id }, select: { id: true, plan: true, billingPeriod: true } });
  if (!b) return;
  const ref = `MP-${a.payment?.id || a.id}`;
  const st = a.payment?.status;
  if (!st || ['pending', 'in_process'].includes(st)) return;
  if (await db.payment.findFirst({ where: { businessId: b.id, providerRef: ref } })) return; // ya registrado
  const approved = st === 'approved';
  await db.payment.create({ data: { businessId: b.id, method: 'AUTOMATICO', amount: Math.round(a.transaction_amount), status: approved ? 'APROBADO' : 'RECHAZADO', provider: 'MERCADOPAGO', providerRef: ref } });
  if (approved) {
    const { applySubscriptionPayment } = await import('@/app/admin/_actions/subscription');
    await applySubscriptionPayment(b.id, `${b.plan}${b.billingPeriod === 'ANUAL' ? '.A' : ''}`);
  } else await chargeFailed(b.id, 'Mercado Pago no pudo cobrar la cuota.');
}

export async function billingReady() {
  const c = await getPay();
  if (c.provider === 'WOMPI') return !!(c.wompi.publicKey && c.wompi.privateKey && c.wompi.integritySecret);
  if (c.provider === 'MERCADOPAGO') return !!c.mp.accessToken;
  return true;
}
