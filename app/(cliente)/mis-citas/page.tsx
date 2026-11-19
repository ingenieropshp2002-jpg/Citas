import { LeaveWait } from './LeaveWait';
import { WINDOWS } from '@/lib/espera';
import Link from 'next/link';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { ClientHeader, ShopHeader } from '@/components/cliente/Header';
import { getShop } from '@/lib/shop';
import { AppointmentActions } from '@/components/cliente/AppointmentActions';
import { Empty } from '@/components/ui/Empty';
import { StatusBadge } from '@/components/ui/Status';
import { Icon } from '@/components/ui/Icon';
import { cop, fechaCorta, fechaLarga, fromBogota, hm, parseJson, time12 } from '@/lib/format';

export const metadata = { title: 'Mis citas' };
export default async function MisCitas({ searchParams }: { searchParams: Promise<{ tab?: string; negocio?: string }> }) {
  const sp = await searchParams;
  const shop = await getShop(sp.negocio);
  const q = shop ? `negocio=${shop.slug}` : '';
  const user = await requireUser(`/mis-citas${q ? '?' + q : ''}`);
  const tab = sp.tab === 'pasadas' ? 'pasadas' : 'proximas';
  const now = new Date();
  const all = await db.appointment.findMany({ where: { customer: { userId: user.id }, ...(shop ? { business: { slug: shop.slug } } : {}) }, include: { business: true, staff: true, services: { include: { service: true } }, review: true }, orderBy: { start: tab === 'proximas' ? 'asc' : 'desc' } });
  const points = shop ? (await db.customer.findMany({ where: { userId: user.id, business: { slug: shop.slug } }, select: { points: true } })).reduce((x, c) => x + c.points, 0) : 0;
  const waits = await db.waitEntry.findMany({ where: { userId: user.id, status: 'ACTIVA', ...(shop ? { business: { slug: shop.slug } } : {}) }, include: { business: { select: { name: true, slug: true } } }, orderBy: { dateFrom: 'asc' } });
  const list = all.filter(a => tab === 'proximas' ? a.end >= now && ['PENDIENTE', 'CONFIRMADA', 'EN_SERVICIO'].includes(a.status) : !(a.end >= now && ['PENDIENTE', 'CONFIRMADA', 'EN_SERVICIO'].includes(a.status)));
  return (
    <>
      {shop ? <ShopHeader shop={shop} title="Mis citas" /> : <ClientHeader title="Mis citas" />}
      <main className="pt-20 pb-10 px-margin max-w-3xl mx-auto">
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary-container dark:text-primary">Mis citas</h1>
        {shop && points > 0 && <p className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary-fixed/50 font-label-lg"><Icon name="loyalty" className="text-[18px] text-secondary" />Tienes {points.toLocaleString('es-CO')} puntos en {shop.name}</p>}
        {!!waits.length && (
          <section className="mt-4 rounded-xl border border-gold/40 bg-secondary-fixed/10 p-space-sm">
            <p className="font-label-lg flex items-center gap-2"><Icon name="hourglass_top" className="text-secondary text-[20px]" />En lista de espera</p>
            <ul className="mt-2 space-y-2">{waits.map(w => (
              <li key={w.id} className="flex items-center gap-2 font-body-sm">
                <Link href={`/reservar/${w.business.slug}?fecha=${w.dateFrom}`} className="flex-1 min-w-0"><b>{w.business.name}</b> · {w.dateFrom === w.dateTo ? fechaCorta(fromBogota(w.dateFrom, '12:00')) : `${fechaCorta(fromBogota(w.dateFrom, '12:00'))} a ${fechaCorta(fromBogota(w.dateTo, '12:00'))}`} · {WINDOWS[w.window as keyof typeof WINDOWS]}</Link>
                <LeaveWait id={w.id} />
              </li>
            ))}</ul>
            <p className="mt-1 font-body-sm text-on-surface-variant">Te avisamos si se libera un cupo. Sales de la lista cuando reservas.</p>
          </section>
        )}
        <div className="flex gap-2 mt-4 mb-5">
          <Link href={`/mis-citas${q ? '?' + q : ''}`} className={`chip ${tab === 'proximas' ? 'chip-on' : ''}`}>Próximas</Link>
          <Link href={`/mis-citas?tab=pasadas${q ? '&' + q : ''}`} className={`chip ${tab === 'pasadas' ? 'chip-on' : ''}`}>Pasadas</Link>
        </div>
        {list.length === 0 ? <Empty icon="calendar_month" title={tab === 'proximas' ? 'No tienes citas próximas' : 'Aún no tienes historial'} text={shop ? `Reserva tu próxima cita en ${shop.name}.` : 'Explora negocios cerca de ti y reserva en segundos.'} action={shop ? <Link href={`/reservar/${shop.slug}`} className="btn-primary">Reservar</Link> : <Link href="/buscar" className="btn-primary">Explorar</Link>} /> : (
          <div className="space-y-3">
            {list.map(a => (
              <article key={a.id} className="card p-4">
                <div className="flex gap-3">
                  <img src={parseJson<string[]>(a.business.images, [])[0]} alt="" className="w-16 h-16 rounded-xl object-cover bg-surface-container shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">{shop ? <span className="font-label-md text-label-md text-secondary truncate">{a.business.name}</span> : <Link href={`/negocio/${a.business.slug}`} className="font-label-md text-label-md text-secondary truncate">{a.business.name}</Link>}<StatusBadge status={a.status} /></div>
                    <Link href={`/cita/${a.code}`} className="font-title-md text-title-md block truncate">{a.services.map(s => s.service.name).join(' + ')}</Link>
                    <p className="font-body-sm text-body-sm text-on-surface-variant flex flex-wrap gap-x-3"><span className="flex items-center gap-1"><Icon name="event" className="text-[14px]" />{fechaLarga(a.start)} · {time12(hm(a.start))}</span><span>{a.staff.name}</span><span className="tnum">{cop(a.total)}</span></p>
                  </div>
                </div>
                <AppointmentActions code={a.code} slug={a.business.slug} upcoming={tab === 'proximas'} canReview={a.status === 'COMPLETADA' && !a.review} policyHours={a.business.cancellationHours}
                  repeatQuery={`servicio=${a.services[0]?.serviceId}&profesional=${a.staffId}`} />
              </article>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
