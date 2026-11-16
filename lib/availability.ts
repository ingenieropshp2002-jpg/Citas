import { db } from './db';
import { bogota, fromBogota, hm, minutesOf, parseJson, timeOf, ymd } from './format';

type Hours = Record<string, [string, string] | null>;

export type Slot = { time: string; staffIds: string[] };

/** Rango laboral de un profesional para una fecha (minutos desde medianoche, hora Bogotá) */
export function workRange(businessHours: string, staffHours: string, daysOff: string, date: string): [number, number] | null {
  if (parseJson<string[]>(daysOff, []).includes(date)) return null;
  const dow = String(bogota(fromBogota(date, '12:00')).dow);
  const sh = parseJson<Hours>(staffHours, {});
  const bh = parseJson<Hours>(businessHours, {});
  const r = Object.keys(sh).length ? sh[dow] : bh[dow];
  const b = bh[dow];
  if (!r || !b) return null;
  return [Math.max(minutesOf(r[0]), minutesOf(b[0])), Math.min(minutesOf(r[1]), minutesOf(b[1]))];
}

/** Calcula las franjas disponibles para una fecha y duración. */
export async function getSlots(businessId: string, date: string, durationMin: number, staffId?: string | null, serviceIds: string[] = []) {
  const business = await db.business.findUniqueOrThrow({ where: { id: businessId } });
  let staff = await db.staff.findMany({ where: { businessId, active: true, ...(staffId ? { id: staffId } : {}) }, include: { services: true } });
  if (serviceIds.length) staff = staff.filter(s => serviceIds.every(id => s.services.some(x => x.serviceId === id)));
  const dayStart = fromBogota(date, '00:00'); const dayEnd = fromBogota(date, '23:59');
  const [appts, blocks] = await Promise.all([
    db.appointment.findMany({ where: { businessId, start: { lt: dayEnd }, end: { gt: dayStart }, status: { notIn: ['CANCELADA'] } } }),
    db.blockedTime.findMany({ where: { businessId, start: { lt: dayEnd }, end: { gt: dayStart } } })
  ]);
  const now = new Date();
  const nowMin = ymd(now) === date ? minutesOf(hm(now)) + 30 : -1; // 30 min de antelación mínima
  if (date < ymd(now)) return [] as Slot[];
  const map = new Map<string, string[]>();
  for (const s of staff) {
    const range = workRange(business.openingHours, s.workHours, s.daysOff, date);
    if (!range) continue;
    const busy = [
      ...appts.filter(a => a.staffId === s.id).map(a => [a.start, a.end] as const),
      ...blocks.filter(b => !b.staffId || b.staffId === s.id).map(b => [b.start, b.end] as const)
    ].map(([a, b]) => [Math.max(0, minutesOf(hm(a)) - (ymd(a) < date ? 1440 : 0)), ymd(b) > date ? 1440 : minutesOf(hm(b))] as const);
    for (let t = range[0]; t + durationMin <= range[1]; t += business.slotStepMin) {
      if (t < nowMin) continue;
      if (busy.some(([a, b]) => t < b && t + durationMin > a)) continue;
      const k = timeOf(t); map.set(k, [...(map.get(k) || []), s.id]);
    }
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([time, staffIds]) => ({ time, staffIds }));
}

/** Verifica que un profesional esté libre (para crear/mover citas) */
export async function isFree(businessId: string, staffId: string, start: Date, end: Date, ignoreAppointmentId?: string) {
  const clash = await db.appointment.findFirst({ where: { businessId, staffId, status: { notIn: ['CANCELADA'] }, start: { lt: end }, end: { gt: start }, ...(ignoreAppointmentId ? { id: { not: ignoreAppointmentId } } : {}) } });
  if (clash) return false;
  const block = await db.blockedTime.findFirst({ where: { businessId, OR: [{ staffId }, { staffId: null }], start: { lt: end }, end: { gt: start } } });
  return !block;
}

/** true si la base de datos rechazó la cita porque se cruza con otra del mismo profesional. */
export function isOverlapError(e: unknown) {
  const x = e as { code?: string; message?: string; meta?: unknown; cause?: unknown } | null;
  const txt = [x?.code, x?.message, JSON.stringify(x?.meta ?? ''), String(x?.cause ?? '')].join(' ');
  return /23P01|Appointment_sin_cruces|exclusion constraint/i.test(txt);
}
