'use server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';

export async function saveReviewSettings(_: unknown, fd: FormData) {
  const { business } = await requireBusiness('marketing');
  const url = String(fd.get('googleReviewUrl') || '').trim();
  if (url && !/^https:\/\/[^\s]+$/.test(url)) return { error: 'El enlace de Google debe empezar por https://' };
  const delay = Math.min(48, Math.max(0, Math.round(Number(fd.get('reviewDelayHours')) || 0)));
  await db.business.update({ where: { id: business.id }, data: { reviewEnabled: fd.get('reviewEnabled') !== null, googleReviewUrl: url || null, reviewDelayHours: delay } });
  revalidatePath('/admin/resenas');
  return { ok: true };
}

/** Modo manual (sin la API de WhatsApp): marca que ya se le escribió desde el celular del negocio. */
export async function markReviewRequested(id: string) {
  const { business } = await requireBusiness('marketing');
  await db.appointment.updateMany({ where: { id, businessId: business.id }, data: { reviewRequestedAt: new Date() } });
  revalidatePath('/admin/resenas');
}
