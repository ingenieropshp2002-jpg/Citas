// Avisos por WhatsApp al negocio: cita nueva, cancelada o reprogramada (a la recepción, al profesional o a ambos)
// y resumen de la mañana para cada profesional con sus citas del día.
import { db } from './db';
import { sendWhatsapp } from './notify';
import { bogota, fechaLarga, fromBogota, hm, time12, ymd } from './format';

const appUrl = () => (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
const cel = (p: string | null | undefined) => { const d = (p || '').replace(/\D/g, '').replace(/^57(?=\d{10}$)/, ''); return /^3\d{9}$/.test(d) ? d : null; };
export type AvisoKind = 'NUEVA' | 'CANCELADA' | 'REPROGRAMADA';
const TITLE: Record<AvisoKind, string> = { NUEVA: '📅 Nueva cita', CANCELADA: '❌ Cita cancelada', REPROGRAMADA: '🔁 Cita reprogramada' };

/** Avisa al negocio por WhatsApp. Nunca frena la reserva: los errores solo quedan en el registro. */
export async function avisarNegocio(appointmentId: string, kind: AvisoKind, antes?: Date) {
  try {
    const a = await db.appointment.findUnique({ where: { id: appointmentId }, include: {
      business: { select: { id: true, name: true, notifyTo: true, receptionWhatsapp: true, waPhoneId: true } },
      customer: { select: { name: true, phone: true } }, staff: { select: { name: true, whatsapp: true, user: { select: { phone: true } } } },
      services: { include: { service: { select: { name: true } } } }
    } });
    if (!a) return;
    const b = a.business; const mode = b.notifyTo || 'RECEPCION';
    if (mode === 'NADIE') return;
    const to = new Set<string>();
    if (mode !== 'PROFESIONAL') { const r = cel(b.receptionWhatsapp); if (r) to.add(r); }
    if (mode !== 'RECEPCION') { const p = cel(a.staff?.whatsapp) || cel(a.staff?.user?.phone); if (p) to.add(p); }
    if (!to.size) return;
    const when = `${fechaLarga(a.start)} a las ${time12(hm(a.start))}`;
    const cliente = `${a.customer.name}${a.customer.phone ? ` (${a.customer.phone})` : ''}`;
    const quien = a.staff?.name.split(' ')[0] || 'cualquier profesional';
    const servicios = a.services.map(s => s.service.name).join(' + ') || 'Cita';
    const cuando = kind === 'REPROGRAMADA' && antes ? `antes ${fechaLarga(antes)} ${time12(hm(antes))}, ahora ${when}` : when;
    const link = `${appUrl()}/admin/agenda?fecha=${ymd(a.start)}`;
    const text = `${TITLE[kind]} en ${b.name}: ${cliente}, ${cuando}, con ${quien}. Servicio: ${servicios}. Agenda: ${link}`;
    for (const phone of to) {
      await sendWhatsapp(phone, text, { phoneId: b.waPhoneId, businessId: b.id, template: { kind: 'AVISO_NEGOCIO', params: [TITLE[kind].replace(/^\S+\s/, ''), b.name, cliente, cuando, quien, servicios, link] } });
    }
  } catch (e) { console.error('[avisos]', e); }
}

/** Resumen de la mañana (desde las 7:00 a. m.): a cada profesional con WhatsApp, sus citas de hoy. Una vez al día. */
export async function resumenesDelDia() {
  const now = new Date(); const b0 = bogota(now);
  if (b0.h < 7 || b0.h >= 11) return 0;
  const today = ymd(now);
  const staff = await db.staff.findMany({ where: { active: true, OR: [{ summaryDay: null }, { summaryDay: { not: today } }], business: { active: true, notifyTo: { in: ['PROFESIONAL', 'AMBOS'] } } }, include: { business: { select: { id: true, name: true, waPhoneId: true } }, user: { select: { phone: true } } } });
  let n = 0;
  for (const s of staff) {
    const phone = cel(s.whatsapp) || cel(s.user?.phone);
    await db.staff.update({ where: { id: s.id }, data: { summaryDay: today } });
    if (!phone) continue;
    const start = fromBogota(today, '00:00'); const end = new Date(start.getTime() + 86400000);
    const list = await db.appointment.findMany({ where: { staffId: s.id, start: { gte: start, lt: end }, status: { in: ['PENDIENTE', 'CONFIRMADA'] } }, include: { customer: { select: { name: true } }, services: { include: { service: { select: { name: true } } } } }, orderBy: { start: 'asc' } });
    if (!list.length) continue;
    const items = list.map(a => `${time12(hm(a.start))} ${a.customer.name.split(' ')[0]} (${a.services.map(x => x.service.name).join(' + ')})`).join('; ');
    const cuantas = `${list.length} ${list.length === 1 ? 'cita' : 'citas'}`;
    const link = `${appUrl()}/admin/agenda`;
    const first = s.name.split(' ')[0];
    await sendWhatsapp(phone, `Buenos días ${first}, hoy tienes ${cuantas} en ${s.business.name}: ${items}. Tu agenda: ${link}`, { phoneId: s.business.waPhoneId, businessId: s.business.id, template: { kind: 'RESUMEN_DIA', params: [first, cuantas, s.business.name, items.slice(0, 900), link] } });
    n++;
  }
  return n;
}
