'use server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
import { isFree } from '@/lib/availability';
import { fromBogota } from '@/lib/format';
import { consumeSupplies } from '@/lib/inventory';
import { sendWhatsapp } from '@/lib/notify';
import { sendReminders } from '@/lib/automations';
import { newCode } from '@/app/(cliente)/reservar/actions';

export async function createAppointmentPanel(_: unknown, fd: FormData) {
  const { business } = await requireBusiness('agenda');
  const serviceIds = fd.getAll('serviceIds').map(String);
  const staffId = String(fd.get('staffId'));
  const services = await db.service.findMany({ where: { id: { in: serviceIds }, businessId: business.id } });
  if (!services.length) return { error: 'Selecciona al menos un servicio.' };
  const dur = services.reduce((a, s) => a + s.durationMin, 0);
  const start = fromBogota(String(fd.get('date')), String(fd.get('time')));
  const end = new Date(start.getTime() + dur * 60000);
  if (!(await isFree(business.id, staffId, start, end))) return { error: 'El profesional ya tiene una cita o bloqueo en ese horario.' };
  let customerId = String(fd.get('customerId') || '');
  if (!customerId) {
    const name = String(fd.get('newName') || '').trim(); const phone = String(fd.get('newPhone') || '').replace(/\D/g, '');
    if (!name) return { error: 'Elige un cliente o escribe el nombre del nuevo cliente.' };
    const existing = phone ? await db.customer.findFirst({ where: { businessId: business.id, phone } }) : null;
    customerId = existing?.id || (await db.customer.create({ data: { businessId: business.id, name, phone, tags: '["Nuevo"]' } })).id;
  }
  const a = await db.appointment.create({ data: { code: await newCode(), businessId: business.id, customerId, staffId, start, end, status: 'CONFIRMADA', source: 'PANEL', total: services.reduce((x, s) => x + s.price, 0), notes: String(fd.get('notes') || '') || null, services: { create: services.map(s => ({ serviceId: s.id, price: s.price, durationMin: s.durationMin })) } }, include: { customer: true } });
  if (a.customer.phone && fd.get('notify')) await sendWhatsapp(a.customer.phone, `Hola ${a.customer.name}, tu cita en ${business.name} quedó agendada (${a.code}).`);
  revalidatePath('/panel/agenda');
  return { ok: true };
}

export async function moveAppointment(id: string, staffId: string, startIso: string) {
  const { business } = await requireBusiness('agenda');
  const a = await db.appointment.findFirst({ where: { id, businessId: business.id } });
  if (!a) return { error: 'Cita no encontrada' };
  const start = new Date(startIso); const end = new Date(start.getTime() + (a.end.getTime() - a.start.getTime()));
  if (!(await isFree(business.id, staffId, start, end, a.id))) return { error: 'Horario ocupado' };
  await db.appointment.update({ where: { id }, data: { staffId, start, end, reminderSent: false } });
  revalidatePath('/panel/agenda');
  return { ok: true };
}

export async function setAppointmentStatus(id: string, status: string) {
  const { business } = await requireBusiness('agenda');
  const a = await db.appointment.findFirst({ where: { id, businessId: business.id }, include: { services: true } });
  if (!a) return { error: 'Cita no encontrada' };
  await db.$transaction(async tx => {
    await tx.appointment.update({ where: { id }, data: { status } });
    // Al completar, descuenta los insumos configurados (solo una vez)
    if (status === 'COMPLETADA' && a.status !== 'COMPLETADA') await consumeSupplies(tx, business.id, a.services.map(s => s.serviceId), a.code);
  });
  revalidatePath('/panel/agenda'); revalidatePath('/panel');
  return { ok: true };
}

export async function blockTime(_: unknown, fd: FormData) {
  const { business } = await requireBusiness('agenda');
  const date = String(fd.get('date'));
  const start = fromBogota(date, String(fd.get('from'))); const end = fromBogota(date, String(fd.get('to')));
  if (end <= start) return { error: 'La hora final debe ser mayor a la inicial.' };
  await db.blockedTime.create({ data: { businessId: business.id, staffId: String(fd.get('staffId') || '') || null, start, end, reason: String(fd.get('reason') || '') || null } });
  revalidatePath('/panel/agenda');
  return { ok: true };
}
export async function deleteBlock(id: string) {
  const { business } = await requireBusiness('agenda');
  await db.blockedTime.deleteMany({ where: { id, businessId: business.id } });
  revalidatePath('/panel/agenda');
}

/** Envía recordatorios por WhatsApp de las citas dentro de la ventana configurada. */
export async function sendRemindersFor(businessId: string) { return sendReminders(businessId); }
export async function sendRemindersNow() {
  const { business } = await requireBusiness('agenda');
  const n = await sendRemindersFor(business.id);
  revalidatePath('/panel/marketing');
  return { ok: true, sent: n };
}
