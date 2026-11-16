import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { ShopHeader } from '@/components/cliente/Header';
import { Icon } from '@/components/ui/Icon';
import { fechaLarga, hm, parseJson, time12 } from '@/lib/format';
import { confirmToken } from '@/lib/asistencia';
import { Answer } from './Answer';

export const metadata = { title: 'Confirma tu cita', robots: { index: false } };

// Enlace del recordatorio: el cliente responde Confirmo o Cancelo sin iniciar sesión.
export default async function Confirmar({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ t?: string }> }) {
  const code = (await params).code; const t = (await searchParams).t || '';
  if (t !== confirmToken(code)) notFound();
  const a = await db.appointment.findUnique({ where: { code }, include: { business: true, staff: true, services: { include: { service: true } } } });
  if (!a) notFound();
  const b = a.business;
  const active = ['PENDIENTE', 'CONFIRMADA'].includes(a.status) && a.start > new Date();
  return (
    <>
      <ShopHeader shop={{ slug: b.slug, name: b.name, logo: b.logo || parseJson<string[]>(b.images, [])[0] || null }} title="Confirma tu cita" />
      <main className="pt-20 pb-28 px-margin max-w-md mx-auto">
        <section className="card p-5 text-center">
          <span className="eyebrow">{b.name}</span>
          <h1 className="mt-1 font-headline-sm text-headline-sm first-letter:uppercase">{fechaLarga(a.start)}</h1>
          <p className="mt-1 font-title-lg text-title-lg tnum">{time12(hm(a.start))}</p>
          <p className="mt-2 text-on-surface-variant">{a.services.map(s => s.service.name).join(' + ')} con {a.staff.name}</p>
          <p className="mt-1 font-body-sm text-on-surface-variant flex items-center justify-center gap-1"><Icon name="location_on" className="text-[16px] text-secondary" />{b.address}</p>
        </section>
        {active ? <Answer code={code} token={t} confirmed={!!a.clientConfirmedAt} tolerance={b.lateToleranceMin} />
          : <div className="card p-5 mt-4 text-center"><Icon name={a.status === 'CANCELADA' ? 'event_busy' : 'history'} className="text-secondary text-[32px]" /><p className="mt-2 font-title-md">{a.status === 'CANCELADA' ? 'Esta cita está cancelada.' : 'Esta cita ya no está activa.'}</p><Link href={`/reservar/${b.slug}`} className="btn-primary mt-4 w-full">Reservar otra cita</Link></div>}
      </main>
    </>
  );
}
