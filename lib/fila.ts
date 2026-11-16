// Fila virtual, huecos libres de la agenda y horas pico solo con cita.
import { db } from '@/lib/db';
import { workRange } from '@/lib/availability';
import { bogota, fromBogota, hm, minutesOf, parseJson, ymd } from '@/lib/format';

export type PeakRule = { id: string; label: string; days: number[]; from: string; to: string; startDate?: string; endDate?: string };
export const QUEUE_OPEN = ['ESPERANDO', 'LLAMADO'];
export const QUEUE_DEFAULT_MIN = 30;

export function peakRules(b: { peakRules: string }) { return parseJson<PeakRule[]>(b.peakRules, []); }

/** Regla de hora pico vigente en este momento (solo se atiende con cita), o null. */
export function activePeak(b: { peakRules: string }, at = new Date()) {
  const date = ymd(at); const dow = bogota(at).dow; const t = hm(at);
  return peakRules(b).find(r =>
    (!r.startDate || date >= r.startDate) && (!r.endDate || date <= r.endDate) &&
    (!r.days?.length || r.days.includes(dow)) && t >= r.from && t < r.to) || null;
}

export const DIAS_LETRA = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
export function describePeak(r: PeakRule) {
  const dias = !r.days?.length || r.days.length === 7 ? 'Todos los días' : r.days.map(d => DIAS_LETRA[d]).join(' ');
  const fechas = r.startDate || r.endDate ? ` · ${r.startDate || '…'} a ${r.endDate || '…'}` : '';
  return `${dias} · ${r.from} a ${r.to}${fechas}`;
}

/** Inicio del día de hoy (Bogotá) para numerar los turnos. */
export function todayStart() { return fromBogota(ymd(new Date())); }

/** Huecos libres de hoy por profesional, desde ahora hasta el cierre. Las citas tienen prioridad. */
export async function gapsToday(b: { id: string; openingHours: string; peakRules: string }) {
  const now = new Date(); const date = ymd(now); const nowMin = minutesOf(hm(now));
  const dayStart = fromBogota(date); const dayEnd = fromBogota(date, '23:59');
  const [staff, appts, blocks] = await Promise.all([
    db.staff.findMany({ where: { businessId: b.id, active: true }, orderBy: { name: 'asc' } }),
    db.appointment.findMany({ where: { businessId: b.id, start: { lt: dayEnd }, end: { gt: dayStart }, status: { notIn: ['CANCELADA', 'NO_ASISTIO'] } }, include: { customer: { select: { name: true } } }, orderBy: { start: 'asc' } }),
    db.blockedTime.findMany({ where: { businessId: b.id, start: { lt: dayEnd }, end: { gt: dayStart } } })
  ]);
  const toMin = (d: Date) => (ymd(d) < date ? 0 : ymd(d) > date ? 1440 : minutesOf(hm(d)));
  const peaks = peakRules(b).filter(r => (!r.startDate || date >= r.startDate) && (!r.endDate || date <= r.endDate) && (!r.days?.length || r.days.includes(bogota(now).dow)));
  return staff.map(s => {
    const range = workRange(b.openingHours, s.workHours, s.daysOff, date);
    const busy = [
      ...appts.filter(a => a.staffId === s.id).map(a => ({ a: toMin(a.start), b: toMin(a.end), who: a.customer.name, status: a.status })),
      ...blocks.filter(x => !x.staffId || x.staffId === s.id).map(x => ({ a: toMin(x.start), b: toMin(x.end), who: 'Bloqueado', status: 'BLOQUEO' })),
      // En hora pico la fila no entra: esas franjas cuentan como reservadas solo para citas.
      ...peaks.map(r => ({ a: minutesOf(r.from), b: minutesOf(r.to), who: r.label || 'Hora pico', status: 'PICO' }))
    ].sort((x, y) => x.a - y.a);
    const gaps: { from: number; to: number }[] = [];
    let current: (typeof busy)[number] | null = null;
    if (range) {
      let t = Math.max(range[0], nowMin);
      current = busy.find(x => x.a <= t && x.b > t) || null;
      for (const x of busy) {
        if (x.b <= t) continue;
        if (x.a > t) gaps.push({ from: t, to: Math.min(x.a, range[1]) });
        t = Math.max(t, x.b);
        if (t >= range[1]) break;
      }
      if (t < range[1]) gaps.push({ from: t, to: range[1] });
    }
    const real = gaps.filter(g => g.to - g.from >= 15);
    const freeNow = !!range && !current && real.length > 0 && real[0].from <= nowMin + 1;
    const freeFor = freeNow ? real[0].to - real[0].from : 0;
    return { staff: s, working: !!range && nowMin < range[1], current, freeNow, freeFor, gaps: real };
  });
}

/** ¿El local está abierto en este momento según su horario general? */
export function openNow(b: { openingHours: string }, at = new Date()) {
  const h = parseJson<Record<string, [string, string]>>(b.openingHours, {})[String(bogota(at).dow)];
  const t = hm(at);
  return !!h && t >= h[0] && t < h[1];
}

/** Fila abierta de hoy en orden, con minutos estimados de espera para cada turno. */
export async function queueToday(businessId: string) {
  const [list, services, working] = await Promise.all([
    db.walkIn.findMany({ where: { businessId, createdAt: { gte: todayStart() }, status: { in: QUEUE_OPEN } }, orderBy: { number: 'asc' } }),
    db.service.findMany({ where: { businessId }, select: { id: true, name: true, durationMin: true } }),
    db.staff.count({ where: { businessId, active: true } })
  ]);
  const svc = new Map(services.map(s => [s.id, s]));
  let acc = 0;
  return list.map((w, i) => {
    const wait = Math.round(acc / Math.max(1, working));
    acc += (w.serviceId && svc.get(w.serviceId)?.durationMin) || QUEUE_DEFAULT_MIN;
    return { ...w, position: i, waitMin: wait, service: w.serviceId ? svc.get(w.serviceId) || null : null };
  });
}

export function nearTurnMessage(w: { name: string; number: number }, businessName: string, ahead: number, link: string) {
  return `Hola ${w.name.split(' ')[0]} 👋, en ${businessName} ya casi es tu turno (#${w.number}). ${ahead === 0 ? 'Eres el siguiente' : `Faltan ${ahead} ${ahead === 1 ? 'persona' : 'personas'} antes de ti`}, por favor acércate al local.\n\nSigue tu turno aquí: ${link}`;
}
export function turnMessage(w: { name: string; number: number }, businessName: string) {
  return `¡${w.name.split(' ')[0]}, es tu turno (#${w.number}) en ${businessName}! Te esperamos en recepción.`;
}
export const turnLink = (id: string) => `${process.env.APP_URL || ''}/fila/${id}`;

/** Avisa automáticamente (si WhatsApp API está configurado) a quienes ya están cerca de su turno. */
export async function notifyUpcoming(b: { id: string; name: string; queueNotifyAhead: number; waPhoneId?: string | null }) {
  const { waConfigured, sendWhatsapp } = await import('@/lib/notify');
  if (!waConfigured()) return;
  const q = (await queueToday(b.id)).filter(w => w.status === 'ESPERANDO');
  for (const w of q.slice(0, Math.max(0, b.queueNotifyAhead))) {
    if (w.notifiedAt || !w.phone) continue;
    await sendWhatsapp(w.phone, nearTurnMessage(w, b.name, w.position, turnLink(w.id)), { phoneId: b.waPhoneId });
    await db.walkIn.update({ where: { id: w.id }, data: { notifiedAt: new Date() } });
  }
}

export async function createWalkIn(b: { id: string }, data: { name: string; phone: string | null; serviceId: string | null }) {
  const n = await db.walkIn.count({ where: { businessId: b.id, createdAt: { gte: todayStart() } } });
  return db.walkIn.create({ data: { businessId: b.id, number: n + 1, ...data } });
}
