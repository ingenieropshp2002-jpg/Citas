'use client';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { cop } from '@/lib/format';
import { computeLine, summarize } from '@/lib/tax';
import { checkout } from '@/app/admin/_actions/pos';

type Svc = { id: string; name: string; price: number; taxRate: number; category: string; staffIds: string[] };
type Prod = { id: string; name: string; price: number; taxRate: number; stock: number; sku: string; barcode: string | null; category: string };
type Cust = { id: string; name: string; phone: string | null; docType: string; docNumber: string | null; email: string | null };
type Line = { key: string; kind: 'SERVICIO' | 'PRODUCTO'; id: string; name: string; unitPrice: number; taxRate: number; quantity: number; discount: number; staffId: string | null; max?: number };
const METHODS = [['EFECTIVO', 'Efectivo', 'payments'], ['TARJETA', 'Datáfono', 'credit_card'], ['NEQUI', 'Nequi', 'smartphone'], ['DAVIPLATA', 'Daviplata', 'smartphone'], ['TRANSFERENCIA', 'Transferencia', 'account_balance'], ['PSE', 'PSE', 'account_balance']];

export function POS({ services, products, staff, customers, posLimit, preset }: {
  services: Svc[]; products: Prod[]; staff: { id: string; name: string }[]; customers: Cust[]; posLimit: number;
  preset?: { appointmentId: string; customerId: string; lines: { serviceId: string; staffId: string; price: number }[]; deposit: number; depositMethod: string };
}) {
  const r = useRouter();
  const [tab, setTab] = useState<'s' | 'p'>('s'); const [q, setQ] = useState('');
  const [lines, setLines] = useState<Line[]>(() => (preset?.lines || []).map((l, i) => { const s = services.find(x => x.id === l.serviceId)!; return { key: 'p' + i, kind: 'SERVICIO', id: s.id, name: s.name, unitPrice: l.price, taxRate: s.taxRate, quantity: 1, discount: 0, staffId: l.staffId }; }));
  const [customerId, setCustomerId] = useState(preset?.customerId || '');
  const [custQ, setCustQ] = useState('');
  const [tip, setTip] = useState(0); const [coupon, setCoupon] = useState('');
  const [wantsInvoice, setWantsInvoice] = useState(false);
  const cust = customers.find(c => c.id === customerId);
  const [buyer, setBuyer] = useState({ docType: '13', docNumber: '', name: '', email: '' });
  const [pays, setPays] = useState<{ method: string; amount: number; received?: number }[]>(preset?.deposit ? [{ method: preset.depositMethod, amount: preset.deposit }, { method: 'EFECTIVO', amount: 0 }] : [{ method: 'EFECTIVO', amount: 0 }]);
  const [err, setErr] = useState(''); const [pending, start] = useTransition();

  const calc = useMemo(() => lines.map(l => ({ ...l, ...computeLine(l) })), [lines]);
  const sum = summarize(calc);
  const total = sum.total + tip;
  const deposit = preset?.deposit || 0;
  const paid = pays.reduce((a, p) => a + (p.amount || 0), 0);
  const needsFE = wantsInvoice || sum.total > posLimit;

  const add = (kind: 'SERVICIO' | 'PRODUCTO', id: string) => {
    if (kind === 'PRODUCTO') { const p = products.find(x => x.id === id)!; const ex = lines.find(l => l.kind === 'PRODUCTO' && l.id === id); if (ex) { if (ex.quantity < p.stock) setLines(lines.map(l => l === ex ? { ...l, quantity: l.quantity + 1 } : l)); return; } if (p.stock <= 0) { setErr(`${p.name} está agotado.`); return; } setLines([...lines, { key: crypto.randomUUID(), kind, id, name: p.name, unitPrice: p.price, taxRate: p.taxRate, quantity: 1, discount: 0, staffId: null, max: p.stock }]); }
    else { const s = services.find(x => x.id === id)!; setLines([...lines, { key: crypto.randomUUID(), kind, id, name: s.name, unitPrice: s.price, taxRate: s.taxRate, quantity: 1, discount: 0, staffId: s.staffIds[0] || null }]); }
    setErr('');
  };
  const upd = (key: string, p: Partial<Line>) => setLines(lines.map(l => l.key === key ? { ...l, ...p } : l));
  const scan = (code: string) => { const p = products.find(x => x.barcode === code || x.sku.toLowerCase() === code.toLowerCase()); if (p) { add('PRODUCTO', p.id); setQ(''); return true; } return false; };
  const fillPays = (i: number) => { if (!pays[i].amount) { const others = pays.reduce((a, p, j) => a + (j === i ? 0 : p.amount || 0), 0); setPays(pays.map((x, j) => j === i ? { ...x, amount: Math.max(0, total - others) } : x)); } };

  const pay = () => start(async () => {
    setErr('');
    const empty = pays.findIndex(p => !p.amount); const finalPays = empty >= 0 && pays.filter(p => !p.amount).length === 1 ? pays.map((p, j) => j === empty ? { ...p, amount: Math.max(0, total - paid) } : p) : pays;
    const b = needsFE ? (buyer.docNumber ? buyer : cust?.docNumber ? { docType: cust.docType, docNumber: cust.docNumber, name: cust.name, email: cust.email || '' } : null) : (cust?.docNumber ? { docType: cust.docType, docNumber: cust.docNumber, name: cust.name, email: cust.email || '' } : null);
    if (wantsInvoice && !b) { setErr('Para factura electrónica a solicitud del cliente, ingresa su documento y nombre.'); return; }
    const res = await checkout({ items: lines.map(l => ({ kind: l.kind, id: l.id, quantity: l.quantity, unitPrice: l.unitPrice, discount: l.discount, staffId: l.staffId })), customerId: customerId || null, appointmentId: preset?.appointmentId || null, tip, couponCode: coupon || undefined, payments: finalPays, wantsInvoice, buyer: b });
    if ('error' in res && res.error) { setErr(res.error); return; }
    if ('saleId' in res) r.push(`/admin/caja/ventas/${res.saleId}${res.docError ? `?docError=${encodeURIComponent(res.docError)}` : ''}`);
  });

  const nq = q.toLowerCase();
  const list = tab === 's' ? services.filter(s => s.name.toLowerCase().includes(nq)) : products.filter(p => p.name.toLowerCase().includes(nq) || p.sku.toLowerCase().includes(nq) || (p.barcode || '').includes(nq));
  const custList = custQ ? customers.filter(c => c.name.toLowerCase().includes(custQ.toLowerCase()) || (c.phone || '').includes(custQ) || (c.docNumber || '').includes(custQ)).slice(0, 5) : [];

  return (
    <div className="grid xl:grid-cols-[1fr_440px] gap-4 items-start">
      <section className="card p-4">
        <div className="flex gap-2 mb-3">
          {(['s', 'p'] as const).map(t => <button key={t} onClick={() => setTab(t)} className={`chip ${tab === t ? 'chip-on' : ''}`}>{t === 's' ? 'Servicios' : 'Productos'}</button>)}
          <div className="relative flex-1"><Icon name="barcode_scanner" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" /><input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && scan(q)) e.preventDefault(); }} className="input !h-9 pl-10" placeholder="Buscar o escanear código de barras" /></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-4 gap-2 max-h-[65vh] overflow-y-auto">
          {list.map(x => { const isP = 'stock' in x; const out = isP && (x as Prod).stock <= 0;
            return <button key={x.id} disabled={out} onClick={() => add(isP ? 'PRODUCTO' : 'SERVICIO', x.id)} className="text-left p-3 rounded-xl border border-parchment hover:border-gold/50 hover:shadow-raised bg-surface-container-lowest transition disabled:opacity-40">
              <p className="font-label-lg text-label-lg line-clamp-2 min-h-[40px]">{x.name}</p>
              <p className="font-title-md text-title-md tnum mt-1">{cop(x.price)}</p>
              <p className="font-body-sm text-[11px] text-on-surface-variant">{isP ? `${(x as Prod).sku} · stock ${(x as Prod).stock}` : x.category}</p>
            </button>; })}
        </div>
      </section>

      <section className="card p-4 xl:sticky xl:top-4">
        <div className="mb-3">
          {cust ? <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-low"><span className="flex items-center gap-2"><Icon name="person" className="text-secondary" />{cust.name}{cust.docNumber && <span className="text-on-surface-variant font-body-sm">· {cust.docNumber}</span>}</span><button className="text-secondary font-label-md" onClick={() => setCustomerId('')}>Cambiar</button></div> : (
            <div className="relative"><input value={custQ} onChange={e => setCustQ(e.target.value)} className="input !h-10" placeholder="Cliente (opcional): nombre, celular o documento" />
              {custList.length > 0 && <ul className="absolute z-10 inset-x-0 card mt-1">{custList.map(c => <li key={c.id}><button className="w-full text-left p-2 hover:bg-surface-container-low" onClick={() => { setCustomerId(c.id); setCustQ(''); }}>{c.name} <span className="text-on-surface-variant">{c.phone}</span></button></li>)}</ul>}</div>
          )}
        </div>
        {lines.length === 0 ? <p className="text-center text-on-surface-variant py-10">Agrega servicios o productos</p> : (
          <ul className="divide-y divide-parchment max-h-[34vh] overflow-y-auto">{calc.map(l => (
            <li key={l.key} className="py-2.5">
              <div className="flex justify-between gap-2"><span className="font-label-lg text-label-lg">{l.name}</span><span className="tnum font-bold">{cop(l.total)}</span></div>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex items-center rounded-lg border border-parchment"><button className="w-7 h-7" onClick={() => l.quantity > 1 ? upd(l.key, { quantity: l.quantity - 1 }) : setLines(lines.filter(x => x.key !== l.key))}>−</button><span className="w-6 text-center tnum">{l.quantity}</span><button className="w-7 h-7" onClick={() => (!l.max || l.quantity < l.max) && upd(l.key, { quantity: l.quantity + 1 })}>+</button></div>
                {l.kind === 'SERVICIO' && <select value={l.staffId || ''} onChange={e => upd(l.key, { staffId: e.target.value })} className="input !h-7 !px-2 !text-[12px] flex-1">{staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>}
                <input type="number" min={0} step={1000} value={l.discount || ''} onChange={e => upd(l.key, { discount: Number(e.target.value) })} placeholder="Desc." className="input !h-7 !px-2 !text-[12px] w-20" />
                <button onClick={() => setLines(lines.filter(x => x.key !== l.key))} aria-label="Quitar" className="text-danger"><Icon name="delete" className="text-[18px]" /></button>
              </div>
            </li>
          ))}</ul>
        )}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <input value={coupon} onChange={e => setCoupon(e.target.value.toUpperCase())} className="input !h-9" placeholder="Cupón" />
          <div className="flex gap-1">{[0, 10].map(p => <button key={p} onClick={() => setTip(Math.round(sum.total * p / 100 / 100) * 100)} className={`chip !h-9 flex-1 min-w-0 !px-2 whitespace-nowrap ${tip === Math.round(sum.total * p / 100 / 100) * 100 ? 'chip-on' : ''}`}>{p ? '+10%' : 'Sin propina'}</button>)}</div>
        </div>
        <dl className="mt-3 space-y-1 tnum font-body-md">
          <div className="flex justify-between text-on-surface-variant"><dt>Subtotal (base)</dt><dd>{cop(sum.subtotal)}</dd></div>
          {sum.byRate.map(t => <div key={t.rate} className="flex justify-between text-on-surface-variant"><dt>IVA {t.rate}% sobre {cop(t.base)}</dt><dd>{cop(t.tax)}</dd></div>)}
          {tip > 0 && <div className="flex justify-between text-on-surface-variant"><dt>Propina voluntaria</dt><dd>{cop(tip)}</dd></div>}
          {deposit > 0 && <div className="flex justify-between text-success"><dt>Incluye depósito pagado online</dt><dd>{cop(deposit)}</dd></div>}
          <div className="flex justify-between font-title-lg text-title-lg pt-1 border-t border-parchment"><dt>Total</dt><dd>{cop(total)}</dd></div>
        </dl>

        <div className={`mt-3 p-3 rounded-xl ${needsFE ? 'bg-[#EFF6FF] dark:bg-[#1e3a8a]/40' : 'bg-surface-container-low'}`}>
          <p className="font-label-md text-label-md flex items-center gap-1.5"><Icon name="receipt_long" className="text-[18px] text-secondary" />{needsFE ? 'Se emitirá Factura Electrónica de Venta' : 'Se emitirá Documento Equivalente Electrónico POS'}</p>
          {sum.total > posLimit && <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">La venta supera 5 UVT ({cop(posLimit)}): la norma exige factura electrónica.</p>}
          <label className="flex items-center gap-2 mt-2 font-body-sm"><input type="checkbox" checked={wantsInvoice} onChange={e => setWantsInvoice(e.target.checked)} className="accent-primary-container" />El cliente solicita factura electrónica</label>
          {needsFE && !cust?.docNumber && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              <select value={buyer.docType} onChange={e => setBuyer({ ...buyer, docType: e.target.value })} className="input !h-9"><option value="13">CC</option><option value="31">NIT</option><option value="22">CE</option><option value="41">Pasaporte</option></select>
              <input value={buyer.docNumber} onChange={e => setBuyer({ ...buyer, docNumber: e.target.value })} className="input !h-9" placeholder="Número (vacío = consumidor final)" />
              <input value={buyer.name} onChange={e => setBuyer({ ...buyer, name: e.target.value })} className="input !h-9" placeholder="Nombre / razón social" />
              <input value={buyer.email} onChange={e => setBuyer({ ...buyer, email: e.target.value })} className="input !h-9" placeholder="Correo para la factura" />
            </div>
          )}
        </div>

        <div className="mt-3 space-y-2">
          {pays.map((p, i) => (
            <div key={i} className="grid grid-cols-[1fr_110px_auto] gap-2 items-center">
              <select value={p.method} onChange={e => setPays(pays.map((x, j) => j === i ? { ...x, method: e.target.value } : x))} className="input !h-10">{METHODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
              <input type="number" min={0} value={p.amount || ''} onFocus={() => fillPays(i)} onChange={e => setPays(pays.map((x, j) => j === i ? { ...x, amount: Number(e.target.value) } : x))} className="input !h-10" placeholder={cop(total)} />
              {pays.length > 1 ? <button onClick={() => setPays(pays.filter((_, j) => j !== i))} className="text-danger" aria-label="Quitar pago"><Icon name="close" /></button> : <span />}
              {p.method === 'EFECTIVO' && <div className="col-span-3 grid grid-cols-2 gap-2"><input type="number" min={0} value={p.received || ''} onChange={e => setPays(pays.map((x, j) => j === i ? { ...x, received: Number(e.target.value) } : x))} className="input !h-9" placeholder="Efectivo recibido" /><p className="self-center font-label-lg tnum">Cambio: {cop(Math.max(0, (p.received || 0) - (p.amount || total)))}</p></div>}
            </div>
          ))}
          <button className="font-label-md text-secondary" onClick={() => setPays([...pays, { method: 'TARJETA', amount: Math.max(0, total - paid) }])}>+ Dividir pago</button>
        </div>
        {err && <p className="mt-2 p-2 rounded-lg bg-[#FFF1F2] text-danger font-label-md">{err}</p>}
        <button disabled={!lines.length || pending} onClick={pay} className="btn-primary w-full mt-3"><Icon name="lock" className="text-[18px] text-secondary-fixed" />{pending ? 'Procesando…' : `Cobrar ${cop(total)}`}</button>
      </section>
    </div>
  );
}
