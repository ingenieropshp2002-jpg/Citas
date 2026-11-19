'use client';
import { useState, useTransition } from 'react';
import { Icon } from '@/components/ui/Icon';
import { sendBirthdaysNow, toggleReward } from '@/app/admin/_actions/loyalty';
export function ToggleReward({ id, active }: { id: string; active: boolean }) {
  const [p, s] = useTransition();
  return <button disabled={p} onClick={() => s(() => toggleReward(id))} className={`btn-sm ${active ? 'btn-ghost' : 'btn-outline'}`}>{active ? 'Pausar' : 'Activar'}</button>;
}
export function BirthdaysNow() {
  const [p, s] = useTransition(); const [m, setM] = useState('');
  return <span className="inline-flex items-center gap-2"><button disabled={p} className="btn-outline btn-sm" onClick={() => s(async () => { const r = await sendBirthdaysNow(); setM(`${r.sent} saludos enviados`); })}><Icon name="cake" className="text-[16px]" />Enviar saludos de hoy</button>{m && <span className="font-label-md text-success">{m}</span>}</span>;
}
