'use client';
import { useTransition } from 'react';
import { Icon } from '@/components/ui/Icon';
import { closeWaiting, pingWaiting } from '../_actions/espera';

export function WaitActions({ id, wa }: { id: string; wa: string | null }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap gap-1.5">
      {wa && <a href={wa} target="_blank" rel="noreferrer" className="btn btn-sm bg-[#25D366] text-white"><Icon name="chat" className="text-[16px]" />WhatsApp</a>}
      <button type="button" disabled={pending} onClick={() => start(async () => { await pingWaiting(id); })} className="btn-outline btn-sm"><Icon name="notifications" className="text-[16px]" />Avisar</button>
      <button type="button" disabled={pending} onClick={() => start(() => closeWaiting(id, 'ATENDIDA'))} className="btn-ghost btn-sm">Atendida</button>
      <button type="button" disabled={pending} onClick={() => start(() => closeWaiting(id, 'CANCELADA'))} className="btn-ghost btn-sm" aria-label="Quitar de la lista"><Icon name="close" className="text-[16px]" /></button>
    </div>
  );
}
