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
  if (perms !== 'ALL') redirect('/panel/suscripcion?error=permiso');
  const plan = (await getSettings()).plans.find(p => p.id === String(fd.get('plan')));
  if (!plan) redirect('/panel/suscripcion');
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
  const b = await db.business.findUniqueOrThrow({ where: { id: businessId } });
  const base = b.paidUntil && b.paidUntil > new Date() ? b.paidUntil : new Date();
  await db.business.update({ where: { id: b.id }, data: { plan, subscriptionStatus: 'ACTIVA', paidUntil: new Date(base.getTime() + days * 86400000) } });
}

// ───── Administración de la plataforma (ADMIN_EMAILS) ─────
async function requireAdmin() {
  const user = await requireUser('/admin');
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
  revalidatePath('/admin', 'layout');
}
