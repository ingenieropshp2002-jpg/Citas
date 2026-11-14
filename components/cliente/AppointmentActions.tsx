'use client';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { ConfirmButton } from '@/components/ui/Confirm';
import { Icon } from '@/components/ui/Icon';
import { cancelMine, leaveReview } from '@/app/(cliente)/reservar/actions';

export function AppointmentActions({ code, slug, upcoming, canReview, repeatQuery, policyHours }: { code: string; slug: string; upcoming: boolean; canReview: boolean; repeatQuery: string; policyHours: number }) {
  const [rating, setRating] = useState(5); const [open, setOpen] = useState(false); const [msg, setMsg] = useState(''); const [pending, start] = useTransition();
  if (upcoming) return (
    <div className="flex flex-wrap gap-2 mt-3">
      <Link href={`/mis-citas/${code}/reprogramar`} className="btn-outline btn-sm"><Icon name="event_repeat" className="text-[16px]" />Reprogramar</Link>
      <ConfirmButton action={async () => cancelMine(code)} title="¿Cancelar esta cita?" text={`El depósito se reembolsa si cancelas con al menos ${policyHours} horas de anticipación.`} confirmLabel="Sí, cancelar"><Icon name="close" className="text-[16px]" />Cancelar</ConfirmButton>
    </div>
  );
  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        <Link href={`/reservar/${slug}?${repeatQuery}`} className="btn-outline btn-sm"><Icon name="replay" className="text-[16px]" />Repetir</Link>
        {canReview && !msg && <button className="btn-ghost btn-sm" onClick={() => setOpen(!open)}><Icon name="rate_review" className="text-[16px]" />Dejar reseña</button>}
      </div>
      {open && !msg && (
        <form className="mt-3 card p-3 space-y-2" onSubmit={e => { e.preventDefault(); const c = String(new FormData(e.currentTarget).get('c')); start(async () => { const r = await leaveReview(code, rating, c); setMsg('error' in r && r.error ? r.error : '¡Gracias por tu reseña!'); }); }}>
          <div className="flex gap-1">{[1, 2, 3, 4, 5].map(n => <button type="button" key={n} onClick={() => setRating(n)} aria-label={`${n} estrellas`}><Icon name="star" fill={n <= rating} className={`text-[28px] ${n <= rating ? 'text-gold' : 'text-outline-variant'}`} /></button>)}</div>
          <textarea name="c" required className="input" rows={3} placeholder="Cuéntanos tu experiencia" />
          <button disabled={pending} className="btn-primary btn-sm">{pending ? 'Enviando…' : 'Publicar reseña'}</button>
        </form>
      )}
      {msg && <p className="mt-2 font-label-md text-label-md text-success">{msg}</p>}
    </div>
  );
}
