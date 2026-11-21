'use client';
import { useEffect, useState, useTransition } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cop } from '@/lib/format';
import { cancelAutoRenew, cardFormData, retryCharge, saveCard } from '../_actions/subscription';

type Plan = { id: string; name: string; price: number; year: number };
const brandOf = (n: string) => (/^4/.test(n) ? 'VISA' : /^(5[1-5]|2[2-7])/.test(n) ? 'MASTERCARD' : /^3[47]/.test(n) ? 'AMEX' : /^3(0|6|8)/.test(n) ? 'DINERS' : 'TARJETA');
const luhn = (n: string) => { let s = 0; for (let i = 0; i < n.length; i++) { let d = Number(n[n.length - 1 - i]); if (i % 2) { d *= 2; if (d > 9) d -= 9; } s += d; } return n.length >= 13 && s % 10 === 0; };

/** Formulario de tarjeta. Con Wompi, el número nunca pasa por nuestro servidor: se convierte en un token en el navegador. */
export function CardForm({ plans, plan: plan0, period: period0, onDone, onCancel }: { plans: Plan[]; plan: string; period: string; onDone: (msg: string) => void; onCancel: () => void }) {
  const [plan, setPlan] = useState(plan0); const [period, setPeriod] = useState(period0);
  const [num, setNum] = useState(''); const [exp, setExp] = useState(''); const [cvc, setCvc] = useState(''); const [holder, setHolder] = useState('');
  const [agree, setAgree] = useState(false); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const [terms, setTerms] = useState<Awaited<ReturnType<typeof cardFormData>> | null>(null);
  useEffect(() => { cardFormData().then(setTerms).catch(() => setErr('No pudimos cargar el formulario. Intenta de nuevo.')); }, []);
  const digits = num.replace(/\D/g, ''); const p = plans.find(x => x.id === plan)!;
  async function submit() {
    setErr('');
    const [mm, yy] = exp.split('/').map(s => s.trim());
    if (!luhn(digits)) return setErr('Revisa el número de la tarjeta.');
    if (!/^(0[1-9]|1[0-2])$/.test(mm || '') || !/^\d{2}$/.test(yy || '')) return setErr('La fecha va como MM/AA, por ejemplo 08/29.');
    if (!/^\d{3,4}$/.test(cvc)) return setErr('El código de seguridad tiene 3 o 4 dígitos.');
    if (holder.trim().length < 4) return setErr('Escribe el nombre como aparece en la tarjeta.');
    if (!agree) return setErr('Acepta la autorización de cobro.');
    setBusy(true);
    try {
      let token: string | undefined; let brand = brandOf(digits); let last4 = digits.slice(-4);
      if (terms?.provider === 'WOMPI') {
        const r = await fetch(`${terms.base}/tokens/cards`, { method: 'POST', headers: { Authorization: `Bearer ${terms.publicKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ number: digits, cvc, exp_month: mm, exp_year: yy, card_holder: holder.trim() }) });
        const d = await r.json() as { data?: { id: string; brand: string; last_four: string }; error?: { messages?: Record<string, string[]> } };
        if (!r.ok || !d.data) { setBusy(false); return setErr('El banco no aceptó los datos de la tarjeta. Revísalos.'); }
        token = d.data.id; brand = d.data.brand || brand; last4 = d.data.last_four || last4;
      }
      const s = await saveCard({ plan, period, token, brand, last4, acceptance: terms?.acceptance?.acceptance_token, personal: terms?.personal?.acceptance_token || null });
      setBusy(false);
      if ('error' in s && s.error) return setErr(s.error);
      const c = 'charged' in s ? s.charged : null;
      onDone(c === 'APPROVED' ? '✓ Tarjeta guardada y pago aprobado. Tu plan quedó activo.' : c === 'PENDING' ? 'Tarjeta guardada. El pago está en revisión: te avisamos en unos minutos.' : c ? 'Guardamos la tarjeta, pero el banco rechazó el pago. Prueba con otra tarjeta.' : '✓ Tarjeta guardada. Cobraremos tu plan automáticamente cuando venza.');
    } catch { setBusy(false); setErr('No pudimos conectar con la pasarela. Intenta de nuevo.'); }
  }
  return (
    <div className="mt-3 space-y-3 p-4 rounded-xl border border-parchment bg-surface-container-lowest">
      <div className="grid grid-cols-2 gap-2">
        <label><span className="label">Plan</span><select value={plan} onChange={e => setPlan(e.target.value)} className="input">{plans.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label><span className="label">Cobrar</span><select value={period} onChange={e => setPeriod(e.target.value)} className="input"><option value="MENSUAL">Cada mes · {cop(p.price)}</option><option value="ANUAL">Cada año · {cop(p.year)}</option></select></label>
      </div>
      <label className="block"><span className="label">Número de la tarjeta</span><input value={num} onChange={e => setNum(e.target.value.replace(/[^\d ]/g, '').slice(0, 23))} className="input tnum" inputMode="numeric" autoComplete="cc-number" placeholder="4242 4242 4242 4242" /></label>
      <div className="grid grid-cols-3 gap-2">
        <label><span className="label">Vence</span><input value={exp} onChange={e => { let v = e.target.value.replace(/[^\d]/g, '').slice(0, 4); if (v.length > 2) v = `${v.slice(0, 2)}/${v.slice(2)}`; setExp(v); }} className="input tnum" inputMode="numeric" autoComplete="cc-exp" placeholder="MM/AA" /></label>
        <label><span className="label">CVC</span><input value={cvc} onChange={e => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))} className="input tnum" inputMode="numeric" autoComplete="cc-csc" placeholder="123" /></label>
        <label><span className="label">Titular</span><input value={holder} onChange={e => setHolder(e.target.value)} className="input" autoComplete="cc-name" /></label>
      </div>
      <label className="flex items-start gap-2 font-body-sm text-on-surface-variant"><input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} className="mt-1 accent-primary-container" />
        <span>Autorizo cobrar {cop(period === 'ANUAL' ? p.year : p.price)} {period === 'ANUAL' ? 'cada año' : 'cada mes'} a esta tarjeta hasta que lo desactive.{terms?.acceptance && <> Acepto los <a href={terms.acceptance.permalink} target="_blank" rel="noopener" className="text-secondary underline">términos de Wompi</a>{terms.personal && <> y la <a href={terms.personal.permalink} target="_blank" rel="noopener" className="text-secondary underline">autorización de datos</a></>}.</>}</span></label>
      {terms?.provider === 'SIMULADO' && <p className="font-body-sm text-on-surface-variant">Modo de prueba: no se cobra nada. Una tarjeta terminada en 0002 simula un rechazo.</p>}
      {err && <p role="alert" className="text-danger font-label-md">{err}</p>}
      <div className="flex gap-2"><button type="button" disabled={busy || !terms} onClick={submit} className="btn-primary flex-1"><Icon name="lock" className="text-[18px]" />{busy ? 'Guardando…' : 'Guardar tarjeta'}</button><button type="button" onClick={onCancel} className="btn-ghost">Cancelar</button></div>
      <p className="font-body-sm text-on-surface-variant flex items-center gap-1"><Icon name="verified_user" className="text-[16px]" />{terms?.provider === 'WOMPI' ? 'Los datos de la tarjeta van directo a Wompi (Bancolombia); nosotros no los guardamos.' : 'No guardamos el número de la tarjeta.'}</p>
    </div>
  );
}

export function AutoRenew({ on, card, provider, plans, plan, period, nextAt, amount, fails, error, trial }: { on: boolean; card: string | null; provider: string; plans: Plan[]; plan: string; period: string; nextAt: string; amount: number; fails: number; error: string | null; trial: boolean }) {
  const [form, setForm] = useState(false); const [msg, setMsg] = useState(''); const [pending, start] = useTransition();
  if (provider === 'MERCADOPAGO' && !on) return null; // lo maneja el formulario de Mercado Pago de la página
  return (
    <section className="card-raised p-5 mb-4">
      <div className="flex items-start gap-3">
        <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${on ? 'bg-[#ECFDF5] text-[#065F46]' : 'bg-secondary-fixed/50 text-secondary'}`}><Icon name={on ? 'autorenew' : 'credit_card'} /></span>
        <div className="flex-1 min-w-0">
          <h2 className="h-section">Renovación automática {on ? <span className="ml-1 px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#065F46] font-label-sm align-middle">Activa</span> : null}</h2>
          {on ? <p className="text-on-surface-variant">{card} · Próximo cobro el {nextAt}: <b className="text-on-surface tnum">{cop(amount)}</b> ({plans.find(p => p.id === plan)?.name}, {period === 'ANUAL' ? 'anual' : 'mensual'}).</p>
            : <p className="text-on-surface-variant">Guarda tu tarjeta y olvídate de pagar a mano: cobramos tu plan {trial ? 'cuando termine la prueba gratis y luego ' : ''}cada mes o cada año. Lo desactivas cuando quieras.</p>}
          {on && fails > 0 && <p className="mt-2 p-2 rounded-lg bg-[#FFF1F2] text-danger font-label-md">El último cobro fue rechazado ({fails} {fails === 1 ? 'vez' : 'veces'}): {error} Cambia la tarjeta o reintenta.</p>}
        </div>
      </div>
      {msg && <p role="status" className="mt-3 font-label-md text-secondary">{msg}</p>}
      {form ? <CardForm plans={plans} plan={plan} period={period} onCancel={() => setForm(false)} onDone={m => { setForm(false); setMsg(m); }} />
        : <div className="flex flex-wrap gap-2 mt-3">
          <button type="button" onClick={() => setForm(true)} className={on ? 'btn-outline btn-sm' : 'btn-primary'}><Icon name="add_card" className="text-[18px]" />{on ? (provider === 'MERCADOPAGO' ? 'Cambiar a tarjeta' : 'Cambiar tarjeta o plan') : 'Activar con mi tarjeta'}</button>
          {on && fails > 0 && provider !== 'MERCADOPAGO' && <button type="button" disabled={pending} onClick={() => start(async () => { const s = await retryCharge(); setMsg(s === 'APPROVED' ? '✓ Pago aprobado.' : s === 'PENDING' ? 'Pago en revisión.' : 'El banco volvió a rechazar el pago.'); })} className="btn-outline btn-sm"><Icon name="refresh" className="text-[18px]" />Reintentar cobro</button>}
          {on && <button type="button" disabled={pending} onClick={() => { if (confirm('¿Desactivar la renovación automática? Tendrás que pagar a mano antes de que venza.')) start(() => cancelAutoRenew()); }} className="btn-ghost btn-sm">Desactivar</button>}
        </div>}
    </section>
  );
}
