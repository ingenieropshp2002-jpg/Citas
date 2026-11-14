'use client';
import { useState, useTransition } from 'react';
import { Icon } from '@/components/ui/Icon';
import { customerAccessLink } from '../../_actions/access';
export function AccessButton({ id }: { id: string }) {
  const [p, start] = useTransition(); const [err, setErr] = useState('');
  return (
    <span className="inline-flex flex-col items-end">
      <button type="button" disabled={p} className="btn-ghost btn-sm" title="Envía por WhatsApp un enlace para que el cliente cree o cambie su contraseña"
        onClick={() => { setErr(''); const w = window.open('', '_blank'); start(async () => { const r = await customerAccessLink(id); if ('error' in r) { w?.close(); setErr(r.error ?? ''); } else if (w) w.location.href = r.url; }); }}>
        <Icon name="key" className="text-[18px]" />{p ? 'Generando…' : 'Enviar acceso'}
      </button>
      {err && <span role="alert" className="font-label-sm text-label-sm text-danger mt-1">{err}</span>}
    </span>
  );
}
