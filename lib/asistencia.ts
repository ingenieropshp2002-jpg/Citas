// Confirmación de asistencia, tolerancia de retraso, liberación de cupos y anticipos para quien incumple.
import { createHmac } from 'crypto';
import { db } from './db';
import { fechaLarga, hm, time12, ymd, bogota } from './format';
import { peakRules } from './fila';
import { DEPOSIT_NOTE } from './abono';

const appUrl = () => (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
export const confirmToken = (code: string) => createHmac('sha256', (process.env.AUTH_SECRET || 'dev-secret-change-me') + ':confirmar').update(code).digest('base64url').slice(0, 16);
export const confirmLink = (code: string) => `${appUrl()}/confirmar/${code}?t=${confirmToken(code)}`;

const LATE_MIN = 5; // desde 5 minutos se cuenta como llegada tarde
const WINDOW_DAYS = 180;
export const RELEASED_NOTE = 'Cupo liberado: no confirmó';
export const NOSHOW_NOTE = 'No llegó (tolerancia vencida)';

type Appt = { code: string; start: Date; customer: { name: string }; staff: { name: string }; services: { service: { name: string } }[] };
export function reminderText(a: Appt, b: { name: string; address: string }, kind: 'DIA' | 'HORA') {
  const first = a.customer.name.split(' ')[0];
  const when = kind === 'HORA' ? `hoy a las ${time12(hm(a.start))} (en 1 hora)` : `${ymd(a.start) === ymd(new Date()) ? 'hoy' : 'mañana'}, ${fechaLarga(a.start)}, a las ${time12(hm(a.start))}`;
  return `${kind === 'HORA' ? '⏰' : '📅'} Hola ${first}, te recordamos tu cita en ${b.name} ${when} con ${a.staff.name} (${a.services.map(s => s.service.name).join(' + ')}).\n\nPor favor toca aquí para responder *Confirmo* o *Cancelo*:\n${confirmLink(a.code)}\n\nSi no confirmas, el cupo puede quedar libre para otra persona.\n📍 ${b.address}`;
}

/** Historial de cumplimiento de un cliente en los últimos 6 meses. */
export async function attendanceRecord(businessId: string, customerIds: string[]) {
  const since = new Date(Date.now() - WINDOW_DAYS * 864e5);
  const rows = await db.appointment.findMany({ where: { businessId, customerId: { in: customerIds }, start: { gte: since, lt: new Date() } }, select: { customerId: true, status: true, notes: true, arrivedLateMin: true, start: true } });
  const out = new Map<string, { total: number; noShows: number; released: number; lates: number; last: Date | null }>();
  for (const id of customerIds) out.set(id, { total: 0, noShows: 0, released: 0, lates: 0, last: null });
  for (const r of rows) {
    const o = out.get(r.customerId)!; o.total++;
    if (r.status === 'NO_ASISTIO') o.noShows++;
    else if (r.status === 'CANCELADA' && r.notes?.includes(RELEASED_NOTE)) o.released++;
    if ((r.arrivedLateMin ?? 0) >= LATE_MIN) o.lates++;
    if ((r.status === 'NO_ASISTIO' || (r.arrivedLateMin ?? 0) >= LATE_MIN) && (!o.last || r.start > o.last)) o.last = r.start;
  }
  return out;
}
/** Puntaje de incumplimiento: faltar o no confirmar pesa 1; dos llegadas tarde pesan 1. */
export const strikes = (r: { noShows: number; released: number; lates: number }) => r.noShows + r.released + Math.floor(r.lates / 2);

export function inPeak(b: { peakRules: string }, start: Date) {
  const date = ymd(start); const dow = bogota(start).dow; const t = hm(start);
  return peakRules(b).find(r => (!r.startDate || date >= r.startDate) && (!r.endDate || date <= r.endDate) && (!r.days?.length || r.days.includes(dow)) && t >= r.from && t < r.to) || null;
}

/** ¿Esta reserva necesita anticipo? Devuelve el motivo para mostrárselo al cliente. */
export async function depositRule(b: { id: string; requireDeposit: boolean; depositPercent: number; depositInPeak: boolean; depositForNoShows: boolean; noShowLimit: number; peakRules: string }, start: Date | null, customers: { id: string; requireDeposit: boolean }[]) {
  if (b.depositPercent <= 0) return { required: false, reason: '' };
  if (customers.some(c => c.requireDeposit)) return { required: true, reason: 'Por tu historial de citas, este negocio te pide un anticipo para reservar.' };
  if (customers.length && b.depositForNoShows) {
    const recs = [...(await attendanceRecord(b.id, customers.map(c => c.id))).values()];
    const total = recs.reduce((a, r) => ({ noShows: a.noShows + r.noShows, released: a.released + r.released, lates: a.lates + r.lates }), { noShows: 0, released: 0, lates: 0 });
    if (strikes(total) >= b.noShowLimit) return { required: true, reason: 'Por citas anteriores sin asistir o con retraso, este negocio te pide un anticipo para reservar.' };
  }
  if (start && b.depositInPeak) { const p = inPeak(b, start); if (p) return { required: true, reason: `En temporada alta (${p.label}) las reservas se aseguran con un anticipo.` }; }
  if (b.requireDeposit) return { required: true, reason: '', optionalLocal: true };
  return { required: false, reason: '' };
}

const lastSweep = new Map<string, number>();
/** Libera cupos sin confirmar y marca "no llegó" cuando pasa la tolerancia. Se ejecuta al consultar la agenda y por cron. */
export async function sweepAppointments(businessId: string, force = false) {
  const now = Date.now();
  if (!force && now - (lastSweep.get(businessId) || 0) < 60_000) return { released: 0, noShows: 0 };
  lastSweep.set(businessId, now);
  const b = await db.business.findUnique({ where: { id: businessId }, select: { releaseUnconfirmed: true, releaseBeforeMin: true, lateToleranceMin: true } });
  if (!b) return { released: 0, noShows: 0 };
  let released = 0, noShows = 0;
  if (b.releaseUnconfirmed) {
    const list = await db.appointment.findMany({ where: { businessId, status: { in: ['PENDIENTE', 'CONFIRMADA'] }, clientConfirmedAt: null, source: { not: 'FILA' }, depositStatus: { not: 'PAGADO' },
      OR: [{ reminderSent: true }, { reminder1hSent: true }], start: { gt: new Date(now), lte: new Date(now + b.releaseBeforeMin * 60000) } }, select: { id: true, notes: true } });
    for (const a of list) await db.appointment.update({ where: { id: a.id }, data: { status: 'CANCELADA', notes: [a.notes, RELEASED_NOTE].filter(Boolean).join(' · ') } });
    released = list.length;
  }
  // Abono por transferencia vencido sin comprobante: se cancela y el horario queda libre.
  {
    const list = await db.appointment.findMany({ where: { businessId, status: 'PENDIENTE', paymentMethod: 'TRANSFERENCIA', depositStatus: 'PENDIENTE', depositProofAt: null, depositDueAt: { lte: new Date(now) } }, select: { id: true, notes: true } });
    for (const a of list) await db.appointment.update({ where: { id: a.id }, data: { status: 'CANCELADA', notes: [a.notes, DEPOSIT_NOTE].filter(Boolean).join(' · ') } });
    if (list.length) await db.payment.updateMany({ where: { appointmentId: { in: list.map(a => a.id) }, status: 'PENDIENTE' }, data: { status: 'RECHAZADO' } });
    released += list.length;
  }
  if (b.lateToleranceMin > 0) {
    const list = await db.appointment.findMany({ where: { businessId, status: { in: ['PENDIENTE', 'CONFIRMADA'] }, start: { lt: new Date(now - b.lateToleranceMin * 60000), gt: new Date(now - 24 * 3600e3) } }, select: { id: true, notes: true } });
    for (const a of list) await db.appointment.update({ where: { id: a.id }, data: { status: 'NO_ASISTIO', notes: [a.notes, NOSHOW_NOTE].filter(Boolean).join(' · ') } });
    noShows = list.length;
  }
  return { released, noShows };
}
