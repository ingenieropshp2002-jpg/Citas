'use client';
import Link from 'next/link';
import { useActionState, useState } from 'react';
import { verifySecondStep } from './actions';

export function SecondStepForm() {
  const [st, action, p] = useActionState(verifySecondStep, null); const [recovery, setRecovery] = useState(false);
  return (
    <form action={action} className="card-raised p-6 space-y-3">
      <label className="block"><span className="label">{recovery ? 'Código de respaldo' : 'Código de 6 dígitos'}</span>
        <input name="code" className="input text-center tracking-[0.3em] font-title-lg" required autoFocus autoComplete="one-time-code" inputMode={recovery ? 'text' : 'numeric'} maxLength={recovery ? 9 : 7} placeholder={recovery ? 'XXXX-XXXX' : '000000'} />
      </label>
      {st?.error && <p role="alert" className="text-danger font-label-md">{st.error}</p>}
      {st && 'expired' in st && st.expired ? <Link href="/login" className="btn-primary w-full">Volver a ingresar</Link> : <button disabled={p} className="btn-primary w-full">{p ? 'Verificando…' : 'Verificar'}</button>}
      <button type="button" onClick={() => setRecovery(!recovery)} className="w-full text-center font-body-sm text-secondary">{recovery ? 'Usar el código de la app' : '¿Perdiste el celular? Usa un código de respaldo'}</button>
    </form>
  );
}
