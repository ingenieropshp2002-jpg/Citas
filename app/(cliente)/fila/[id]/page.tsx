import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { ShopHeader } from '@/components/cliente/Header';
import { Icon } from '@/components/ui/Icon';
import { AutoRefresh } from '@/components/ui/AutoRefresh';
import { parseJson } from '@/lib/format';
import { queueToday } from '@/lib/fila';
import { leaveQueue } from '../actions';

export const metadata = { title: 'Mi turno', robots: { index: false } };

export default async function MiTurno({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const w = await db.walkIn.findUnique({ where: { id }, include: { business: true } });
  if (!w) notFound();
  const b = w.business;
  const q = await queueToday(b.id);
  const me = q.find(x => x.id === w.id);
  const ahead = me?.position ?? 0;
  const leave = leaveQueue.bind(null, w.id);
  const state = w.status === 'LLAMADO' ? 'llamado' : w.status === 'ESPERANDO' ? 'esperando' : w.status === 'ATENDIENDO' || w.status === 'ATENDIDO' ? 'atendido' : 'fuera';
  return (
    <>
      {(state === 'esperando' || state === 'llamado') && <AutoRefresh seconds={20} />}
      <ShopHeader shop={{ slug: b.slug, name: b.name, logo: b.logo || parseJson<string[]>(b.images, [])[0] || null }} title="Mi turno" />
      <main className="pt-20 pb-28 px-margin max-w-md mx-auto text-center">
        <p className="eyebrow">{b.name}</p>
        <div className={`mx-auto mt-3 w-44 h-44 rounded-full flex flex-col items-center justify-center shadow-raised ${state === 'llamado' ? 'bg-secondary-fixed text-on-secondary-fixed animate-pulse' : 'bg-primary-container text-white'}`}>
          <span className="font-label-md uppercase tracking-widest opacity-80">Turno</span>
          <span className="font-display text-[64px] leading-none tnum">#{w.number}</span>
        </div>
        {state === 'esperando' && (<>
          <h1 className="mt-6 font-headline-sm text-headline-sm">{ahead === 0 ? '¡Eres el siguiente!' : `${ahead} ${ahead === 1 ? 'persona' : 'personas'} antes de ti`}</h1>
          <p className="mt-1 text-on-surface-variant">Espera aproximada: <b className="text-on-surface">{me && me.waitMin > 0 ? `${me.waitMin} min` : 'muy poco'}</b></p>
          <p className="mt-4 font-body-sm text-on-surface-variant flex items-center justify-center gap-1.5"><Icon name="chat" className="text-[18px] text-[#25D366]" />Te escribimos por WhatsApp cuando te falte poco. Esta página se actualiza sola.</p>
        </>)}
        {state === 'llamado' && <><h1 className="mt-6 font-headline-sm text-headline-sm">¡Es tu turno!</h1><p className="mt-1 text-on-surface-variant">Acércate a recepción, te estamos esperando.</p></>}
        {state === 'atendido' && <><h1 className="mt-6 font-headline-sm text-headline-sm">Ya te están atendiendo</h1><p className="mt-1 text-on-surface-variant">¡Gracias por visitarnos!</p></>}
        {state === 'fuera' && <><h1 className="mt-6 font-headline-sm text-headline-sm">Este turno ya no está en la fila</h1><Link href={`/negocio/${b.slug}/fila`} className="btn-primary mt-4">Tomar un turno nuevo</Link></>}
        {(state === 'esperando' || state === 'llamado') && <form action={leave} className="mt-8"><button className="btn-ghost text-danger">Salir de la fila</button></form>}
        <Link href={`/reservar/${b.slug}`} className="block mt-4 font-label-md text-secondary">La próxima vez, reserva tu cita</Link>
      </main>
    </>
  );
}
