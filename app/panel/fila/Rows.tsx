'use client';
import { useActionState, useState, useTransition } from 'react';
import { Icon } from '@/components/ui/Icon';
import { attendWalkIn, callWalkIn, closeWalkIn, deletePeakRule, markNotified } from '../_actions/fila';

type W = { id: string; number: number; name: string; phone: string | null; status: string; service: string | null; waitMin: number; position: number; since: string; notified: boolean };
export function QueueRow({ w, near, wa, staff }: { w: W; near: boolean; wa: string | null; staff: { id: string; name: string; freeFor: number; fits: boolean }[] }) {
  const [pending, start] = useTransition(); const [open, setOpen] = useState(false);
  const [st, run] = useActionState(attendWalkIn, null);
  return (
    <li className={`p-3 rounded-xl border ${w.status === 'LLAMADO' ? 'border-gold bg-secondary-fixed/25' : near ? 'border-gold/50' : 'border-parchment'}`}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="w-12 h-12 shrink-0 rounded-full bg-primary-container text-white flex items-center justify-center font-title-md tnum">#{w.number}</span>
        <div className="flex-1 min-w-[160px]">
          <p className="font-label-lg">{w.name} {w.status === 'LLAMADO' && <span className="ml-1 px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm">Llamado</span>}</p>
          <p className="font-body-sm text-on-surface-variant">{[w.service, w.phone, `llegó ${w.since}`].filter(Boolean).join(' · ')}</p>
          <p className="font-body-sm text-on-surface-variant">{w.position === 0 ? 'Sigue' : `${w.position} antes`} · espera aprox. {w.waitMin} min</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {wa && w.status === 'ESPERANDO' && <a href={wa} target="_blank" rel="noreferrer" onClick={() => start(() => markNotified(w.id))} className={`btn-sm btn ${near && !w.notified ? 'bg-[#25D366] text-white' : 'btn-ghost'}`}><Icon name="chat" className="text-[16px]" />{w.notified ? 'Avisado' : 'Avisar'}</a>}
          {w.status === 'ESPERANDO' && <button disabled={pending} onClick={() => start(() => callWalkIn(w.id))} className="btn-ghost btn-sm"><Icon name="campaign" className="text-[16px]" />Llamar</button>}
          <button onClick={() => setOpen(!open)} className="btn-primary btn-sm"><Icon name="content_cut" className="text-[16px]" />Atender</button>
          <button disabled={pending} onClick={() => start(() => closeWalkIn(w.id, 'NO_VINO'))} className="btn-ghost btn-sm" title="No vino"><Icon name="person_off" className="text-[16px]" /></button>
        </div>
      </div>
      {open && (
        <form action={run} className="mt-3 flex flex-wrap items-center gap-2">
          <input type="hidden" name="id" value={w.id} />
          {staff.length === 0 ? <p className="font-body-sm text-on-surface-variant">Nadie está libre en este momento. Revisa los huecos libres.</p> : <>
            <select name="staffId" required className="input flex-1 min-w-[200px]" defaultValue={staff.find(s => s.fits)?.id || ''}>
              <option value="" disabled>¿Quién lo atiende?</option>
              {staff.map(s => <option key={s.id} value={s.id} disabled={!s.fits}>{s.name} · libre {s.freeFor} min{s.fits ? '' : ' (no alcanza)'}</option>)}
            </select>
            <button className="btn-primary btn-sm">Pasar a atención</button></>}
          {st?.error && <p role="alert" className="w-full p-2 rounded-lg bg-[#FFF1F2] text-danger font-label-md">{st.error}</p>}
        </form>
      )}
    </li>
  );
}

export function DeletePeak({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return <button disabled={pending} onClick={() => start(() => deletePeakRule(id))} aria-label="Quitar franja" className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-surface-container text-on-surface-variant"><Icon name="delete" className="text-[18px]" /></button>;
}
