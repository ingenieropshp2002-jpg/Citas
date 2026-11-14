'use server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { getSlots, isFree } from '@/lib/availability';
import { fromBogota, ymd } from '@/lib/format';
import { createCheckout } from '@/lib/payments';
import { sendWhatsapp } from '@/lib/notify';
import { revalidatePath } from 'next/cache';

const appUrl = () => process.env.APP_URL || 'http://localhost:3000';
export async function newCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return 'RC-' + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export async function applyCoupon(businessId: string, code: string, total: number) {
  const c = await db.coupon.findFirst({ where: { businessId, code: code.trim().toUpperCase(), active: true } });
  if (!c) return { error: 'Cupón no válido' };
  if (c.validUntil && c.validUntil < new Date()) return { error: 'El cupón venció' };
  if (c.maxUses && c.uses >= c.maxUses) return { error: 'El cupón ya alcanzó su límite de usos' };
  const discount = c.type === 'PORCENTAJE' ? Math.round(total * c.value / 100) : Math.min(c.value, total);
  return { discount, code: c.code };
}

export async function createBooking(input: { businessId: string; serviceIds: string[]; staffId: string | null; date: string; time: string; method: string; phone?: string; coupon?: string; notes?: string }) {
  const user = await requireUser();
  const b = await db.business.findUniqueOrThrow({ where: { id: input.businessId } });
  const services = await db.service.findMany({ where: { id: { in: input.serviceIds }, businessId: b.id, active: true } });
  if (!services.length) return { error: 'Selecciona al menos un servicio.' };
  const dur = services.reduce((a, s) => a + s.durationMin, 0);
  let total = services.reduce((a, s) => a + s.price, 0);
  let staffId = input.staffId;
  if (!staffId) {
    const slot = (await getSlots(b.id, input.date, dur, null, input.serviceIds)).find(s => s.time === input.time);
    if (!slot) return { error: 'Ese horario ya no está disponible. Elige otro.' };
    staffId = slot.staffIds[0];
  }
  const start = fromBogota(input.date, input.time); const end = new Date(start.getTime() + dur * 60000);
  if (start < new Date()) return { error: 'Elige un horario futuro.' };
  if (!(await isFree(b.id, staffId, start, end))) return { error: 'Ese horario acaba de ocuparse. Elige otro.' };
  let discount = 0;
  if (input.coupon) { const c = await applyCoupon(b.id, input.coupon, total); if ('error' in c) return { error: c.error }; discount = c.discount!; total -= discount; await db.coupon.updateMany({ where: { businessId: b.id, code: c.code }, data: { uses: { increment: 1 } } }); }
  const phone = (input.phone || user.phone || '').replace(/\D/g, '');
  let customer = await db.customer.findFirst({ where: { businessId: b.id, OR: [{ userId: user.id }, ...(phone ? [{ phone }] : [])] } });
  if (!customer) customer = await db.customer.create({ data: { businessId: b.id, userId: user.id, name: user.name, phone, email: user.email, tags: '["Nuevo"]' } });
  else if (!customer.userId) await db.customer.update({ where: { id: customer.id }, data: { userId: user.id } });
  const online = input.method !== 'EN_LOCAL';
  const deposit = online && b.requireDeposit ? Math.round((total * b.depositPercent) / 100 / 100) * 100 : 0;
  const code = await newCode();
  const appt = await db.appointment.create({ data: {
    code, businessId: b.id, customerId: customer.id, staffId, start, end, total, depositAmount: deposit,
    depositStatus: deposit ? 'PENDIENTE' : 'NO_APLICA', paymentMethod: input.method, notes: [input.notes, discount ? `Cupón ${input.coupon} (-${discount})` : ''].filter(Boolean).join(' · ') || null,
    status: 'PENDIENTE', services: { create: services.map(s => ({ serviceId: s.id, price: s.price, durationMin: s.durationMin })) }
  } });
  if (deposit > 0) {
    const pay = await db.payment.create({ data: { businessId: b.id, appointmentId: appt.id, method: input.method, amount: deposit, status: 'PENDIENTE', provider: 'PENDIENTE' } });
    const co = await createCheckout({ reference: `${code}_${pay.id}`, amount: deposit, description: `Depósito cita ${code} - ${b.name}`, email: user.email, method: input.method, redirectUrl: `${appUrl()}/pago/retorno?ref=${code}_${pay.id}`, notificationUrl: `${appUrl()}/api/pagos/webhook` });
    await db.payment.update({ where: { id: pay.id }, data: { provider: co.provider } });
    return { redirect: co.url };
  }
  if (phone) await sendWhatsapp(phone, `Hola ${user.name}, recibimos tu solicitud de cita en ${b.name} (${code}) para el ${input.date} a las ${input.time}. Te confirmaremos pronto.`);
  return { redirect: `/cita/${code}` };
}

/** Marca un pago como aprobado y confirma la cita (lo usan el webhook, el retorno y el modo simulado) */
export async function settlePayment(reference: string, approved: boolean, providerRef?: string) {
  const payId = reference.split('_')[1];
  const pay = await db.payment.findUnique({ where: { id: payId }, include: { appointment: { include: { customer: true, business: true } } } });
  if (!pay || pay.status === 'APROBADO') return pay;
  await db.payment.update({ where: { id: pay.id }, data: { status: approved ? 'APROBADO' : 'RECHAZADO', providerRef } });
  if (approved && reference.startsWith('SUB-')) { const { applySubscriptionPayment } = await import('@/app/panel/_actions/subscription'); await applySubscriptionPayment(pay.businessId, reference.slice(4).split('_')[0]); }
  if (pay.appointment) {
    await db.appointment.update({ where: { id: pay.appointment.id }, data: approved ? { depositStatus: 'PAGADO', status: 'CONFIRMADA' } : { depositStatus: 'PENDIENTE' } });
    if (approved && pay.appointment.customer.phone) await sendWhatsapp(pay.appointment.customer.phone, `✅ Tu cita ${pay.appointment.code} en ${pay.appointment.business.name} está confirmada. Te recordaremos antes de tu cita.`);
  }
  return pay;
}

export async function cancelMine(code: string) {
  const user = await requireUser();
  const a = await db.appointment.findUnique({ where: { code }, include: { customer: true, business: true } });
  if (!a || a.customer.userId !== user.id) return { error: 'Cita no encontrada' };
  if (['CANCELADA', 'COMPLETADA', 'NO_ASISTIO'].includes(a.status)) return { error: 'Esta cita ya no se puede cancelar.' };
  const hoursLeft = (a.start.getTime() - Date.now()) / 3600000;
  const refundable = hoursLeft >= a.business.cancellationHours;
  await db.appointment.update({ where: { id: a.id }, data: { status: 'CANCELADA', depositStatus: a.depositStatus === 'PAGADO' ? (refundable ? 'REEMBOLSADO' : 'PAGADO') : a.depositStatus } });
  revalidatePath('/mis-citas');
  return { ok: true, refundable };
}

export async function rescheduleMine(code: string, date: string, time: string) {
  const user = await requireUser();
  const a = await db.appointment.findUnique({ where: { code }, include: { customer: true, business: true } });
  if (!a || a.customer.userId !== user.id) return { error: 'Cita no encontrada' };
  if (!['PENDIENTE', 'CONFIRMADA'].includes(a.status)) return { error: 'Esta cita ya no se puede reprogramar.' };
  if ((a.start.getTime() - Date.now()) / 3600000 < a.business.cancellationHours) return { error: `Solo puedes reprogramar con ${a.business.cancellationHours} h de anticipación. Comunícate con el negocio.` };
  const dur = a.end.getTime() - a.start.getTime();
  const start = fromBogota(date, time); const end = new Date(start.getTime() + dur);
  if (!(await isFree(a.businessId, a.staffId, start, end, a.id))) return { error: 'Ese horario no está disponible.' };
  await db.appointment.update({ where: { id: a.id }, data: { start, end, reminderSent: false } });
  revalidatePath('/mis-citas');
  return { redirect: `/cita/${code}` };
}

export async function leaveReview(code: string, rating: number, comment: string) {
  const user = await requireUser();
  const a = await db.appointment.findUnique({ where: { code }, include: { customer: true, services: { include: { service: true } }, review: true } });
  if (!a || a.customer.userId !== user.id) return { error: 'Cita no encontrada' };
  if (a.status !== 'COMPLETADA') return { error: 'Solo puedes reseñar citas completadas.' };
  if (a.review) return { error: 'Ya dejaste una reseña para esta cita.' };
  const r = Math.min(5, Math.max(1, Math.round(rating)));
  await db.review.create({ data: { businessId: a.businessId, appointmentId: a.id, userId: user.id, staffId: a.staffId, authorName: user.name, rating: r, comment: comment.slice(0, 1000), serviceName: a.services[0]?.service.name } });
  const agg = await db.review.aggregate({ where: { businessId: a.businessId }, _avg: { rating: true }, _count: true });
  const biz = await db.business.findUniqueOrThrow({ where: { id: a.businessId } });
  // Mantiene el histórico (reviewCount puede incluir reseñas importadas)
  await db.business.update({ where: { id: a.businessId }, data: { reviewCount: biz.reviewCount + 1, rating: Math.round(((biz.rating * biz.reviewCount + r) / (biz.reviewCount + 1)) * 10) / 10 } });
  void agg;
  revalidatePath('/mis-citas');
  return { ok: true };
}
export async function todayStr() { return ymd(new Date()); }
