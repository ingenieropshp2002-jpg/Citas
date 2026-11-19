'use client';
import { useState, useTransition } from 'react';
import { userResetLinkAction } from '@/app/superadmin/actions';
export function ResetLinkButton({ id, phone, name }: { id: string; phone: string | null; name: string }) {
  const [link, setLink] = useState(''); const [p, start] = useTransition(); const [copied, setCopied] = useState(false);
  if (!link) return <button type="button" disabled={p} className="btn-ghost btn-sm" onClick={() => start(async () => { const r = await userResetLinkAction(id); if ('link' in r && r.link) setLink(r.link); })}>{p ? 'Generando…' : 'Generar enlace (vence en 24 h)'}</button>;
  const wa = phone ? `https://wa.me/57${phone.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(`Hola ${name.split(' ')[0]}, aquí puedes crear tu contraseña (vence en 24 horas): ${link}`)}` : null;
  return (
    <div className="space-y-2">
      <input readOnly value={link} className="input text-body-sm" onFocus={e => e.currentTarget.select()} />
      <div className="flex gap-2">
        <button type="button" className="btn-ghost btn-sm" onClick={async () => { try { await navigator.clipboard.writeText(link); setCopied(true); } catch { /* sin permiso de portapapeles */ } }}>{copied ? 'Copiado ✓' : 'Copiar'}</button>
        {wa && <a href={wa} target="_blank" rel="noreferrer" className="btn btn-sm bg-[#25D366] text-white">Enviar por WhatsApp</a>}
      </div>
    </div>
  );
}
