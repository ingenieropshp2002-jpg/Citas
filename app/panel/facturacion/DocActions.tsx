'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmButton } from '@/components/ui/Confirm';
import { Icon } from '@/components/ui/Icon';
import { retransmit } from '@/app/panel/_actions/pos';
import { annulDocument } from '@/app/panel/_actions/dian';
export function DocActions({ id, canResend, canAnnul }: { id: string; canResend: boolean; canAnnul: boolean }) {
  const r = useRouter(); const [p, start] = useTransition();
  return (
    <div className="flex gap-1 justify-end">
      <a href={`/api/documentos/${id}/xml`} className="btn-ghost btn-sm" title="Descargar XML"><Icon name="code" className="text-[16px]" /></a>
      {canResend && <button disabled={p} className="btn-ghost btn-sm" title="Transmitir de nuevo" onClick={() => start(async () => { await retransmit(id); r.refresh(); })}><Icon name="send" className="text-[16px]" /></button>}
      {canAnnul && <ConfirmButton title="Emitir nota crédito" text="Anula totalmente el documento ante la DIAN (concepto 2: anulación). Para devolver productos al inventario, anula la venta desde Caja > Ventas." confirmLabel="Emitir nota" fields={<input name="reason" className="input" placeholder="Motivo" required />} action={async fd => { const x = await annulDocument(id, String(fd.get('reason'))); r.refresh(); return x; }}><Icon name="undo" className="text-[16px]" /></ConfirmButton>}
    </div>
  );
}
