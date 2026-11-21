'use client';
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { Icon } from '@/components/ui/Icon';
import { StatusBadge } from '@/components/ui/Status';
import { fechaLarga, hm, time12 } from '@/lib/format';
import { citasPorCelular, type PhoneAppt } from './telefono';

const KEY = 'rc_cel';
export function PhoneLookup({ loginHref, negocio }: { loginHref: string; negocio?: string }) {
  const [phone, setPhone] = useState(''); const [remember, setRemember] = useState(true);
  const [list, setList] = useState<PhoneAppt[] | null>(null); const [error, setError] = useState(''); const [pending, start] = useTransition();
  const run = (p: string) => start(async () => {
    setError(''); const r = await citasPorCelular(p, negocio);
    if ('error' in r) { setError(r.error); setList(null); return; }
    setList(r.list);
    try { if (remember) localStorage.setItem(KEY, p); else localStorage.removeItem(KEY); } catch { /* sin almacenamiento */ }
  });
  useEffect(() => { try { const p = localStorage.getItem(KEY); if (p) { setPhone(p); run(p); } } catch { /* nada */ } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="mt-4">
      <form onSubmit={e => { e.preventDefault(); run(phone); }} className="card p-space-md">
        <p className="font-title-md text-title-md">Consulta con tu celular</p>
        <p className="font-body-sm text-on-surface-variant mt-0.5">El mismo número con el que reservaste. No necesitas cuenta.</p>
        <div className="mt-3 flex gap-2">
          <div className="relative flex-1"><span className="absolute inset-y-0 left-0 pl-3 flex items-center font-label-md text-on-surface-variant">+57</span>
            <input className="input pl-12 h-11" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="300 123 4567" value={phone} onChange={e => setPhone(e.target.value)} /></div>
          <button className="btn-gold h-11" disabled={pending}>{pending ? 'Buscando…' : 'Ver'}</button>
        </div>
        <label className="mt-2 flex items-center gap-2 font-body-sm text-on-surface-variant"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="accent-primary-container" />Recordar mi número en este dispositivo</label>
        {error && <p className="mt-2 font-label-md text-danger">{error}</p>}
      </form>
      {list && (list.length === 0 ? (
        <div className="card p-6 mt-3 text-center text-on-surface-variant"><Icon name="calendar_month" className="text-secondary text-[28px]" /><p className="mt-1">No hay citas próximas con ese número.</p></div>
      ) : (
        <div className="space-y-3 mt-3">
          {list.map(a => { const d = new Date(a.start); return (
            <Link key={a.code} href={`/cita/${a.code}`} className="card p-4 block hover:shadow-raised transition">
              <div className="flex items-center justify-between gap-2"><span className="font-label-md text-label-md text-secondary truncate">{a.business}</span><StatusBadge status={a.status} /></div>
              <p className="font-title-md text-title-md truncate">{a.services}</p>
              <p className="font-body-sm text-on-surface-variant flex flex-wrap gap-x-3"><span className="flex items-center gap-1"><Icon name="event" className="text-[14px]" />{fechaLarga(d)} · {time12(hm(d))}</span>{a.staff && <span className="flex items-center gap-1"><Icon name="person" className="text-[14px]" />{a.staff}</span>}</p>
            </Link>
          ); })}
        </div>
      ))}
      <p className="mt-5 text-center font-body-sm text-on-surface-variant">¿Quieres reprogramar, cancelar o ver tu historial? <Link href={loginHref} className="text-secondary font-semibold">Ingresa a tu cuenta</Link></p>
    </div>
  );
}
