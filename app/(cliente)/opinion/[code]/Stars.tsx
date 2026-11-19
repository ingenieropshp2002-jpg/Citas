'use client';
import { useState, useTransition } from 'react';
import { Icon } from '@/components/ui/Icon';
import { googleClicked, submitOpinion } from './actions';

const WORDS = ['', 'Mala', 'Regular', 'Buena', 'Muy buena', '¡Excelente!'];

export function Stars({ code, t, google, done: initialDone, business }: { code: string; t: string; google: string | null; done: boolean; business: string }) {
  const [rating, setRating] = useState(0); const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(''); const [err, setErr] = useState('');
  const [done, setDone] = useState(initialDone); const [pending, start] = useTransition();
  const send = () => start(async () => { setErr(''); const r = await submitOpinion(code, t, rating, comment); if (r.error) setErr(r.error); else setDone(true); });
  if (done) return (
    <div className="card p-6 text-center">
      <div className="w-14 h-14 rounded-full bg-[#ECFDF5] text-[#065F46] flex items-center justify-center mx-auto"><Icon name="favorite" /></div>
      <h2 className="font-headline-sm text-headline-sm mt-3">¡Gracias por tu opinión!</h2>
      {google ? <>
        <p className="text-on-surface-variant mt-1">¿Nos ayudas a que más personas conozcan {business}? Publicar tu reseña en Google toma un minuto.</p>
        <a href={google} target="_blank" rel="noreferrer" onClick={() => { void googleClicked(code, t); }} className="btn-primary w-full mt-4"><Icon name="star" className="text-[18px] text-secondary-fixed" />Publicar en Google</a>
      </> : <p className="text-on-surface-variant mt-1">Tus comentarios nos ayudan a mejorar.</p>}
    </div>
  );
  const shown = hover || rating;
  return (
    <div className="card p-6">
      <h2 className="font-headline-sm text-headline-sm text-center">¿Cómo te fue?</h2>
      <div className="flex justify-center gap-1 mt-4" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" aria-label={`${n} estrellas`} onMouseEnter={() => setHover(n)} onClick={() => setRating(n)} className="p-1">
            <Icon name="star" fill={n <= shown} className={`text-[40px] ${n <= shown ? 'text-secondary' : 'text-on-surface-variant/40'}`} />
          </button>
        ))}
      </div>
      <p className="text-center font-label-lg h-6 mt-1">{WORDS[shown]}</p>
      <label className="block mt-3"><span className="label">Cuéntanos más (opcional)</span><textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} maxLength={1000} className="input" placeholder="¿Qué te gustó? ¿Qué podemos mejorar?" /></label>
      {err && <p role="alert" className="mt-2 text-danger font-label-md">{err}</p>}
      <button disabled={!rating || pending} onClick={send} className="btn-primary w-full mt-4">{pending ? 'Enviando…' : 'Enviar'}</button>
    </div>
  );
}
