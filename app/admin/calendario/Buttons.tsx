'use client';
import { useState, useTransition } from 'react';
import { Icon } from '@/components/ui/Icon';
import { disconnectGcal, syncNow } from '../_actions/calendario';

export function GcalButtons({ staffId }: { staffId: string }) {
  const [p, start] = useTransition(); const [msg, setMsg] = useState('');
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" disabled={p} onClick={() => start(async () => { const n = await syncNow(staffId); setMsg(n ? `${n} ${n === 1 ? 'cambio copiado' : 'cambios copiados'}` : 'Todo al día'); })} className="btn-outline btn-sm"><Icon name="sync" className="text-[16px]" />{p ? 'Sincronizando…' : 'Sincronizar ahora'}</button>
      <button type="button" disabled={p} onClick={() => start(() => disconnectGcal(staffId))} className="btn-ghost btn-sm">Desconectar</button>
      {msg && <span role="status" className="font-label-md text-secondary">{msg}</span>}
    </div>
  );
}
