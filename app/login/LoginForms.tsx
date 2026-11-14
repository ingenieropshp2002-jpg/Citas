'use client';
import Link from 'next/link';
import { useActionState, useState, useTransition } from 'react';
import { Icon } from '@/components/ui/Icon';
import { loginEmail, sendOtp, verifyOtp } from './actions';

export function LoginForms({ next, google }: { next: string; google: boolean }) {
  const [tab, setTab] = useState<'phone' | 'email'>('phone');
  const [phone, setPhone] = useState(''); const [sent, setSent] = useState(false); const [code, setCode] = useState(''); const [name, setName] = useState(''); const [needName, setNeedName] = useState(false);
  const [msg, setMsg] = useState(''); const [dev, setDev] = useState(''); const [p, start] = useTransition();
  const [st, emailAction, ep] = useActionState(loginEmail, null);
  return (
    <div className="card-raised p-6">
      <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-surface-container-low mb-5">
        {(['phone', 'email'] as const).map(t => <button key={t} onClick={() => setTab(t)} className={`h-10 rounded-lg font-label-lg text-label-lg ${tab === t ? 'bg-surface-container-lowest shadow-sm text-primary-container dark:text-primary' : 'text-on-surface-variant'}`}>{t === 'phone' ? 'Celular' : 'Correo'}</button>)}
      </div>
      {tab === 'phone' ? (
        <form className="space-y-3" onSubmit={e => { e.preventDefault(); setMsg(''); start(async () => {
          if (!sent) { const r = await sendOtp(phone); if ('error' in r && r.error) setMsg(r.error); else { setSent(true); setDev(r.devCode || ''); } return; }
          const r = await verifyOtp(phone, code, name, next); if (r?.error) setMsg(r.error); if (r?.needName) setNeedName(true);
        }); }}>
          <label className="block"><span className="label">Celular</span>
            <div className="relative"><span className="absolute inset-y-0 left-0 pl-4 flex items-center font-label-lg text-on-surface-variant">🇨🇴 +57</span><input className="input pl-20" inputMode="numeric" placeholder="300 000 0000" value={phone} disabled={sent} onChange={e => setPhone(e.target.value)} required /></div></label>
          {sent && <label className="block"><span className="label">Código enviado por WhatsApp/SMS</span><input className="input tracking-[0.5em] text-center font-title-lg" inputMode="numeric" maxLength={6} value={code} onChange={e => setCode(e.target.value)} required autoFocus /></label>}
          {dev && <p className="font-body-sm text-body-sm bg-secondary-fixed/30 rounded-lg p-2">Modo desarrollo (sin WhatsApp configurado): tu código es <b>{dev}</b></p>}
          {needName && <label className="block"><span className="label">¿Cómo te llamas?</span><input className="input" value={name} onChange={e => setName(e.target.value)} required /></label>}
          {msg && <p className="text-danger font-label-md">{msg}</p>}
          <button disabled={p} className="btn-primary w-full">{p ? 'Un momento…' : sent ? 'Verificar e ingresar' : 'Enviar código'}</button>
          {sent && <button type="button" className="w-full font-label-md text-secondary" onClick={() => { setSent(false); setCode(''); }}>Cambiar número</button>}
        </form>
      ) : (
        <form action={emailAction} className="space-y-3">
          <input type="hidden" name="next" value={next} />
          <label className="block"><span className="label">Correo</span><input name="email" type="email" className="input" required autoComplete="email" /></label>
          <label className="block"><span className="label">Contraseña</span><input name="password" type="password" className="input" required autoComplete="current-password" /></label>
          {st?.error && <p className="text-danger font-label-md">{st.error}</p>}
          <button disabled={ep} className="btn-primary w-full">{ep ? 'Ingresando…' : 'Ingresar'}</button>
          <p className="text-center font-body-sm text-on-surface-variant">¿No tienes cuenta? <Link className="text-secondary font-bold" href={`/registro?next=${encodeURIComponent(next)}`}>Regístrate</Link></p>
        </form>
      )}
      <div className="flex items-center gap-3 my-5 text-on-surface-variant font-label-md"><span className="flex-1 h-px bg-parchment" />o<span className="flex-1 h-px bg-parchment" /></div>
      {google ? <a href={`/api/auth/google?next=${encodeURIComponent(next)}`} className="btn-ghost w-full border border-parchment"><img alt="" src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" />Continuar con Google</a>
        : <p className="text-center font-body-sm text-body-sm text-on-surface-variant flex items-center justify-center gap-1"><Icon name="info" className="text-[16px]" />Google se activa configurando GOOGLE_CLIENT_ID.</p>}
    </div>
  );
}
