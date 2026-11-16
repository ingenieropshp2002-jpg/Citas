'use client';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cop, fechaCorta, fromBogota, time12, ymd } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';
import { DateSlotPicker } from './DateSlotPicker';
import { applyCoupon, createBooking, depositCheck } from '@/app/(cliente)/reservar/actions';

type Svc = { id: string; name: string; description: string | null; durationMin: number; price: number; category: string; staffIds: string[] };
type Stf = { id: string; name: string; title: string; photo: string | null; rating: number };
const STEPS = ['Servicio', 'Profesional', 'Horario', 'Pago'];
const BANKS = ['Bancolombia', 'Davivienda', 'Banco de Bogotá', 'BBVA', 'Banco de Occidente', 'Banco Popular', 'Scotiabank Colpatria', 'Nu Colombia', 'Banco Caja Social', 'Itaú'];

export function BookingWizard({ business, services, staff, initialService, initialStaff, userPhone }: {
  business: { id: string; name: string; depositPercent: number; requireDeposit: boolean; cancellationHours: number; image?: string };
  services: Svc[]; staff: Stf[]; initialService?: string; initialStaff?: string; userPhone: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(initialService ? (initialStaff ? 3 : 2) : 1);
  const [sel, setSel] = useState<string[]>(initialService ? [initialService] : []);
  const [staffId, setStaffId] = useState<string | null>(initialStaff || null);
  const [date, setDate] = useState(ymd(new Date()));
  const [time, setTime] = useState('');
  const [method, setMethod] = useState('NEQUI');
  const [phone, setPhone] = useState(userPhone);
  const [bank, setBank] = useState(BANKS[0]);
  const [coupon, setCoupon] = useState(''); const [discount, setDiscount] = useState(0); const [couponMsg, setCouponMsg] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState(''); const [alts, setAlts] = useState<{ date: string; time: string }[]>([]); const [taken, setTaken] = useState(false); const [pending, start] = useTransition();

  const chosen = services.filter(s => sel.includes(s.id));
  const duration = chosen.reduce((a, s) => a + s.durationMin, 0);
  const subtotal = chosen.reduce((a, s) => a + s.price, 0);
  const total = subtotal - discount;
  const [rule, setRule] = useState<{ required: boolean; mandatory: boolean; reason: string }>({ required: business.requireDeposit, mandatory: false, reason: '' });
  useEffect(() => { if (step === 4 && date && time) depositCheck(business.id, date, time, phone).then(r => { setRule(r); if (r.mandatory) setMethod(m => (m === 'EN_LOCAL' ? 'NEQUI' : m)); }); }, [step, date, time, business.id, phone]);
  const deposit = method !== 'EN_LOCAL' && rule.required ? Math.max(1000, Math.round(total * business.depositPercent / 100 / 100) * 100) : 0;
  const eligibleStaff = useMemo(() => staff.filter(st => chosen.every(s => s.staffIds.includes(st.id))), [staff, chosen]);
  const stf = staff.find(s => s.id === staffId);
  const canNext = step === 1 ? sel.length > 0 : step === 2 ? true : step === 3 ? !!time : true;

  const confirm = (at?: { date: string; time: string }) => start(async () => {
    setError(''); setAlts([]); setTaken(false);
    if (at) { setDate(at.date); setTime(at.time); }
    const r = await createBooking({ businessId: business.id, serviceIds: sel, staffId, date: at?.date ?? date, time: at?.time ?? time, method, phone, coupon: discount ? coupon : undefined, notes: [notes, method === 'PSE' ? `Banco: ${bank}` : ''].filter(Boolean).join(' · ') });
    if ('error' in r && r.error) { setError(r.error); setAlts(('alternatives' in r && r.alternatives) || []); setTaken('taken' in r && !!r.taken); return; }
    if ('redirect' in r && r.redirect) { if (r.redirect.startsWith('http')) window.location.href = r.redirect; else router.push(r.redirect); }
  });
  const ctaLabel = step < 4 ? 'Continuar' : deposit ? `Confirmar y pagar ${cop(deposit, true)} con ${method === 'NEQUI' ? 'Nequi' : method === 'PSE' ? 'PSE' : 'Tarjeta'}` : 'Confirmar reserva';

  return (
    <div className="flex flex-col w-full pb-44 max-w-3xl mx-auto">
      {/* Barra de progreso */}
      <section className="px-margin pt-space-md pb-space-sm">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-6 right-6 top-4 h-0.5 bg-surface-container-highest" />
          <div className="absolute left-6 top-4 h-0.5 bg-gold transition-all duration-500" style={{ width: `calc((100% - 3rem) * ${(step - 1) / 3})` }} />
          {STEPS.map((l, i) => {
            const n = i + 1; const done = n < step; const active = n === step;
            return (
              <button key={l} type="button" disabled={n > step} onClick={() => setStep(n)} className="relative z-10 flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${done ? 'bg-primary-container text-white shadow-sm' : active ? 'bg-secondary-fixed text-on-secondary-fixed shadow-md' : 'bg-surface-container-high text-on-surface-variant'}`}>
                  {done ? <Icon name="check" className="text-[16px] text-secondary-fixed" /> : <span className="font-label-md text-label-md font-bold">{n}</span>}
                </div>
                <span className={`mt-1 font-label-sm text-label-sm ${active ? 'text-primary font-bold' : done ? 'text-on-surface-variant' : 'text-outline'}`}>{l}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Resumen compacto */}
      {chosen.length > 0 && step > 1 && (
        <section className="px-margin mt-space-sm">
          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex items-start gap-3">
            {business.image && <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 shadow-sm"><img className="w-full h-full object-cover" src={business.image} alt="" /></div>}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2"><span className="px-2 py-0.5 rounded-full bg-surface-container text-primary text-[10px] font-semibold tracking-wide uppercase truncate">{business.name}</span><span className="font-label-md text-label-md text-secondary font-bold tnum">{cop(subtotal, true)}</span></div>
              <h2 className="font-title-md text-title-md truncate mt-0.5">{chosen.map(s => s.name).join(' + ')}</h2>
              {stf && <div className="flex items-center gap-1.5 mt-1 text-on-surface-variant font-body-sm text-body-sm"><Icon name="person_heart" className="text-[14px] text-secondary" /><span className="truncate">{stf.name} · {stf.title}</span></div>}
              <div className="flex items-center gap-3 mt-1.5 text-on-surface-variant font-label-sm text-label-sm"><span className="flex items-center gap-1"><Icon name="schedule" className="text-[14px]" /> {duration} min</span>{time && <span className="flex items-center gap-1"><Icon name="event_available" className="text-[14px] text-secondary" />{fechaCorta(fromBogota(date, time))} · {time12(time)}</span>}</div>
            </div>
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="px-margin mt-space-md">
          <span className="eyebrow">Paso 1 de 4</span>
          <h3 className="font-headline-sm text-headline-sm font-semibold mb-space-sm">Elige tus servicios</h3>
          <div className="space-y-space-sm">
            {services.map(s => { const on = sel.includes(s.id); return (
              <label key={s.id} className={`p-space-md rounded-xl bg-surface-container-lowest shadow-sm flex items-center gap-space-md cursor-pointer border transition ${on ? 'border-gold/60 shadow-raised' : 'border-transparent'}`}>
                <div className="flex-1 min-w-0">
                  <span className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1"><Icon name="schedule" className="text-[14px]" />{s.durationMin} min · {s.category}</span>
                  <p className="font-title-md text-title-md text-primary-container dark:text-primary font-bold">{s.name}</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-1">{s.description}</p>
                  <p className="mt-1 font-title-lg text-title-lg tnum">{cop(s.price)} <span className="font-label-sm text-label-sm text-on-surface-variant">COP</span></p>
                </div>
                <input type="checkbox" className="sr-only" checked={on} onChange={() => { setSel(on ? sel.filter(x => x !== s.id) : [...sel, s.id]); setTime(''); setStaffId(null); }} />
                <span className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 transition ${on ? 'bg-primary-container text-secondary-fixed' : 'bg-secondary text-on-secondary'}`}><Icon name={on ? 'check' : 'add'} /></span>
              </label>
            ); })}
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="px-margin mt-space-md">
          <span className="eyebrow">Paso 2 de 4</span>
          <h3 className="font-headline-sm text-headline-sm font-semibold mb-space-sm">Elige tu profesional</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-space-sm">
            <button type="button" onClick={() => { setStaffId(null); setTime(''); setStep(3); }} className={`card p-space-md flex flex-col items-center text-center ${staffId === null ? 'border-gold/60 shadow-raised' : ''}`}>
              <span className="w-16 h-16 rounded-full bg-secondary-fixed/50 flex items-center justify-center"><Icon name="groups" className="text-secondary text-[30px]" /></span>
              <p className="mt-2 font-title-md text-title-md">Cualquiera</p><p className="font-body-sm text-body-sm text-on-surface-variant">Más horarios disponibles</p>
            </button>
            {eligibleStaff.map(s => (
              <button type="button" key={s.id} onClick={() => { setStaffId(s.id); setTime(''); setStep(3); }} className={`card p-space-md flex flex-col items-center text-center ${staffId === s.id ? 'border-gold/60 shadow-raised' : ''}`}>
                <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-gold to-secondary-fixed">{s.photo ? <img src={s.photo} alt="" className="w-full h-full rounded-full object-cover" /> : <span className="w-full h-full rounded-full bg-primary-container text-white flex items-center justify-center">{s.name[0]}</span>}</div>
                <p className="mt-2 font-title-md text-title-md">{s.name}</p><p className="font-body-sm text-body-sm text-on-surface-variant">{s.title}</p>
                <span className="mt-1 flex items-center gap-0.5 font-label-md text-label-md"><Icon name="star" fill className="text-[14px] text-gold" />{s.rating.toFixed(1)}</span>
              </button>
            ))}
          </div>
          {eligibleStaff.length === 0 && <p className="mt-3 text-on-surface-variant">Ningún profesional realiza todos los servicios elegidos juntos. Reserva por separado.</p>}
        </section>
      )}

      {step === 3 && (
        <section className="px-margin mt-space-md">
          <span className="eyebrow">Paso 3 de 4</span>
          <h3 className="font-headline-sm text-headline-sm font-semibold">Elige fecha y hora</h3>
          <DateSlotPicker businessId={business.id} duration={duration} staffId={staffId} serviceIds={sel} date={date} time={time} onChange={(d, t) => { setDate(d); setTime(t); }} />
        </section>
      )}

      {step === 4 && (
        <>
          <section className="px-margin mt-space-md">
            <span className="eyebrow">Paso 4 de 4</span>
            <h3 className="font-headline-sm text-headline-sm font-semibold mb-space-xs">Garantía &amp; Pago</h3>
            {rule.mandatory && rule.reason && (
              <div className="p-space-sm rounded-xl bg-[#FFF7E6] dark:bg-secondary-fixed/10 border border-gold/50 flex items-start gap-2.5 mb-space-sm">
                <Icon name="info" className="text-secondary text-[20px] mt-0.5" />
                <p className="text-body-sm font-body-sm">{rule.reason}</p>
              </div>
            )}
            {rule.required && (
              <div className="p-space-sm rounded-xl bg-secondary-fixed/20 flex items-start gap-2.5 mb-space-sm shadow-sm">
                <Icon name="verified_user" className="text-secondary text-[20px] mt-0.5" />
                <div className="text-body-sm font-body-sm"><p className="font-bold">Depósito de reserva anticipada ({business.depositPercent}%)</p>
                  <p className="text-on-surface-variant mt-0.5">Paga solo <b className="text-on-surface">{cop(Math.max(1000, Math.round(total * business.depositPercent / 100 / 100) * 100), true)}</b> ahora para asegurar tu cita. Reembolsable si cancelas con {business.cancellationHours}h de anticipación.</p></div>
              </div>
            )}
            <div className="space-y-space-xs">
              {[
                ['NEQUI', 'Nequi', 'Notificación push al celular', <span key="n" className="w-8 h-8 rounded-lg bg-nequi flex items-center justify-center text-white font-bold text-xs">N</span>, 'Instantáneo'],
                ['PSE', 'PSE (Débito Bancario)', 'Bancolombia, Davivienda, etc.', <span key="p" className="w-8 h-8 rounded-lg bg-pse flex items-center justify-center font-bold text-[10px] text-white">PSE</span>],
                ['TARJETA', 'Tarjeta débito / Crédito', 'Visa, Mastercard, Amex', <span key="t" className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant"><Icon name="credit_card" className="text-[18px]" /></span>],
                ['EN_LOCAL', 'Pagar en el Salón', 'Efectivo, Datáfono o Transferencia', <span key="l" className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant"><Icon name="storefront" className="text-[18px]" /></span>]
              ].filter(([v]) => !(rule.mandatory && v === 'EN_LOCAL')).map(([v, l, d, icon, badge]) => (
                <div key={v as string} className={`rounded-xl bg-surface-container-lowest p-space-sm shadow-sm border transition ${method === v ? 'border-gold/50' : 'border-transparent'}`}>
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-3">{icon}<div><div className="font-label-lg text-label-lg font-bold flex items-center gap-1.5">{l}{badge && <span className="text-[10px] px-1.5 rounded bg-secondary-fixed text-on-secondary-fixed font-semibold">{badge}</span>}</div><span className="font-body-sm text-body-sm text-on-surface-variant">{d}</span></div></div>
                    <input type="radio" name="pm" className="accent-primary-container w-4 h-4" checked={method === v} onChange={() => setMethod(v as string)} />
                  </label>
                  {method === 'NEQUI' && v === 'NEQUI' && (
                    <div className="mt-space-sm pt-space-xs"><label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">Número de celular Nequi (+57)</label>
                      <div className="relative"><span className="absolute inset-y-0 left-0 pl-3 flex items-center font-label-md text-label-md text-on-surface-variant">+57</span><input className="w-full pl-12 pr-4 py-2.5 rounded-lg bg-surface outline-none focus:bg-surface-container-low" type="tel" inputMode="numeric" value={phone} onChange={e => setPhone(e.target.value)} placeholder="300 000 0000" /></div></div>
                  )}
                  {method === 'PSE' && v === 'PSE' && (
                    <div className="mt-space-sm"><label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">Banco</label><select className="input h-11" value={bank} onChange={e => setBank(e.target.value)}>{BANKS.map(x => <option key={x}>{x}</option>)}</select><p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Serás redirigido al portal seguro de tu banco.</p></div>
                  )}
                  {method === 'TARJETA' && v === 'TARJETA' && <p className="mt-2 font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1"><Icon name="lock" className="text-[14px] text-secondary" />Ingresarás los datos de tu tarjeta en la pasarela segura. No los almacenamos.</p>}
                </div>
              ))}
            </div>
            <div className="mt-space-sm flex gap-2">
              <input className="input h-11 uppercase" placeholder="Cupón de descuento" value={coupon} onChange={e => setCoupon(e.target.value)} />
              <button type="button" className="btn-outline btn-sm h-11" onClick={async () => { const r = await applyCoupon(business.id, coupon, subtotal); if ('error' in r) { setCouponMsg(r.error!); setDiscount(0); } else { setDiscount(r.discount!); setCouponMsg(`Cupón aplicado: -${cop(r.discount!)}`); } }}>Aplicar</button>
            </div>
            {couponMsg && <p className={`mt-1 font-label-md text-label-md ${discount ? 'text-success' : 'text-danger'}`}>{couponMsg}</p>}
            <textarea className="input mt-space-sm" rows={2} placeholder="Notas para el profesional (opcional)" value={notes} onChange={e => setNotes(e.target.value)} />
          </section>
          <section className="px-margin mt-space-md">
            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm">
              <h4 className="font-title-md text-title-md font-semibold mb-space-xs">Desglose de Pago</h4>
              <div className="space-y-2 text-body-sm font-body-sm text-on-surface-variant tnum">
                {chosen.map(s => <div key={s.id} className="flex justify-between"><span>{s.name}</span><span className="font-medium text-on-surface">{cop(s.price, true)}</span></div>)}
                {discount > 0 && <div className="flex justify-between text-success"><span>Descuento</span><span>-{cop(discount, true)}</span></div>}
                <div className="flex justify-between"><span>Tarifa de plataforma &amp; recordatorios</span><span className="text-secondary font-medium">Gratis</span></div>
                <div className="flex justify-between items-center pt-2 font-semibold text-primary"><span>{deposit ? 'Anticipo a pagar hoy (Online)' : 'Total a pagar en el salón'}</span><span className="text-title-md font-currency-display">{cop(deposit || total, true)}</span></div>
                {deposit > 0 && <div className="flex justify-between"><span>Saldo restante en recepción ({fechaCorta(fromBogota(date, '12:00'))})</span><span className="font-medium">{cop(total - deposit, true)}</span></div>}
              </div>
            </div>
          </section>
        </>
      )}

      {/* CTA fijo */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-xl px-margin py-3 shadow-[0_-8px_30px_rgba(13,37,56,0.08)] pb-safe">
        <div className="max-w-md mx-auto w-full">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-on-surface-variant font-label-sm text-label-sm"><Icon name="event_available" className="text-[15px] text-secondary" /><span>{time ? `${fechaCorta(fromBogota(date, time))} · ${time12(time)}` : `${chosen.length} servicio(s) · ${duration} min`}</span></div>
            <div className="font-label-sm text-label-sm">{step === 4 ? 'Total Hoy: ' : 'Total: '}<span className="font-title-md text-title-md font-bold text-primary tnum">{cop(step === 4 ? (deposit || 0) : subtotal, true)}</span></div>
          </div>
          {error && !taken && <p className="mb-2 text-center font-label-md text-label-md text-danger">{error}</p>}
          {taken && (
            <div role="alert" className="mb-3 p-3 rounded-2xl border border-gold/60 bg-secondary-fixed/25">
              <p className="flex items-center justify-center gap-1.5 font-label-lg text-label-lg font-semibold text-on-surface"><Icon name="event_busy" className="text-[20px] text-danger" />{error}</p>
              {alts.length > 0 ? (<>
                <p className="mt-1 mb-2 text-center font-body-sm text-on-surface-variant">{stf ? `Estos son los próximos horarios libres con ${stf.name.split(' ')[0]}.` : 'Estos son los próximos horarios libres.'} Toca uno y queda reservado.</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {alts.map(a => (
                    <button key={a.date + a.time} type="button" disabled={pending} onClick={() => confirm(a)} className="px-3 h-10 rounded-full border border-gold/60 bg-surface-container-lowest font-label-md text-label-md text-primary hover:bg-secondary-fixed/60 disabled:opacity-50">
                      {a.date === ymd(new Date()) ? 'Hoy' : fechaCorta(fromBogota(a.date, '12:00'))} · {time12(a.time)}
                    </button>
                  ))}
                </div>
              </>) : <p className="mt-1 text-center font-body-sm text-on-surface-variant">No quedan horarios libres en los próximos 14 días. Prueba con otro profesional.</p>}
            </div>
          )}
          <button type="button" disabled={!canNext || pending || (step === 2 && false)} onClick={() => (step < 4 ? setStep(step === 2 && staffId === undefined ? 3 : step + 1) : confirm())}
            className="w-full py-3.5 px-4 rounded-lg bg-primary-container text-white dark:text-on-primary-container font-label-lg text-label-lg font-bold flex items-center justify-center gap-2 active:scale-[0.985] transition-transform shadow-md disabled:opacity-50">
            {step === 4 && <Icon name="lock" className="text-[18px] text-secondary-fixed" />}<span>{pending ? 'Procesando…' : ctaLabel}</span>
          </button>
          <div className="flex items-center justify-center gap-1 mt-2 text-on-surface-variant text-[11px] font-label-sm"><Icon name="verified" className="text-[13px] text-secondary" /><span>Transacción 100% segura y encriptada · pasarela vigilada</span></div>
        </div>
      </div>
    </div>
  );
}
