import Link from 'next/link';
import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
import { PageHeader, Stat } from '@/components/panel/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { Empty } from '@/components/ui/Empty';
import { StatusBadge } from '@/components/ui/Status';
import { addDays, fechaLarga, fromBogota, hm, time12, ymd } from '@/lib/format';
import { waLink } from '@/lib/notify';
import { reminderText, sweepAppointments } from '@/lib/asistencia';
import { ReminderActions } from './Row';

export const metadata = { title: 'Recordatorios' };
// Recordatorios por WhatsApp en modo manual: cada botón abre WhatsApp con el mensaje listo; la persona solo toca enviar.
export default async function Recordatorios({ searchParams }: { searchParams: Promise<{ dia?: string }> }) {
  const { business: b, staffId, perms } = await requireBusiness('agenda');
  await sweepAppointments(b.id);
  const q = (await searchParams).dia;
  const dia = q === 'hoy' ? 'hoy' : q === 'hora' ? 'hora' : 'manana';
  const today = ymd(new Date()); const date = dia === 'manana' ? addDays(today, 1) : today;
  const range = dia === 'hora' ? { gt: new Date(), lte: new Date(Date.now() + 90 * 60000) } : { gte: fromBogota(date), lt: fromBogota(addDays(date, 1)) };
  const list = await db.appointment.findMany({
    where: { businessId: b.id, start: range, status: { in: ['PENDIENTE', 'CONFIRMADA'] }, ...(perms !== 'ALL' && !perms.includes('configuracion') && staffId ? { staffId } : {}) },
    include: { customer: true, staff: true, services: { include: { service: true } } }, orderBy: { start: 'asc' }
  });
  const kind = dia === 'hora' ? 'HORA' as const : 'DIA' as const;
  const msg = (a: typeof list[number]) => reminderText(a, b, kind);
  const sentOf = (a: typeof list[number]) => (kind === 'HORA' ? a.reminder1hSent : a.reminderSent);
  const sent = list.filter(sentOf).length; const ok = list.filter(a => a.clientConfirmedAt).length;
  return (
    <>
      <PageHeader eyebrow="Agenda" title="Recordatorios con confirmación" subtitle="Toca el botón verde: se abre tu WhatsApp con el mensaje listo y solo das enviar. El cliente responde Confirmo o Cancelo desde el enlace y aquí lo ves al instante." actions={<>
        <Link href="/panel/recordatorios" className={`chip ${dia === 'manana' ? 'chip-on' : ''}`}>Mañana</Link>
        <Link href="/panel/recordatorios?dia=hoy" className={`chip ${dia === 'hoy' ? 'chip-on' : ''}`}>Hoy</Link>
        <Link href="/panel/recordatorios?dia=hora" className={`chip ${dia === 'hora' ? 'chip-on' : ''}`}>1 hora antes</Link>
      </>} />
      {b.releaseUnconfirmed && <p className="mb-4 p-3 rounded-xl bg-secondary-fixed/30 font-body-sm flex items-center gap-2"><Icon name="lock_open" className="text-secondary text-[20px]" />Si el cliente no confirma, el cupo se libera solo {b.releaseBeforeMin} minutos antes de la cita (solo si ya se le envió el recordatorio).</p>}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Stat label="Citas" value={String(list.length)} icon="event" hint={dia === 'hora' ? 'Próximos 90 minutos' : fechaLarga(fromBogota(date, '12:00'))} />
        <Stat label="Recordatorios enviados" value={`${sent}/${list.length}`} icon="send" tone="gold" />
        <Stat label="Confirmadas por el cliente" value={`${ok}/${list.length}`} icon="mark_chat_read" />
      </div>
      {list.length === 0 ? <div className="card"><Empty icon="event_available" title={dia === 'hora' ? 'No hay citas en la próxima hora y media' : `No hay citas ${dia === 'hoy' ? 'hoy' : 'mañana'}`} text="Cuando haya citas aparecerán aquí para enviar el recordatorio." /></div> : (
        <ul className="space-y-2">{list.map(a => (
          <li key={a.id} className={`card p-4 flex flex-col md:flex-row md:items-center gap-3 ${a.clientConfirmedAt ? 'border-l-4 border-l-[#059669]' : ''}`}>
            <div className="w-20 shrink-0"><p className="font-title-md text-title-md tnum">{time12(hm(a.start))}</p><StatusBadge status={a.status} /></div>
            <div className="flex-1 min-w-0"><Link href={`/panel/clientes/${a.customer.id}`} className="font-label-lg hover:text-secondary">{a.customer.name}</Link>
              <p className="font-body-sm text-on-surface-variant truncate">{a.services.map(s => s.service.name).join(' + ')} · {a.staff.name}{a.customer.phone ? ` · ${a.customer.phone}` : ''}</p></div>
            <ReminderActions id={a.id} href={a.customer.phone ? waLink(a.customer.phone, msg(a)) : null} sent={sentOf(a)} hour={kind === 'HORA'} confirmed={!!a.clientConfirmedAt} />
          </li>
        ))}</ul>
      )}
    </>
  );
}
