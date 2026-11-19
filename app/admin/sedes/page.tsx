import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { ownedBusinesses, requireBusiness } from '@/lib/auth';
import { PageHeader, Stat } from '@/components/panel/PageHeader';
import { ActionForm } from '@/components/ui/ActionForm';
import { Drawer } from '@/components/ui/Drawer';
import { Icon } from '@/components/ui/Icon';
import { addDays, cop, fromBogota, ymd } from '@/lib/format';
import { createSede, switchSede } from '../_actions/sedes';

export const metadata = { title: 'Sedes' };
export default async function Sedes() {
  const { user, business: current, staffId } = await requireBusiness('configuracion');
  if (staffId) redirect('/admin?sinpermiso=1');
  const { list } = await ownedBusinesses(user.id);
  const ids = list.map(b => b.id);
  const today = ymd(new Date()); const monthStart = today.slice(0, 8) + '01';
  const [sales, appts, todayAppts, staff] = await Promise.all([
    db.sale.groupBy({ by: ['businessId'], where: { businessId: { in: ids }, status: 'PAGADA', createdAt: { gte: fromBogota(monthStart) } }, _sum: { total: true }, _count: true }),
    db.appointment.groupBy({ by: ['businessId', 'status'], where: { businessId: { in: ids }, start: { gte: fromBogota(monthStart), lt: fromBogota(addDays(today, 1)) } }, _count: true }),
    db.appointment.groupBy({ by: ['businessId'], where: { businessId: { in: ids }, start: { gte: fromBogota(today), lt: fromBogota(addDays(today, 1)) }, status: { in: ['PENDIENTE', 'CONFIRMADA', 'COMPLETADA'] } }, _count: true }),
    db.staff.groupBy({ by: ['businessId'], where: { businessId: { in: ids }, active: true }, _count: true })
  ]);
  const rows = list.map(b => {
    const ap = appts.filter(a => a.businessId === b.id);
    const total = ap.reduce((a, x) => a + x._count, 0); const done = ap.filter(x => x.status === 'COMPLETADA').reduce((a, x) => a + x._count, 0);
    const noShow = ap.filter(x => x.status === 'NO_ASISTIO').reduce((a, x) => a + x._count, 0);
    const s = sales.find(x => x.businessId === b.id);
    return { b, revenue: s?._sum.total || 0, salesCount: s?._count || 0, total, done, noShow, today: todayAppts.find(x => x.businessId === b.id)?._count || 0, staff: staff.find(x => x.businessId === b.id)?._count || 0 };
  });
  const sum = (k: 'revenue' | 'done' | 'today') => rows.reduce((a, r) => a + r[k], 0);
  return (
    <>
      <PageHeader eyebrow="Tu cuenta" title="Sedes" subtitle="Cada sede tiene su propia agenda, equipo, caja e inventario. La suscripción es una sola."
        actions={<Drawer title="Nueva sede" trigger={<><Icon name="add_business" className="text-[18px]" />Nueva sede</>}>
          <ActionForm action={createSede}>
            <label className="block"><span className="label">Nombre de la sede *</span><input name="name" required maxLength={80} className="input" placeholder={`${current.name} Chapinero`} /></label>
            <label className="block"><span className="label">Dirección *</span><input name="address" required maxLength={160} className="input" /></label>
            <div className="grid grid-cols-2 gap-3">
              <label><span className="label">Ciudad</span><input name="city" defaultValue={current.city} className="input" /></label>
              <label><span className="label">Barrio / zona</span><input name="zone" className="input" /></label>
            </div>
            <label className="block"><span className="label">Teléfono / WhatsApp</span><input name="phone" inputMode="numeric" className="input" /></label>
            <label className="flex items-center gap-2"><input type="checkbox" name="copyServices" defaultChecked className="accent-primary-container" />Copiar los servicios y precios de «{current.name}»</label>
            <p className="font-body-sm text-on-surface-variant">También se copian el horario, las reglas de reservas y anticipos, el logo y las fotos. El equipo, la caja, el inventario y la facturación DIAN se configuran aparte en cada sede.</p>
            <button className="btn-primary w-full">Crear sede</button>
          </ActionForm>
        </Drawer>} />
      {list.length > 1 && <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
        <Stat label="Sedes" value={String(list.length)} icon="storefront" />
        <Stat label="Ventas del mes (todas)" value={cop(sum('revenue'))} icon="payments" tone="gold" />
        <Stat label="Citas atendidas del mes" value={String(sum('done'))} icon="event_available" />
        <Stat label="Citas para hoy" value={String(sum('today'))} icon="today" />
      </div>}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">{rows.map(r => (
        <article key={r.b.id} className={`card p-5 ${r.b.id === current.id ? 'ring-2 ring-secondary/60' : ''}`}>
          <div className="flex items-start justify-between gap-2"><span className="font-label-sm tracking-widest text-secondary">{r.b.parentId ? 'SEDE' : 'SEDE PRINCIPAL'}</span>{r.b.id === current.id && <span className="font-label-sm text-on-surface-variant">Estás aquí</span>}</div>
          <h2 className="font-headline-sm text-headline-sm mt-1">{r.b.name}</h2>
          <p className="text-on-surface-variant font-body-sm">{[r.b.address, r.b.zone, r.b.city].filter(Boolean).join(' · ')}</p>
          <dl className="grid grid-cols-2 gap-2 mt-4 font-body-sm">
            <div><dt className="text-on-surface-variant">Ventas del mes</dt><dd className="font-title-md tnum">{cop(r.revenue)}</dd></div>
            <div><dt className="text-on-surface-variant">Citas hoy</dt><dd className="font-title-md tnum">{r.today}</dd></div>
            <div><dt className="text-on-surface-variant">Atendidas del mes</dt><dd className="tnum">{r.done} de {r.total}</dd></div>
            <div><dt className="text-on-surface-variant">No llegaron</dt><dd className="tnum">{r.noShow}</dd></div>
            <div><dt className="text-on-surface-variant">Profesionales</dt><dd className="tnum">{r.staff}</dd></div>
            <div><dt className="text-on-surface-variant">Página</dt><dd><a href={`/negocio/${r.b.slug}`} target="_blank" className="text-secondary">/{r.b.slug} ↗</a></dd></div>
          </dl>
          {r.b.id !== current.id && <form action={switchSede} className="mt-4"><input type="hidden" name="id" value={r.b.id} /><button className="btn-outline btn-sm w-full"><Icon name="swap_horiz" className="text-[16px]" />Administrar esta sede</button></form>}
        </article>
      ))}</div>
    </>
  );
}
