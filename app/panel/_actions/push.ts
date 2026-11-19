'use server';
import { db } from '@/lib/db';
import { requireBusiness, getUser } from '@/lib/auth';
import { getVapid, pushToUsers } from '@/lib/push';

export async function pushPublicKey() { await requireBusiness(undefined, { allowExpired: true }); return (await getVapid()).publicKey; }

export async function savePushSubscription(sub: { endpoint: string; keys: { p256dh: string; auth: string } }) {
  const { user } = await requireBusiness(undefined, { allowExpired: true });
  if (!/^https:\/\//.test(sub?.endpoint || '') || !sub.keys?.p256dh || !sub.keys?.auth) return { error: 'Suscripción inválida.' };
  await db.pushSubscription.upsert({ where: { endpoint: sub.endpoint }, create: { userId: user.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth }, update: { userId: user.id, p256dh: sub.keys.p256dh, auth: sub.keys.auth } });
  return { ok: true };
}

export async function removePushSubscription(endpoint: string) {
  const user = await getUser();
  if (user && endpoint) await db.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } });
  return { ok: true };
}

export async function testPush() {
  const { user } = await requireBusiness(undefined, { allowExpired: true });
  const n = await pushToUsers([user.id], { title: 'Avisos activados 🔔', body: 'Así te llegarán las reservas y cancelaciones, aunque la app esté cerrada.', url: '/panel/agenda', tag: 'prueba' });
  return { sent: n };
}
