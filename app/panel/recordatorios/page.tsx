import Link from 'next/link';
import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
import { PageHeader, Stat } from '@/components/panel/PageHeader';
import { Empty } from '@/components/ui/Empty';
import { StatusBadge } from '@/components/ui/Status';
import { addDays, fechaLarga, fromBogota, hm, time12, ymd } from '@/lib/format';
import { waLink } from '@/lib/notify';
import { ReminderActions } from './Row';

export const metadata = { title: 'Recordatorios' };
// Recordatorios por WhatsApp en modo manual: cada botón abre WhatsApp con el mensaje listo; la persona solo toca enviar.
export default async function Recordatorios({ searchParams }: { searchParams: Promise<{ dia?: string }> }) {
  const { business: b, staffId, perms } = await requireBusiness('agenda');
  const dia = (await searchParams).dia === 'hoy' ? 'hoy' : 'manana';
  const today = ymd(new Date()); const date = dia === 'hoy' ? today : addDays(today, 1);
  const list = await db.appointment.findMany({
    where: { businessId: b.id, start: { gte: fromBogota(date), lt: fromBogota(addDays(date, 1)) }, status: { in: ['PENDIENTE', 'CONFIRMADA'] }, ...(perms !== 'ALL' && !perms.includes('configuracion') && staffId ? { staffId } : {}) },
    include: { customer: true, staff: true, services: { include: { service: true } } }, orderBy: { start: 'asc' }
  });
  const base = process.env.APP_URL || '';
  const msg = (a: typeof list[number]) => `Hola ${a.customer.name.split(' ')[0]} 👋, te recordamos tu cita en ${b.name} ${dia === 'hoy' ? 'hoy' : 'mañana'}, ${fechaLarga(a.start)}, a las ${time12(hm(a.start))} con ${a.staff.name} (${a.services.map(s => s.service.name).join(' + ')}).\n\n¿Nos confirmas tu asistencia? Responde *SÍ* para confirmar. Si necesitas cambiar la hora, puedes hacerlo aquí: ${base}/mis-citas/${a.code}/reprogramar\n\n📍 ${b.address}`;
  const sent = list.filter(a => a.reminderSent).length; const ok = list.filter(a => a.clientConfirmedAt).length;
  return (
    <>
      <PageHeader eyebrow="Agenda" title="Recordatorios por WhatsApp" subtitle="Toca el botón verde: se abre tu WhatsApp con el mensaje listo y solo das enviar. Cuando el cliente responda, márcalo como confirmado." actions={<>
        <Link href="/panel/recordatorios?dia=hoy" className={`chip ${dia === 'hoy' ? 'chip-on' : ''}`}>Hoy</Link>
        <Link href="/panel/recordatorios" className={`chip ${dia === 'manana' ? 'chip-on' : ''}`}>Mañana</Link>
      </>} />
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Stat label="Citas" value={String(list.length)} icon="event" hint={fechaLarga(fromBogota(date, '12:00'))} />
        <Stat label="Recordatorios enviados" value={`${sent}/${list.length}`} icon="send" tone="gold" />
        <Stat label="Confirmadas por el cliente" value={`${ok}/${list.length}`} icon="mark_chat_read" />
      </div>
      {list.length === 0 ? <div className="card"><Empty icon="event_available" title={`No hay citas ${dia === 'hoy' ? 'hoy' : 'mañana'}`} text="Cuando haya citas aparecerán aquí para enviar el recordatorio." /></div> : (
        <ul className="space-y-2">{list.map(a => (
          <li key={a.id} className={`card p-4 flex flex-col md:flex-row md:items-center gap-3 ${a.clientConfirmedAt ? 'border-l-4 border-l-[#059669]' : ''}`}>
            <div className="w-20 shrink-0"><p className="font-title-md text-title-md tnum">{time12(hm(a.start))}</p><StatusBadge status={a.status} /></div>
            <div className="flex-1 min-w-0"><Link href={`/panel/clientes/${a.customer.id}`} className="font-label-lg hover:text-secondary">{a.customer.name}</Link>
              <p className="font-body-sm text-on-surface-variant truncate">{a.services.map(s => s.service.name).join(' + ')} · {a.staff.name}{a.customer.phone ? ` · ${a.customer.phone}` : ''}</p></div>
            <ReminderActions id={a.id} href={a.customer.phone ? waLink(a.customer.phone, msg(a)) : null} sent={a.reminderSent} confirmed={!!a.clientConfirmedAt} />
          </li>
        ))}</ul>
      )}
    </>
  );
}
