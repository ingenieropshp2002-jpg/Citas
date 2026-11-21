'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { addDays, time12, ymd } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';

/** "Horas libres hoy" en el perfil del negocio: cada hora lleva a reservar ese día. */
export function TodaySlots({ businessId, slug, duration }: { businessId: string; slug: string; duration: number }) {
  const [slots, setSlots] = useState<string[] | null>(null);
  const [all, setAll] = useState(false);
  const today = ymd(new Date());
  useEffect(() => {
    fetch(`/api/disponibilidad?b=${businessId}&dur=${duration}&staff=&fecha=${today}`).then(r => r.json())
      .then(d => setSlots(((d.slots || []) as { time: string }[]).map(s => s.time))).catch(() => setSlots([]));
  }, [businessId, duration, today]);
  const shown = slots ? (all ? slots : slots.slice(0, 10)) : [];
  return (
    <div className="mt-space-md max-w-2xl rounded-2xl border border-parchment bg-surface-container-lowest p-space-sm shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="font-label-lg flex items-center gap-1.5"><Icon name="event_available" className="text-secondary text-[20px]" />Horas libres hoy</p>
        {slots && slots.length > 0 && <span className="font-label-sm text-label-sm text-on-surface-variant">{slots.length} {slots.length === 1 ? 'disponible' : 'disponibles'}</span>}
      </div>
      {slots === null ? <div className="skeleton h-9" /> : slots.length === 0 ? (
        <p className="font-body-sm text-on-surface-variant">Sin horas libres hoy · <Link href={`/reservar/${slug}?fecha=${addDays(today, 1)}`} className="text-secondary font-semibold">elige otro día</Link></p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {shown.map(t => <Link key={t} href={`/reservar/${slug}?fecha=${today}`} className="px-3 h-9 inline-flex items-center rounded-full border border-gold/50 bg-surface font-label-md text-label-md text-primary hover:bg-secondary-fixed/50">{time12(t)}</Link>)}
          {slots.length > 10 && <button type="button" onClick={() => setAll(!all)} className="px-3 h-9 rounded-full font-label-md text-label-md text-secondary hover:bg-surface-container">{all ? 'Ver menos' : `+${slots.length - 10} más`}</button>}
        </div>
      )}
    </div>
  );
}
