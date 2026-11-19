import Link from 'next/link';
import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
import { PageHeader } from '@/components/panel/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { Empty } from '@/components/ui/Empty';
import { ConfirmButton } from '@/components/ui/Confirm';
import { AutoRefresh } from '@/components/ui/AutoRefresh';
import { cop, fechaCorta, hm, time12 } from '@/lib/format';
import { DEPOSIT_NOTE } from '@/lib/abono';
import { sweepAppointments } from '@/lib/asistencia';
import { acceptDeposit, rejectDeposit } from '../_actions/abonos';
import { waLink } from '@/lib/notify';

export const metadata = { title: 'Abonos' };
export default async function Abonos() {
  const { business: b } = await requireBusiness('agenda');
  await sweepAppointments(b.id);
  const since = new Date(Date.now() - 7 * 864e5);
  const [pending, done] = await Promise.all([
    db.appointment.findMany({ where: { businessId: b.id, paymentMethod: 'TRANSFERENCIA', depositStatus: 'PENDIENTE', status: 'PENDIENTE' }, include: { customer: true, staff: { select: { name: true } } }, orderBy: [{ depositProofAt: { sort: 'asc', nulls: 'last' } }, { depositDueAt: 'asc' }] }),
    db.appointment.findMany({ where: { businessId: b.id, paymentMethod: 'TRANSFERENCIA', createdAt: { gte: since }, OR: [{ depositStatus: 'PAGADO' }, { status: 'CANCELADA', notes: { contains: DEPOSIT_NOTE } }] }, include: { customer: true }, orderBy: { createdAt: 'desc' }, take: 20 })
  ]);
  const noInfo = !b.transferInfo.trim();
  return (
    <>
      <AutoRefresh seconds={30} />
      <PageHeader eyebrow="Agenda" title="Abonos" subtitle={b.depositPercent > 0 ? `Abono del ${b.depositPercent}% · plazo para pagar: ${b.depositDeadlineMin} min` : 'No estás pidiendo abono'} actions={<Link href="/admin/configuracion" className="btn-ghost btn-sm"><Icon name="settings" className="text-[16px]" />Configurar</Link>} />
      {(noInfo || b.depositPercent <= 0) && <div className="card p-4 mb-4 flex items-start gap-3 border border-gold/50"><Icon name="info" className="text-secondary" /><p className="font-body-md">{b.depositPercent <= 0 ? 'Elige el porcentaje del abono' : 'Escribe los datos de tu cuenta'} en <Link href="/admin/configuracion" className="text-secondary font-semibold underline">Configuración → Abono para separar la cita</Link> para que tus clientes puedan pagar por transferencia y subir el comprobante.</p></div>}
      <section className="card overflow-hidden">
        <h2 className="h-section p-4 border-b border-parchment">Por revisar ({pending.length})</h2>
        {pending.length === 0 ? <Empty icon="account_balance" title="No hay abonos pendientes" text="Cuando un cliente reserve con abono por transferencia, aparecerá aquí con su comprobante." /> : (
          <ul className="divide-y divide-parchment">
            {pending.map(a => {
              const left = a.depositDueAt ? Math.round((a.depositDueAt.getTime() - Date.now()) / 60000) : null;
              return (
                <li key={a.id} className="p-4 flex flex-wrap items-center gap-3">
                  <div className="min-w-[200px] flex-1">
                    <p className="font-title-md">{a.customer.name} <span className="font-label-md text-on-surface-variant">· {a.code}</span></p>
                    <p className="font-body-sm text-on-surface-variant">{fechaCorta(a.start)} {time12(hm(a.start))} con {a.staff.name} · abono <b className="text-on-surface tnum">{cop(a.depositAmount)}</b> de {cop(a.total)}</p>
                    {a.depositProofAt
                      ? <p className="font-label-md text-[#059669] flex items-center gap-1 mt-1"><Icon name="task_alt" className="text-[16px]" />Comprobante subido a las {time12(hm(a.depositProofAt))}</p>
                      : <p className="font-label-md text-secondary flex items-center gap-1 mt-1"><Icon name="hourglass_top" className="text-[16px]" />Esperando comprobante{left !== null ? ` · se libera en ${left > 0 ? `${left} min` : 'instantes'}` : ''}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {a.depositProofAt && <a href={`/api/abono/${a.code}`} target="_blank" rel="noreferrer" className="btn-outline btn-sm"><Icon name="visibility" className="text-[16px]" />Ver comprobante</a>}
                    {a.customer.phone && <a href={waLink(a.customer.phone, `Hola ${a.customer.name.split(' ')[0]}, te escribimos de ${b.name} por el abono de tu cita ${a.code}.`)} target="_blank" rel="noreferrer" className="btn-ghost btn-sm"><Icon name="chat" className="text-[16px]" />WhatsApp</a>}
                    <ConfirmButton action={acceptDeposit} danger={false} className="btn-primary btn-sm" title="¿Abono recibido?" text={`Confirma que llegaron ${cop(a.depositAmount)} a tu cuenta. La cita de ${a.customer.name} quedará confirmada.`} confirmLabel="Sí, lo recibí" fields={<input type="hidden" name="id" value={a.id} />}><Icon name="check" className="text-[16px]" />Abono recibido</ConfirmButton>
                    {a.depositProofAt && <ConfirmButton action={rejectDeposit} className="btn-ghost btn-sm text-danger" title="Rechazar comprobante" text="El cliente podrá subir otro. Tendrá al menos 30 minutos más antes de que se libere el horario." confirmLabel="Rechazar" fields={<><input type="hidden" name="id" value={a.id} /><label className="block"><span className="label">Motivo (opcional, se le envía al cliente)</span><input name="reason" className="input" placeholder="No aparece en la cuenta, valor incompleto…" /></label></>}><Icon name="close" className="text-[16px]" />Rechazar</ConfirmButton>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      {done.length > 0 && (
        <section className="card overflow-hidden mt-6">
          <h2 className="h-section p-4 border-b border-parchment">Últimos 7 días</h2>
          <ul className="divide-y divide-parchment">
            {done.map(a => <li key={a.id} className="p-3 px-4 flex items-center gap-3 font-body-md"><Icon name={a.depositStatus === 'PAGADO' ? 'check_circle' : 'event_busy'} className={a.depositStatus === 'PAGADO' ? 'text-[#059669]' : 'text-danger'} /><span className="flex-1">{a.customer.name} · {fechaCorta(a.start)} {time12(hm(a.start))}</span><span className="tnum">{cop(a.depositAmount)}</span><span className="font-label-md text-on-surface-variant w-28 text-right">{a.depositStatus === 'PAGADO' ? 'Recibido' : 'No pagó · liberado'}</span></li>)}
          </ul>
        </section>
      )}
    </>
  );
}
