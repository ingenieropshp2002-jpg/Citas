// Panel de métricas: ingresos, ocupación, clientes perdidos y desempeño del equipo.
import { db } from './db';
import { addDays, bogota, fromBogota, minutesOf, parseJson, ymd } from './format';

type Hours = Record<string, [string, string] | null>;
const ACTIVE = ['PENDIENTE', 'CONFIRMADA', 'COMPLETADA', 'NO_ASISTIO'];

/** Minutos que cada profesional tenía disponibles entre dos fechas (su horario o el del negocio, menos bloqueos). */
function availableMinutes(days: string[], staff: { id: string; workHours: string }[], biz: Hours, blocks: { staffId: string | null; start: Date; end: Date }[]) {
  const out = new Map<string, number>();
  for (const s of staff) {
    const own = parseJson<Hours>(s.workHours, {});
    let total = 0;
    for (const d of days) {
      const dow = String(fromBogota(d, '12:00').getUTCDay());
      const h = dow in own ? own[dow] : biz[dow];
      if (h) total += Math.max(0, minutesOf(h[1]) - minutesOf(h[0]));
    }
    const dayStart = fromBogota(days[0]).getTime(); const dayEnd = fromBogota(addDays(days[days.length - 1], 1)).getTime();
    for (const bl of blocks) if (!bl.staffId || bl.staffId === s.id) total -= Math.max(0, (Math.min(bl.end.getTime(), dayEnd) - Math.max(bl.start.getTime(), dayStart)) / 60000);
    out.set(s.id, Math.max(0, total));
  }
  return out;
}

export async function metrics(businessId: string, desde: string, hasta: string) {
  const today = ymd(new Date());
  const range = { gte: fromBogota(desde), lt: fromBogota(addDays(hasta, 1)) };
  const days: string[] = []; for (let d = desde; d <= hasta && days.length < 400; d = addDays(d, 1)) days.push(d);
  const occDays = days.filter(d => d <= today); // la ocupación se mide en días ya transcurridos
  const len = days.length; const pDesde = addDays(desde, -len); const pHasta = addDays(desde, -1);
  const prevRange = { gte: fromBogota(pDesde), lt: fromBogota(desde) };
  const b = await db.business.findFirstOrThrow({ where: { id: businessId }, select: { openingHours: true, inactiveDays: true, name: true } });
  const [sales, prevSales, appts, prevAppts, staff, blocks, reviews] = await Promise.all([
    db.sale.findMany({ where: { businessId, status: 'PAGADA', createdAt: range }, select: { total: true, tip: true, createdAt: true, customerId: true, items: { select: { staffId: true, total: true, kind: true } } } }),
    db.sale.findMany({ where: { businessId, status: 'PAGADA', createdAt: prevRange }, select: { total: true, tip: true } }),
    db.appointment.findMany({ where: { businessId, start: range }, select: { start: true, end: true, status: true, staffId: true, customerId: true } }),
    db.appointment.findMany({ where: { businessId, start: prevRange }, select: { status: true, customerId: true } }),
    db.staff.findMany({ where: { businessId, active: true }, select: { id: true, name: true, color: true, photo: true, workHours: true } }),
    occDays.length ? db.blockedTime.findMany({ where: { businessId, start: { lt: fromBogota(addDays(occDays[occDays.length - 1], 1)) }, end: { gt: fromBogota(occDays[0]) } }, select: { staffId: true, start: true, end: true } }) : [],
    db.review.findMany({ where: { businessId, createdAt: range }, select: { staffId: true, rating: true } })
  ]);
  const revenue = sales.reduce((a, s) => a + s.total - s.tip, 0);
  const prevRevenue = prevSales.reduce((a, s) => a + s.total - s.tip, 0);

  // Ingresos por día
  const daily = new Map(days.map(d => [d, 0]));
  for (const s of sales) { const k = ymd(s.createdAt); daily.set(k, (daily.get(k) || 0) + s.total - s.tip); }

  // Ocupación: minutos reservados (no cancelados) sobre minutos disponibles, solo en días ya transcurridos
  const biz = parseJson<Hours>(b.openingHours, {});
  const avail = occDays.length ? availableMinutes(occDays, staff, biz, blocks) : new Map<string, number>();
  const lastOcc = occDays.length ? fromBogota(addDays(occDays[occDays.length - 1], 1)).getTime() : 0;
  const booked = new Map<string, number>();
  const heat = Array.from({ length: 7 }, () => new Array(24).fill(0) as number[]);
  for (const a of appts) {
    if (!ACTIVE.includes(a.status)) continue;
    const t = bogota(a.start); heat[t.dow][t.h]++;
    if (a.start.getTime() < lastOcc) booked.set(a.staffId, (booked.get(a.staffId) || 0) + (a.end.getTime() - a.start.getTime()) / 60000);
  }
  const totalAvail = [...avail.values()].reduce((a, v) => a + v, 0);
  const totalBooked = staff.reduce((a, s) => a + (booked.get(s.id) || 0), 0);
  const occupancy = totalAvail ? Math.min(100, Math.round(totalBooked / totalAvail * 100)) : 0;

  // Citas
  const count = (list: { status: string }[], st: string) => list.filter(a => a.status === st).length;
  const done = count(appts, 'COMPLETADA'); const noShow = count(appts, 'NO_ASISTIO'); const cancelled = count(appts, 'CANCELADA');
  const prevDone = count(prevAppts, 'COMPLETADA');

  // Clientes: nuevos, recurrentes, retención y perdidos
  const seenNow = new Set(appts.filter(a => a.status === 'COMPLETADA').map(a => a.customerId));
  for (const s of sales) if (s.customerId) seenNow.add(s.customerId);
  const seenPrev = new Set(prevAppts.filter(a => a.status === 'COMPLETADA').map(a => a.customerId));
  const firstBefore = seenNow.size ? await db.appointment.groupBy({ by: ['customerId'], where: { businessId, customerId: { in: [...seenNow] }, status: 'COMPLETADA', start: { lt: range.gte } }, _count: true }) : [];
  const returning = new Set(firstBefore.map(x => x.customerId));
  const newClients = [...seenNow].filter(id => !returning.has(id)).length;
  const retained = [...seenPrev].filter(id => seenNow.has(id)).length;
  const cutoff = new Date(Date.now() - b.inactiveDays * 86400e3);
  const lostWhere = { businessId, visits: { gt: 0 }, lastVisit: { lt: cutoff, gte: new Date(Date.now() - 365 * 86400e3) } };
  const [lostCount, lost, lostValue] = await Promise.all([
    db.customer.count({ where: lostWhere }),
    db.customer.findMany({ where: lostWhere, orderBy: { totalSpent: 'desc' }, take: 8, select: { id: true, name: true, phone: true, lastVisit: true, totalSpent: true, visits: true } }),
    db.customer.aggregate({ where: lostWhere, _sum: { totalSpent: true } })
  ]);

  // Equipo
  const team = staff.map(s => {
    const its = sales.flatMap(x => x.items).filter(i => i.staffId === s.id);
    const ap = appts.filter(a => a.staffId === s.id);
    const rv = reviews.filter(r => r.staffId === s.id);
    const av = avail.get(s.id) || 0;
    return {
      id: s.id, name: s.name, color: s.color, photo: s.photo,
      revenue: its.reduce((a, i) => a + i.total, 0), services: its.filter(i => i.kind === 'SERVICIO').length,
      clients: new Set(ap.filter(a => a.status === 'COMPLETADA').map(a => a.customerId)).size,
      noShow: ap.filter(a => a.status === 'NO_ASISTIO').length,
      occupancy: av ? Math.min(100, Math.round((booked.get(s.id) || 0) / av * 100)) : 0,
      rating: rv.length ? rv.reduce((a, r) => a + r.rating, 0) / rv.length : null, reviews: rv.length
    };
  }).sort((a, b) => b.revenue - a.revenue);

  return {
    days, daily: days.map(d => ({ d, v: daily.get(d) || 0 })), heat,
    revenue, prevRevenue, salesCount: sales.length, ticket: sales.length ? Math.round(revenue / sales.length) : 0,
    occupancy, occDays: occDays.length, done, prevDone, noShow, cancelled, total: appts.length,
    clients: seenNow.size, newClients, returningClients: seenNow.size - newClients, retention: seenPrev.size ? Math.round(retained / seenPrev.size * 100) : null, prevClients: seenPrev.size,
    lostCount, lost, lostValue: lostValue._sum.totalSpent || 0, inactiveDays: b.inactiveDays,
    team, prev: { desde: pDesde, hasta: pHasta }
  };
}
