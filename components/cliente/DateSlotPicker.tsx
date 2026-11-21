'use client';
import { useEffect, useState } from 'react';
import { addDays, DIAS_CORTOS, fromBogota, MESES, time12, ymd } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';

export type Slot = { time: string; staffIds: string[] };
type Pro = { id: string; name: string; title: string; photo: string | null };
export function DateSlotPicker({ businessId, duration, staffId, serviceIds, date, time, onChange, footer, staff = [], pickedStaff = null, onPickStaff }: {
  businessId: string; duration: number; staffId: string | null; serviceIds: string[]; date: string; time: string; onChange: (date: string, time: string) => void;
  footer?: (empty: boolean) => React.ReactNode;
  /** Profesionales elegibles: si se elige "Cualquiera", se muestran las horas libres de cada uno */
  staff?: Pro[]; pickedStaff?: string | null; onPickStaff?: (id: string | null) => void;
}) {
  const perPro = !staffId && staff.length > 1 && !!onPickStaff;
  const [view, setView] = useState<'pro' | 'hora'>('pro');
  const [open, setOpen] = useState<Record<string, boolean>>({});
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
      {perPro && (
        <div className="mt-space-sm inline-flex rounded-full bg-surface-container p-1" role="tablist">
          {([['pro', 'Por profesional', 'person_heart'], ['hora', 'Por hora', 'schedule']] as const).map(([v, l, ic]) => (
            <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)}
              className={`px-3 h-8 rounded-full font-label-md text-label-md flex items-center gap-1 transition ${view === v ? 'bg-primary-container text-white shadow-sm' : 'text-on-surface-variant'}`}><Icon name={ic} className="text-[16px]" />{l}</button>
          ))}
        </div>
      )}
      {perPro && view === 'pro' && slots !== null && slots.length > 0 && (
        <div className="mt-space-sm space-y-space-sm">
          {staff.map(p => {
            const mine = slots.filter(s => s.staffIds.includes(p.id)); const all = !!open[p.id]; const shown = all ? mine : mine.slice(0, 8);
            return (
              <div key={p.id} className={`bg-surface-container-lowest rounded-xl p-space-sm shadow-sm border ${pickedStaff === p.id && time ? 'border-gold/60' : 'border-transparent'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full p-[2px] bg-gradient-to-tr from-gold to-secondary-fixed shrink-0">{p.photo ? <img src={p.photo} alt="" className="w-full h-full rounded-full object-cover" /> : <span className="w-full h-full rounded-full bg-primary-container text-white flex items-center justify-center font-label-lg">{p.name[0]}</span>}</div>
                  <div className="flex-1 min-w-0"><p className="font-title-md text-title-md truncate">{p.name}</p><p className="font-body-sm text-body-sm text-on-surface-variant truncate">{p.title}</p></div>
                  <span className={`font-label-sm text-label-sm px-2 py-0.5 rounded-full ${mine.length ? 'bg-secondary-fixed/40 text-on-surface' : 'bg-surface-container text-on-surface-variant'}`}>{mine.length ? `${mine.length} ${mine.length === 1 ? 'hora libre' : 'horas libres'}` : 'Sin horas este día'}</span>
                </div>
                {mine.length > 0 && (
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                    {shown.map(s => { const on = time === s.time && pickedStaff === p.id; return (
                      <button type="button" key={s.time} onClick={() => { onPickStaff!(p.id); onChange(date, s.time); }}
                        className={`py-2 rounded-lg font-label-md text-label-md transition ${on ? 'bg-primary text-on-primary font-bold shadow' : 'bg-surface text-on-surface hover:bg-surface-container'}`}>{time12(s.time)}</button>
                    ); })}
                    {mine.length > 8 && <button type="button" onClick={() => setOpen(o => ({ ...o, [p.id]: !all }))} className="py-2 rounded-lg font-label-md text-label-md text-secondary hover:bg-surface-container">{all ? 'Ver menos' : `+${mine.length - 8} más`}</button>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <div className={`mt-space-sm space-y-space-sm ${perPro && view === 'pro' && slots?.length ? 'hidden' : ''}`}>
        {slots === null ? [0, 1, 2].map(i => <div key={i} className="skeleton h-24" />) : slots.length === 0 ? (
          <div className="card p-6 text-center text-on-surface-variant"><Icon name="event_busy" className="text-secondary text-[28px]" /><p className="mt-1">No hay horarios disponibles este día. Prueba otra fecha o entra a la lista de espera.</p></div>
        ) : groups.filter(g => g[2].length).map(([label, icon, list]) => (
          <div key={label} className="bg-surface-container-lowest rounded-xl p-space-sm shadow-sm">
            <div className="flex items-center gap-1.5 text-on-surface-variant font-label-md text-label-md mb-2"><Icon name={icon} className="text-[16px] text-secondary" /><span>{label}</span></div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {list.map(s => (
                <button type="button" key={s.time} onClick={() => { onPickStaff?.(null); onChange(date, s.time); }}
                  className={`py-2 rounded-lg font-label-md text-label-md transition flex items-center justify-center gap-1.5 ${time === s.time && !pickedStaff ? 'bg-primary text-on-primary font-bold shadow' : 'bg-surface text-on-surface hover:bg-surface-container'}`}>
                  <span>{time12(s.time)}</span>{time === s.time && !pickedStaff && <span className="w-1.5 h-1.5 rounded-full bg-secondary-fixed" />}
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
