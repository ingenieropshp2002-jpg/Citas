'use server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';

export async function setCustomerDeposit(id: string, value: boolean) {
  const { business } = await requireBusiness('clientes');
  await db.customer.updateMany({ where: { id, businessId: business.id }, data: { requireDeposit: value } });
  revalidatePath('/panel/clientes/incumplidos'); revalidatePath(`/panel/clientes/${id}`);
}
