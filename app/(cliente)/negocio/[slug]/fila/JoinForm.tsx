'use client';
import { useActionState } from 'react';
import { joinQueue } from '@/app/(cliente)/fila/actions';
import { Submit } from '@/components/ui/Submit';

export function JoinForm({ slug, services }: { slug: string; services: { id: string; name: string }[] }) {
  const [st, run] = useActionState(joinQueue, null);
  return (
    <form action={run} className="card p-5 mt-space-md space-y-3">
      <input type="hidden" name="slug" value={slug} />
      <label className="block"><span className="label">Tu nombre</span><input name="name" required maxLength={60} autoComplete="name" className="input" /></label>
      <label className="block"><span className="label">Celular (WhatsApp)</span><input name="phone" required inputMode="numeric" autoComplete="tel" placeholder="300 123 4567" className="input" /></label>
      <label className="block"><span className="label">¿Qué te vas a hacer? (opcional)</span>
        <select name="serviceId" className="input" defaultValue=""><option value="">Aún no sé</option>{services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      {st?.error && <p role="alert" className="p-2 rounded-lg bg-[#FFF1F2] text-danger font-label-md">{st.error}</p>}
      <Submit className="btn-primary w-full" pendingText="Anotando…">Tomar mi turno</Submit>
    </form>
  );
}
