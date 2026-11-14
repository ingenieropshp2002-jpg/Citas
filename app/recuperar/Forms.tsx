'use client';
import { useActionState } from 'react';
import { requestReset, resetPassword } from '../login/actions';
import { PasswordInput } from '@/components/ui/PasswordInput';

export function ResetRequest({ next, email }: { next: string; email: string }) {
  const [st, action, pending] = useActionState(requestReset, null);
  if (st && 'ok' in st) return <div className="card-raised p-6" role="status"><p className="font-title-md text-title-md">Revisa tu correo</p><p className="mt-1 text-on-surface-variant">Si el correo tiene una cuenta, te llegará un enlace en unos minutos. Revisa también la carpeta de spam.</p></div>;
  if (st && 'manual' in st) return <div className="card-raised p-6" role="status"><p className="font-title-md text-title-md">Pídelo por WhatsApp</p><p className="mt-1 text-on-surface-variant">Escríbele al negocio donde reservas y pídele un enlace para crear tu contraseña. Te lo envían al instante desde su panel.</p></div>;
  return (
    <form action={action} className="card-raised p-6 space-y-3" noValidate>
      <input type="hidden" name="next" value={next} />
      <label className="block"><span className="label">Correo</span><input name="email" type="email" defaultValue={email} className="input" required autoComplete="email" inputMode="email" autoFocus /></label>
      {st && 'error' in st && <p role="alert" className="text-danger font-label-md">{st.error}</p>}
      <button disabled={pending} className="btn-primary w-full">{pending ? 'Enviando…' : 'Enviar enlace'}</button>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [st, action, pending] = useActionState(resetPassword, null);
  return (
    <form action={action} className="card-raised p-6 space-y-3">
      <input type="hidden" name="token" value={token} />
      <label className="block"><span className="label">Nueva contraseña</span><PasswordInput name="password" autoComplete="new-password" minLength={8} autoFocus /></label>
      <label className="block"><span className="label">Repite la contraseña</span><PasswordInput name="password2" autoComplete="new-password" minLength={8} /></label>
      <p className="font-body-sm text-body-sm text-on-surface-variant">Mínimo 8 caracteres.</p>
      {st?.error && <p role="alert" className="text-danger font-label-md">{st.error}</p>}
      <button disabled={pending} className="btn-primary w-full">{pending ? 'Guardando…' : 'Guardar e ingresar'}</button>
    </form>
  );
}
