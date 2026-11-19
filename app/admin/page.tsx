import Link from 'next/link';
import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
import { sweepAppointments } from '@/lib/asistencia';
import { PageHeader, Stat } from '@/components/panel/PageHeader';
import { StatusBadge } from '@/components/ui/Status';
import { Icon } from '@/components/ui/Icon';
import { Empty } from '@/components/ui/Empty';
import { addDays, cop, DIAS_CORTOS, fechaLarga, fromBogota, hm, minutesOf, parseJson, time12, ymd } from '@/lib/format';
import { lowStock } from '@/lib/inventory';
import { workRange } from '@/lib/availability';

export const metadata = { title: 'Dashboard' };
export default async function Dashboard({ searchParams }: { searchParams: Promise<{ sinpermiso?: string }> }) {
  const { business: b, user } = await requireBusiness();
  await sweepAppointments(b.id);
  const sp = await searchParams;
  const today = ymd(new Date());
  const dayStart = fromBogota(today); const dayEnd = fromBogota(addDays(today, 1));
  const weekStart = addDays(today, -6);
  const [appts, sales, newCustomers, staff, low, weekSales] = await Promise.all([
    db.appointment.findMany({ where: { businessId: b.id, start: { gte: dayStart, lt: dayEnd } }, include: { customer: true, staff: true, services: { include: { service: true } } }, orderBy: { start: 'asc' } }),
    db.sale.findMany({ where: { businessId: b.id, status: 'PAGADA', createdAt: { gte: dayStart, lt: dayEnd } } }),
    db.customer.count({ where: { businessId: b.id, createdAt: { gte: fromBogota(addDays(today, -30)) } } }),
    db.staff.findMany({ where: { businessId: b.id, active: true } }),
    lowStock(b.id),
    db.sale.findMany({ where: { businessId: b.id, status: 'PAGADA', createdAt: { gte: fromBogota(weekStart), lt: dayEnd } }, select: { total: true, tip: true, createdAt: true } })
  ]);
  const revenue = sales.reduce((a, s) => a + s.total - s.tip, 0);
  const capacity = staff.reduce((a, s) => { const r = workRange(b.openingHours, s.workHours, s.daysOff, today); return a + (r ? r[1] - r[0] : 0); }, 0);
  const booked = appts.filter(a => a.status !== 'CANCELADA').reduce((a, x) => a + (x.end.getTime() - x.start.getTime()) / 60000, 0);
  const occupancy = capacity ? Math.round(booked / capacity * 100) : 0;
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const perDay = days.map(d => weekSales.filter(s => ymd(s.createdAt) === d).reduce((a, s) => a + s.total - s.tip, 0));
  const max = Math.max(...perDay, 1);
  const now = new Date();
  const upcoming = appts.filter(a => a.end >= now && !['CANCELADA', 'COMPLETADA', 'NO_ASISTIO'].includes(a.status));
  return (
    <>
      {sp.sinpermiso && <div className="mb-4 p-3 rounded-xl bg-[#FFF1F2] text-danger font-label-md">No tienes permiso para ese módulo. Pide acceso al administrador.</div>}
      <PageHeader eyebrow={fechaLarga(new Date())} title={`Hola, ${user.name.split(' ')[0]}`} subtitle="Así va tu negocio hoy."
        actions={<><Link href="/admin/caja" className="btn-outline btn-sm"><Icon name="point_of_sale" className="text-[18px]" />Cobrar</Link><Link href="/admin/agenda?nueva=1" className="btn-primary btn-sm"><Icon name="add" className="text-[18px]" />Nueva cita</Link></>} />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        <Stat label="Ingresos de hoy" value={cop(revenue)} icon="payments" tone="gold" hint={`${sales.length} ventas`} />
        <Stat label="Citas de hoy" value={String(appts.filter(a => a.status !== 'CANCELADA').length)} icon="event_available" hint={`${upcoming.length} por atender`} />
        <Stat label="Ocupación" value={`${occupancy}%`} icon="donut_large" hint={`${Math.round(booked / 60)} h de ${Math.round(capacity / 60)} h`} />
        <Stat label="Clientes nuevos" value={String(newCustomers)} icon="person_add" hint="Últimos 30 días" />
      </div>
      <div className="grid xl:grid-cols-3 gap-4 mt-4">
        <section className="card p-5 xl:col-span-2">
          <div className="flex items-center justify-between"><h2 className="h-section">Ventas de la semana</h2><span className="font-title-md text-title-md tnum">{cop(perDay.reduce((a, x) => a + x, 0))}</span></div>
          <div className="mt-6 h-56 flex items-end gap-2 md:gap-4" role="img" aria-label="Gráfica de ventas de los últimos 7 días">
            {days.map((d, i) => (
              <div key={d} className="flex-1 min-w-0 flex flex-col items-center gap-2 h-full justify-end group">
                <span className="hidden md:block font-label-sm text-label-sm text-on-surface-variant opacity-0 group-hover:opacity-100 tnum whitespace-nowrap">{cop(perDay[i])}</span>
                <div className={`w-full max-w-[56px] rounded-t-lg transition-all ${d === today ? 'bg-gold' : 'bg-primary-container/85 dark:bg-primary/70'}`} style={{ height: `${Math.max(4, perDay[i] / max * 100)}%` }} />
                <span className={`font-label-sm text-label-sm ${d === today ? 'text-secondary' : 'text-on-surface-variant'}`}>{DIAS_CORTOS[fromBogota(d, '12:00').getUTCDay()]}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="card p-5">
          <div className="flex items-center justify-between mb-3"><h2 className="h-section">Próximas citas</h2><Link href="/admin/agenda" className="font-label-md text-secondary">Agenda</Link></div>
          {upcoming.length === 0 ? <Empty icon="event_available" title="Sin citas pendientes" text="Comparte tu link de reservas para llenar la agenda." /> : (
            <ul className="space-y-3">
              {upcoming.slice(0, 6).map(a => (
                <li key={a.id} className="flex items-center gap-3">
                  <div className="w-14 text-center"><p className="font-title-md text-title-md tnum">{time12(hm(a.start)).replace(' ', '')}</p></div>
                  <span className="w-1 self-stretch rounded-full" style={{ background: a.staff.color }} />
                  <div className="flex-1 min-w-0"><p className="font-label-lg text-label-lg truncate">{a.customer.name}</p><p className="font-body-sm text-body-sm text-on-surface-variant truncate">{a.services.map(s => s.service.name).join(', ')} · {a.staff.name.split(' ')[0]}</p></div>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      {low.length > 0 && (
        <section className="card p-5 mt-4 border-danger/30">
          <div className="flex items-center gap-2"><Icon name="warning" className="text-danger" /><h2 className="font-title-lg text-title-lg">Alertas de stock bajo</h2><Link href="/admin/inventario?filtro=bajo" className="ml-auto font-label-md text-secondary">Ver inventario</Link></div>
          <div className="flex flex-wrap gap-2 mt-3">{low.map(p => <span key={p.id} className="px-3 py-1.5 rounded-lg bg-[#FFF1F2] text-danger font-label-md text-label-md dark:bg-error-container dark:text-on-error-container">{p.name}: {p.stock} {p.unit.toLowerCase()} (mín. {p.minStock})</span>)}</div>
        </section>
      )}
    </>
  );
}
