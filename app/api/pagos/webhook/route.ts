import { NextRequest, NextResponse } from 'next/server';
import { settlePayment } from '@/app/(cliente)/reservar/actions';
import { verifyWompiEvent } from '@/lib/payments';
// Webhook único: Wompi (evento transaction.updated) y Mercado Pago (topic payment).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (body.event === 'transaction.updated') {
    if (!verifyWompiEvent(body)) return NextResponse.json({ error: 'firma inválida' }, { status: 401 });
    const t = body.data.transaction;
    if (t.status !== 'PENDING') await settlePayment(t.reference, t.status === 'APPROVED', t.id);
    return NextResponse.json({ ok: true });
  }
  const mpId = body?.data?.id || req.nextUrl.searchParams.get('data.id');
  if ((body.type === 'payment' || req.nextUrl.searchParams.get('type') === 'payment') && mpId && process.env.MERCADOPAGO_ACCESS_TOKEN) {
    const p = await fetch(`https://api.mercadopago.com/v1/payments/${mpId}`, { headers: { Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}` } }).then(r => r.json());
    if (p.external_reference && !['pending', 'in_process'].includes(p.status)) await settlePayment(p.external_reference, p.status === 'approved', String(p.id));
  }
  return NextResponse.json({ ok: true });
}
