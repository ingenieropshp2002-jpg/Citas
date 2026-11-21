'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Icon } from '@/components/ui/Icon';
import { StatusBadge } from '@/components/ui/Status';
import { fechaLarga, hm, time12 } from '@/lib/format';
import { anularAccesos, entrarConCodigo, miEnlace, salirDelCelular, type PhoneAppt } from './telefono';

/** Sin sesión: celular + código de una cita (lo recibe al reservar). */
export function PhoneLookup({ loginHref, expired }: { loginHref: string; expired?: boolean }) {
  const router = useRouter();
  const [phone, setPhone] = useState(''); const [code, setCode] = useState('');
  const [error, setError] = useState(expired ? 'Ese enlace ya no funciona. Entra con tu celular y el código de una cita.' : ''); const [pending, start] = useTransition();
  return (
    <div className="mt-4">
      <form onSubmit={e => { e.preventDefault(); start(async () => { setError(''); const r = await entrarConCodigo(phone, code); if ('error' in r) setError(r.error); else router.refresh(); }); }} className="card p-space-md space-y-3">
        <div><p className="font-title-md text-title-md">Consulta tus citas sin cuenta</p>
          <p className="font-body-sm text-on-surface-variant mt-0.5">Escribe el celular con el que reservaste y el código de cualquiera de tus citas (por ejemplo 7K2M9P). Lo encuentras en la confirmación que te llegó.</p></div>
        <label className="block"><span className="label">Celular</span>
          <div className="relative"><span className="absolute inset-y-0 left-0 pl-3 flex items-center font-label-md text-on-surface-variant">+57</span>
            <input className="input pl-12 h-11" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="300 123 4567" value={phone} onChange={e => setPhone(e.target.value)} required /></div></label>
        <label className="block"><span className="label">Código de una cita</span>
          <input className="input h-11 uppercase tracking-wider" autoComplete="off" placeholder="7K2M9P" maxLength={9} value={code} onChange={e => setCode(e.target.value)} required /></label>
        {error && <p role="alert" className="font-label-md text-danger">{error}</p>}
        <button className="btn-gold w-full h-11" disabled={pending}>{pending ? 'Revisando…' : 'Ver mis citas'}</button>
        <p className="font-body-sm text-on-surface-variant flex items-start gap-1.5"><Icon name="lock" className="text-[16px] text-secondary mt-0.5" />Así nadie puede ver tus citas solo con tu número. Este dispositivo queda recordado 7 días.</p>
      </form>
      <p className="mt-5 text-center font-body-sm text-on-surface-variant">¿Quieres reprogramar, cancelar o ver tu historial? <Link href={loginHref} className="text-secondary font-semibold">Ingresa a tu cuenta</Link></p>
    </div>
  );
}

/** Citas del celular recordado, con el enlace personal y la opción de cerrar el acceso. */
export function PhoneAppointments({ phone, list, loginHref }: { phone: string; list: PhoneAppt[]; loginHref: string }) {
  const router = useRouter(); const [pending, start] = useTransition(); const [msg, setMsg] = useState('');
  const copy = () => start(async () => {
    const r = await miEnlace(); if ('error' in r) { setMsg(r.error!); return; }
    try { if (navigator.share) await navigator.share({ title: 'Mis citas', url: r.url }); else { await navigator.clipboard.writeText(r.url); setMsg('Enlace copiado. Guárdalo solo para ti.'); } }
    catch { setMsg(''); }
  });
  return (
    <div className="mt-4">
      <p className="font-body-sm text-on-surface-variant flex items-center gap-1.5"><Icon name="smartphone" className="text-[16px] text-secondary" />Citas del celular •••{phone.slice(-4)}</p>
      {list.length === 0 ? (
        <div className="card p-6 mt-3 text-center text-on-surface-variant"><Icon name="calendar_month" className="text-secondary text-[28px]" /><p className="mt-1">No tienes citas próximas.</p><Link href="/buscar" className="btn-gold btn-sm mt-3 inline-flex">Reservar</Link></div>
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
      )}
      <div className="card p-space-md mt-4">
        <p className="font-label-lg flex items-center gap-1.5"><Icon name="key" className="text-secondary text-[18px]" />Tu enlace personal</p>
        <p className="font-body-sm text-on-surface-variant mt-0.5">Abre tus citas sin escribir nada. Guárdalo solo para ti.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={copy} disabled={pending} className="btn-outline btn-sm"><Icon name="content_copy" className="text-[16px]" />Copiar mi enlace</button>
          <button type="button" disabled={pending} onClick={() => start(async () => { await salirDelCelular(); router.refresh(); })} className="btn-ghost btn-sm">Salir de este dispositivo</button>
          <button type="button" disabled={pending} onClick={() => start(async () => { if (!confirm('Se anulará tu enlace personal y se cerrará el acceso en todos los dispositivos. ¿Continuar?')) return; await anularAccesos(); router.refresh(); })} className="btn-ghost btn-sm text-danger">Anular enlace y cerrar en todos</button>
        </div>
        {msg && <p className="mt-2 font-label-md text-success">{msg}</p>}
      </div>
      <p className="mt-5 text-center font-body-sm text-on-surface-variant">¿Quieres reprogramar, cancelar o ver tu historial? <Link href={loginHref} className="text-secondary font-semibold">Ingresa a tu cuenta</Link></p>
    </div>
  );
}
