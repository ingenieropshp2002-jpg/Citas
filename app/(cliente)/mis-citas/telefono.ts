'use server';
import { db } from '@/lib/db';

const ACTIVE = ['PENDIENTE', 'CONFIRMADA', 'EN_SERVICIO'];
export type PhoneAppt = { code: string; business: string; slug: string; services: string; staff: string | null; start: string; status: string };

/** Citas próximas de un celular, sin cuenta (como en la cita: nombre del negocio, servicio, fecha y estado). */
export async function citasPorCelular(raw: string, negocio?: string): Promise<{ error: string } | { list: PhoneAppt[] }> {
  const phone = raw.replace(/\D/g, '').replace(/^57(?=\d{10}$)/, '');
  if (!/^3\d{9}$/.test(phone)) return { error: 'Escribe un celular colombiano de 10 dígitos que empiece por 3.' };
  const since = new Date(Date.now() - 3 * 3600_000);
  const rows = await db.appointment.findMany({
    where: { customer: { phone: { in: [phone, `57${phone}`] } }, end: { gte: since }, status: { in: ACTIVE }, ...(negocio ? { business: { slug: negocio } } : {}) },
    include: { business: { select: { name: true, slug: true } }, staff: { select: { name: true } }, services: { include: { service: { select: { name: true } } } } },
    orderBy: { start: 'asc' }, take: 20
  });
  return { list: rows.map(a => ({ code: a.code, business: a.business.name, slug: a.business.slug, services: a.services.map(s => s.service.name).join(' + '), staff: a.staff?.name.split(' ')[0] || null, start: a.start.toISOString(), status: a.status })) };
}
