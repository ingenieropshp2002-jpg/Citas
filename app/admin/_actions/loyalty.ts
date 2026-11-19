'use server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
import { sendBirthdays } from '@/lib/automations';
import { fillVars, sendWhatsapp } from '@/lib/notify';

const int = (v: FormDataEntryValue | null, d: number) => { const n = parseInt(String(v ?? ''), 10); return Number.isFinite(n) ? n : d; };
const done = () => { revalidatePath('/admin/fidelizacion'); return { ok: true }; };

export async function saveLoyaltySettings(_: unknown, fd: FormData) {
  const { business } = await requireBusiness('fidelizacion');
  await db.business.update({ where: { id: business.id }, data: {
    loyaltyEnabled: !!fd.get('loyaltyEnabled'), pointsPerThousand: Math.max(0, int(fd.get('pointsPerThousand'), 1)), inactiveDays: Math.max(15, int(fd.get('inactiveDays'), 60)),
    birthdayEnabled: !!fd.get('birthdayEnabled'), birthdayMessage: String(fd.get('birthdayMessage') || '').trim() || business.birthdayMessage,
    birthdayCoupon: String(fd.get('birthdayCoupon') || '').trim().toUpperCase() || null
  } });
  return done();
}

export async function saveReward(_: unknown, fd: FormData) {
  const { business } = await requireBusiness('fidelizacion');
  const name = String(fd.get('name') || '').trim(); const points = int(fd.get('points'), 0);
  if (!name || points <= 0) return { error: 'Escribe el premio y los puntos necesarios.' };
  await db.reward.create({ data: { businessId: business.id, name, points } });
  return done();
}

export async function toggleReward(id: string) {
  const { business } = await requireBusiness('fidelizacion');
  const r = await db.reward.findFirst({ where: { id, businessId: business.id } });
  if (r) await db.reward.update({ where: { id }, data: { active: !r.active } });
  revalidatePath('/admin/fidelizacion');
}

export async function redeemReward(_: unknown, fd: FormData) {
  const { business, user } = await requireBusiness('fidelizacion');
  const customer = await db.customer.findFirst({ where: { id: String(fd.get('customerId')), businessId: business.id } });
  const reward = await db.reward.findFirst({ where: { id: String(fd.get('rewardId')), businessId: business.id, active: true } });
  if (!customer || !reward) return { error: 'Elige el cliente y el premio.' };
  if (customer.points < reward.points) return { error: `${customer.name} tiene ${customer.points} puntos y el premio pide ${reward.points}.` };
  await db.$transaction([
    db.pointMovement.create({ data: { businessId: business.id, customerId: customer.id, points: -reward.points, reason: `Canje: ${reward.name} (por ${user.name})` } }),
    db.customer.update({ where: { id: customer.id }, data: { points: { decrement: reward.points } } })
  ]);
  if (customer.phone) await sendWhatsapp(customer.phone, `🎁 ¡Hola ${customer.name.split(' ')[0]}! Canjeaste "${reward.name}" en ${business.name}. Te quedan ${customer.points - reward.points} puntos. ¡Gracias por tu fidelidad!`, { phoneId: business.waPhoneId });
  return done();
}

export async function adjustPoints(_: unknown, fd: FormData) {
  const { business, user } = await requireBusiness('fidelizacion');
  const customer = await db.customer.findFirst({ where: { id: String(fd.get('customerId')), businessId: business.id } });
  const pts = int(fd.get('points'), 0);
  if (!customer || !pts) return { error: 'Elige el cliente y los puntos (pueden ser negativos).' };
  if (customer.points + pts < 0) return { error: 'El cliente quedaría con puntos negativos.' };
  await db.$transaction([
    db.pointMovement.create({ data: { businessId: business.id, customerId: customer.id, points: pts, reason: String(fd.get('reason') || '').trim() || `Ajuste manual (${user.name})` } }),
    db.customer.update({ where: { id: customer.id }, data: { points: { increment: pts } } })
  ]);
  return done();
}

export async function sendBirthdaysNow() {
  const { business } = await requireBusiness('fidelizacion');
  const n = await sendBirthdays(business.id, true);
  revalidatePath('/admin/fidelizacion');
  return { ok: true, sent: n };
}

/** Mensaje para recuperar clientes inactivos (a todos los que no han recibido uno en los últimos 30 días). */
export async function sendWinback(_: unknown, fd: FormData) {
  const { business } = await requireBusiness('fidelizacion');
  const msg = String(fd.get('message') || '').trim();
  if (!msg) return { error: 'Escribe el mensaje.' };
  const limit = new Date(Date.now() - business.inactiveDays * 86400000); const recent = new Date(Date.now() - 30 * 86400000);
  const list = await db.customer.findMany({ where: { businessId: business.id, phone: { not: null }, OR: [{ lastVisit: null }, { lastVisit: { lt: limit } }], AND: [{ OR: [{ winbackSentAt: null }, { winbackSentAt: { lt: recent } }] }] } });
  const link = `${process.env.APP_URL || ''}/reservar/${business.slug}`;
  const coupon = String(fd.get('coupon') || '').trim().toUpperCase();
  for (const c of list) {
    await sendWhatsapp(c.phone!, fillVars(msg, { nombre: c.name.split(' ')[0], negocio: business.name, link, cupon: coupon, puntos: c.points }), { phoneId: business.waPhoneId, template: { kind: 'RECUPERAR', params: [c.name.split(' ')[0], business.name] } });
    await db.customer.update({ where: { id: c.id }, data: { winbackSentAt: new Date() } });
  }
  revalidatePath('/admin/fidelizacion');
  return { ok: true, sent: list.length };
}
