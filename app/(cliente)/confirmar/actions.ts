'use server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { confirmToken } from '@/lib/asistencia';
import { pushToBusiness } from '@/lib/push';
import { fechaCorta, hm, time12 } from '@/lib/format';

export async function answerAttendance(code: string, token: string, answer: 'SI' | 'NO') {
  if (token !== confirmToken(code)) return { error: 'Enlace no válido.' };
  const a = await db.appointment.findUnique({ where: { code }, include: { customer: { select: { name: true } } } });
  if (!a || !['PENDIENTE', 'CONFIRMADA'].includes(a.status)) return { error: 'Esta cita ya no está activa.' };
  if (a.start < new Date()) return { error: 'Esta cita ya pasó.' };
  if (answer === 'SI') await db.appointment.update({ where: { id: a.id }, data: { clientConfirmedAt: new Date() } });
  else await db.appointment.update({ where: { id: a.id }, data: { status: 'CANCELADA', clientConfirmedAt: null, notes: [a.notes, 'Cancelada por el cliente desde el recordatorio'].filter(Boolean).join(' · ') } });
  await pushToBusiness(a.businessId, answer === 'SI'
    ? { title: '✅ Cita confirmada', body: `${a.customer.name} confirmó su cita del ${fechaCorta(a.start)} a las ${time12(hm(a.start))}`, url: '/panel/recordatorios', tag: `cita-${code}` }
    : { title: '❌ Cita cancelada', body: `${a.customer.name} canceló su cita del ${fechaCorta(a.start)} a las ${time12(hm(a.start))}. El horario quedó libre.`, url: '/panel/agenda', tag: `cita-${code}` }, a.staffId);
  revalidatePath(`/confirmar/${code}`); revalidatePath('/panel/recordatorios'); revalidatePath('/panel/agenda');
  return { ok: true };
}
