import Link from 'next/link';
import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
import { PageHeader, Stat } from '@/components/panel/PageHeader';
import { Empty } from '@/components/ui/Empty';
import { Icon } from '@/components/ui/Icon';
import { ActionForm } from '@/components/ui/ActionForm';
import { Submit } from '@/components/ui/Submit';
import { AutoRefresh } from '@/components/ui/AutoRefresh';
import { hm, time12, timeOf } from '@/lib/format';
import { waLink } from '@/lib/notify';
import { activePeak, describePeak, gapsToday, nearTurnMessage, peakRules, queueToday, todayStart, turnLink, DIAS_LETRA } from '@/lib/fila';
import { addPeakRule, addWalkInPanel, saveQueueSettings } from '../_actions/fila';
import { QueueRow, DeletePeak } from './Rows';

export const metadata = { title: 'Fila y huecos' };
const dur = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`);

// Citas primero, turnos después: la agenda manda y la fila entra en los huecos libres.
export default async function Fila() {
  const { business: b } = await requireBusiness('agenda');
  const [q, gaps, services, served] = await Promise.all([
    queueToday(b.id), gapsToday(b),
    db.service.findMany({ where: { businessId: b.id, active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    db.walkIn.count({ where: { businessId: b.id, createdAt: { gte: todayStart() }, status: { in: ['ATENDIENDO', 'ATENDIDO'] } } })
  ]);
  const peak = activePeak(b); const rules = peakRules(b);
  const freeNow = gaps.filter(g => g.freeNow);
  const link = `/negocio/${b.slug}/fila`;
  return (
    <>
      <AutoRefresh seconds={20} />
      <PageHeader eyebrow="Agenda" title="Fila y huecos libres" subtitle="Las citas tienen prioridad. Quien llega sin cita se anota con el QR y entra en los huecos libres de la agenda."
        actions={<><Link href="/panel/fila/qr" className="btn-ghost btn-sm"><Icon name="qr_code_2" className="text-[18px]" />QR de la fila</Link><Link href={link} target="_blank" className="btn-ghost btn-sm"><Icon name="open_in_new" className="text-[18px]" />Ver página</Link></>} />
      {peak && <div className="mb-4 p-4 rounded-2xl bg-secondary-fixed/40 border border-gold/50 flex items-center gap-3"><Icon name="lock_clock" className="text-secondary text-[24px]" /><div><p className="font-label-lg">Hora pico: solo con cita hasta las {time12(peak.to)}</p><p className="font-body-sm text-on-surface-variant">{peak.label}. Mientras tanto la fila no recibe turnos nuevos.</p></div></div>}
      {!b.queueEnabled && <div className="mb-4 p-4 rounded-2xl bg-surface-container-low flex items-center gap-3"><Icon name="pause_circle" className="text-[24px]" /><p className="font-label-lg">La fila virtual está apagada. Actívala abajo en Ajustes de la fila.</p></div>}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="En la fila" value={String(q.length)} icon="groups" />
        <Stat label="Espera del último" value={q.length ? dur(q[q.length - 1].waitMin) : '—'} icon="hourglass_top" tone="gold" />
        <Stat label="Libres ahora" value={`${freeNow.length}/${gaps.filter(g => g.working).length}`} icon="person_check" />
        <Stat label="Atendidos hoy sin cita" value={String(served)} icon="how_to_reg" />
      </div>
      <div className="grid xl:grid-cols-[1fr_380px] gap-4 items-start">
        <section className="card p-4">
          <h2 className="h-section mb-3">Fila de hoy</h2>
          {q.length === 0 ? <Empty icon="groups" title="No hay nadie en la fila" text="Cuando alguien escanee el QR del local aparecerá aquí." /> : (
            <ul className="space-y-2">{q.map(w => {
              const near = w.status === 'ESPERANDO' && w.position < b.queueNotifyAhead;
              return <QueueRow key={w.id} w={{ id: w.id, number: w.number, name: w.name, phone: w.phone, status: w.status, service: w.service?.name || null, waitMin: w.waitMin, position: w.position, since: time12(hm(w.createdAt)), notified: !!w.notifiedAt }}
                near={near} wa={w.phone ? waLink(w.phone, nearTurnMessage(w, b.name, w.position, turnLink(w.id))) : null}
                staff={freeNow.map(g => ({ id: g.staff.id, name: g.staff.name, freeFor: g.freeFor, fits: g.freeFor >= (w.service?.durationMin || 30) }))} />;
            })}</ul>
          )}
          <details className="mt-4 rounded-xl bg-surface-container-low p-3">
            <summary className="cursor-pointer font-label-lg">Anotar a alguien en recepción</summary>
            <ActionForm action={addWalkInPanel} className="grid sm:grid-cols-3 gap-2 mt-3" success="Agregado a la fila." resetOnSuccess>
              <input name="name" required placeholder="Nombre" className="input" />
              <input name="phone" inputMode="numeric" placeholder="Celular (opcional)" className="input" />
              <select name="serviceId" className="input" defaultValue=""><option value="">Servicio (opcional)</option>{services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
              <Submit className="btn-primary sm:col-span-3">Agregar a la fila</Submit>
            </ActionForm>
          </details>
        </section>
        <section className="card p-4">
          <h2 className="h-section mb-1">Huecos libres hoy</h2>
          <p className="font-body-sm text-on-surface-variant mb-3">Se actualiza solo. Las citas y las horas pico ya están descontadas.</p>
          <ul className="space-y-2">{gaps.filter(g => g.working).map(g => (
            <li key={g.staff.id} className={`p-3 rounded-xl border ${g.freeNow ? 'border-[#059669]/40 bg-[#ECFDF5] dark:bg-[#05291d]' : 'border-parchment'}`}>
              <div className="flex items-center justify-between gap-2"><p className="font-label-lg truncate">{g.staff.name}</p>
                {g.freeNow ? <span className="text-[#047857] font-label-md whitespace-nowrap">Libre {dur(g.freeFor)}</span> : <span className="text-on-surface-variant font-label-md whitespace-nowrap">{g.current?.status === 'PICO' ? 'Solo citas' : 'Ocupado'}</span>}</div>
              {g.current && g.current.status !== 'PICO' && <p className="font-body-sm text-on-surface-variant truncate">Con {g.current.who} hasta {time12(timeOf(g.current.b))}</p>}
              {g.gaps.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1">{g.gaps.slice(0, 5).map(x => <span key={x.from} className="px-2 py-0.5 rounded-md bg-surface-container-low font-label-sm tnum">{time12(timeOf(x.from))} – {time12(timeOf(x.to))}</span>)}</div>}
              {g.gaps.length === 0 && <p className="font-body-sm text-on-surface-variant">Sin huecos el resto del día.</p>}
            </li>
          ))}{gaps.filter(g => g.working).length === 0 && <li className="font-body-sm text-on-surface-variant">Nadie trabaja el resto de hoy.</li>}</ul>
        </section>
      </div>
      <div className="grid lg:grid-cols-2 gap-4 mt-4 items-start">
        <section className="card p-5 space-y-3">
          <h2 className="h-section">Ajustes de la fila</h2>
          <ActionForm action={saveQueueSettings} className="space-y-3" success="Ajustes guardados.">
            <label className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low"><input type="checkbox" name="queueEnabled" defaultChecked={b.queueEnabled} className="w-5 h-5 accent-primary-container" /><span className="font-label-lg">Recibir turnos sin cita con el QR</span></label>
            <label className="block"><span className="label">Avisar por WhatsApp cuando falten</span><select name="queueNotifyAhead" defaultValue={b.queueNotifyAhead} className="input">{[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} {n === 1 ? 'turno' : 'turnos'}</option>)}</select></label>
            <Submit className="btn-primary">Guardar</Submit>
          </ActionForm>
        </section>
        <section className="card p-5 space-y-3">
          <h2 className="h-section">Horas pico: solo con cita</h2>
          <p className="font-body-sm text-on-surface-variant">En estas franjas la fila no recibe turnos y los huecos quedan solo para reservas. Úsalo en temporada alta.</p>
          {rules.length > 0 && <ul className="space-y-2">{rules.map(r => <li key={r.id} className="flex items-center gap-2 p-3 rounded-xl bg-surface-container-low"><Icon name="lock_clock" className="text-secondary text-[20px]" /><div className="flex-1 min-w-0"><p className="font-label-lg truncate">{r.label}</p><p className="font-body-sm text-on-surface-variant">{describePeak(r)}</p></div><DeletePeak id={r.id} /></li>)}</ul>}
          <ActionForm action={addPeakRule} className="space-y-3 pt-2 border-t border-parchment" success="Franja agregada." resetOnSuccess>
            <input name="label" placeholder="Nombre (ej. Temporada de diciembre)" className="input" />
            <div><span className="label">Días</span><div className="flex flex-wrap gap-1.5">{[1, 2, 3, 4, 5, 6, 0].map(d => <label key={d} className="chip has-[:checked]:bg-primary-container has-[:checked]:text-on-primary cursor-pointer"><input type="checkbox" name="days" value={d} className="sr-only" defaultChecked={d === 5 || d === 6} />{DIAS_LETRA[d]}</label>)}</div></div>
            <div className="grid grid-cols-2 gap-3"><label className="block"><span className="label">Desde</span><input type="time" name="from" defaultValue="15:00" required className="input" /></label><label className="block"><span className="label">Hasta</span><input type="time" name="to" defaultValue="19:00" required className="input" /></label></div>
            <div className="grid grid-cols-2 gap-3"><label className="block"><span className="label">Fecha inicial (opcional)</span><input type="date" name="startDate" className="input" /></label><label className="block"><span className="label">Fecha final (opcional)</span><input type="date" name="endDate" className="input" /></label></div>
            <Submit className="btn-gold">Agregar franja</Submit>
          </ActionForm>
        </section>
      </div>
    </>
  );
}
