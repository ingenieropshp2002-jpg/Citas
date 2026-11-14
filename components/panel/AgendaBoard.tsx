'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { Icon } from '@/components/ui/Icon';
import { AGENDA_COLORS, StatusBadge } from '@/components/ui/Status';
import { addDays, cop, DIAS_CORTOS, fromBogota, hm, MESES, minutesOf, time12, timeOf, ymd } from '@/lib/format';
import { blockTime, createAppointmentPanel, deleteBlock, moveAppointment, setAppointmentStatus } from '@/app/panel/_actions/agenda';

type Appt = { id: string; code: string; staffId: string; start: string; end: string; status: string; confirmed?: boolean; total: number; customer: { id: string; name: string; phone: string | null }; services: string; notes: string | null; depositAmount: number; depositStatus: string; saleId: string | null };
type Staff = { id: string; name: string; color: string; photo: string | null };
type Block = { id: string; staffId: string | null; start: string; end: string; reason: string | null };
const HOUR = 64; // px por hora

export function AgendaBoard({ view, date, staff, appts, blocks, range, services, customers, openNew, staffFilter }: {
  view: 'dia' | 'semana' | 'mes'; date: string; staff: Staff[]; appts: Appt[]; blocks: Block[]; range: [number, number];
  services: { id: string; name: string; durationMin: number; price: number; staffIds: string[] }[]; customers: { id: string; name: string; phone: string | null }[]; openNew: boolean; staffFilter: string;
}) {
  const r = useRouter();
  const [sel, setSel] = useState<Appt | null>(null);
  const [modal, setModal] = useState<'nueva' | 'bloqueo' | null>(openNew ? 'nueva' : null);
  const [prefill, setPrefill] = useState<{ staffId?: string; date?: string; time?: string }>({});
  const [err, setErr] = useState(''); const [pending, start] = useTransition();
  const go = (p: Record<string, string>) => { const q = new URLSearchParams({ vista: view, fecha: date, ...(staffFilter ? { prof: staffFilter } : {}), ...p }); r.push(`/panel/agenda?${q}`); };
  const shift = (n: number) => go({ fecha: view === 'mes' ? (() => { const d = fromBogota(date, '12:00'); d.setUTCMonth(d.getUTCMonth() + n, 1); return ymd(d); })() : addDays(date, view === 'semana' ? 7 * n : n) });
  const weekStart = useMemo(() => { const dow = fromBogota(date, '12:00').getUTCDay(); return addDays(date, -((dow + 6) % 7)); }, [date]);
  const d0 = fromBogota(date, '12:00');
  const title = view === 'mes' ? `${MESES[d0.getUTCMonth()]} ${d0.getUTCFullYear()}` : view === 'semana' ? `Semana del ${fromBogota(weekStart, '12:00').getUTCDate()} de ${MESES[fromBogota(weekStart, '12:00').getUTCMonth()]}` : `${DIAS_CORTOS[d0.getUTCDay()]} ${d0.getUTCDate()} de ${MESES[d0.getUTCMonth()]}`;
  const hours = Array.from({ length: Math.ceil((range[1] - range[0]) / 60) }, (_, i) => range[0] + i * 60);
  const height = (range[1] - range[0]) / 60 * HOUR;
  const top = (iso: string) => (minutesOf(hm(new Date(iso))) - range[0]) / 60 * HOUR;
  const h = (a: string, b: string) => Math.max(18, (new Date(b).getTime() - new Date(a).getTime()) / 3600000 * HOUR);

  const onDrop = (e: React.DragEvent<HTMLDivElement>, staffId: string, day: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/appt'); const offset = Number(e.dataTransfer.getData('text/offset') || 0);
    const rect = e.currentTarget.getBoundingClientRect();
    const mins = Math.round(((e.clientY - rect.top - offset) / HOUR * 60) / 15) * 15 + range[0];
    const a = appts.find(x => x.id === id); if (!a) return;
    start(async () => { const res = await moveAppointment(id, view === 'semana' ? a.staffId : staffId, fromBogota(day, timeOf(Math.max(range[0], mins))).toISOString()); setErr(res.error || ''); r.refresh(); });
  };
  const clickEmpty = (e: React.MouseEvent<HTMLDivElement>, staffId: string, day: string) => {
    if (e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mins = Math.floor(((e.clientY - rect.top) / HOUR * 60) / 15) * 15 + range[0];
    setPrefill({ staffId, date: day, time: timeOf(mins) }); setModal('nueva');
  };

  const Column = ({ staffId, day, list, bl }: { staffId: string; day: string; list: Appt[]; bl: Block[] }) => (
    <div className="relative border-l border-parchment/70" style={{ height }} onDragOver={e => e.preventDefault()} onDrop={e => onDrop(e, staffId, day)} onClick={e => clickEmpty(e, staffId, day)}>
      {hours.map(x => <div key={x} className="absolute inset-x-0 border-t border-parchment/50 pointer-events-none" style={{ top: (x - range[0]) / 60 * HOUR }} />)}
      {bl.map(b => <div key={b.id} title={b.reason || 'Bloqueado'} className="absolute inset-x-1 rounded-md bg-[repeating-linear-gradient(45deg,rgb(var(--c-surface-container))_0_6px,rgb(var(--c-surface-container-high))_6px_12px)] text-on-surface-variant font-label-sm text-label-sm p-1 flex justify-between" style={{ top: top(b.start), height: h(b.start, b.end) }}>{b.reason || 'Bloqueado'}<button onClick={() => start(async () => { await deleteBlock(b.id); r.refresh(); })} aria-label="Quitar bloqueo"><Icon name="close" className="text-[14px]" /></button></div>)}
      {list.map(a => (
        <button key={a.id} draggable onDragStart={e => { e.dataTransfer.setData('text/appt', a.id); e.dataTransfer.setData('text/offset', String(e.clientY - (e.currentTarget.getBoundingClientRect().top))); }} onClick={() => setSel(a)}
          className={`absolute inset-x-1 rounded-md border-l-4 px-2 py-1 text-left overflow-hidden shadow-sm hover:shadow-raised hover:z-10 cursor-grab active:cursor-grabbing ${AGENDA_COLORS[a.status]}`} style={{ top: top(a.start), height: h(a.start, a.end) }}>
          <p className="font-label-md text-label-md truncate">{a.confirmed && <span title="Confirmó por WhatsApp" className="text-[#059669]">✓ </span>}{time12(hm(new Date(a.start)))} · {a.customer.name}</p>
          <p className="font-body-sm text-[11px] leading-tight opacity-80 truncate">{a.services}</p>
        </button>
      ))}
    </div>
  );

  const nowMin = minutesOf(hm(new Date()));
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex items-center gap-1 card p-1">
          <button className="btn-sm btn-ghost !h-8" onClick={() => shift(-1)} aria-label="Anterior"><Icon name="chevron_left" /></button>
          <button className="btn-sm btn-ghost !h-8" onClick={() => go({ fecha: ymd(new Date()) })}>Hoy</button>
          <button className="btn-sm btn-ghost !h-8" onClick={() => shift(1)} aria-label="Siguiente"><Icon name="chevron_right" /></button>
        </div>
        <h2 className="font-title-lg text-title-lg capitalize mr-auto">{title}</h2>
        <div className="flex p-1 card">{(['dia', 'semana', 'mes'] as const).map(v => <button key={v} onClick={() => go({ vista: v })} className={`h-8 px-3 rounded-lg font-label-md capitalize ${view === v ? 'bg-primary-container text-white dark:text-on-primary-container' : 'text-on-surface-variant'}`}>{v === 'dia' ? 'Día' : v}</button>)}</div>
        {view !== 'dia' && <select className="input !h-10 !w-auto" value={staffFilter} onChange={e => go({ prof: e.target.value })}><option value="">Todo el equipo</option>{staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>}
        <button className="btn-ghost btn-sm" onClick={() => setModal('bloqueo')}><Icon name="block" className="text-[18px]" />Bloquear horario</button>
        <button className="btn-primary btn-sm" onClick={() => { setPrefill({ date }); setModal('nueva'); }}><Icon name="add" className="text-[18px]" />Nueva cita</button>
      </div>
      {err && <p className="mb-3 p-2 rounded-lg bg-[#FFF1F2] text-danger font-label-md">{err}</p>}
      <div className="flex flex-wrap gap-3 mb-3 font-label-sm text-label-sm text-on-surface-variant">{['CONFIRMADA', 'PENDIENTE', 'EN_SERVICIO', 'COMPLETADA', 'NO_ASISTIO'].map(s => <StatusBadge key={s} status={s} />)}<span className="ml-auto hidden md:inline">Arrastra una cita para moverla · Clic en un espacio vacío para agendar</span></div>

      {view === 'mes' ? (
        <div className="card overflow-hidden">
          <div className="grid grid-cols-7 bg-surface-container-low">{['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'].map(d => <div key={d} className="p-2 font-label-sm text-label-sm text-on-surface-variant text-center">{d}</div>)}</div>
          <div className="grid grid-cols-7">
            {(() => { const first = ymd(new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth(), 1, 17))); const lead = (fromBogota(first, '12:00').getUTCDay() + 6) % 7; const start0 = addDays(first, -lead);
              return Array.from({ length: 42 }, (_, i) => { const d = addDays(start0, i); const inMonth = fromBogota(d, '12:00').getUTCMonth() === d0.getUTCMonth(); const list = appts.filter(a => ymd(new Date(a.start)) === d && a.status !== 'CANCELADA');
                return <button key={d} onClick={() => go({ vista: 'dia', fecha: d })} className={`min-h-[92px] p-1.5 border-t border-l border-parchment/70 text-left hover:bg-surface-container-low ${inMonth ? '' : 'opacity-40'}`}>
                  <span className={`inline-flex w-6 h-6 items-center justify-center rounded-full font-label-md ${d === ymd(new Date()) ? 'bg-gold text-white' : ''}`}>{fromBogota(d, '12:00').getUTCDate()}</span>
                  {list.slice(0, 3).map(a => <p key={a.id} className={`mt-0.5 px-1 rounded text-[11px] truncate border-l-2 ${AGENDA_COLORS[a.status]}`}>{hm(new Date(a.start))} {a.customer.name.split(' ')[0]}</p>)}
                  {list.length > 3 && <p className="text-[11px] text-on-surface-variant mt-0.5">+{list.length - 3} más</p>}
                </button>; }); })()}
          </div>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          {(() => { const cols = view === 'dia' ? staff.map(s => ({ key: s.id, staffId: s.id, day: date, label: s.name, color: s.color, photo: s.photo })) : Array.from({ length: 7 }, (_, i) => { const d = addDays(weekStart, i); return { key: d, staffId: staffFilter || staff[0]?.id, day: d, label: `${DIAS_CORTOS[fromBogota(d, '12:00').getUTCDay()]} ${fromBogota(d, '12:00').getUTCDate()}`, color: d === ymd(new Date()) ? '#d4af37' : '', photo: null }; });
            return (
              <div style={{ minWidth: 64 + cols.length * 150 }}>
                <div className="grid sticky top-0 z-20 bg-surface-container-lowest border-b border-parchment" style={{ gridTemplateColumns: `64px repeat(${cols.length}, minmax(150px,1fr))` }}>
                  <div />{cols.map(c => <div key={c.key} className="p-2 flex items-center gap-2 border-l border-parchment/70">{c.photo ? <img src={c.photo} alt="" className="w-7 h-7 rounded-full object-cover" /> : <span className="w-2 h-7 rounded-full" style={{ background: c.color || 'transparent' }} />}<span className="font-label-lg text-label-lg truncate">{c.label}</span></div>)}
                </div>
                <div className="grid relative" style={{ gridTemplateColumns: `64px repeat(${cols.length}, minmax(150px,1fr))` }}>
                  <div className="relative" style={{ height }}>{hours.map(x => <span key={x} className="absolute right-2 -translate-y-1/2 font-label-sm text-label-sm text-on-surface-variant" style={{ top: (x - range[0]) / 60 * HOUR }}>{x > range[0] ? time12(timeOf(x)).replace(':00', '') : ''}</span>)}</div>
                  {cols.map(c => <Column key={c.key} staffId={c.staffId} day={c.day} list={appts.filter(a => ymd(new Date(a.start)) === c.day && (view === 'dia' ? a.staffId === c.staffId : !staffFilter || a.staffId === staffFilter) && a.status !== 'CANCELADA')} bl={blocks.filter(b => ymd(new Date(b.start)) === c.day && (view === 'dia' ? (!b.staffId || b.staffId === c.staffId) : (!staffFilter || !b.staffId || b.staffId === staffFilter)))} />)}
                  {nowMin > range[0] && nowMin < range[1] && (view === 'dia' ? date === ymd(new Date()) : true) && <div className="absolute left-16 right-0 border-t-2 border-gold pointer-events-none z-10" style={{ top: (nowMin - range[0]) / 60 * HOUR }}><span className="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full bg-gold" /></div>}
                </div>
              </div>
            ); })()}
        </div>
      )}
      {pending && <p className="fixed bottom-4 right-4 card px-3 py-2 font-label-md z-50">Guardando…</p>}

      {sel && <Detail a={sel} staff={staff} onClose={() => setSel(null)} onDone={() => { setSel(null); r.refresh(); }} />}
      {modal === 'nueva' && <NewAppointment onClose={() => setModal(null)} onDone={() => { setModal(null); r.refresh(); }} staff={staff} services={services} customers={customers} prefill={prefill} />}
      {modal === 'bloqueo' && <BlockForm onClose={() => setModal(null)} onDone={() => { setModal(null); r.refresh(); }} staff={staff} date={date} />}
    </div>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return (
    <dialog ref={ref} onClose={onClose} className="backdrop:bg-primary-container/40 backdrop:backdrop-blur-sm m-0 ml-auto h-full max-h-none w-full max-w-md bg-surface-container-lowest text-on-surface p-0 shadow-sheet">
      <div className="p-5 border-b border-parchment flex items-center justify-between sticky top-0 bg-surface-container-lowest z-10"><h3 className="font-headline-sm text-headline-sm">{title}</h3><button onClick={() => ref.current?.close()} aria-label="Cerrar" className="w-9 h-9 rounded-full hover:bg-surface-container flex items-center justify-center"><Icon name="close" /></button></div>
      <div className="p-5">{children}</div>
    </dialog>
  );
}

function Detail({ a, staff, onClose, onDone }: { a: Appt; staff: Staff[]; onClose: () => void; onDone: () => void }) {
  const [p, start] = useTransition(); const [err, setErr] = useState('');
  const set = (s: string) => start(async () => { const r = await setAppointmentStatus(a.id, s); if (r.error) setErr(r.error); else onDone(); });
  const st = staff.find(s => s.id === a.staffId);
  return (
    <Sheet title="Detalle de la cita" onClose={onClose}>
      <div className="flex items-center justify-between"><span className="font-label-md tracking-widest text-on-surface-variant">{a.code}</span><span className="flex items-center gap-2">{a.confirmed && <span className="font-label-sm text-[#059669] flex items-center gap-1"><Icon name="mark_chat_read" className="text-[16px]" />Confirmó</span>}<StatusBadge status={a.status} /></span></div>
      <Link href={`/panel/clientes/${a.customer.id}`} className="block mt-3 font-headline-sm text-headline-sm hover:text-secondary">{a.customer.name}</Link>
      {a.customer.phone && <a href={`https://wa.me/57${a.customer.phone}`} target="_blank" rel="noreferrer" className="font-label-md text-[#059669] flex items-center gap-1"><Icon name="chat" className="text-[16px]" />+57 {a.customer.phone}</a>}
      <dl className="mt-4 space-y-2">
        <div className="flex justify-between"><dt className="text-on-surface-variant">Servicios</dt><dd className="text-right">{a.services}</dd></div>
        <div className="flex justify-between"><dt className="text-on-surface-variant">Profesional</dt><dd>{st?.name}</dd></div>
        <div className="flex justify-between"><dt className="text-on-surface-variant">Horario</dt><dd>{ymd(new Date(a.start))} · {time12(hm(new Date(a.start)))} – {time12(hm(new Date(a.end)))}</dd></div>
        <div className="flex justify-between"><dt className="text-on-surface-variant">Valor</dt><dd className="tnum font-bold">{cop(a.total)}</dd></div>
        {a.depositAmount > 0 && <div className="flex justify-between"><dt className="text-on-surface-variant">Depósito</dt><dd className="tnum">{cop(a.depositAmount)} · {a.depositStatus.toLowerCase()}</dd></div>}
        {a.notes && <div><dt className="text-on-surface-variant">Notas</dt><dd className="mt-1 p-2 rounded-lg bg-surface-container-low">{a.notes}</dd></div>}
      </dl>
      {err && <p className="text-danger mt-3">{err}</p>}
      <div className="grid grid-cols-2 gap-2 mt-6">
        {a.status === 'PENDIENTE' && <button disabled={p} className="btn-primary btn-sm col-span-2" onClick={() => set('CONFIRMADA')}>Confirmar</button>}
        {['PENDIENTE', 'CONFIRMADA'].includes(a.status) && <button disabled={p} className="btn-ghost btn-sm" onClick={() => set('EN_SERVICIO')}>Iniciar servicio</button>}
        {!a.saleId && !['CANCELADA', 'NO_ASISTIO'].includes(a.status) && <Link href={`/panel/caja?cita=${a.id}`} className="btn-gold btn-sm"><Icon name="point_of_sale" className="text-[16px]" />Cobrar</Link>}
        {a.saleId && <Link href={`/panel/caja/ventas/${a.saleId}`} className="btn-outline btn-sm col-span-2">Ver venta</Link>}
        {['PENDIENTE', 'CONFIRMADA'].includes(a.status) && <button disabled={p} className="btn-ghost btn-sm" onClick={() => set('NO_ASISTIO')}>No asistió</button>}
        {['PENDIENTE', 'CONFIRMADA'].includes(a.status) && <button disabled={p} className="btn-danger btn-sm" onClick={() => { if (confirm('¿Cancelar la cita?')) set('CANCELADA'); }}>Cancelar cita</button>}
      </div>
    </Sheet>
  );
}

function NewAppointment({ onClose, onDone, staff, services, customers, prefill }: { onClose: () => void; onDone: () => void; staff: Staff[]; services: { id: string; name: string; durationMin: number; price: number; staffIds: string[] }[]; customers: { id: string; name: string; phone: string | null }[]; prefill: { staffId?: string; date?: string; time?: string } }) {
  const [st, action, p] = useActionState(createAppointmentPanel, null);
  const [staffId, setStaffId] = useState(prefill.staffId || staff[0]?.id);
  const [q, setQ] = useState(''); const [cust, setCust] = useState('');
  useEffect(() => { if (st?.ok) onDone(); }, [st, onDone]);
  const filtered = q ? customers.filter(c => c.name.toLowerCase().includes(q.toLowerCase()) || (c.phone || '').includes(q)).slice(0, 6) : [];
  return (
    <Sheet title="Nueva cita" onClose={onClose}>
      <form action={action} className="space-y-4">
        <div>
          <span className="label">Cliente</span>
          <input type="hidden" name="customerId" value={cust} />
          {cust ? <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container-low"><span>{customers.find(c => c.id === cust)?.name}</span><button type="button" className="text-secondary font-label-md" onClick={() => setCust('')}>Cambiar</button></div> : (
            <>
              <input className="input" placeholder="Buscar por nombre o celular" value={q} onChange={e => setQ(e.target.value)} />
              {filtered.length > 0 && <ul className="card mt-1 divide-y divide-parchment">{filtered.map(c => <li key={c.id}><button type="button" className="w-full text-left p-2 hover:bg-surface-container-low" onClick={() => setCust(c.id)}>{c.name} <span className="text-on-surface-variant">{c.phone}</span></button></li>)}</ul>}
              <div className="grid grid-cols-2 gap-2 mt-2"><input name="newName" className="input" placeholder="o nuevo: nombre" defaultValue="" /><input name="newPhone" className="input" placeholder="Celular" inputMode="numeric" /></div>
            </>
          )}
        </div>
        <label className="block"><span className="label">Profesional</span><select name="staffId" className="input" value={staffId} onChange={e => setStaffId(e.target.value)}>{staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <fieldset><legend className="label">Servicios</legend><div className="space-y-1 max-h-48 overflow-y-auto">{services.filter(s => s.staffIds.includes(staffId)).map(s => <label key={s.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-surface-container-low"><input type="checkbox" name="serviceIds" value={s.id} className="accent-primary-container" /><span className="flex-1">{s.name}</span><span className="text-on-surface-variant font-body-sm">{s.durationMin} min · {cop(s.price)}</span></label>)}</div></fieldset>
        <div className="grid grid-cols-2 gap-2"><label><span className="label">Fecha</span><input type="date" name="date" className="input" defaultValue={prefill.date} required /></label><label><span className="label">Hora</span><input type="time" step={900} name="time" className="input" defaultValue={prefill.time || '09:00'} required /></label></div>
        <label className="block"><span className="label">Notas</span><textarea name="notes" className="input" rows={2} /></label>
        <label className="flex items-center gap-2"><input type="checkbox" name="notify" defaultChecked className="accent-primary-container" />Avisar al cliente por WhatsApp</label>
        {st?.error && <p className="text-danger font-label-md">{st.error}</p>}
        <button disabled={p} className="btn-primary w-full">{p ? 'Guardando…' : 'Agendar cita'}</button>
      </form>
    </Sheet>
  );
}

function BlockForm({ onClose, onDone, staff, date }: { onClose: () => void; onDone: () => void; staff: Staff[]; date: string }) {
  const [st, action, p] = useActionState(blockTime, null);
  useEffect(() => { if (st?.ok) onDone(); }, [st, onDone]);
  return (
    <Sheet title="Bloquear horario" onClose={onClose}>
      <form action={action} className="space-y-4">
        <label className="block"><span className="label">Profesional</span><select name="staffId" className="input"><option value="">Todo el negocio</option>{staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label className="block"><span className="label">Fecha</span><input type="date" name="date" defaultValue={date} className="input" required /></label>
        <div className="grid grid-cols-2 gap-2"><label><span className="label">Desde</span><input type="time" name="from" defaultValue="12:00" className="input" required /></label><label><span className="label">Hasta</span><input type="time" name="to" defaultValue="13:00" className="input" required /></label></div>
        <label className="block"><span className="label">Motivo</span><input name="reason" className="input" placeholder="Almuerzo, capacitación, cita médica…" /></label>
        {st?.error && <p className="text-danger">{st.error}</p>}
        <button disabled={p} className="btn-primary w-full">Bloquear</button>
      </form>
    </Sheet>
  );
}
