import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { ShopHeader } from '@/components/cliente/Header';
import { parseJson } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';
import { StatusBadge } from '@/components/ui/Status';
import { cop, fechaLarga, hm, METHOD_LABEL, time12, timeOf, ymd } from '@/lib/format';
import { attentionPlan, aheadOf } from '@/lib/turnos';
import { waLink } from '@/lib/notify';
import { getUser } from '@/lib/auth';
import { DEPOSIT_NOTE } from '@/lib/abono';
import { ProofUpload } from './ProofUpload';
import { AutoRefresh } from '@/components/ui/AutoRefresh';

export const metadata = { title: 'Cita confirmada' };
const g = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
export default async function Cita({ params }: { params: Promise<{ code: string }> }) {
  const a = await db.appointment.findUnique({ where: { code: (await params).code }, include: { business: true, staff: true, services: { include: { service: true } } } });
  if (!a) notFound();
  const names = a.services.map(s => s.service.name).join(' + ');
  const msg = `Tengo cita en ${a.business.name} el ${fechaLarga(a.start)} a las ${time12(hm(a.start))} (${names}). Código ${a.code}. ${a.business.address}`;
  const gcal = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(names + ' - ' + a.business.name)}&dates=${g(a.start)}/${g(a.end)}&location=${encodeURIComponent(a.business.address)}&details=${encodeURIComponent('Código ' + a.code)}`;
  const ok = a.status === 'CONFIRMADA';
  const abono = a.paymentMethod === 'TRANSFERENCIA' && a.depositAmount > 0;
  const waiting = abono && a.depositStatus === 'PENDIENTE' && a.status === 'PENDIENTE';
  const expired = abono && a.status === 'CANCELADA' && !!a.notes?.includes(DEPOSIT_NOTE);
  const user = waiting ? await getUser() : null;
  const mine = !!user && !!(await db.customer.findFirst({ where: { id: a.customerId, userId: user.id }, select: { id: true } }));
  // El día de la cita: ¿va a tiempo o hay personas antes? (citas del mismo profesional y fila en sus huecos)
  const today = ymd(a.start) === ymd(new Date()) && ['PENDIENTE', 'CONFIRMADA', 'EN_SERVICIO'].includes(a.status);
  const plan = today ? await attentionPlan(a.business) : null;
  const pos = plan ? aheadOf(plan, a.id, true) : null;
  return (
    <>
      <ShopHeader shop={{ slug: a.business.slug, name: a.business.name, logo: a.business.logo || parseJson<string[]>(a.business.images, [])[0] || null }} title="Tu cita" />
      <main className="pt-20 pb-10 px-margin max-w-xl mx-auto">
        <div className="text-center">
          <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center shadow-raised ${ok ? 'bg-primary-container' : 'bg-secondary-fixed'}`}><Icon name={ok ? 'check' : 'hourglass_top'} className={`text-[40px] ${ok ? 'text-secondary-fixed' : 'text-on-secondary-fixed'}`} /></div>
          <h1 className="mt-4 font-headline-lg-mobile text-headline-lg-mobile text-primary-container dark:text-primary">{ok ? '¡Cita confirmada!' : a.status === 'PENDIENTE' ? 'Solicitud recibida' : 'Detalle de la cita'}</h1>
          <p className="text-on-surface-variant mt-1">{ok ? 'Te enviamos la confirmación por WhatsApp.' : waiting ? (a.depositProofAt ? 'Recibimos tu comprobante. El negocio lo está revisando.' : 'Tu cupo está apartado mientras pagas el abono.') : expired ? 'El horario se liberó porque no se recibió el abono a tiempo.' : a.depositStatus === 'PENDIENTE' ? 'Tu depósito está pendiente de pago.' : 'El negocio confirmará tu cita pronto.'}</p>
        </div>
        {waiting && (
          <div className="card-raised mt-6 p-5 space-y-3 border border-gold/50">
            {a.depositProofAt && <AutoRefresh seconds={30} />}
            <div className="flex items-start gap-3">
              <Icon name="account_balance" className="text-secondary text-[26px]" />
              <div>
                <p className="font-title-md">Paga el abono de <b className="tnum">{cop(a.depositAmount, true)}</b> por transferencia</p>
                {a.depositDueAt && <p className="font-body-sm text-on-surface-variant">Tienes hasta las <b className="text-on-surface">{time12(hm(a.depositDueAt))}</b>{ymd(a.depositDueAt) !== ymd(new Date()) ? ` del ${fechaLarga(a.depositDueAt)}` : ' de hoy'}. Si no subes el comprobante antes, la cita se cancela y el horario queda libre.</p>}
              </div>
            </div>
            <div className="rounded-xl bg-surface-container-low p-4 whitespace-pre-line font-body-md select-all">{a.business.transferInfo || 'El negocio te enviará los datos de la cuenta por WhatsApp.'}</div>
            <p className="font-body-sm text-on-surface-variant">En el concepto o la descripción escribe tu código <b className="text-on-surface">{a.code}</b>.</p>
            {a.depositProofAt && <p className="flex items-center gap-2 font-label-lg text-[#059669]"><Icon name="task_alt" className="text-[20px]" />Comprobante enviado. Te avisamos cuando lo confirmen. <a href={`/api/abono/${a.code}`} target="_blank" rel="noreferrer" className="text-secondary underline ml-auto font-label-md">Ver</a></p>}
            {mine ? <ProofUpload code={a.code} has={!!a.depositProofAt} /> : <Link href={`/login?next=/cita/${a.code}`} className="btn-primary w-full">Inicia sesión para subir el comprobante</Link>}
          </div>
        )}
        {expired && <div className="card mt-6 p-4 flex items-start gap-3 border border-danger/40"><Icon name="event_busy" className="text-danger text-[24px]" /><p className="font-body-md">Esta cita se canceló porque el abono no llegó dentro del plazo. Puedes <Link href={`/reservar/${a.business.slug}`} className="text-secondary font-semibold underline">reservar otro horario</Link>.</p></div>}
        {pos && (a.status === 'EN_SERVICIO'
          ? <div className="card mt-6 p-4 flex items-center gap-3 border border-[#059669]/40"><Icon name="content_cut" className="text-[#059669] text-[24px]" /><p className="font-label-lg">Ya te están atendiendo. ¡Disfruta tu servicio!</p></div>
          : <div className={`card mt-6 p-4 flex items-start gap-3 border ${pos.me.delay > 5 ? 'border-gold/60' : 'border-[#059669]/40'}`}>
              <Icon name={pos.me.delay > 5 ? 'schedule' : 'check_circle'} className={`text-[26px] ${pos.me.delay > 5 ? 'text-secondary' : 'text-[#059669]'}`} />
              <div>
                <p className="font-label-lg">{pos.me.delay > 5 ? `${a.staff.name.split(' ')[0]} va con unos ${pos.me.delay} min de retraso` : 'Vas a tiempo'}</p>
                <p className="font-body-sm text-on-surface-variant">{pos.ahead === 0 ? 'Eres la siguiente persona.' : `Hay ${pos.ahead} ${pos.ahead === 1 ? 'persona' : 'personas'} antes de ti con ${a.staff.name.split(' ')[0]}.`} Hora estimada de atención: <b className="text-on-surface tnum">{time12(timeOf(pos.me.start))}</b>. Tu cita tiene prioridad sobre quienes llegan sin reserva.</p>
              </div>
            </div>)}
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
              {a.depositAmount > 0 && <div className="flex justify-between"><span className="text-on-surface-variant">Depósito ({METHOD_LABEL[a.paymentMethod || ''] || a.paymentMethod})</span><span>{cop(a.depositAmount, true)} · {a.depositStatus === 'PAGADO' ? 'Pagado' : a.depositStatus === 'REEMBOLSADO' ? 'Reembolsado' : expired ? 'No pagado' : a.depositProofAt ? 'En revisión' : 'Pendiente'}</span></div>}
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
