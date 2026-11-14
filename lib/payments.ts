import { createHash } from 'crypto';

// Pasarela de pagos configurable: Wompi (Bancolombia: tarjeta, PSE, Nequi), Mercado Pago o modo simulado.
export type CheckoutInput = { reference: string; amount: number; description: string; email?: string | null; method?: string; redirectUrl: string; notificationUrl: string };

export function provider() { return (process.env.PAYMENT_PROVIDER || 'SIMULADO').toUpperCase(); }

export function wompiIntegrity(reference: string, amountInCents: number, currency = 'COP') {
  return createHash('sha256').update(`${reference}${amountInCents}${currency}${process.env.WOMPI_INTEGRITY_SECRET || ''}`).digest('hex');
}

/** Verifica la firma de los eventos (webhook) de Wompi */
export function verifyWompiEvent(body: any) {
  try {
    const props: string[] = body.signature.properties;
    const values = props.map(p => p.split('.').reduce((o: any, k) => o?.[k], body.data)).join('');
    const sum = createHash('sha256').update(values + body.timestamp + (process.env.WOMPI_EVENTS_SECRET || '')).digest('hex');
    return sum === body.signature.checksum;
  } catch { return false; }
}

export async function createCheckout(i: CheckoutInput): Promise<{ url: string; provider: string }> {
  const p = provider();
  if (p === 'WOMPI') {
    const cents = i.amount * 100;
    const q = new URLSearchParams({ 'public-key': process.env.WOMPI_PUBLIC_KEY || '', currency: 'COP', 'amount-in-cents': String(cents), reference: i.reference, 'signature:integrity': wompiIntegrity(i.reference, cents), 'redirect-url': i.redirectUrl });
    if (i.email) q.set('customer-data:email', i.email);
    return { url: `https://checkout.wompi.co/p/?${q.toString()}`, provider: 'WOMPI' };
  }
  if (p === 'MERCADOPAGO') {
    const r = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST', headers: { Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
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
  const base = process.env.WOMPI_ENV === 'production' ? 'https://production.wompi.co/v1' : 'https://sandbox.wompi.co/v1';
  const r = await fetch(`${base}/transactions/${id}`);
  const d = await r.json();
  return { status: d.data?.status as string, reference: d.data?.reference as string, method: d.data?.payment_method_type as string };
}
