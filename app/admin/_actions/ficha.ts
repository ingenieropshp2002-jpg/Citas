'use server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';

/** Borra una ficha técnica con sus fotos. */
export async function deleteRecord(fd: FormData) {
  const { business, perms } = await requireBusiness();
  if (perms !== 'ALL' && !perms.includes('clientes')) return { error: 'No tienes permiso para borrar fichas.' };
  const r = await db.clientRecord.findFirst({ where: { id: String(fd.get('id')), businessId: business.id } });
  if (!r) return { error: 'No encontrada.' };
  await db.clientRecord.delete({ where: { id: r.id } });
  revalidatePath(`/admin/clientes/${r.customerId}`);
  return { ok: true };
}
