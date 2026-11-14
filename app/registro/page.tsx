'use client';
import Link from 'next/link';
import { useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { registerEmail } from '../login/actions';
function Form() {
  const next = useSearchParams().get('next') || '/';
  const [st, action, p] = useActionState(registerEmail, null);
  return (
    <form action={action} className="card-raised p-6 space-y-3">
      <input type="hidden" name="next" value={next} />
      <label className="block"><span className="label">Nombre completo</span><input name="name" className="input" required /></label>
      <label className="block"><span className="label">Correo</span><input name="email" type="email" className="input" required /></label>
      <label className="block"><span className="label">Celular (opcional)</span><input name="phone" className="input" inputMode="numeric" placeholder="300 000 0000" /></label>
      <label className="block"><span className="label">Contraseña (mín. 8)</span><input name="password" type="password" minLength={8} className="input" required /></label>
      <label className="flex items-start gap-2 font-body-sm text-body-sm text-on-surface-variant"><input type="checkbox" required className="mt-1 accent-primary-container" />Autorizo el tratamiento de mis datos personales según la Ley 1581 de 2012 y la política de privacidad.</label>
      {st?.error && <p className="text-danger font-label-md">{st.error}</p>}
      <button disabled={p} className="btn-primary w-full">{p ? 'Creando…' : 'Crear cuenta'}</button>
      <p className="text-center font-body-sm text-on-surface-variant">¿Ya tienes cuenta? <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-secondary font-bold">Ingresa</Link></p>
    </form>
  );
}
export default function Registro() {
  return <main className="min-h-screen flex flex-col justify-center px-margin py-10 max-w-md mx-auto"><h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary-container dark:text-primary mb-6">Crea tu cuenta</h1><Suspense><Form /></Suspense></main>;
}
