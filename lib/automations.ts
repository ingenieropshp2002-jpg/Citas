import { db } from './db';
import { bogota, fechaLarga, hm, time12 } from './format';
import { fillVars, sendWhatsapp, waConfigured } from './notify';
import { subscriptionState } from './subscription';
import { confirmLink, reminderText, sweepAppointments } from './asistencia';

const appUrl = () => process.env.APP_URL || 'http://localhost:3000';

/** Recordatorios por WhatsApp con enlace "Confirmo / Cancelo": uno el día anterior y otro 1 hora antes. */
export async function sendReminders(businessId: string) {
  if (!waConfigured()) return 0; // modo manual: se envían desde /panel/recordatorios
  const b = await db.business.findUniqueOrThrow({ where: { id: businessId } });
  if (!b.notifyWhatsapp) return 0;
  const include = { customer: true, staff: true, services: { include: { service: true } } } as const;
  const base = { businessId, status: { in: ['CONFIRMADA', 'PENDIENTE'] }, start: { gt: new Date() } };
  const day = await db.appointment.findMany({ where: { ...base, reminderSent: false, start: { gt: new Date(Date.now() + 70 * 60000), lte: new Date(Date.now() + b.reminderHours * 3600000) } }, include });
  const hour = b.reminderHourBefore ? await db.appointment.findMany({ where: { ...base, reminder1hSent: false, clientConfirmedAt: null, start: { gt: new Date(), lte: new Date(Date.now() + 70 * 60000) } }, include }) : [];
  for (const [list, kind] of [[day, 'DIA'], [hour, 'HORA']] as const) for (const a of list) {
    if (a.customer.phone) {
      const when = `${fechaLarga(a.start)} a las ${time12(hm(a.start))}`;
      await sendWhatsapp(a.customer.phone, reminderText(a, b, kind), { phoneId: b.waPhoneId, template: { kind: 'RECORDATORIO', params: [a.customer.name.split(' ')[0], b.name, when, a.staff.name, confirmLink(a.code)] } });
    }
    await db.appointment.update({ where: { id: a.id }, data: kind === 'DIA' ? { reminderSent: true } : { reminder1hSent: true } });
  }
  return day.length + hour.length;
}

/** Saludo de cumpleaños (una vez al año, desde las 9 a. m. hora Colombia). */
export async function sendBirthdays(businessId: string, force = false) {
  const b = await db.business.findUniqueOrThrow({ where: { id: businessId } });
  const now = bogota(new Date());
  if (!waConfigured()) return 0;
  if (!b.birthdayEnabled || (!force && now.h < 9)) return 0;
  const list = (await db.customer.findMany({ where: { businessId, birthday: { not: null }, phone: { not: null } } }))
    .filter(c => { const d = bogota(c.birthday!); return d.m === now.m && d.d === now.d && c.birthdayGreetedYear !== now.y; });
  for (const c of list) {
    const text = fillVars(b.birthdayMessage, { nombre: c.name.split(' ')[0], negocio: b.name, link: `${appUrl()}/negocio/${b.slug}`, cupon: b.birthdayCoupon || '', puntos: c.points });
    await sendWhatsapp(c.phone!, text, { phoneId: b.waPhoneId, template: { kind: 'CUMPLEANOS', params: [c.name.split(' ')[0], b.name] } });
    await db.customer.update({ where: { id: c.id }, data: { birthdayGreetedYear: now.y } });
  }
  return list.length;
}

/** Marca como vencidas las pruebas gratis que terminaron. */
export async function refreshSubscription(businessId: string) {
  const b = await db.business.findUniqueOrThrow({ where: { id: businessId } });
  const s = subscriptionState(b);
  if (s.state === 'VENCIDA' && b.subscriptionStatus !== 'VENCIDA') await db.business.update({ where: { id: b.id }, data: { subscriptionStatus: 'VENCIDA' } });
  return s.state;
}

/** Todo lo automático de un negocio. Lo llama /api/cron/recordatorios cada 15 minutos. */
export async function runAutomations(businessId: string) {
  await sweepAppointments(businessId, true);
  const reminders = await sendReminders(businessId);
  const birthdays = await sendBirthdays(businessId);
  const subscription = await refreshSubscription(businessId);
  return { reminders, birthdays, subscription };
}
