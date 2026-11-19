'use server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
import { isOverlapError } from '@/lib/availability';
import { sendWhatsapp, waConfigured } from '@/lib/notify';
import { activePeak, createWalkIn, notifyUpcoming, peakRules, QUEUE_DEFAULT_MIN, turnMessage, type PeakRule } from '@/lib/fila';
import { ymd } from '@/lib/format';
import { newCode } from '@/app/(cliente)/reservar/actions';

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const done = () => revalidatePath('/admin/fila');

export async function addWalkInPanel(_: unknown, fd: FormData) {
  const { business: b } = await requireBusiness('agenda');
  const name = str(fd, 'name'); const phone = str(fd, 'phone').replace(/\D/g, '');
  if (!name) return { error: 'Escribe el nombre.' };
  const peak = activePeak(b);
  if (peak) return { error: `Ahora es hora pico (${peak.label || 'solo con cita'}): en este horario solo se atiende con reserva.` };
  if (b.queueOpenDate !== ymd(new Date())) return { error: 'Primero abre la fila de hoy con el botón "Abrir fila".' };
  await createWalkIn(b, { name, phone: phone || null, serviceId: str(fd, 'serviceId') || null });
  await notifyUpcoming(b); done();
  return { ok: true };
}

export async function markNotified(id: string) {
  const { business: b } = await requireBusiness('agenda');
  await db.walkIn.updateMany({ where: { id, businessId: b.id }, data: { notifiedAt: new Date() } }); done();
}

export async function callWalkIn(id: string) {
  const { business: b } = await requireBusiness('agenda');
  const w = await db.walkIn.findFirst({ where: { id, businessId: b.id } });
  if (!w) return;
  await db.walkIn.update({ where: { id }, data: { status: 'LLAMADO', calledAt: new Date() } });
  if (w.phone && waConfigured()) await sendWhatsapp(w.phone, turnMessage(w, b.name), { phoneId: b.waPhoneId });
  done();
}

export async function closeWalkIn(id: string, status: 'NO_VINO' | 'CANCELADO') {
  const { business: b } = await requireBusiness('agenda');
  await db.walkIn.updateMany({ where: { id, businessId: b.id }, data: { status } });
  await notifyUpcoming(b); done();
}

/** Pasa a atención en el hueco libre de un profesional: crea la cita "en servicio" desde ahora, así nadie puede reservar encima. */
export async function attendWalkIn(_: unknown, fd: FormData) {
  const { business: b } = await requireBusiness('agenda');
  const w = await db.walkIn.findFirst({ where: { id: str(fd, 'id'), businessId: b.id } });
  if (!w || !['ESPERANDO', 'LLAMADO'].includes(w.status)) return { error: 'Este turno ya no está en la fila.' };
  const staffId = str(fd, 'staffId'); if (!staffId) return { error: 'Elige quién lo atiende.' };
  const service = w.serviceId ? await db.service.findFirst({ where: { id: w.serviceId, businessId: b.id } }) : null;
  const dur = service?.durationMin || QUEUE_DEFAULT_MIN;
  const start = new Date(Math.floor(Date.now() / 60000) * 60000); const end = new Date(start.getTime() + dur * 60000);
  let customer = w.phone ? await db.customer.findFirst({ where: { businessId: b.id, phone: w.phone } }) : null;
  if (!customer) customer = await db.customer.create({ data: { businessId: b.id, name: w.name, phone: w.phone, tags: '["Sin cita"]' } });
  try {
    const appt = await db.appointment.create({ data: {
      code: await newCode(), businessId: b.id, customerId: customer.id, staffId, start, end, total: service?.price || 0,
      status: 'EN_SERVICIO', source: 'FILA', notes: `Turno #${w.number} de la fila`,
      ...(service ? { services: { create: [{ serviceId: service.id, price: service.price, durationMin: service.durationMin }] } } : {})
    } });
    await db.walkIn.update({ where: { id: w.id }, data: { status: 'ATENDIENDO', appointmentId: appt.id, calledAt: w.calledAt || new Date() } });
  } catch (e) {
    if (isOverlapError(e)) return { error: 'Ese profesional ya tiene una cita en ese tiempo. Elige otro o espera el siguiente hueco.' };
    throw e;
  }
  await notifyUpcoming(b); done(); revalidatePath('/admin/agenda');
  return { ok: true };
}

export async function saveQueueSettings(_: unknown, fd: FormData) {
  const { business: b } = await requireBusiness('configuracion');
  await db.business.update({ where: { id: b.id }, data: { queueEnabled: fd.get('queueEnabled') === 'on', queueNotifyAhead: Math.min(10, Math.max(0, Number(str(fd, 'queueNotifyAhead')) || 0)) } });
  done(); return { ok: true };
}

export async function addPeakRule(_: unknown, fd: FormData) {
  const { business: b } = await requireBusiness('configuracion');
  const from = str(fd, 'from'); const to = str(fd, 'to');
  if (!/^\d\d:\d\d$/.test(from) || !/^\d\d:\d\d$/.test(to) || from >= to) return { error: 'Revisa las horas: la hora final debe ser después de la inicial.' };
  const startDate = str(fd, 'startDate') || undefined; const endDate = str(fd, 'endDate') || undefined;
  if (startDate && endDate && startDate > endDate) return { error: 'La fecha final debe ser igual o posterior a la inicial.' };
  const rule: PeakRule = { id: Math.random().toString(36).slice(2, 9), label: str(fd, 'label') || 'Hora pico', days: fd.getAll('days').map(Number).filter(n => n >= 0 && n <= 6), from, to, startDate, endDate };
  await db.business.update({ where: { id: b.id }, data: { peakRules: JSON.stringify([...peakRules(b), rule]) } });
  done(); return { ok: true };
}

export async function deletePeakRule(id: string) {
  const { business: b } = await requireBusiness('configuracion');
  await db.business.update({ where: { id: b.id }, data: { peakRules: JSON.stringify(peakRules(b).filter(r => r.id !== id)) } });
  done();
}

/** El dueño abre o cierra la fila del día (se cierra sola al día siguiente). */
export async function setQueueOpen(open: boolean) {
  const { business: b } = await requireBusiness('agenda');
  await db.business.update({ where: { id: b.id }, data: { queueOpenDate: open ? ymd(new Date()) : null } });
  done(); revalidatePath(`/negocio/${b.slug}`);
}
