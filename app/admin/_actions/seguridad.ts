'use server';
import QRCode from 'qrcode';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { newRecoveryCodes, newSecret, openSecret, otpauth, sealSecret, verify } from '@/lib/totp';

/** Paso 1: crea el secreto (todavía sin activar) y devuelve el QR para escanear. */
export async function startTotp() {
  const u = await requireUser('/admin/seguridad');
  if (u.totpEnabledAt) return { error: 'Ya está activada.' };
  const secret = newSecret();
  await db.user.update({ where: { id: u.id }, data: { totpSecret: sealSecret(secret), totpEnabledAt: null } });
  const uri = otpauth(secret, u.email || u.phone || u.name, (await getSettings()).appName);
  return { qr: await QRCode.toDataURL(uri, { margin: 1, width: 220, color: { dark: '#0d2538' } }), secret: secret.replace(/(.{4})/g, '$1 ').trim() };
}

/** Paso 2: confirma con un código de la app; la activa y entrega los códigos de respaldo (se muestran una sola vez). */
export async function confirmTotp(code: string) {
  const u = await requireUser('/admin/seguridad');
  if (!u.totpSecret || u.totpEnabledAt) return { error: 'Vuelve a empezar la activación.' };
  if (!verify(openSecret(u.totpSecret), code)) return { error: 'El código no coincide. Escribe el que se ve ahora en la app.' };
  const r = newRecoveryCodes();
  await db.user.update({ where: { id: u.id }, data: { totpEnabledAt: new Date(), totpRecovery: r.stored } });
  revalidatePath('/admin/seguridad');
  return { codes: r.codes };
}

export async function disableTotp(code: string) {
  const u = await requireUser('/admin/seguridad');
  if (!u.totpEnabledAt || !u.totpSecret) return { error: 'No está activada.' };
  if (!verify(openSecret(u.totpSecret), code)) return { error: 'El código no coincide.' };
  await db.user.update({ where: { id: u.id }, data: { totpEnabledAt: null, totpSecret: null, totpRecovery: null } });
  revalidatePath('/admin/seguridad');
  return { ok: true };
}

export async function regenerateRecovery(code: string) {
  const u = await requireUser('/admin/seguridad');
  if (!u.totpEnabledAt || !u.totpSecret) return { error: 'No está activada.' };
  if (!verify(openSecret(u.totpSecret), code)) return { error: 'El código no coincide.' };
  const r = newRecoveryCodes();
  await db.user.update({ where: { id: u.id }, data: { totpRecovery: r.stored } });
  return { codes: r.codes };
}
