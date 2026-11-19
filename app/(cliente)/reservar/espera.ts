'use server';
import { db } from '@/lib/db';
import { getUser } from '@/lib/auth';
import { fromBogota, hm } from '@/lib/format';
import { getVapid } from '@/lib/push';

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
