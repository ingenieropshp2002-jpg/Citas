'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireBusiness, requireUser } from '@/lib/auth';
import { createCheckout } from '@/lib/payments';
import { isSuperAdmin } from '@/lib/auth';
import { getSettings, yearPrice } from '@/lib/settings';

const appUrl = () => process.env.APP_URL || 'http://localhost:3000';

export async function paySubscription(fd: FormData) {
  const { business, user, perms } = await requireBusiness(undefined, { allowExpired: true });
  if (perms !== 'ALL') redirect('/admin/suscripcion?error=permiso');
  const plan = (await getSettings()).plans.find(p => p.id === String(fd.get('plan')));
  if (!plan) redirect('/admin/suscripcion');
  const anual = String(fd.get('period')) === 'ANUAL';
  const amount = anual ? yearPrice(plan) : plan.price;
  const method = String(fd.get('method') || 'TARJETA');
  const pay = await db.payment.create({ data: { businessId: business.id, method, amount, status: 'PENDIENTE', provider: 'PENDIENTE' } });
  // La referencia lleva el plan y el período: SUB-PRO.A_<id> (anual) o SUB-PRO_<id> (mensual).
  const reference = `SUB-${plan.id}${anual ? '.A' : ''}_${pay.id}`;
  const co = await createCheckout({ reference, amount, description: `Suscripción ${plan.name} (${anual ? '1 año' : '1 mes'}) - ${business.name}`, email: user.email, method, redirectUrl: `${appUrl()}/pago/retorno?ref=${reference}`, notificationUrl: `${appUrl()}/api/pagos/webhook` });
  await db.payment.update({ where: { id: pay.id }, data: { provider: co.provider } });
  redirect(co.url);
}

/** Activa o extiende la suscripción tras un pago aprobado (lo llama settlePayment). "PRO.A" = un año; "PRO" = un mes. */
export async function applySubscriptionPayment(businessId: string, planRef: string) {
  const [plan, period] = planRef.split('.');
  const days = period === 'A' ? 365 : 30;
  const { principalId, syncSedes } = await import('@/lib/sedes');
  const b = await db.business.findUniqueOrThrow({ where: { id: await principalId(businessId) } });
  // Se suma desde lo que ya tenía: plan vigente o días de prueba que le quedan.
  const base = new Date(Math.max(Date.now(), b.paidUntil?.getTime() || 0, b.subscriptionStatus === 'PRUEBA' ? b.trialEndsAt?.getTime() || 0 : 0));
  await db.business.update({ where: { id: b.id }, data: { plan, subscriptionStatus: 'ACTIVA', paidUntil: new Date(base.getTime() + days * 86400000), billingFails: 0, billingError: null } });
  await syncSedes(b.id);
}

// ───── Administración de la plataforma (ADMIN_EMAILS) ─────
async function requireAdmin() {
  const user = await requireUser('/superadmin');
  if (!isSuperAdmin(user)) redirect('/');
  return user;
}
export async function adminSetSubscription(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get('id')); const action = String(fd.get('action'));
  const b = await db.business.findUnique({ where: { id } });
  if (!b) return;
  const day = 86400000; const now = Date.now();
  if (action === 'ACTIVAR_30') await db.business.update({ where: { id }, data: { subscriptionStatus: 'ACTIVA', paidUntil: new Date(Math.max(now, b.paidUntil?.getTime() || 0) + 30 * day) } });
  if (action === 'ACTIVAR_SIEMPRE') await db.business.update({ where: { id }, data: { subscriptionStatus: 'ACTIVA', paidUntil: null, trialEndsAt: null } });
  if (action === 'EXTENDER_PRUEBA') await db.business.update({ where: { id }, data: { subscriptionStatus: 'PRUEBA', trialEndsAt: new Date(Math.max(now, b.trialEndsAt?.getTime() || 0) + (await getSettings()).trialDays * day) } });
  if (action === 'SUSPENDER') await db.business.update({ where: { id }, data: { subscriptionStatus: 'VENCIDA', paidUntil: null, trialEndsAt: new Date(now - day) } });
  await (await import('@/lib/sedes')).syncSedes(id);
  revalidatePath('/superadmin', 'layout');
}

// ───── Renovación automática ─────
async function ownerOnly() {
  const r = await requireBusiness(undefined, { allowExpired: true });
  if (r.perms !== 'ALL') throw new Error('Solo el dueño puede cambiar el cobro.');
  const { principalId } = await import('@/lib/sedes');
  const id = await principalId(r.business.id);
  return { ...r, principal: await db.business.findUniqueOrThrow({ where: { id } }) };
}

/** Datos para el formulario de tarjeta (llave pública y términos de Wompi). */
export async function cardFormData() {
  await ownerOnly();
  const { getPay, wompiAcceptance, wompiBase } = await import('@/lib/payments');
  const c = await getPay();
  if (c.provider !== 'WOMPI') return { provider: c.provider, publicKey: '', base: '', acceptance: null, personal: null };
  const t = await wompiAcceptance();
  return { provider: c.provider, publicKey: c.wompi.publicKey, base: wompiBase(c), ...t };
}

/** Guarda la tarjeta (token de Wompi hecho en el navegador) y activa la renovación automática. */
export async function saveCard(i: { plan: string; period: string; token?: string; brand: string; last4: string; acceptance?: string; personal?: string | null }) {
  const { user, principal: b } = await ownerOnly();
  const { getPay, wompiCreateSource } = await import('@/lib/payments');
  const { priceFor, chargeNow, dueDate } = await import('@/lib/billing');
  const c = await getPay();
  if (c.provider === 'MERCADOPAGO') return { error: 'Con Mercado Pago la tarjeta se registra en su página.' };
  const p = await priceFor(i.plan, i.period);
  if (!p) return { error: 'Elige un plan.' };
  if (!/^\d{4}$/.test(i.last4)) return { error: 'Tarjeta inválida.' };
  const email = user.email || `${b.slug}@sin-correo.local`;
  let ref = 'SIM';
  if (c.provider === 'WOMPI') {
    if (!i.token || !i.acceptance) return { error: 'Acepta los términos de Wompi.' };
    try { ref = await wompiCreateSource({ token: i.token, email, acceptance: i.acceptance, personal: i.personal }); } catch (e) { return { error: (e as Error).message }; }
  }
  await db.business.update({ where: { id: b.id }, data: { autoRenew: true, plan: p.plan.id, billingPeriod: p.anual ? 'ANUAL' : 'MENSUAL', billingProvider: c.provider, billingRef: ref, billingCard: `${i.brand.toUpperCase().slice(0, 12)} •••• ${i.last4}`, billingEmail: email, billingFails: 0, billingError: null, billingLastTryAt: null } });
  await (await import('@/lib/sedes')).syncSedes(b.id);
  // Si ya venció (o vence en menos de un día), se cobra de una vez; si no, el cron cobra al vencer.
  let charged: string | null = null;
  const fresh = await db.business.findUniqueOrThrow({ where: { id: b.id } });
  if (dueDate(fresh).getTime() < Date.now() + 86400e3) charged = (await chargeNow(b.id)).status;
  revalidatePath('/admin/suscripcion');
  return { ok: true, charged };
}

/** Mercado Pago: crea la suscripción y lleva al dueño a autorizarla. */
export async function startMpSubscription(fd: FormData) {
  const { user, principal: b } = await ownerOnly();
  const { mpCreatePreapproval } = await import('@/lib/payments');
  const { priceFor, dueDate } = await import('@/lib/billing');
  const p = await priceFor(String(fd.get('plan')), String(fd.get('period')));
  if (!p) redirect('/admin/suscripcion');
  if (!user.email) redirect('/admin/suscripcion?error=correo');
  let url = '/admin/suscripcion?error=mp';
  try {
    const r = await mpCreatePreapproval({ reason: `${(await getSettings()).appName} · Plan ${p.plan.name} ${p.anual ? 'anual' : 'mensual'} · ${b.name}`, reference: `SUBR-${b.id}`, email: user.email, amount: p.amount, months: p.anual ? 12 : 1, startAt: dueDate(b), backUrl: `${appUrl()}/admin/suscripcion?auto=mp` });
    await db.business.update({ where: { id: b.id }, data: { plan: p.plan.id, billingPeriod: p.anual ? 'ANUAL' : 'MENSUAL', billingProvider: 'MERCADOPAGO', billingRef: r.id, billingEmail: user.email, autoRenew: false } });
    url = r.url;
  } catch (e) { console.error('[mp]', e); }
  redirect(url);
}

export async function cancelAutoRenew() {
  const { principal: b } = await ownerOnly();
  if (b.billingProvider === 'MERCADOPAGO' && b.billingRef) await (await import('@/lib/payments')).mpCancelPreapproval(b.billingRef);
  await db.business.update({ where: { id: b.id }, data: { autoRenew: false, billingRef: null, billingCard: null, billingFails: 0, billingError: null } });
  revalidatePath('/admin/suscripcion');
}

/** Cambia el plan o el período de la renovación automática (aplica desde el próximo cobro). */
export async function changeAutoPlan(fd: FormData) {
  const { principal: b } = await ownerOnly();
  const { priceFor } = await import('@/lib/billing');
  const p = await priceFor(String(fd.get('plan')), String(fd.get('period')));
  if (!p || b.billingProvider === 'MERCADOPAGO') return;
  await db.business.update({ where: { id: b.id }, data: { plan: p.plan.id, billingPeriod: p.anual ? 'ANUAL' : 'MENSUAL' } });
  await (await import('@/lib/sedes')).syncSedes(b.id);
  revalidatePath('/admin/suscripcion');
}

/** Reintenta el cobro ya (por ejemplo, después de que el banco autorizó). */
export async function retryCharge() {
  const { principal: b } = await ownerOnly();
  await db.business.update({ where: { id: b.id }, data: { billingFails: 0, billingLastTryAt: null } });
  const r = await (await import('@/lib/billing')).chargeNow(b.id);
  revalidatePath('/admin/suscripcion');
  return r.status;
}
