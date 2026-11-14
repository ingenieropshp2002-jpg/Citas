import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { ShopHeader } from '@/components/cliente/Header';
import { parseJson } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';
import { StatusBadge } from '@/components/ui/Status';
import { cop, fechaLarga, hm, METHOD_LABEL, time12 } from '@/lib/format';
import { waLink } from '@/lib/notify';

export const metadata = { title: 'Cita confirmada' };
const g = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
export default async function Cita({ params }: { params: Promise<{ code: string }> }) {
  const a = await db.appointment.findUnique({ where: { code: (await params).code }, include: { business: true, staff: true, services: { include: { service: true } } } });
  if (!a) notFound();
  const names = a.services.map(s => s.service.name).join(' + ');
  const msg = `Tengo cita en ${a.business.name} el ${fechaLarga(a.start)} a las ${time12(hm(a.start))} (${names}). Código ${a.code}. ${a.business.address}`;
  const gcal = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(names + ' - ' + a.business.name)}&dates=${g(a.start)}/${g(a.end)}&location=${encodeURIComponent(a.business.address)}&details=${encodeURIComponent('Código ' + a.code)}`;
  const ok = a.status === 'CONFIRMADA';
  return (
    <>
      <ShopHeader shop={{ slug: a.business.slug, name: a.business.name, logo: a.business.logo || parseJson<string[]>(a.business.images, [])[0] || null }} title="Tu cita" />
      <main className="pt-20 pb-10 px-margin max-w-xl mx-auto">
        <div className="text-center">
          <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center shadow-raised ${ok ? 'bg-primary-container' : 'bg-secondary-fixed'}`}><Icon name={ok ? 'check' : 'hourglass_top'} className={`text-[40px] ${ok ? 'text-secondary-fixed' : 'text-on-secondary-fixed'}`} /></div>
          <h1 className="mt-4 font-headline-lg-mobile text-headline-lg-mobile text-primary-container dark:text-primary">{ok ? '¡Cita confirmada!' : a.status === 'PENDIENTE' ? 'Solicitud recibida' : 'Detalle de la cita'}</h1>
          <p className="text-on-surface-variant mt-1">{ok ? 'Te enviamos la confirmación por WhatsApp.' : a.depositStatus === 'PENDIENTE' ? 'Tu depósito está pendiente de pago.' : 'El negocio confirmará tu cita pronto.'}</p>
        </div>
        <div className="card-raised mt-6 overflow-hidden">
          <div className="bg-primary-container text-white p-5 flex items-center justify-between">
            <div><p className="font-label-sm text-label-sm text-secondary-fixed uppercase tracking-wider">Código</p><p className="font-title-lg text-title-lg tracking-widest">{a.code}</p></div>
            <StatusBadge status={a.status} />
          </div>
          <div className="p-5 space-y-3">
            <Row icon="storefront" label="Lugar" value={a.business.name} sub={a.business.address} />
            <Row icon="spa" label="Servicios" value={names} sub={`${(a.end.getTime() - a.start.getTime()) / 60000} min`} />
            <Row icon="person_heart" label="Profesional" value={a.staff.name} sub={a.staff.title} />
            <Row icon="event" label="Fecha y hora" value={fechaLarga(a.start)} sub={time12(hm(a.start))} />
            <div className="border-t border-dashed border-parchment pt-3 space-y-1 tnum">
              <div className="flex justify-between"><span className="text-on-surface-variant">Total</span><b>{cop(a.total, true)}</b></div>
              {a.depositAmount > 0 && <div className="flex justify-between"><span className="text-on-surface-variant">Depósito ({METHOD_LABEL[a.paymentMethod || ''] || a.paymentMethod})</span><span>{cop(a.depositAmount, true)} · {a.depositStatus === 'PAGADO' ? 'Pagado' : a.depositStatus === 'REEMBOLSADO' ? 'Reembolsado' : 'Pendiente'}</span></div>}
              <div className="flex justify-between"><span className="text-on-surface-variant">Saldo en el salón</span><span>{cop(a.total - (a.depositStatus === 'PAGADO' ? a.depositAmount : 0), true)}</span></div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-5">
          <a href={gcal} target="_blank" rel="noopener noreferrer" className="btn-outline"><Icon name="calendar_add_on" className="text-[18px]" />Google Calendar</a>
          <a href={`/api/cita/${a.code}/ics`} className="btn-outline"><Icon name="download" className="text-[18px]" />Añadir (.ics)</a>
          <a href={waLink('', msg)} target="_blank" rel="noopener noreferrer" className="btn col-span-2 bg-[#25D366] text-white"><Icon name="share" className="text-[18px]" />Compartir por WhatsApp</a>
          <Link href={`/negocio/${a.business.slug}`} className="btn-outline col-span-2">Volver a {a.business.name}</Link>
          <Link href={`/mis-citas?negocio=${a.business.slug}`} className="btn-primary col-span-2">Ver mis citas</Link>
        </div>
      </main>
    </>
  );
}
function Row({ icon, label, value, sub }: { icon: string; label: string; value: string; sub?: string }) {
  return <div className="flex gap-3"><span className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center shrink-0"><Icon name={icon} className="text-[18px] text-secondary" /></span><div><p className="font-label-sm text-label-sm text-on-surface-variant uppercase">{label}</p><p className="font-title-md text-title-md">{value}</p>{sub && <p className="font-body-sm text-body-sm text-on-surface-variant">{sub}</p>}</div></div>;
}
