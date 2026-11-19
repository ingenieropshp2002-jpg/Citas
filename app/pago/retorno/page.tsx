import { redirect } from 'next/navigation';
import { settlePayment } from '@/app/(cliente)/reservar/actions';
import { wompiTransaction } from '@/lib/payments';
// Retorno desde la pasarela. Se verifica el estado consultando a la pasarela (no se confía en los parámetros).
export default async function Retorno({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const ref = sp.ref || sp.external_reference || '';
  if (sp.id) { // Wompi agrega ?id=<transacción>
    const t = await wompiTransaction(sp.id);
    if (t.reference === ref && t.status !== 'PENDING') await settlePayment(ref, t.status === 'APPROVED', sp.id);
  } else if (sp.payment_id && process.env.MERCADOPAGO_ACCESS_TOKEN) {
    const p = await fetch(`https://api.mercadopago.com/v1/payments/${sp.payment_id}`, { headers: { Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}` } }).then(r => r.json());
    if (p.external_reference === ref && p.status !== 'pending' && p.status !== 'in_process') await settlePayment(ref, p.status === 'approved', String(p.id));
  }
  if (ref.startsWith('SUB-')) redirect('/admin/suscripcion?pago=retorno');
  redirect(`/cita/${ref.split('_')[0]}`);
}
