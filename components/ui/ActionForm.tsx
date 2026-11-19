'use client';
import { useActionState, useEffect, useRef } from 'react';
type R = { ok?: boolean; error?: string; message?: string } | null | undefined;
export function ActionForm({ action, children, className = 'space-y-4', success = 'Guardado', resetOnSuccess = false }: { action: (s: any, fd: FormData) => Promise<R>; children: React.ReactNode; className?: string; success?: string; resetOnSuccess?: boolean }) {
  const [st, run] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (st?.ok && resetOnSuccess) ref.current?.reset(); }, [st, resetOnSuccess]);
  return (
    <form ref={ref} action={run} className={className}>
      {children}
      {st?.error && <p role="alert" className="p-2 rounded-lg bg-[#FFF1F2] text-danger font-label-md text-label-md">{st.error}</p>}
      {st?.ok && <p role="status" className="p-2 rounded-lg bg-[#ECFDF5] text-[#065F46] font-label-md text-label-md">✓ {st.message || success}</p>}
    </form>
  );
}
