'use server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
import { pushToUsers } from '@/lib/push';

/** El negocio avisa a mano a alguien de la lista (por ejemplo, cuando abre un hueco que no vino de una cancelación). */
export async function pingWaiting(id: string) {
  const { business } = await requireBusiness('agenda');
  const w = await db.waitEntry.findFirst({ where: { id, businessId: business.id } });
  if (!w) return { error: 'No encontrada.' };
  await pushToUsers([w.userId], { title: `🔔 ${business.name} tiene un cupo para ti`, body: 'Estabas en la lista de espera. Entra y elige tu horario antes de que se ocupe.', url: `/reservar/${business.slug}?fecha=${w.dateFrom}${w.staffId ? `&profesional=${w.staffId}` : ''}`, tag: `espera-${w.id}` });
  await db.waitEntry.update({ where: { id }, data: { notifiedAt: new Date(), notifyCount: { increment: 1 } } });
  revalidatePath('/admin/espera');
  return { ok: true };
}

export async function closeWaiting(id: string, status: 'ATENDIDA' | 'CANCELADA') {
  const { business } = await requireBusiness('agenda');
  await db.waitEntry.updateMany({ where: { id, businessId: business.id }, data: { status } });
  revalidatePath('/admin/espera');
}
