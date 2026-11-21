'use server';
import { db } from '@/lib/db';
import { checkCode, deviceCel, forgetDevice, personalLink, rememberDevice, revokeAll } from '@/lib/celular';

const ACTIVE = ['PENDIENTE', 'CONFIRMADA', 'EN_SERVICIO'];
export type PhoneAppt = { code: string; business: string; slug: string; services: string; staff: string | null; start: string; status: string };

/** Próximas citas del celular recordado en este dispositivo. */
export async function citasDelCelular(phone: string, negocio?: string): Promise<PhoneAppt[]> {
  const rows = await db.appointment.findMany({
    where: { customer: { phone: { in: [phone, `57${phone}`] } }, end: { gte: new Date(Date.now() - 3 * 3600_000) }, status: { in: ACTIVE }, ...(negocio ? { business: { slug: negocio } } : {}) },
    include: { business: { select: { name: true, slug: true } }, staff: { select: { name: true } }, services: { include: { service: { select: { name: true } } } } },
    orderBy: { start: 'asc' }, take: 30
  });
  return rows.map(a => ({ code: a.code, business: a.business.name, slug: a.business.slug, services: a.services.map(s => s.service.name).join(' + '), staff: a.staff?.name.split(' ')[0] || null, start: a.start.toISOString(), status: a.status }));
}

export async function entrarConCodigo(phone: string, code: string) {
  const r = await checkCode(phone, code);
  if ('error' in r) return r;
  await rememberDevice(r.phone);
  return { ok: true };
}
export async function salirDelCelular() { await forgetDevice(); return { ok: true }; }
export async function miEnlace() { const p = await deviceCel(); return p ? { url: await personalLink(p) } : { error: 'Vuelve a ingresar.' }; }
/** Anula el enlace personal y cierra el acceso en todos los dispositivos (incluido este). */
export async function anularAccesos() { const p = await deviceCel(); if (p) await revokeAll(p); await forgetDevice(); return { ok: true }; }
