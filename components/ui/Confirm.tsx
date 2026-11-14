'use client';
import { useRef, useState, useTransition } from 'react';
import { Icon } from './Icon';

/** Botón que abre un modal de confirmación y ejecuta un server action. */
export function ConfirmButton({ action, title, text, confirmLabel = 'Confirmar', className = 'btn-danger btn-sm', children, danger = true, fields }: {
  action: (fd: FormData) => Promise<unknown>; title: string; text?: string; confirmLabel?: string; className?: string; children: React.ReactNode; danger?: boolean; fields?: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [pending, start] = useTransition();
  const [err, setErr] = useState('');
  return (
    <>
      <button type="button" className={className} onClick={() => { setErr(''); ref.current?.showModal(); }}>{children}</button>
      <dialog ref={ref} className="backdrop:bg-primary-container/40 backdrop:backdrop-blur-sm rounded-3xl p-0 w-[min(92vw,420px)] bg-surface-container-lowest text-on-surface shadow-sheet">
        <form className="p-6" onSubmit={e => { e.preventDefault(); const fd = new FormData(e.currentTarget); start(async () => { try { const r: any = await action(fd); if (r?.error) { setErr(r.error); return; } ref.current?.close(); } catch (x) { setErr((x as Error).message); } }); }}>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${danger ? 'bg-[#FFF1F2] text-danger' : 'bg-secondary-fixed/50 text-secondary'}`}><Icon name={danger ? 'warning' : 'help'} /></div>
          <h3 className="font-headline-sm text-headline-sm text-primary-container dark:text-primary">{title}</h3>
          {text && <p className="text-on-surface-variant mt-1">{text}</p>}
          {fields && <div className="mt-4 space-y-3">{fields}</div>}
          {err && <p className="mt-3 text-danger font-label-md">{err}</p>}
          <div className="flex gap-2 justify-end mt-6">
            <button type="button" className="btn-ghost btn-sm" onClick={() => ref.current?.close()}>Volver</button>
            <button disabled={pending} className={danger ? 'btn-danger btn-sm' : 'btn-primary btn-sm'}>{pending ? 'Procesando…' : confirmLabel}</button>
          </div>
        </form>
      </dialog>
    </>
  );
}
