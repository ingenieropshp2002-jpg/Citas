'use client';
import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
export function CopyLink({ url }: { url: string }) {
  const [ok, setOk] = useState(false);
  return <button type="button" className="btn-outline btn-sm" onClick={() => { navigator.clipboard.writeText(url); setOk(true); setTimeout(() => setOk(false), 1500); }}><Icon name={ok ? 'check' : 'content_copy'} className="text-[16px]" />{ok ? 'Copiado' : 'Copiar'}</button>;
}
