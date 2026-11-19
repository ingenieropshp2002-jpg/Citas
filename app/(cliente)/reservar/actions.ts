'use server';
import { isSuspended } from '@/lib/subscription';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { getSlots, isFree, isOverlapError } from '@/lib/availability';
import { customerStrikes, depositRule } from '@/lib/asistencia';
import { getUser } from '@/lib/auth';
import { addDays, cop, fechaCorta, fromBogota, hm, time12, ymd } from '@/lib/format';
import { pushToBusiness } from '@/lib/push';
import { depositDue } from '@/lib/abono';
import { notifyFreed } from '@/lib/espera';
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

/** Próximos horarios libres (mismo profesional si lo eligió) después del horario que se ocupó. */
async function nextFree(businessId: string, date: string, time: string, dur: number, staffId: string | null, serviceIds: string[]) {
  const out: { date: string; time: string }[] = [];
  for (let i = 0; i < 14 && out.length < 6; i++) {
    const d = addDays(date, i);
    for (const s of await getSlots(businessId, d, dur, staffId, serviceIds)) {
      if (i === 0 && s.time <= time) continue;
      out.push({ date: d, time: s.time }); if (out.length >= 6) break;
    }
  }
  return out;
}

async function taken(businessId: string, input: { date: string; time: string; staffId: string | null; serviceIds: string[] }, dur: number) {
  const st = input.staffId ? await db.staff.findUnique({ where: { id: input.staffId }, select: { name: true } }) : null;
  return { error: `Otra persona acaba de reservar este horario${st ? ` con ${st.name.split(' ')[0]}` : ''}.`, taken: true, alternatives: await nextFree(businessId, input.date, input.time, dur, input.staffId, input.serviceIds) };
}

export async function createBooking(input: { businessId: string; serviceIds: string[]; staffId: string | null; date: string; time: string; method: string; phone?: string; coupon?: string; notes?: string }) {
  const user = await requireUser();
  const b = await db.business.findUniqueOrThrow({ where: { id: input.businessId } });
  if (isSuspended(b)) return { error: 'Este negocio no está recibiendo reservas en este momento.' };
  const services = await db.service.findMany({ where: { id: { in: input.serviceIds }, businessId: b.id, active: true } });
  if (!services.length) return { error: 'Selecciona al menos un servicio.' };
  const dur = services.reduce((a, s) => a + s.durationMin, 0);
  let total = services.reduce((a, s) => a + s.price, 0);
  let candidates: string[] = input.staffId ? [input.staffId] : [];
  if (!input.staffId) {
    const slot = (await getSlots(b.id, input.date, dur, null, input.serviceIds)).find(s => s.time === input.time);
    if (!slot) return await taken(b.id, input, dur);
    candidates = slot.staffIds;
  }
  const start = fromBogota(input.date, input.time); const end = new Date(start.getTime() + dur * 60000);
  if (start < new Date()) return { error: 'Elige un horario futuro.' };
  const free: string[] = [];
  for (const id of candidates) if (await isFree(b.id, id, start, end)) free.push(id);
  if (!free.length) return await taken(b.id, input, dur);
  const phone = (input.phone || user.phone || '').replace(/\D/g, '');
  const mine = await db.customer.findMany({ where: { businessId: b.id, OR: [{ userId: user.id }, ...(phone ? [{ phone }] : [])] } });
  const existing = mine.find(c => c.userId === user.id) || mine[0] || null;
  const rule = await depositRule(b, start, mine);
  if (rule.required && !rule.optionalLocal && input.method === 'EN_LOCAL') return { error: rule.reason || 'Esta reserva necesita un anticipo. Elige Nequi, PSE o tarjeta.' };
  const transfer = input.method === 'TRANSFERENCIA';
  if (transfer && (!b.transferInfo.trim() || !rule.required)) return { error: 'Este negocio no recibe abonos por transferencia. Elige otro medio de pago.' };
  let discount = 0; let couponCode = '';
  if (input.coupon) { const c = await applyCoupon(b.id, input.coupon, total); if ('error' in c) return { error: c.error }; discount = c.discount!; total -= discount; couponCode = c.code!; }
  let customer = existing;
  if (!customer) customer = await db.customer.create({ data: { businessId: b.id, userId: user.id, name: user.name, phone, email: user.email, tags: '["Nuevo"]' } });
  else if (!customer.userId) await db.customer.update({ where: { id: customer.id }, data: { userId: user.id } });
  const online = input.method !== 'EN_LOCAL';
  const deposit = online && rule.required ? Math.max(1000, Math.round((total * b.depositPercent) / 100 / 100) * 100) : 0;
  const code = await newCode();
  // La base de datos rechaza citas cruzadas (restricción Appointment_sin_cruces); si dos personas
  // reservan a la vez, solo una gana y a la otra se le intenta asignar otro profesional libre.
  let appt = null;
  for (const staffId of free) {
    try {
      appt = await db.appointment.create({ data: {
        code, businessId: b.id, customerId: customer.id, staffId, start, end, total, depositAmount: deposit,
        depositStatus: deposit ? 'PENDIENTE' : 'NO_APLICA', paymentMethod: input.method, depositDueAt: transfer && deposit ? depositDue(b.depositDeadlineMin, start) : null, notes: [input.notes, discount ? `Cupón ${input.coupon} (-${discount})` : ''].filter(Boolean).join(' · ') || null,
        status: 'PENDIENTE', services: { create: services.map(s => ({ serviceId: s.id, price: s.price, durationMin: s.durationMin })) }
      } });
      break;
    } catch (e) { if (!isOverlapError(e)) throw e; }
  }
  if (!appt) return await taken(b.id, input, dur);
  // Ya consiguió cita: sale de la lista de espera de este negocio.
  await db.waitEntry.updateMany({ where: { businessId: b.id, userId: user.id, status: 'ACTIVA' }, data: { status: 'RESERVADA' } });
  if (couponCode) await db.coupon.updateMany({ where: { businessId: b.id, code: couponCode }, data: { uses: { increment: 1 } } });
  if (deposit > 0 && transfer) {
    // Abono por transferencia: el cupo queda apartado hasta el plazo; el cliente sube el comprobante en /cita/[code].
    await db.payment.create({ data: { businessId: b.id, appointmentId: appt.id, method: 'TRANSFERENCIA', amount: deposit, status: 'PENDIENTE', provider: 'MANUAL', providerRef: `ABONO-${code}` } });
    await pushToBusiness(b.id, { title: '📅 Nueva reserva (abono pendiente)', body: `${customer.name} · ${input.date} ${input.time} · abono ${cop(deposit)} por transferencia`, url: '/admin/abonos', tag: `cita-${code}` }, appt.staffId);
    return { redirect: `/cita/${code}` };
  }
  if (deposit > 0) {
    const pay = await db.payment.create({ data: { businessId: b.id, appointmentId: appt.id, method: input.method, amount: deposit, status: 'PENDIENTE', provider: 'PENDIENTE' } });
    const co = await createCheckout({ reference: `${code}_${pay.id}`, amount: deposit, description: `Depósito cita ${code} - ${b.name}`, email: user.email, method: input.method, redirectUrl: `${appUrl()}/pago/retorno?ref=${code}_${pay.id}`, notificationUrl: `${appUrl()}/api/pagos/webhook` });
    await db.payment.update({ where: { id: pay.id }, data: { provider: co.provider } });
    return { redirect: co.url };
  }
  await pushToBusiness(b.id, { title: '📅 Nueva reserva', body: `${customer.name} · ${input.date} ${input.time}`, url: '/admin/agenda', tag: `cita-${code}` }, appt.staffId);
  if (phone) await sendWhatsapp(phone, `Hola ${user.name}, recibimos tu solicitud de cita en ${b.name} (${code}) para el ${fechaCorta(start)} a las ${time12(input.time)}. Te confirmaremos pronto.`, { phoneId: b.waPhoneId, businessId: b.id, template: { kind: 'CONFIRMACION', params: [user.name.split(' ')[0], b.name, `${fechaCorta(start)} a las ${time12(input.time)}`, 'reservada', `${appUrl()}/cita/${code}`] } });
  return { redirect: `/cita/${code}` };
}

/** Marca un pago como aprobado y confirma la cita (lo usan el webhook, el retorno y el modo simulado) */
export async function settlePayment(reference: string, approved: boolean, providerRef?: string) {
  const payId = reference.split('_')[1];
  const pay = await db.payment.findUnique({ where: { id: payId }, include: { appointment: { include: { customer: true, business: true } } } });
  if (!pay || pay.status === 'APROBADO') return pay;
  await db.payment.update({ where: { id: pay.id }, data: { status: approved ? 'APROBADO' : 'RECHAZADO', providerRef } });
  if (approved && reference.startsWith('SUB-')) { const { applySubscriptionPayment } = await import('@/app/admin/_actions/subscription'); await applySubscriptionPayment(pay.businessId, reference.slice(4).split('_')[0]); }
  if (pay.appointment) {
    await db.appointment.update({ where: { id: pay.appointment.id }, data: approved ? { depositStatus: 'PAGADO', status: 'CONFIRMADA' } : { depositStatus: 'PENDIENTE' } });
    if (approved && pay.appointment.customer.phone) await sendWhatsapp(pay.appointment.customer.phone, `✅ Tu cita ${pay.appointment.code} en ${pay.appointment.business.name} está confirmada. Te recordaremos antes de tu cita.`, { phoneId: pay.appointment.business.waPhoneId, businessId: pay.appointment.businessId, template: { kind: 'CONFIRMACION', params: [pay.appointment.customer.name.split(' ')[0], pay.appointment.business.name, `${fechaCorta(pay.appointment.start)} a las ${time12(hm(pay.appointment.start))}`, 'confirmada', `${appUrl()}/cita/${pay.appointment.code}`] } });
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
  await notifyFreed([a], null);
  await pushToBusiness(a.businessId, { title: '❌ Cita cancelada', body: `${a.customer.name} canceló su cita del ${fechaCorta(a.start)} a las ${time12(hm(a.start))}`, url: '/admin/agenda', tag: `cita-${a.code}` }, a.staffId);
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
  try { await db.appointment.update({ where: { id: a.id }, data: { start, end, reminderSent: false } }); }
  catch (e) { if (isOverlapError(e)) return { error: 'Alguien acaba de tomar ese horario. Elige otro.' }; throw e; }
  revalidatePath('/mis-citas');
  return { redirect: `/cita/${code}` };
}

export async function leaveReview(code: string, rating: number, comment: string) {
  const user = await requireUser();
  const a = await db.appointment.findUnique({ where: { code }, include: { customer: true, services: { include: { service: true } }, review: true } });
  if (!a || a.customer.userId !== user.id) return { error: 'Cita no encontrada' };
  if (a.status !== 'COMPLETADA') return { error: 'Solo puedes reseñar citas completadas.' };
  if (a.review) return { error: 'Ya dejaste una reseña para esta cita.' };
  await (await import('@/lib/resenas')).saveReview(a, { rating, comment, authorName: user.name, userId: user.id });
  revalidatePath('/mis-citas');
  return { ok: true };
}
export async function todayStr() { return ymd(new Date()); }

/** Para el paso de pago: ¿esta reserva exige anticipo y por qué? */
export async function depositCheck(businessId: string, date: string, time: string, phone?: string) {
  const b = await db.business.findUnique({ where: { id: businessId } });
  if (!b) return { required: false, mandatory: false, reason: '', faltas: 0, limite: 0 };
  const user = await getUser();
  const p = (phone || user?.phone || '').replace(/\D/g, '');
  const mine = user ? await db.customer.findMany({ where: { businessId, OR: [{ userId: user.id }, ...(p ? [{ phone: p }] : [])] } }) : [];
  const r = await depositRule(b, date && time ? fromBogota(date, time) : null, mine);
  const faltas = mine.length ? await customerStrikes(businessId, mine.map(c => c.id)) : 0;
  return { required: r.required, mandatory: r.required && !r.optionalLocal, reason: r.reason, faltas, limite: b.depositForNoShows && b.depositPercent > 0 ? b.noShowLimit : 0 };
}
