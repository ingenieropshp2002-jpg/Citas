import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
import { PageHeader } from '@/components/panel/PageHeader';
import { AgendaBoard } from '@/components/panel/AgendaBoard';
import { addDays, fromBogota, minutesOf, parseJson, ymd } from '@/lib/format';

export const metadata = { title: 'Agenda' };
export default async function Agenda({ searchParams }: { searchParams: Promise<{ vista?: string; fecha?: string; nueva?: string; prof?: string }> }) {
  const { business: b, staffId: myStaff, perms } = await requireBusiness('agenda');
  const sp = await searchParams;
  const view = (['dia', 'semana', 'mes'].includes(sp.vista || '') ? sp.vista : 'dia') as 'dia' | 'semana' | 'mes';
  const date = sp.fecha && /^\d{4}-\d{2}-\d{2}$/.test(sp.fecha) ? sp.fecha : ymd(new Date());
  const d = fromBogota(date, '12:00');
  let from: string, to: string;
  if (view === 'mes') { from = addDays(ymd(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 17))), -7); to = addDays(from, 50); }
  else if (view === 'semana') { from = addDays(date, -((d.getUTCDay() + 6) % 7)); to = addDays(from, 7); }
  else { from = date; to = addDays(date, 1); }
  // Un profesional sin permiso de "configuracion" ve solo su propia agenda
  const onlyMine = perms !== 'ALL' && !perms.includes('configuracion') && myStaff;
  const staffWhere = { businessId: b.id, active: true, ...(onlyMine ? { id: myStaff! } : {}) };
  const [staff, appts, blocks, services, customers] = await Promise.all([
    db.staff.findMany({ where: staffWhere, orderBy: { name: 'asc' } }),
    db.appointment.findMany({ where: { businessId: b.id, start: { gte: fromBogota(from), lt: fromBogota(to) }, ...(onlyMine ? { staffId: myStaff! } : {}) }, include: { customer: true, services: { include: { service: true } } } }),
    db.blockedTime.findMany({ where: { businessId: b.id, start: { gte: fromBogota(from), lt: fromBogota(to) } } }),
    db.service.findMany({ where: { businessId: b.id, active: true }, include: { staff: true } }),
    db.customer.findMany({ where: { businessId: b.id }, select: { id: true, name: true, phone: true }, orderBy: { name: 'asc' } })
  ]);
  const hours = Object.values(parseJson<Record<string, [string, string] | null>>(b.openingHours, {})).filter(Boolean) as [string, string][];
  const range: [number, number] = [Math.floor(Math.min(...hours.map(h => minutesOf(h[0])), 480) / 60) * 60, Math.ceil(Math.max(...hours.map(h => minutesOf(h[1])), 1080) / 60) * 60];
  return (
    <>
      <PageHeader eyebrow="Operación" title="Agenda" />
      <AgendaBoard view={view} date={date} range={range} openNew={!!sp.nueva} staffFilter={sp.prof || ''}
        staff={staff.map(s => ({ id: s.id, name: s.name, color: s.color, photo: s.photo }))}
        appts={appts.map(a => ({ id: a.id, code: a.code, staffId: a.staffId, start: a.start.toISOString(), end: a.end.toISOString(), status: a.status, total: a.total, customer: { id: a.customer.id, name: a.customer.name, phone: a.customer.phone }, services: a.services.map(s => s.service.name).join(', '), notes: a.notes, depositAmount: a.depositAmount, depositStatus: a.depositStatus, saleId: a.saleId }))}
        blocks={blocks.map(x => ({ id: x.id, staffId: x.staffId, start: x.start.toISOString(), end: x.end.toISOString(), reason: x.reason }))}
        services={services.map(s => ({ id: s.id, name: s.name, durationMin: s.durationMin, price: s.price, staffIds: s.staff.map(x => x.staffId) }))}
        customers={customers} />
    </>
  );
}
