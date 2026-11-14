'use client';
import Link from 'next/link';
import { useState } from 'react';
import { cop } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';

type S = { id: string; name: string; description: string | null; category: string; tag: string | null; durationMin: number; price: number };
export function ServiceList({ services, slug }: { services: S[]; slug: string }) {
  const cats = ['Todos', ...new Set(services.map(s => s.category))];
  const [cat, setCat] = useState('Todos');
  const list = services.filter(s => cat === 'Todos' || s.category === cat);
  return (
    <>
      <div className="flex gap-space-xs overflow-x-auto no-scrollbar pb-space-xs">
        {cats.map(c => <button key={c} onClick={() => setCat(c)} className={`px-space-sm py-1.5 rounded-lg font-label-sm text-label-sm whitespace-nowrap ${cat === c ? 'bg-secondary text-on-secondary shadow-sm' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}`}>{c}</button>)}
      </div>
      <div className="grid md:grid-cols-2 gap-space-sm mt-space-sm">
        {list.map(s => (
          <div key={s.id} className="p-space-md rounded-xl bg-surface-container-lowest shadow-md flex items-center justify-between gap-space-md border border-transparent hover:border-gold/40 transition">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-space-xs mb-1">
                {s.tag && <span className="px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-semibold">{s.tag}</span>}
                <span className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-0.5"><Icon name="schedule" className="text-[14px]" /> {s.durationMin} min</span>
              </div>
              <h3 className="font-title-md text-title-md text-primary-container dark:text-primary truncate font-bold">{s.name}</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2 mt-0.5">{s.description}</p>
              <div className="mt-2 flex items-baseline gap-1"><span className="font-currency-display text-currency-display text-primary-container dark:text-primary font-bold">{cop(s.price).replace('$', '$ ')}</span><span className="font-label-sm text-label-sm text-on-surface-variant">COP</span></div>
            </div>
            <Link href={`/reservar/${slug}?servicio=${s.id}`} aria-label={`Reservar ${s.name}`} className="flex items-center justify-center h-12 w-12 rounded-xl bg-secondary hover:bg-secondary/85 transition-colors text-on-secondary shadow-sm active:scale-95 shrink-0"><Icon name="add" className="text-[22px]" /></Link>
          </div>
        ))}
      </div>
    </>
  );
}
