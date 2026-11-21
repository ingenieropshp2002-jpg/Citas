import { NextRequest, NextResponse } from 'next/server';
import { settlePayment } from '@/app/(cliente)/reservar/actions';
import { getPay, verifyWompiEvent } from '@/lib/payments';
// Webhook único: Wompi (evento transaction.updated) y Mercado Pago (payment, subscription_preapproval y subscription_authorized_payment).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (body.event === 'transaction.updated') {
    if (!(await verifyWompiEvent(body))) return NextResponse.json({ error: 'firma inválida' }, { status: 401 });
    const t = body.data.transaction;
    if (t.status !== 'PENDING' && typeof t.reference === 'string' && t.reference.includes('_')) await settlePayment(t.reference, t.status === 'APPROVED', t.id);
    return NextResponse.json({ ok: true });
  }
  const sp = req.nextUrl.searchParams;
  const type = String(body.type || body.topic || sp.get('type') || sp.get('topic') || '');
  const id = String(body?.data?.id || sp.get('data.id') || sp.get('id') || '');
  const token = (await getPay()).mp.accessToken;
  if (!id || !token) return NextResponse.json({ ok: true });
  // No se confía en el contenido del aviso: siempre se consulta el estado real en Mercado Pago.
  if (type === 'subscription_preapproval') await (await import('@/lib/billing')).mpPreapprovalChanged(id);
  else if (type === 'subscription_authorized_payment') await (await import('@/lib/billing')).mpRecurringPayment(id);
  else if (type === 'payment') {
    const p = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => ({}));
    const ref = String(p.external_reference || '');
    // Las cuotas de suscripción (SUBR-) llegan por subscription_authorized_payment.
    if (ref.includes('_') && !ref.startsWith('SUBR-') && !['pending', 'in_process'].includes(p.status)) await settlePayment(ref, p.status === 'approved', String(p.id));
  }
  return NextResponse.json({ ok: true });
}
