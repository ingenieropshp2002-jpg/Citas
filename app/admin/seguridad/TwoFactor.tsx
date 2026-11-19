'use client';
import { useState, useTransition } from 'react';
import { Icon } from '@/components/ui/Icon';
import { confirmTotp, disableTotp, regenerateRecovery, startTotp } from '../_actions/seguridad';

function Codes({ codes }: { codes: string[] }) {
  const text = codes.join('\n');
  return (
    <div className="mt-3 p-4 rounded-xl border border-gold/60 bg-secondary-fixed/15">
      <p className="font-label-lg">Guarda estos códigos de respaldo</p>
      <p className="font-body-sm text-on-surface-variant">Cada uno sirve una sola vez para entrar si pierdes el celular. No los volverás a ver.</p>
      <pre className="mt-2 grid grid-cols-2 gap-1 font-mono text-[15px]">{codes.map(c => <span key={c}>{c}</span>)}</pre>
      <div className="flex gap-2 mt-2">
        <button type="button" className="btn-outline btn-sm" onClick={() => navigator.clipboard.writeText(text)}><Icon name="content_copy" className="text-[16px]" />Copiar</button>
        <a className="btn-outline btn-sm" download="codigos-de-respaldo.txt" href={`data:text/plain;charset=utf-8,${encodeURIComponent(text)}`}><Icon name="download" className="text-[16px]" />Descargar</a>
      </div>
    </div>
  );
}

export function TwoFactor({ enabled, left }: { enabled: boolean; left: number }) {
  const [p, start] = useTransition(); const [err, setErr] = useState('');
  const [setup, setSetup] = useState<{ qr: string; secret: string } | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null); const [code, setCode] = useState('');
  const run = (fn: () => Promise<void>) => { setErr(''); start(fn); };
  if (codes) return <><p className="font-label-lg text-[#065F46] flex items-center gap-1"><Icon name="verified_user" className="text-[20px]" />Verificación en dos pasos activa</p><Codes codes={codes} /></>;
  if (enabled) return (
    <div>
      <p className="font-label-lg text-[#065F46] flex items-center gap-1"><Icon name="verified_user" className="text-[20px]" />Activa. Te quedan {left} {left === 1 ? 'código' : 'códigos'} de respaldo.</p>
      <p className="font-body-sm text-on-surface-variant mt-1">Para desactivarla o crear códigos nuevos, escribe el código de tu app:</p>
      <div className="flex flex-wrap gap-2 mt-2">
        <input value={code} onChange={e => setCode(e.target.value)} className="input w-36 text-center tracking-widest" inputMode="numeric" maxLength={7} placeholder="000000" aria-label="Código" />
        <button type="button" disabled={p} className="btn-outline btn-sm" onClick={() => run(async () => { const r = await regenerateRecovery(code); if ('codes' in r && r.codes) setCodes(r.codes); else setErr(r.error || ''); })}>Nuevos códigos de respaldo</button>
        <button type="button" disabled={p} className="btn-ghost btn-sm text-danger" onClick={() => run(async () => { const r = await disableTotp(code); if ('error' in r && r.error) setErr(r.error); })}>Desactivar</button>
      </div>
      {err && <p role="alert" className="text-danger font-label-md mt-2">{err}</p>}
    </div>
  );
  if (!setup) return (
    <div>
      <p className="text-on-surface-variant">Además de la contraseña, al entrar te pediremos un código que cambia cada 30 segundos en tu celular. Así nadie entra aunque conozca tu clave.</p>
      <button type="button" disabled={p} className="btn-primary mt-3" onClick={() => run(async () => { const r = await startTotp(); if ('qr' in r && r.qr) setSetup({ qr: r.qr, secret: r.secret! }); else setErr(r.error || ''); })}><Icon name="lock" className="text-[18px]" />Activar verificación en dos pasos</button>
      {err && <p role="alert" className="text-danger font-label-md mt-2">{err}</p>}
    </div>
  );
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <img src={setup.qr} alt="Código QR para la app de autenticación" className="w-44 h-44 rounded-xl border border-parchment bg-white p-2 shrink-0" />
      <div className="space-y-2">
        <ol className="list-decimal pl-5 font-body-sm text-on-surface-variant space-y-1">
          <li>Instala Google Authenticator, Microsoft Authenticator o Authy.</li>
          <li>Toca «Agregar» y escanea el código QR. Si no puedes, escribe esta clave: <b className="font-mono text-on-surface">{setup.secret}</b></li>
          <li>Escribe el código de 6 dígitos que aparece.</li>
        </ol>
        <div className="flex gap-2">
          <input value={code} onChange={e => setCode(e.target.value)} className="input w-36 text-center tracking-widest" inputMode="numeric" maxLength={7} placeholder="000000" aria-label="Código de la app" autoComplete="one-time-code" />
          <button type="button" disabled={p} className="btn-primary" onClick={() => run(async () => { const r = await confirmTotp(code); if ('codes' in r && r.codes) setCodes(r.codes); else setErr(r.error || ''); })}>{p ? 'Verificando…' : 'Activar'}</button>
        </div>
        {err && <p role="alert" className="text-danger font-label-md">{err}</p>}
      </div>
    </div>
  );
}
