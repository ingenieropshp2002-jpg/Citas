'use client';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Icon } from '@/components/ui/Icon';
import { loadSuggestedServices, markGuideStep, setGuideHidden } from './_actions/onboarding';
import type { Step } from '@/lib/onboarding';

/** Guía de primeros pasos en el inicio del panel, hasta que el negocio la complete o la oculte. */
export function Guide({ steps, welcome, trialLeft }: { steps: Step[]; welcome: boolean; trialLeft: number | null }) {
  const [pending, start] = useTransition(); const [msg, setMsg] = useState('');
  const done = steps.filter(s => s.done).length;
  const next = steps.find(s => !s.done);
  return (
    <section className="card-raised p-5 mb-4 border-gold/40">
      <div className="flex items-start gap-3">
        <span className="w-11 h-11 rounded-xl bg-secondary-fixed/50 flex items-center justify-center shrink-0"><Icon name="rocket_launch" className="text-secondary" /></span>
        <div className="flex-1 min-w-0">
          <h2 className="h-section">{welcome ? '¡Bienvenido! Deja tu negocio listo en minutos' : 'Primeros pasos'}</h2>
          <p className="text-on-surface-variant font-body-sm">{done} de {steps.length} listos{trialLeft != null ? ` · Te quedan ${trialLeft} ${trialLeft === 1 ? 'día' : 'días'} de prueba gratis` : ''}</p>
          <div className="mt-2 h-2 rounded-full bg-surface-container overflow-hidden"><div className="h-full bg-gold transition-all" style={{ width: `${done / steps.length * 100}%` }} /></div>
        </div>
        <button type="button" disabled={pending} onClick={() => start(() => setGuideHidden(true))} className="btn-ghost btn-sm shrink-0" aria-label="Ocultar guía"><Icon name="close" className="text-[18px]" /></button>
      </div>
      <ol className="mt-4 grid md:grid-cols-2 gap-2">
        {steps.map((s, i) => (
          <li key={s.key} className={`rounded-xl border p-3 flex items-start gap-3 ${s.done ? 'border-parchment opacity-70' : s === next ? 'border-gold/60 bg-secondary-fixed/10' : 'border-parchment'}`}>
            <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-label-md ${s.done ? 'bg-[#ECFDF5] text-[#065F46]' : 'bg-surface-container text-on-surface-variant'}`}>{s.done ? <Icon name="check" className="text-[18px]" /> : i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className={`font-label-lg ${s.done ? 'line-through' : ''}`}>{s.title}</p>
              {!s.done && <p className="font-body-sm text-on-surface-variant">{s.text}</p>}
              {!s.done && <div className="flex flex-wrap gap-2 mt-2">
                <Link href={s.href} className={s === next ? 'btn-primary btn-sm' : 'btn-outline btn-sm'}>{s.cta}</Link>
                {s.key === 'servicios' && <button type="button" disabled={pending} className="btn-outline btn-sm" onClick={() => start(async () => { const r = await loadSuggestedServices(); setMsg('error' in r && r.error ? r.error : `Listo: cargamos ${r.count} servicios sugeridos. Ajusta precios y duración en Servicios.`); })}><Icon name="auto_awesome" className="text-[16px]" />Cargar sugeridos</button>}
                {s.manual && <button type="button" disabled={pending} className="btn-ghost btn-sm" onClick={() => start(() => markGuideStep(s.key))}>{s.key === 'equipo' ? 'Trabajo solo' : 'Ya lo hice'}</button>}
              </div>}
            </div>
          </li>
        ))}
      </ol>
      {msg && <p role="status" className="mt-3 font-label-md text-secondary">{msg}</p>}
    </section>
  );
}
