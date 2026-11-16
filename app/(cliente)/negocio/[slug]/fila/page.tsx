import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { ShopHeader } from '@/components/cliente/Header';
import { Icon } from '@/components/ui/Icon';
import { AutoRefresh } from '@/components/ui/AutoRefresh';
import { parseJson, time12 } from '@/lib/format';
import { queueStatus, queueToday } from '@/lib/fila';
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
  const st = queueStatus(b);
  const wait = q.length ? q[q.length - 1].waitMin + 15 : 0;
  const peak = 'peak' in st ? st.peak : null;
  const blocked = st.open ? null : peak ? `En este horario (hasta las ${time12(peak.to)}) solo atendemos con cita.` : st.reason;
  return (
    <>
      <AutoRefresh seconds={30} />
      <ShopHeader shop={{ slug: b.slug, name: b.name, logo: b.logo || parseJson<string[]>(b.images, [])[0] || null }} title="Fila virtual" />
      <main className="pt-20 pb-28 px-margin max-w-md mx-auto">
        <span className="eyebrow">Fila del local</span>
        <h1 className="font-headline-md text-headline-md">¿Ya estás en el local? Únete a la fila</h1>
        <p className="mt-1 text-on-surface-variant">Solo para quienes están en el local ahora mismo y no tienen cita. Te avisamos por WhatsApp cuando te falte poco. Las personas con cita se atienden a su hora.</p>
        <p className="mt-2 font-body-sm text-on-surface-variant">¿Quieres venir otro día u otra hora? <Link href={`/reservar/${b.slug}`} className="text-secondary font-semibold">Reserva tu cita</Link>.</p>
        <div className="grid grid-cols-2 gap-3 mt-space-md">
          <div className="card p-4 text-center"><p className="font-label-sm text-on-surface-variant uppercase tracking-wider">En la fila</p><p className="font-headline-md text-headline-md tnum">{q.length}</p></div>
          <div className="card p-4 text-center"><p className="font-label-sm text-on-surface-variant uppercase tracking-wider">Espera aprox.</p><p className="font-headline-md text-headline-md tnum">{q.length ? `${wait} min` : 'Ya'}</p></div>
        </div>
        {blocked ? (
          <div className="card p-5 mt-space-md text-center">
            <Icon name={peak ? 'event_available' : 'storefront'} className="text-secondary text-[32px]" />
            <p className="mt-2 font-title-md">{blocked}</p>
            <Link href={`/reservar/${b.slug}`} className="btn-primary mt-4 w-full">Reservar una cita</Link>
          </div>
        ) : <JoinForm slug={b.slug} services={b.services} />}
        <p className="mt-6 text-center font-body-sm text-on-surface-variant">¿Prefieres asegurar tu hora? <Link href={`/reservar/${b.slug}`} className="text-secondary font-semibold">Reserva una cita</Link></p>
      </main>
    </>
  );
}
