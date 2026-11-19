'use client';
import { useState, useTransition } from 'react';
import { Icon } from '@/components/ui/Icon';
import { sendCampaign, toggleCoupon } from '@/app/admin/_actions/marketing';
import { sendRemindersNow } from '@/app/admin/_actions/agenda';
export function SendCampaign({ id, label }: { id: string; label: string }) {
  const [p, s] = useTransition(); const [m, setM] = useState('');
  return <span className="inline-flex items-center gap-2"><button disabled={p} className="btn-primary btn-sm" onClick={() => { if (confirm('¿Enviar la campaña por WhatsApp a la audiencia?')) s(async () => { const r = await sendCampaign(id); setM('sent' in r ? `Enviada a ${r.sent}` : r.error || ''); }); }}><Icon name="send" className="text-[16px]" />{label}</button>{m && <span className="font-label-md text-success">{m}</span>}</span>;
}
export function ToggleCoupon({ id, active }: { id: string; active: boolean }) {
  const [p, s] = useTransition();
  return <button disabled={p} onClick={() => s(() => toggleCoupon(id))} className={`btn-sm ${active ? 'btn-ghost' : 'btn-outline'}`}>{active ? 'Desactivar' : 'Activar'}</button>;
}
export function RemindersNow() {
  const [p, s] = useTransition(); const [m, setM] = useState('');
  return <span className="inline-flex items-center gap-2"><button disabled={p} className="btn-outline btn-sm" onClick={() => s(async () => { const r = await sendRemindersNow(); setM(`${r.sent} recordatorios enviados`); })}><Icon name="notifications" className="text-[16px]" />Enviar ahora</button>{m && <span className="font-label-md text-success">{m}</span>}</span>;
}
