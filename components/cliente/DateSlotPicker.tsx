'use client';
import { useEffect, useState } from 'react';
import { addDays, DIAS_CORTOS, fromBogota, MESES, time12, ymd } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';

export type Slot = { time: string; staffIds: string[] };
export function DateSlotPicker({ businessId, duration, staffId, serviceIds, date, time, onChange, footer }: {
  businessId: string; duration: number; staffId: string | null; serviceIds: string[]; date: string; time: string; onChange: (date: string, time: string) => void;
  footer?: (empty: boolean) => React.ReactNode;
}) {
  const today = ymd(new Date());
  const days = Array.from({ length: 21 }, (_, i) => addDays(today, i));
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const qs = `b=${businessId}&dur=${duration}&staff=${staffId || ''}&servicios=${serviceIds.join(',')}`;
  useEffect(() => { fetch(`/api/disponibilidad?${qs}&dias=21&desde=${today}`).then(r => r.json()).then(d => setCounts(d.days || {})); }, [qs, today]);
  useEffect(() => { setSlots(null); fetch(`/api/disponibilidad?${qs}&fecha=${date}`).then(r => r.json()).then(d => setSlots(d.slots || [])); }, [qs, date]);
  const d0 = fromBogota(date, '12:00');
  const groups: [string, string, Slot[]][] = [
    ['Mañana', 'wb_twilight', (slots || []).filter(s => s.time < '12:00')],
    ['Tarde', 'wb_sunny', (slots || []).filter(s => s.time >= '12:00' && s.time < '18:00')],
    ['Noche', 'nights_stay', (slots || []).filter(s => s.time >= '18:00')]
  ];
  return (
    <div>
      <div className="flex items-center justify-end -mt-9 mb-space-xs">
        <div className="flex items-center gap-1 bg-surface-container px-2.5 py-1 rounded-full text-on-surface"><span className="font-label-sm text-label-sm font-semibold capitalize">{MESES[d0.getUTCMonth()]} {d0.getUTCFullYear()}</span><Icon name="calendar_month" className="text-[16px] text-on-surface-variant" /></div>
      </div>
      <div className="flex items-center gap-2 overflow-x-auto py-2 no-scrollbar scroll-smooth">
        {days.map(d => {
          const dt = fromBogota(d, '12:00'); const n = counts[d]; const sel = d === date; const full = n === 0;
          return (
            <button key={d} type="button" title={full ? 'Agotado: puedes entrar a la lista de espera' : undefined} onClick={() => onChange(d, '')}
              className={`shrink-0 w-14 py-2.5 rounded-xl flex flex-col items-center transition-all ${sel ? 'bg-primary text-on-primary shadow-md scale-105' : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container'} ${full && !sel ? 'opacity-50' : ''}`}>
              <span className={`font-label-sm text-label-sm ${sel ? 'text-secondary-fixed dark:text-secondary' : 'text-on-surface-variant'}`}>{DIAS_CORTOS[dt.getUTCDay()]}</span>
              <span className="font-title-lg text-title-lg font-bold">{dt.getUTCDate()}</span>
              {full ? <span className="text-[10px] text-error font-medium mt-0.5">Agotado</span> : d === today ? <span className={`text-[10px] font-semibold mt-0.5 ${sel ? 'text-secondary-fixed dark:text-secondary' : 'text-secondary'}`}>Hoy</span> : <span className="w-1.5 h-1.5 rounded-full bg-secondary-fixed-dim mt-1" />}
            </button>
          );
        })}
      </div>
      <div className="mt-space-sm space-y-space-sm">
        {slots === null ? [0, 1, 2].map(i => <div key={i} className="skeleton h-24" />) : slots.length === 0 ? (
          <div className="card p-6 text-center text-on-surface-variant"><Icon name="event_busy" className="text-secondary text-[28px]" /><p className="mt-1">No hay horarios disponibles este día. Prueba otra fecha o entra a la lista de espera.</p></div>
        ) : groups.filter(g => g[2].length).map(([label, icon, list]) => (
          <div key={label} className="bg-surface-container-lowest rounded-xl p-space-sm shadow-sm">
            <div className="flex items-center gap-1.5 text-on-surface-variant font-label-md text-label-md mb-2"><Icon name={icon} className="text-[16px] text-secondary" /><span>{label}</span></div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {list.map(s => (
                <button type="button" key={s.time} onClick={() => onChange(date, s.time)}
                  className={`py-2 rounded-lg font-label-md text-label-md transition flex items-center justify-center gap-1.5 ${time === s.time ? 'bg-primary text-on-primary font-bold shadow' : 'bg-surface text-on-surface hover:bg-surface-container'}`}>
                  <span>{time12(s.time)}</span>{time === s.time && <span className="w-1.5 h-1.5 rounded-full bg-secondary-fixed" />}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {footer && slots !== null && footer(slots.length === 0)}
    </div>
  );
}
