'use server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
import { fromBogota, ymd } from '@/lib/format';

export async function saveExpense(_: unknown, fd: FormData) {
  const { business, user } = await requireBusiness('gastos');
  const amount = Math.round(Number(String(fd.get('amount') || '').replace(/[^\d]/g, '')));
  const description = String(fd.get('description') || '').trim();
  if (!amount || amount <= 0) return { error: 'Escribe el valor del gasto.' };
  if (!description) return { error: 'Escribe una descripción.' };
  await db.expense.create({ data: {
    businessId: business.id, date: fromBogota(String(fd.get('date') || ymd(new Date())), '12:00'), category: String(fd.get('category') || 'OTROS'),
    description, amount, method: String(fd.get('method') || 'EFECTIVO'), supplier: String(fd.get('supplier') || '').trim() || null,
    receipt: String(fd.get('receipt') || '').trim() || null, userName: user.name
  } });
  revalidatePath('/panel/gastos'); revalidatePath('/panel/reportes');
  return { ok: true };
}

export async function deleteExpense(fd: FormData) {
  const { business } = await requireBusiness('gastos');
  await db.expense.deleteMany({ where: { id: String(fd.get('id')), businessId: business.id } });
  revalidatePath('/panel/gastos'); revalidatePath('/panel/reportes');
  return { ok: true };
}
