'use server';
import { db } from '@/lib/db';
import { getUser } from '@/lib/auth';
import { addDays, fromBogota, hm, ymd } from '@/lib/format';
import { getVapid, pushToBusiness } from '@/lib/push';
import { revalidatePath } from 'next/cache';

/** Horarios de ese día apartados por otra persona que todavía no paga el abono. */
export async function heldSlots(businessId: string, date: string, staffId: string | null) {
  const user = await getUser();
  const now = new Date();
  const list = await db.appointment.findMany({
    where: { businessId, status: 'PENDIENTE', paymentMethod: 'TRANSFERENCIA', depositStatus: 'PENDIENTE', start: { gte: fromBogota(date) > now ? fromBogota(date) : now, lt: fromBogota(date, '23:59') }, ...(staffId ? { staffId } : {}), ...(user ? { customer: { OR: [{ userId: null }, { userId: { not: user.id } }] } } : {}) },
    include: { staff: { select: { name: true } } }, orderBy: { start: 'asc' }, take: 12
  });
  const mine = user && list.length ? await db.slotWatch.findMany({ where: { userId: user.id, staffId: { in: list.map(a => a.staffId) }, start: { in: list.map(a => a.start) } }, select: { staffId: true, start: true } }) : [];
  return list.map(a => ({
    staffId: a.staffId, staffName: a.staff.name.split(' ')[0], start: a.start.toISOString(), time: hm(a.start),
    until: a.depositProofAt ? null : a.depositDueAt ? hm(a.depositDueAt) : null, reviewing: !!a.depositProofAt,
    watching: mine.some(w => w.staffId === a.staffId && w.start.getTime() === a.start.getTime())
  }));
}

export async function clientPushKey() { return (await getVapid()).publicKey; }

/** "Avísame si se libera": queda en la lista de espera de ese horario. */
export async function watchSlot(input: { businessId: string; staffId: string; start: string; serviceIds: string[]; sub?: { endpoint: string; keys: { p256dh: string; auth: string } } | null }) {
  const user = await getUser();
  if (!user) return { error: 'Inicia sesión para que te avisemos.' };
  const start = new Date(input.start);
  const held = await db.appointment.findFirst({ where: { businessId: input.businessId, staffId: input.staffId, start, status: 'PENDIENTE', depositStatus: 'PENDIENTE' }, select: { id: true } });
  if (!held) return { error: 'Ese horario ya no está apartado. Revisa los horarios disponibles.', free: true };
  await db.slotWatch.upsert({ where: { staffId_start_userId: { staffId: input.staffId, start, userId: user.id } }, create: { businessId: input.businessId, staffId: input.staffId, start, userId: user.id, serviceIds: JSON.stringify(input.serviceIds.slice(0, 5)) }, update: { notifiedAt: null } });
  const s = input.sub;
  if (s && /^https:\/\//.test(s.endpoint) && s.keys?.p256dh && s.keys?.auth) await db.pushSubscription.upsert({ where: { endpoint: s.endpoint }, create: { userId: user.id, endpoint: s.endpoint, p256dh: s.keys.p256dh, auth: s.keys.auth }, update: { userId: user.id, p256dh: s.keys.p256dh, auth: s.keys.auth } });
  return { ok: true, push: !!s };
}

/** Lista de espera por fecha y franja: avisa sola cuando se libera un cupo que le sirve. */
export async function joinWaitlist(input: { businessId: string; staffId: string | null; serviceIds: string[]; dateFrom: string; days: number; window: string; phone?: string; sub?: { endpoint: string; keys: { p256dh: string; auth: string } } | null }) {
  const user = await getUser();
  if (!user) return { error: 'Inicia sesión para entrar a la lista de espera.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dateFrom)) return { error: 'Elige una fecha.' };
  const w = ['CUALQUIERA', 'MANANA', 'TARDE', 'NOCHE'].includes(input.window) ? input.window : 'CUALQUIERA';
  const days = Math.min(14, Math.max(1, Math.round(input.days || 1)));
  const today = ymd(new Date());
  const dateFrom = input.dateFrom < today ? today : input.dateFrom;
  const dateTo = addDays(dateFrom, days - 1);
  const phone = (input.phone || '').replace(/\D/g, '').slice(-10) || user.phone || null;
  if (!phone && !input.sub) return { error: 'Escribe tu celular para avisarte por WhatsApp, o activa las notificaciones.' };
  const b = await db.business.findUnique({ where: { id: input.businessId }, select: { id: true } });
  if (!b) return { error: 'Negocio no encontrado.' };
  if (input.staffId && !(await db.staff.findFirst({ where: { id: input.staffId, businessId: b.id }, select: { id: true } }))) return { error: 'Profesional no encontrado.' };
  if ((await db.waitEntry.count({ where: { userId: user.id, status: 'ACTIVA' } })) >= 5) return { error: 'Ya estás en 5 listas de espera. Sal de alguna en Mis citas.' };
  // Si ya tenía una para ese negocio, se actualiza en lugar de duplicarla.
  const prev = await db.waitEntry.findFirst({ where: { businessId: b.id, userId: user.id, status: 'ACTIVA' } });
  const data = { staffId: input.staffId, serviceIds: JSON.stringify(input.serviceIds.slice(0, 5)), dateFrom, dateTo, window: w, phone };
  if (prev) await db.waitEntry.update({ where: { id: prev.id }, data: { ...data, notifiedAt: null } });
  else await db.waitEntry.create({ data: { ...data, businessId: b.id, userId: user.id } });
  if (phone && !user.phone) await db.user.update({ where: { id: user.id }, data: { phone } });
  const s = input.sub;
  if (s && /^https:\/\//.test(s.endpoint) && s.keys?.p256dh && s.keys?.auth) await db.pushSubscription.upsert({ where: { endpoint: s.endpoint }, create: { userId: user.id, endpoint: s.endpoint, p256dh: s.keys.p256dh, auth: s.keys.auth }, update: { userId: user.id, p256dh: s.keys.p256dh, auth: s.keys.auth } });
  await pushToBusiness(b.id, { title: '⏳ Nueva persona en lista de espera', body: `${user.name} · ${dateFrom === dateTo ? dateFrom : `${dateFrom} a ${dateTo}`}`, url: '/admin/espera', tag: `espera-${user.id}` });
  return { ok: true, dateFrom, dateTo, whatsapp: !!phone, push: !!s };
}

export async function leaveWaitlist(id: string) {
  const user = await getUser();
  if (!user) return;
  await db.waitEntry.updateMany({ where: { id, userId: user.id, status: 'ACTIVA' }, data: { status: 'CANCELADA' } });
  revalidatePath('/mis-citas');
}
