'use client';
import { useOptimistic, useTransition } from 'react';
import { setCustomerDeposit } from '@/app/panel/_actions/asistencia';

export function DepositToggle({ id, manual, auto }: { id: string; manual: boolean; auto: boolean }) {
  const [, start] = useTransition();
  const [on, set] = useOptimistic(manual, (_, v: boolean) => v);
  return (
    <div className="flex flex-col items-end gap-1">
      {auto && <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm whitespace-nowrap">Automático</span>}
      <label className="flex items-center gap-2 font-label-md whitespace-nowrap cursor-pointer"><input type="checkbox" checked={on} onChange={e => { const v = e.target.checked; start(async () => { set(v); await setCustomerDeposit(id, v); }); }} className="w-4 h-4 accent-primary-container" />Exigir siempre</label>
    </div>
  );
}
