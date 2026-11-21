// Mis citas sin cuenta, sin costo: se entra con el celular + el código de una de sus citas,
// o con el enlace personal. El dispositivo queda recordado unos días con una cookie firmada.
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { db } from './db';

const KEY = () => new TextEncoder().encode(`${process.env.AUTH_SECRET || 'dev-secret-change-me'}:celular`);
const COOKIE = 'rc_cel';
const DAYS = 7;
const MAX_FAILS = 5; const LOCK_MIN = 15;
const appUrl = () => (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
export const cleanCel = (raw: string) => raw.replace(/\D/g, '').replace(/^57(?=\d{10}$)/, '');

async function version(phone: string) {
  return (await db.phoneLink.findUnique({ where: { phone }, select: { version: true } }))?.version ?? 0;
}
async function sign(phone: string, v: number, exp?: string) {
  const j = new SignJWT({ p: phone, v }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt();
  return (exp ? j.setExpirationTime(exp) : j).sign(KEY());
}
async function read(t: string | undefined) {
  if (!t) return null;
  try {
    const { payload } = await jwtVerify(t, KEY());
    const phone = String(payload.p || ''); if (!/^3\d{9}$/.test(phone)) return null;
    return Number(payload.v) === (await version(phone)) ? phone : null; // un enlace anulado ya no sirve
  } catch { return null; }
}

/** Enlace personal: abre Mis citas sin escribir nada. Se anula subiendo la versión. */
export async function personalLink(phone: string) {
  return `${appUrl()}/mis-citas/acceso/${await sign(phone, await version(phone))}`;
}
export async function rememberDevice(phone: string) {
  (await cookies()).set(COOKIE, await sign(phone, await version(phone), `${DAYS}d`), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: DAYS * 86400 });
}
export async function forgetDevice() { (await cookies()).delete(COOKIE); }
/** Celular recordado en este dispositivo (null si no hay o fue anulado). */
export async function deviceCel() { return read((await cookies()).get(COOKIE)?.value); }
export async function linkCel(token: string) { return read(token); }

/** Celular + código de una de sus citas. Máximo 5 intentos fallidos; luego espera 15 minutos. */
export async function checkCode(raw: string, codeRaw: string): Promise<{ phone: string } | { error: string }> {
  const phone = cleanCel(raw);
  if (!/^3\d{9}$/.test(phone)) return { error: 'Escribe un celular colombiano de 10 dígitos que empiece por 3.' };
  const row = await db.phoneLink.findUnique({ where: { phone } });
  if (row?.lockedUntil && row.lockedUntil > new Date()) return { error: `Demasiados intentos. Vuelve a intentar en ${Math.ceil((row.lockedUntil.getTime() - Date.now()) / 60000)} minutos.` };
  let code = codeRaw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length === 6) code = `RC${code}`;
  code = code.replace(/^RC/, 'RC-');
  const a = code.length === 9 ? await db.appointment.findUnique({ where: { code }, select: { customer: { select: { phone: true } } } }) : null;
  if (a && cleanCel(a.customer.phone || '') === phone) {
    if (row?.fails) await db.phoneLink.update({ where: { phone }, data: { fails: 0, lockedUntil: null } });
    return { phone };
  }
  const fails = (row?.fails ?? 0) + 1; const lock = fails >= MAX_FAILS;
  await db.phoneLink.upsert({ where: { phone }, create: { phone, fails: lock ? 0 : fails, lockedUntil: lock ? new Date(Date.now() + LOCK_MIN * 60000) : null }, update: { fails: lock ? 0 : fails, lockedUntil: lock ? new Date(Date.now() + LOCK_MIN * 60000) : null } });
  return { error: lock ? `Demasiados intentos. Vuelve a intentar en ${LOCK_MIN} minutos.` : `El código no coincide con ese celular. Te quedan ${MAX_FAILS - fails} ${MAX_FAILS - fails === 1 ? 'intento' : 'intentos'}.` };
}

/** Anula el enlace personal y los dispositivos recordados de ese celular. */
export async function revokeAll(phone: string) {
  await db.phoneLink.upsert({ where: { phone }, create: { phone, version: 1 }, update: { version: { increment: 1 } } });
}
