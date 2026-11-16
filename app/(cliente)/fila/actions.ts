'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { createWalkIn, notifyUpcoming, queueStatus } from '@/lib/fila';

export async function joinQueue(_: unknown, fd: FormData) {
  const b = await db.business.findUnique({ where: { slug: String(fd.get('slug') || '') } });
  if (!b || !b.active) return { error: 'Negocio no encontrado.' };
  const st = queueStatus(b);
  if (!st.open) return { error: st.reason };
  const name = String(fd.get('name') || '').trim().slice(0, 60);
  const phone = String(fd.get('phone') || '').replace(/\D/g, '');
  if (!name) return { error: 'Escribe tu nombre.' };
  if (phone.length < 10) return { error: 'Escribe tu celular de 10 dígitos para avisarte por WhatsApp.' };
  const dup = await db.walkIn.findFirst({ where: { businessId: b.id, phone, status: { in: ['ESPERANDO', 'LLAMADO'] }, createdAt: { gte: new Date(Date.now() - 12 * 3600e3) } } });
  if (dup) redirect(`/fila/${dup.id}`);
  const serviceId = String(fd.get('serviceId') || '') || null;
  const w = await createWalkIn(b, { name, phone, serviceId: serviceId && (await db.service.findFirst({ where: { id: serviceId, businessId: b.id } })) ? serviceId : null });
  await notifyUpcoming(b);
  revalidatePath('/panel/fila');
  redirect(`/fila/${w.id}`);
}

export async function leaveQueue(id: string) {
  const w = await db.walkIn.findUnique({ where: { id } });
  if (w && ['ESPERANDO', 'LLAMADO'].includes(w.status)) await db.walkIn.update({ where: { id }, data: { status: 'CANCELADO' } });
  revalidatePath(`/fila/${id}`); revalidatePath('/panel/fila');
}
