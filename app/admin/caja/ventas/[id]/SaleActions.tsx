'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmButton } from '@/components/ui/Confirm';
import { Icon } from '@/components/ui/Icon';
import { emitPending, voidSale } from '@/app/admin/_actions/pos';
export function SaleActions({ saleId, hasDoc, voided }: { saleId: string; hasDoc: boolean; voided: boolean }) {
  const r = useRouter(); const [p, start] = useTransition(); const [err, setErr] = useState('');
  return (
    <>
      <button className="btn-ghost btn-sm" onClick={() => window.print()}><Icon name="print" className="text-[18px]" />Imprimir</button>
      {!hasDoc && !voided && <button disabled={p} className="btn-outline btn-sm" onClick={() => start(async () => { const x = await emitPending(saleId, false); if (x.error) setErr(x.error); r.refresh(); })}>Emitir documento</button>}
      {!voided && <ConfirmButton title="Anular venta" text={hasDoc ? 'Se emitirá una nota crédito / nota de ajuste que anula el documento electrónico y se devolverán los productos al inventario.' : 'Se devolverán los productos al inventario.'} confirmLabel="Anular"
        fields={<input name="reason" required className="input" placeholder="Motivo (obligatorio)" />}
        action={async fd => { const x = await voidSale(saleId, String(fd.get('reason') || '')); r.refresh(); return x; }}><Icon name="block" className="text-[16px]" />Anular</ConfirmButton>}
      {err && <p className="w-full text-danger font-label-md">{err}</p>}
    </>
  );
}
