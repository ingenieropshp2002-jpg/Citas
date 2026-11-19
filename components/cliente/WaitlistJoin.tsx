'use client';
import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { joinWaitlist } from '@/app/(cliente)/reservar/espera';
import { fechaCorta, fromBogota } from '@/lib/format';
import { subscribeDevice } from './HeldSlots';

const WINDOWS: [string, string][] = [['CUALQUIERA', 'A cualquier hora'], ['MANANA', 'Mañana'], ['TARDE', 'Tarde'], ['NOCHE', 'Noche']];

/** «Lista de espera»: si no hay horario que le sirva, el cliente deja fecha y franja y le avisamos solos cuando se libere un cupo. */
export function WaitlistJoin({ businessId, staffId, staffName, serviceIds, date, empty }: { businessId: string; staffId: string | null; staffName: string | null; serviceIds: string[]; date: string; empty: boolean }) {
  const [open, setOpen] = useState(false); const [days, setDays] = useState(1); const [win, setWin] = useState('CUALQUIERA');
  const [phone, setPhone] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [done, setDone] = useState('');
  async function send() {
    setBusy(true); setErr('');
    const sub = await subscribeDevice();
    const r = await joinWaitlist({ businessId, staffId, serviceIds, dateFrom: date, days, window: win, phone, sub });
    setBusy(false);
    if ('error' in r && r.error) { setErr(r.error); if (/Inicia sesión/.test(r.error)) location.href = `/login?next=${encodeURIComponent(location.pathname + location.search)}`; return; }
    if ('ok' in r && r.dateFrom && r.dateTo) setDone(`Listo. Si se libera un cupo ${r.dateFrom === r.dateTo ? `el ${fechaCorta(fromBogota(r.dateFrom, '12:00'))}` : `entre el ${fechaCorta(fromBogota(r.dateFrom, '12:00'))} y el ${fechaCorta(fromBogota(r.dateTo, '12:00'))}`}, te avisamos ${[r.whatsapp && 'por WhatsApp', r.push && 'con una notificación'].filter(Boolean).join(' y ')}. Sales de la lista cuando reserves.`);
  }
  if (done) return <div role="status" className="mt-space-md rounded-xl bg-[#ECFDF5] text-[#065F46] p-space-sm flex gap-2"><Icon name="check_circle" className="text-[20px]" /><p className="font-body-sm">{done}</p></div>;
  if (!open) return (
    <button type="button" onClick={() => setOpen(true)} className={`mt-space-md w-full rounded-xl border border-dashed p-space-sm flex items-center gap-3 text-left ${empty ? 'border-gold/70 bg-secondary-fixed/15' : 'border-parchment'}`}>
      <Icon name="hourglass_top" className="text-secondary" />
      <span className="flex-1"><span className="font-label-lg block">{empty ? '¿No hay cupo? Entra a la lista de espera' : '¿Ningún horario te sirve? Lista de espera'}</span><span className="font-body-sm text-on-surface-variant">Te avisamos solos si alguien cancela.</span></span>
      <Icon name="chevron_right" className="text-on-surface-variant" />
    </button>
  );
  return (
    <div className="mt-space-md rounded-xl border border-gold/50 bg-secondary-fixed/10 p-space-sm space-y-3">
      <p className="font-label-lg flex items-center gap-2"><Icon name="hourglass_top" className="text-secondary text-[20px]" />Lista de espera{staffName ? ` con ${staffName}` : ''}</p>
      <div>
        <span className="label">¿Qué días te sirven?</span>
        <div className="flex flex-wrap gap-2">{[[1, `Solo el ${fechaCorta(fromBogota(date, '12:00'))}`], [3, 'Ese día y 2 más'], [7, 'Esa semana']].map(([n, l]) => <button key={n} type="button" onClick={() => setDays(n as number)} className={`chip ${days === n ? 'chip-on' : ''}`}>{l}</button>)}</div>
      </div>
      <div>
        <span className="label">¿A qué hora?</span>
        <div className="flex flex-wrap gap-2">{WINDOWS.map(([k, l]) => <button key={k} type="button" onClick={() => setWin(k)} className={`chip ${win === k ? 'chip-on' : ''}`}>{l}</button>)}</div>
      </div>
      <label className="block"><span className="label">Celular para el aviso por WhatsApp <span className="font-normal text-on-surface-variant">(si no lo tenemos)</span></span><input value={phone} onChange={e => setPhone(e.target.value)} className="input" inputMode="numeric" autoComplete="tel-national" placeholder="300 000 0000" /></label>
      {err && <p role="alert" className="text-danger font-label-md">{err}</p>}
      <div className="flex gap-2"><button type="button" disabled={busy} onClick={send} className="btn-primary flex-1">{busy ? 'Guardando…' : 'Avísame si se libera'}</button><button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancelar</button></div>
    </div>
  );
}
