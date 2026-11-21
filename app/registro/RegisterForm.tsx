'use client';
import Link from 'next/link';
import { useActionState } from 'react';
import { registerEmail } from '@/app/login/actions';
import { PasswordInput } from '@/components/ui/PasswordInput';
export function RegisterForm({ next, embedded = false }: { next: string; embedded?: boolean }) {
  const [st, action, p] = useActionState(registerEmail, null);
  return (
    <form action={action} className="card-raised p-6 space-y-3" key={st ? JSON.stringify(st) : 'nuevo'}>
      <input type="hidden" name="next" value={next} />
      <label className="block"><span className="label">Nombre completo</span><input name="name" className="input" required minLength={2} autoComplete="name" defaultValue={st?.name} /></label>
      <label className="block"><span className="label">Correo</span><input name="email" type="email" className="input" required autoComplete="email" inputMode="email" defaultValue={st?.email} /></label>
      <label className="block"><span className="label">Celular <span className="text-on-surface-variant font-normal">(opcional)</span></span><input name="phone" className="input" inputMode="numeric" autoComplete="tel-national" placeholder="300 000 0000" defaultValue={st?.phone} /></label>
      <label className="block"><span className="label">Contraseña</span><PasswordInput name="password" minLength={8} autoComplete="new-password" /></label>
      <label className="block"><span className="label">Repite la contraseña</span><PasswordInput name="password2" minLength={8} autoComplete="new-password" /></label>
      <p className="font-body-sm text-body-sm text-on-surface-variant -mt-1">Mínimo 8 caracteres.</p>
      <label className="flex items-start gap-2 font-body-sm text-body-sm text-on-surface-variant"><input type="checkbox" required className="mt-1 accent-primary-container" />Autorizo el tratamiento de mis datos personales según la Ley 1581 de 2012 y la política de privacidad.</label>
      {st?.error && <p role="alert" className="text-danger font-label-md">{st.error}</p>}
      <button disabled={p} className="btn-primary w-full">{p ? 'Creando tu cuenta…' : 'Crear cuenta'}</button>
      {!embedded && <p className="text-center font-body-sm text-on-surface-variant">¿Ya tienes cuenta? <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-secondary font-bold">Ingresa</Link></p>}
    </form>
  );
}
