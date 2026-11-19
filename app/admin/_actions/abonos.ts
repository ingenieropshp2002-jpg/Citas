'use server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
import { sendWhatsapp } from '@/lib/notify';
import { fechaLarga, hm, time12 } from '@/lib/format';

async function load(fd: FormData) {
  const { business } = await requireBusiness('agenda');
  const a = await db.appointment.findFirst({ where: { id: String(fd.get('id') || ''), businessId: business.id }, include: { customer: true } });
  return { business, a };
}

/** "Abono recibido": queda pagado y la cita se confirma sola. */
export async function acceptDeposit(fd: FormData) {
  const { business, a } = await load(fd);
  if (!a || a.depositStatus !== 'PENDIENTE') return { error: 'Este abono ya no está pendiente.' };
  if (a.status === 'CANCELADA') return { error: 'La cita ya se canceló; el horario pudo ser tomado por otra persona.' };
  await db.$transaction([
    db.appointment.update({ where: { id: a.id }, data: { depositStatus: 'PAGADO', status: a.status === 'PENDIENTE' ? 'CONFIRMADA' : a.status } }),
    db.payment.updateMany({ where: { appointmentId: a.id, status: 'PENDIENTE' }, data: { status: 'APROBADO' } })
  ]);
  if (a.customer.phone) await sendWhatsapp(a.customer.phone, `✅ ${a.customer.name.split(' ')[0]}, recibimos tu abono. Tu cita en ${business.name} el ${fechaLarga(a.start)} a las ${time12(hm(a.start))} quedó confirmada (${a.code}).`, { phoneId: business.waPhoneId, businessId: business.id, template: { kind: 'CONFIRMACION', params: [a.customer.name.split(' ')[0], business.name, `${fechaLarga(a.start)} a las ${time12(hm(a.start))}`, 'confirmada (abono recibido)', `${(process.env.APP_URL || '').replace(/\/$/, '')}/cita/${a.code}`] } });
  revalidatePath('/admin/abonos'); revalidatePath('/admin/agenda');
  return { ok: true };
}

/** Rechazar el comprobante: se borra y el cliente puede subir otro dentro del plazo (mínimo 30 minutos más). */
export async function rejectDeposit(fd: FormData) {
  const { business, a } = await load(fd);
  if (!a || a.depositStatus !== 'PENDIENTE') return { error: 'Este abono ya no está pendiente.' };
  const reason = String(fd.get('reason') || '').trim().slice(0, 200);
  const due = new Date(Math.min(a.start.getTime(), Math.max(a.depositDueAt?.getTime() || 0, Date.now() + 30 * 60000)));
  await db.$transaction([
    db.depositProof.deleteMany({ where: { appointmentId: a.id } }),
    db.appointment.update({ where: { id: a.id }, data: { depositProofAt: null, depositDueAt: due, notes: [a.notes, `Comprobante rechazado${reason ? `: ${reason}` : ''}`].filter(Boolean).join(' · ') } })
  ]);
  if (a.customer.phone) await sendWhatsapp(a.customer.phone, `Hola ${a.customer.name.split(' ')[0]}, en ${business.name} no pudimos validar el comprobante de tu abono${reason ? ` (${reason})` : ''}. Puedes subir otro antes de las ${time12(hm(due))}: ${(process.env.APP_URL || '').replace(/\/$/, '')}/cita/${a.code}`, { phoneId: business.waPhoneId });
  revalidatePath('/admin/abonos');
  return { ok: true };
}
