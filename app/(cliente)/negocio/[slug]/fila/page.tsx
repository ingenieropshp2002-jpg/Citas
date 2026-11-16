import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { ShopHeader } from '@/components/cliente/Header';
import { Icon } from '@/components/ui/Icon';
import { AutoRefresh } from '@/components/ui/AutoRefresh';
import { parseJson, time12 } from '@/lib/format';
import { activePeak, openNow, queueToday } from '@/lib/fila';
import { JoinForm } from './JoinForm';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const b = await db.business.findUnique({ where: { slug: (await params).slug }, select: { name: true } });
  return { title: { absolute: b ? `Fila virtual · ${b.name}` : 'Fila virtual' }, robots: { index: false } };
}

// Página a la que lleva el QR del local: quien llega sin cita se anota y espera afuera.
export default async function FilaNegocio({ params }: { params: Promise<{ slug: string }> }) {
  const b = await db.business.findUnique({ where: { slug: (await params).slug }, include: { services: { where: { active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } } } });
  if (!b || !b.active) notFound();
  const q = await queueToday(b.id);
  const peak = activePeak(b); const open = openNow(b);
  const wait = q.length ? q[q.length - 1].waitMin + 15 : 0;
  const blocked = !b.queueEnabled ? 'Este negocio no tiene la fila virtual activa.' : !open ? 'El local está cerrado en este momento.' : peak ? `En este horario (hasta las ${time12(peak.to)}) solo atendemos con cita.` : null;
  return (
    <>
      <AutoRefresh seconds={30} />
      <ShopHeader shop={{ slug: b.slug, name: b.name, logo: b.logo || parseJson<string[]>(b.images, [])[0] || null }} title="Fila virtual" />
      <main className="pt-20 pb-28 px-margin max-w-md mx-auto">
        <span className="eyebrow">Sin cita</span>
        <h1 className="font-headline-md text-headline-md">Toma tu turno y espera donde quieras</h1>
        <p className="mt-1 text-on-surface-variant">Te avisamos por WhatsApp cuando te falte poco. Las personas con cita tienen prioridad en su horario.</p>
        <div className="grid grid-cols-2 gap-3 mt-space-md">
          <div className="card p-4 text-center"><p className="font-label-sm text-on-surface-variant uppercase tracking-wider">En la fila</p><p className="font-headline-md text-headline-md tnum">{q.length}</p></div>
          <div className="card p-4 text-center"><p className="font-label-sm text-on-surface-variant uppercase tracking-wider">Espera aprox.</p><p className="font-headline-md text-headline-md tnum">{q.length ? `${wait} min` : 'Ya'}</p></div>
        </div>
        {blocked ? (
          <div className="card p-5 mt-space-md text-center">
            <Icon name={peak ? 'event_available' : 'schedule'} className="text-secondary text-[32px]" />
            <p className="mt-2 font-title-md">{blocked}</p>
            <Link href={`/reservar/${b.slug}`} className="btn-primary mt-4 w-full">Reservar una cita</Link>
          </div>
        ) : <JoinForm slug={b.slug} services={b.services} />}
        <p className="mt-6 text-center font-body-sm text-on-surface-variant">¿Prefieres asegurar tu hora? <Link href={`/reservar/${b.slug}`} className="text-secondary font-semibold">Reserva una cita</Link></p>
      </main>
    </>
  );
}
