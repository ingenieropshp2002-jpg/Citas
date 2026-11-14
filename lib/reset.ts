import { SignJWT, jwtVerify } from 'jose';
import { createHash } from 'crypto';
import { db } from './db';

// Enlaces para crear o cambiar la contraseña. Vencen en 24 horas y dejan de servir apenas se usa uno.
const secret = () => new TextEncoder().encode((process.env.AUTH_SECRET || 'dev-secret-change-me') + ':reset');
const fp = (hash: string | null) => createHash('sha256').update(hash || 'sin-clave').digest('hex').slice(0, 16);
export const appUrl = () => (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');

export async function resetLink(user: { id: string; passwordHash: string | null }, next = '/') {
  const t = await new SignJWT({ uid: user.id, fp: fp(user.passwordHash), next }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('24h').sign(secret());
  return `${appUrl()}/recuperar/${t}`;
}

export async function readResetToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret());
    const user = await db.user.findUnique({ where: { id: String(payload.uid) } });
    if (!user || fp(user.passwordHash) !== payload.fp) return null;
    return { user, next: String(payload.next || '/') };
  } catch { return null; }
}

export function emailConfigured() { return !!process.env.RESEND_API_KEY; }

export async function sendEmail(to: string, subject: string, html: string) {
  if (!emailConfigured()) return false;
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: process.env.MAIL_FROM || 'Registro Citas <onboarding@resend.dev>', to, subject, html })
  }).catch(() => null);
  return !!r?.ok;
}
