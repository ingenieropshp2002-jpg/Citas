'use client';
import { useState, useTransition } from 'react';
import { Icon } from '@/components/ui/Icon';
import { answerAttendance } from '../actions';

export function Answer({ code, token, confirmed, tolerance }: { code: string; token: string; confirmed: boolean; tolerance: number }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<'SI' | 'NO' | null>(confirmed ? 'SI' : null);
  const [error, setError] = useState(''); const [asking, setAsking] = useState(false);
  const send = (v: 'SI' | 'NO') => start(async () => { setError(''); const r = await answerAttendance(code, token, v); if (r.error) setError(r.error); else setState(v); });
  if (state === 'SI') return (
    <div className="card p-5 mt-4 text-center border border-[#059669]/40 bg-[#ECFDF5] dark:bg-[#05291d]">
      <Icon name="check_circle" fill className="text-[#059669] text-[40px]" />
      <p className="mt-2 font-title-md">¡Listo! Tu asistencia quedó confirmada.</p>
      {tolerance > 0 && <p className="mt-1 font-body-sm text-on-surface-variant">Te esperamos a tiempo: después de {tolerance} minutos de retraso la cita se libera para otra persona.</p>}
      <button disabled={pending} onClick={() => setAsking(true)} className="mt-4 font-label-md text-danger">¿Ya no puedes ir? Cancelar</button>
      {asking && <div className="mt-3"><button disabled={pending} onClick={() => send('NO')} className="btn-danger w-full">Sí, cancelar mi cita</button></div>}
    </div>
  );
  if (state === 'NO') return (
    <div className="card p-5 mt-4 text-center"><Icon name="event_busy" className="text-secondary text-[36px]" /><p className="mt-2 font-title-md">Tu cita fue cancelada.</p><p className="mt-1 font-body-sm text-on-surface-variant">Gracias por avisar: así otra persona puede usar ese horario.</p></div>
  );
  return (
    <div className="mt-4 space-y-3">
      <p className="text-center font-title-md">¿Vas a asistir?</p>
      <button disabled={pending} onClick={() => send('SI')} className="btn-primary w-full h-14 text-[17px]"><Icon name="check" className="text-[20px]" />Confirmo</button>
      {!asking ? <button disabled={pending} onClick={() => setAsking(true)} className="btn-ghost w-full h-14 text-[17px]"><Icon name="close" className="text-[20px]" />Cancelo</button>
        : <button disabled={pending} onClick={() => send('NO')} className="btn-danger w-full h-14 text-[17px]">Sí, cancelar mi cita</button>}
      {error && <p role="alert" className="p-2 rounded-lg bg-[#FFF1F2] text-danger font-label-md text-center">{error}</p>}
      <p className="text-center font-body-sm text-on-surface-variant">Si no confirmas, el cupo puede quedar libre para otra persona.</p>
    </div>
  );
}
