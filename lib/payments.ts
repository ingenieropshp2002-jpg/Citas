import { createHash } from 'crypto';
import { db } from './db';

// Pasarela de pagos configurable: Wompi (Bancolombia: tarjeta, PSE, Nequi), Mercado Pago o modo simulado.
// Las llaves se guardan en /superadmin/pagos (PlatformSetting 'pagos'); si falta alguna, se usan las variables de entorno.
export type CheckoutInput = { reference: string; amount: number; description: string; email?: string | null; method?: string; redirectUrl: string; notificationUrl: string };
export type PayConfig = {
  provider: 'SIMULADO' | 'WOMPI' | 'MERCADOPAGO';
  wompi: { publicKey: string; privateKey: string; integritySecret: string; eventsSecret: string; env: 'sandbox' | 'production' };
  mp: { accessToken: string; publicKey: string };
};

let memo: { at: number; v: PayConfig } | null = null;
export async function getPay(): Promise<PayConfig> {
  if (memo && Date.now() - memo.at < 60_000) return memo.v;
  let s: Partial<{ provider: string; wompi: Partial<PayConfig['wompi']>; mp: Partial<PayConfig['mp']> }> = {};
  try { const r = await db.platformSetting.findUnique({ where: { key: 'pagos' } }); if (r) s = JSON.parse(r.value); } catch { /* sin valor */ }
  const e = process.env;
  const p = String(s.provider || e.PAYMENT_PROVIDER || 'SIMULADO').toUpperCase();
  const v: PayConfig = {
    provider: (['WOMPI', 'MERCADOPAGO'].includes(p) ? p : 'SIMULADO') as PayConfig['provider'],
    wompi: { publicKey: s.wompi?.publicKey || e.WOMPI_PUBLIC_KEY || '', privateKey: s.wompi?.privateKey || e.WOMPI_PRIVATE_KEY || '', integritySecret: s.wompi?.integritySecret || e.WOMPI_INTEGRITY_SECRET || '', eventsSecret: s.wompi?.eventsSecret || e.WOMPI_EVENTS_SECRET || '', env: (s.wompi?.env || e.WOMPI_ENV) === 'production' ? 'production' : 'sandbox' },
    mp: { accessToken: s.mp?.accessToken || e.MERCADOPAGO_ACCESS_TOKEN || '', publicKey: s.mp?.publicKey || e.MERCADOPAGO_PUBLIC_KEY || '' }
  };
  memo = { at: Date.now(), v };
  return v;
}
export function resetPayMemo() { memo = null; }
export async function provider() { return (await getPay()).provider; }
export const wompiBase = (c: PayConfig) => (c.wompi.env === 'production' ? 'https://production.wompi.co/v1' : 'https://sandbox.wompi.co/v1');

export async function wompiIntegrity(reference: string, amountInCents: number, currency = 'COP') {
  return createHash('sha256').update(`${reference}${amountInCents}${currency}${(await getPay()).wompi.integritySecret}`).digest('hex');
}

/** Verifica la firma de los eventos (webhook) de Wompi */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function verifyWompiEvent(body: any) {
  try {
    const props: string[] = body.signature.properties;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const values = props.map(p => p.split('.').reduce((o: any, k) => o?.[k], body.data)).join('');
    const sum = createHash('sha256').update(values + body.timestamp + (await getPay()).wompi.eventsSecret).digest('hex');
    return sum === body.signature.checksum;
  } catch { return false; }
}

export async function createCheckout(i: CheckoutInput): Promise<{ url: string; provider: string }> {
  const c = await getPay();
  if (c.provider === 'WOMPI') {
    const cents = i.amount * 100;
    const q = new URLSearchParams({ 'public-key': c.wompi.publicKey, currency: 'COP', 'amount-in-cents': String(cents), reference: i.reference, 'signature:integrity': await wompiIntegrity(i.reference, cents), 'redirect-url': i.redirectUrl });
    if (i.email) q.set('customer-data:email', i.email);
    return { url: `https://checkout.wompi.co/p/?${q.toString()}`, provider: 'WOMPI' };
  }
  if (c.provider === 'MERCADOPAGO') {
    const r = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST', headers: { Authorization: `Bearer ${c.mp.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ title: i.description, quantity: 1, currency_id: 'COP', unit_price: i.amount }], external_reference: i.reference, back_urls: { success: i.redirectUrl, failure: i.redirectUrl, pending: i.redirectUrl }, auto_return: 'approved', notification_url: i.notificationUrl, payer: i.email ? { email: i.email } : undefined })
    });
    const data = await r.json();
    if (!r.ok) throw new Error('Mercado Pago: ' + (data.message || r.status));
    return { url: data.init_point, provider: 'MERCADOPAGO' };
  }
  return { url: `/pago/simulado?ref=${encodeURIComponent(i.reference)}&monto=${i.amount}&metodo=${i.method || ''}&volver=${encodeURIComponent(i.redirectUrl)}`, provider: 'SIMULADO' };
}

/** Consulta el estado de una transacción de Wompi por id (al volver del checkout) */
export async function wompiTransaction(id: string) {
  const r = await fetch(`${wompiBase(await getPay())}/transactions/${encodeURIComponent(id)}`);
  const d = await r.json();
  return { status: d.data?.status as string, reference: d.data?.reference as string, method: d.data?.payment_method_type as string };
}

// ───── Cobro recurrente ─────

/** Términos de Wompi que el cliente debe aceptar antes de guardar la tarjeta. */
export async function wompiAcceptance() {
  const c = await getPay();
  const d = await fetch(`${wompiBase(c)}/merchants/${c.wompi.publicKey}`).then(r => r.json()) as { data?: { presigned_acceptance?: { acceptance_token: string; permalink: string }; presigned_personal_data_auth?: { acceptance_token: string; permalink: string } } };
  return { acceptance: d.data?.presigned_acceptance || null, personal: d.data?.presigned_personal_data_auth || null };
}

/** Guarda la tarjeta (ya tokenizada en el navegador) como fuente de pago para cobrarla sin que el dueño esté presente. */
export async function wompiCreateSource(i: { token: string; email: string; acceptance: string; personal?: string | null }) {
  const c = await getPay();
  const r = await fetch(`${wompiBase(c)}/payment_sources`, {
    method: 'POST', headers: { Authorization: `Bearer ${c.wompi.privateKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'CARD', token: i.token, customer_email: i.email, acceptance_token: i.acceptance, ...(i.personal ? { accept_personal_auth: i.personal } : {}) })
  });
  const d = await r.json() as { data?: { id: number | string; status: string }; error?: { messages?: unknown; reason?: string } };
  if (!r.ok || !d.data?.id) throw new Error(`Wompi no aceptó la tarjeta${d.error?.reason ? `: ${d.error.reason}` : ''}.`);
  return String(d.data.id);
}

/** Cobra a una fuente de pago guardada. El resultado final llega por el webhook (transaction.updated). */
export async function wompiCharge(i: { sourceId: string; amount: number; reference: string; email: string }) {
  const c = await getPay();
  const cents = i.amount * 100;
  const r = await fetch(`${wompiBase(c)}/transactions`, {
    method: 'POST', headers: { Authorization: `Bearer ${c.wompi.privateKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount_in_cents: cents, currency: 'COP', signature: await wompiIntegrity(i.reference, cents), customer_email: i.email, payment_method: { installments: 1 }, reference: i.reference, payment_source_id: Number(i.sourceId) || i.sourceId })
  });
  const d = await r.json() as { data?: { id: string; status: string; status_message?: string }; error?: { reason?: string } };
  if (!r.ok || !d.data) return { id: null, status: 'ERROR', message: d.error?.reason || `Wompi ${r.status}` };
  return { id: d.data.id, status: d.data.status, message: d.data.status_message || null };
}

/** Mercado Pago: suscripción (preapproval). Mercado Pago cobra solo cada mes o cada año. */
export async function mpCreatePreapproval(i: { reason: string; reference: string; email: string; amount: number; months: number; startAt: Date; backUrl: string }) {
  const c = await getPay();
  const r = await fetch('https://api.mercadopago.com/preapproval', {
    method: 'POST', headers: { Authorization: `Bearer ${c.mp.accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: i.reason, external_reference: i.reference, payer_email: i.email, back_url: i.backUrl, status: 'pending', auto_recurring: { frequency: i.months, frequency_type: 'months', transaction_amount: i.amount, currency_id: 'COP', ...(i.startAt > new Date(Date.now() + 3600e3) ? { start_date: i.startAt.toISOString() } : {}) } })
  });
  const d = await r.json() as { id?: string; init_point?: string; message?: string };
  if (!r.ok || !d.id || !d.init_point) throw new Error('Mercado Pago: ' + (d.message || r.status));
  return { id: d.id, url: d.init_point };
}
async function mpGet<T>(path: string) {
  const c = await getPay();
  const r = await fetch(`https://api.mercadopago.com${path}`, { headers: { Authorization: `Bearer ${c.mp.accessToken}` } });
  return r.ok ? (await r.json()) as T : null;
}
export const mpPreapproval = (id: string) => mpGet<{ id: string; status: string; external_reference: string; payer_email?: string; auto_recurring?: { transaction_amount: number } }>(`/preapproval/${encodeURIComponent(id)}`);
export const mpAuthorizedPayment = (id: string) => mpGet<{ id: number; preapproval_id: string; status: string; transaction_amount: number; payment?: { id: number; status: string } }>(`/authorized_payments/${encodeURIComponent(id)}`);
export async function mpCancelPreapproval(id: string) {
  const c = await getPay();
  await fetch(`https://api.mercadopago.com/preapproval/${encodeURIComponent(id)}`, { method: 'PUT', headers: { Authorization: `Bearer ${c.mp.accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'cancelled' }) }).catch(() => null);
}
