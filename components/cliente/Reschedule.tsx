'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { DateSlotPicker } from './DateSlotPicker';
import { rescheduleMine } from '@/app/(cliente)/reservar/actions';
import { ymd } from '@/lib/format';
export function Reschedule({ code, businessId, duration, staffId }: { code: string; businessId: string; duration: number; staffId: string }) {
  const [date, setDate] = useState(ymd(new Date())); const [time, setTime] = useState(''); const [err, setErr] = useState(''); const [p, start] = useTransition(); const r = useRouter();
  return (
    <div className="mt-10">
      <DateSlotPicker businessId={businessId} duration={duration} staffId={staffId} serviceIds={[]} date={date} time={time} onChange={(d, t) => { setDate(d); setTime(t); }} />
      {err && <p className="text-danger mt-3">{err}</p>}
      <button disabled={!time || p} className="btn-primary w-full mt-5" onClick={() => start(async () => { const x = await rescheduleMine(code, date, time); if ('error' in x && x.error) setErr(x.error); else if ('redirect' in x && x.redirect) r.push(x.redirect); })}>{p ? 'Guardando…' : 'Confirmar nuevo horario'}</button>
    </div>
  );
}
