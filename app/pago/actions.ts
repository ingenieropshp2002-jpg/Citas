'use server';
import { redirect } from 'next/navigation';
import { settlePayment } from '@/app/(cliente)/reservar/actions';
import { provider } from '@/lib/payments';
export async function simulate(ref: string, approved: boolean) {
  if ((await provider()) !== 'SIMULADO') throw new Error('El modo simulado está desactivado.');
  const pay = await settlePayment(ref, approved, 'SIM-' + Date.now());
  if (ref.startsWith('SUB-')) redirect(`/admin/suscripcion?pago=${approved ? 'ok' : 'rechazado'}`);
  redirect(`/cita/${ref.split('_')[0]}${approved ? '' : '?pago=rechazado'}`);
  return pay;
}
