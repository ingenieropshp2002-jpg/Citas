'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cop } from '@/lib/format';

type P = { id: string; name: string; price: number; year: number; desc: string; staff: string };

/** Planes con cambio entre pago mensual y anual (el anual equivale a 10 meses). */
export function Plans({ plans, trialDays, signup }: { plans: P[]; trialDays: number; signup: string }) {
  const [anual, setAnual] = useState(false);
  return (
    <>
      <div className="flex justify-center mt-6">
        <div role="radiogroup" aria-label="Forma de pago" className="inline-flex p-1 rounded-full bg-surface-container">
          {[['Mensual', false], ['Anual · 2 meses gratis', true]].map(([l, v]) => (
            <button key={String(v)} type="button" role="radio" aria-checked={anual === v} onClick={() => setAnual(v as boolean)} className={`px-4 py-2 rounded-full font-label-lg transition ${anual === v ? 'bg-primary-container text-white shadow' : 'text-on-surface-variant'}`}>{l as string}</button>
          ))}
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-4 mt-6">
        {plans.map((p, i) => (
          <article key={p.id} className={`card p-6 flex flex-col ${i === 1 ? 'border-gold/70 shadow-raised relative' : ''}`}>
            {i === 1 && <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gold text-primary-container font-label-sm uppercase tracking-wider">El más elegido</span>}
            <h3 className="font-headline-sm text-headline-sm text-primary-container dark:text-primary">{p.name}</h3>
            <p className="font-label-md text-secondary">{p.staff}</p>
            <p className="mt-4"><span className="font-headline-lg text-headline-lg tnum text-primary-container dark:text-primary">{cop(anual ? p.year : p.price)}</span> <span className="text-on-surface-variant">/{anual ? 'año' : 'mes'}</span></p>
            <p className="font-body-sm text-on-surface-variant h-5">{anual ? `Equivale a ${cop(Math.round(p.year / 12))} al mes` : `O ${cop(p.year)} al año`}</p>
            <p className="mt-4 text-on-surface-variant flex-1">{p.desc}</p>
            <Link href={signup} className={`${i === 1 ? 'btn-gold' : 'btn-primary'} w-full mt-6`}>Empezar {trialDays} días gratis</Link>
            <p className="mt-2 text-center font-body-sm text-on-surface-variant flex items-center justify-center gap-1"><Icon name="credit_card_off" className="text-[16px]" />Sin tarjeta</p>
          </article>
        ))}
      </div>
    </>
  );
}
