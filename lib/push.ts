// Avisos Web Push (con el sonido de notificación del teléfono) al dueño y a los profesionales.
// Implementación propia con WebCrypto (VAPID ES256 + cifrado aes128gcm, RFC 8291/8292): funciona en Node y en Workers.
import { db } from './db';

const enc = new TextEncoder();
const b64u = (buf: ArrayBuffer | Uint8Array) => {
  const a = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = ''; for (const x of a) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const unb64u = (s: string) => {
  const t = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
  return Uint8Array.from(t, c => c.charCodeAt(0));
};
const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
};
const subtle = () => globalThis.crypto.subtle;

type Vapid = { publicKey: string; privateJwk: JsonWebKey };
let vapidMemo: Vapid | null = null;
/** Llaves VAPID de la plataforma: se crean la primera vez y se guardan en PlatformSetting. */
export async function getVapid(): Promise<Vapid> {
  if (vapidMemo) return vapidMemo;
  const row = await db.platformSetting.findUnique({ where: { key: 'vapidKeys' } });
  if (row) return (vapidMemo = JSON.parse(row.value));
  const kp = await subtle().generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']) as CryptoKeyPair;
  const v: Vapid = { publicKey: b64u(await subtle().exportKey('raw', kp.publicKey)), privateJwk: await subtle().exportKey('jwk', kp.privateKey) };
  // Si dos peticiones las crean a la vez, gana la primera que se guardó.
  await db.platformSetting.upsert({ where: { key: 'vapidKeys' }, create: { key: 'vapidKeys', value: JSON.stringify(v) }, update: {} });
  const saved = await db.platformSetting.findUnique({ where: { key: 'vapidKeys' } });
  return (vapidMemo = JSON.parse(saved!.value));
}

export async function vapidAuth(endpoint: string, v: Vapid) {
  const header = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  // Apple y Google exigen que "sub" sea https: o mailto:.
  const app = (process.env.APP_URL || '').replace(/\/$/, '');
  const sub = app.startsWith('https://') ? app : 'https://reserva-citas.ingenieropshp2002.workers.dev';
  const claims = b64u(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub })));
  const key = await subtle().importKey('jwk', v.privateJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await subtle().sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(`${header}.${claims}`));
  return `vapid t=${header}.${claims}.${b64u(sig)}, k=${v.publicKey}`;
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, len: number) {
  const k = await subtle().importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await subtle().deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, k, len * 8));
}

export async function encrypt(payload: string, p256dh: string, auth: string) {
  const ua = unb64u(p256dh); const secret = unb64u(auth);
  const eph = await subtle().generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']) as CryptoKeyPair;
  const asPub = new Uint8Array(await subtle().exportKey('raw', eph.publicKey));
  const uaKey = await subtle().importKey('raw', ua, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await subtle().deriveBits({ name: 'ECDH', public: uaKey } as any, eph.privateKey, 256));
  const ikm = await hkdf(secret, shared, concat(enc.encode('WebPush: info\0'), ua, asPub), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const key = await subtle().importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const cipher = new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv: nonce }, key, concat(enc.encode(payload), new Uint8Array([2]))));
  const head = new Uint8Array(21); head.set(salt); new DataView(head.buffer).setUint32(16, 4096); head[20] = asPub.length;
  return concat(head, asPub, cipher);
}

export type PushMsg = { title: string; body: string; url?: string; tag?: string };

/** Envía el aviso a todos los teléfonos registrados de esas personas. Borra las suscripciones que ya no existen. */
export async function pushToUsers(userIds: (string | null | undefined)[], msg: PushMsg) {
  const ids = [...new Set(userIds.filter(Boolean) as string[])];
  if (!ids.length) return 0;
  const subs = await db.pushSubscription.findMany({ where: { userId: { in: ids } } });
  if (!subs.length) return 0;
  const v = await getVapid();
  const body = JSON.stringify(msg);
  let sent = 0;
  await Promise.allSettled(subs.map(async s => {
    const res = await fetch(s.endpoint, { method: 'POST', headers: { Authorization: await vapidAuth(s.endpoint, v), 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: '86400', Urgency: 'high' }, body: await encrypt(body, s.p256dh, s.auth) });
    if (res.status === 404 || res.status === 410) await db.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
    else if (res.ok) sent++;
  }));
  return sent;
}

/** Aviso al dueño del negocio y, si se indica, al profesional de la cita. Nunca hace fallar la acción que lo llama. */
export async function pushToBusiness(businessId: string, msg: PushMsg, staffId?: string | null) {
  try {
    const [b, st] = await Promise.all([
      db.business.findUnique({ where: { id: businessId }, select: { ownerId: true } }),
      staffId ? db.staff.findUnique({ where: { id: staffId }, select: { userId: true } }) : null
    ]);
    return await pushToUsers([b?.ownerId, st?.userId], msg);
  } catch (e) { console.error('push', e); return 0; }
}
