// Orden de atención de hoy: las citas reservadas mandan y la fila solo entra en los huecos libres.
// Lo usan la página del turno, la página de la cita, el panel de la fila y la pantalla del local.
import { db } from './db';
import { workRange } from './availability';
import { bogota, fromBogota, hm, minutesOf, ymd } from './format';
import { peakRules, QUEUE_DEFAULT_MIN } from './fila';

export type PlanItem = {
  kind: 'CITA' | 'FILA'; id: string; label: string; number?: number; code?: string;
  staffId: string | null; staffName: string | null;
  scheduled: number | null; // minuto del día reservado (citas)
  start: number; end: number; // minuto del día estimado
  inService: boolean; delay: number; // minutos de retraso estimado (citas)
};
const OVERRUN_MIN = 5; // si un servicio ya debió terminar, se supone que acaba en 5 minutos

export async function attentionPlan(b: { id: string; openingHours: string; peakRules: string }, at = new Date()) {
  await (await import('./asistencia')).sweepAppointments(b.id);
  const date = ymd(at); const now = minutesOf(hm(at));
  const dayStart = fromBogota(date); const dayEnd = fromBogota(date, '23:59');
  const [staff, appts, blocks, walkIns, services] = await Promise.all([
    db.staff.findMany({ where: { businessId: b.id, active: true }, include: { services: { select: { serviceId: true } } }, orderBy: { name: 'asc' } }),
    db.appointment.findMany({ where: { businessId: b.id, start: { gte: dayStart, lt: dayEnd }, status: { in: ['PENDIENTE', 'CONFIRMADA', 'EN_SERVICIO'] } }, include: { customer: { select: { name: true } } }, orderBy: { start: 'asc' } }),
    db.blockedTime.findMany({ where: { businessId: b.id, start: { lt: dayEnd }, end: { gt: dayStart } } }),
    db.walkIn.findMany({ where: { businessId: b.id, createdAt: { gte: dayStart }, status: { in: ['ESPERANDO', 'LLAMADO'] } }, orderBy: { number: 'asc' } }),
    db.service.findMany({ where: { businessId: b.id }, select: { id: true, durationMin: true } })
  ]);
  const toMin = (d: Date) => (ymd(d) < date ? 0 : ymd(d) > date ? 1440 : minutesOf(hm(d)));
  const dur = new Map(services.map(s => [s.id, s.durationMin]));
  const peaks = peakRules(b).filter(r => (!r.startDate || date >= r.startDate) && (!r.endDate || date <= r.endDate) && (!r.days?.length || r.days.includes(bogota(at).dow)));
  const items: PlanItem[] = [];
  // Por profesional: citas en orden, con retraso acumulado si el anterior se alarga.
  const busy = new Map<string, [number, number][]>();
  const range = new Map<string, [number, number] | null>();
  for (const s of staff) {
    const r = workRange(b.openingHours, s.workHours, s.daysOff, date); range.set(s.id, r);
    let free = now;
    const occ: [number, number][] = [
      ...blocks.filter(x => !x.staffId || x.staffId === s.id).map(x => [toMin(x.start), toMin(x.end)] as [number, number]),
      ...peaks.map(p => [minutesOf(p.from), minutesOf(p.to)] as [number, number])
    ];
    for (const a of appts.filter(a => a.staffId === s.id)) {
      const sched = toMin(a.start); const length = toMin(a.end) - sched;
      let start: number, end: number;
      if (a.status === 'EN_SERVICIO') { start = sched; end = Math.max(toMin(a.end), now + OVERRUN_MIN); }
      else { start = Math.max(sched, free); end = start + length; } // si va tarde, se corre detrás del anterior
      free = Math.max(free, end);
      occ.push([start, end]);
      items.push({ kind: 'CITA', id: a.id, code: a.code, label: a.customer.name, staffId: s.id, staffName: s.name, scheduled: sched, start, end, inService: a.status === 'EN_SERVICIO', delay: Math.max(0, start - sched) });
    }
    busy.set(s.id, occ.sort((x, y) => x[0] - y[0]));
  }
  // La fila, en orden de llegada, toma el primer hueco donde quepa su servicio (sin mover ninguna cita).
  for (const w of walkIns) {
    const need = (w.serviceId && dur.get(w.serviceId)) || QUEUE_DEFAULT_MIN;
    let best: { staff: (typeof staff)[number]; start: number } | null = null;
    for (const s of staff) {
      if (w.serviceId && !s.services.some(x => x.serviceId === w.serviceId)) continue;
      const r = range.get(s.id); if (!r) continue;
      let t = Math.max(now, r[0]);
      for (const [a, e] of busy.get(s.id)!) { if (e <= t) continue; if (a >= t + need) break; t = Math.max(t, e); }
      if (t + need > r[1]) continue;
      if (!best || t < best.start) best = { staff: s, start: t };
    }
    const start = best?.start ?? 1440; const end = start + need;
    if (best) { busy.get(best.staff.id)!.push([start, end]); busy.get(best.staff.id)!.sort((x, y) => x[0] - y[0]); }
    items.push({ kind: 'FILA', id: w.id, number: w.number, label: w.name, staffId: best?.staff.id ?? null, staffName: best?.staff.name ?? null, scheduled: null, start, end, inService: false, delay: 0 });
  }
  items.sort((x, y) => x.start - y.start || (x.kind === 'CITA' ? -1 : 1));
  return { now, items };
}

/** Personas que se atienden antes que este turno o cita (sin contar a quien ya está en servicio). */
export function aheadOf(plan: { items: PlanItem[] }, id: string, sameStaff = false) {
  const me = plan.items.find(i => i.id === id);
  if (!me) return null;
  const before = plan.items.filter(i => i.id !== id && !i.inService && (i.start < me.start || (i.start === me.start && i.kind === 'CITA' && me.kind === 'FILA')) && (!sameStaff || i.staffId === me.staffId));
  return { me, ahead: before.length, citas: before.filter(i => i.kind === 'CITA').length, fila: before.filter(i => i.kind === 'FILA').length };
}

/** "Ana María Gómez" → "Ana M." para mostrar en pantalla sin exponer el nombre completo. */
export const shortName = (n: string) => { const [a, b] = n.trim().split(/\s+/); return b ? `${a} ${b[0].toUpperCase()}.` : a; };
