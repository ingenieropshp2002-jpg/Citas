'use server';
import { timingSafeEqual } from 'crypto';
import { db } from '@/lib/db';
import { reviewToken, saveReview } from '@/lib/resenas';

const okToken = (code: string, t: string) => { const a = Buffer.from(reviewToken(code)); const b = Buffer.from(String(t || '')); return a.length === b.length && timingSafeEqual(a, b); };

/** Calificación desde el enlace que le llegó al cliente (sin iniciar sesión). */
export async function submitOpinion(code: string, t: string, rating: number, comment: string) {
  if (!okToken(code, t)) return { error: 'Enlace no válido.' };
  const a = await db.appointment.findFirst({ where: { code }, include: { customer: true, services: { include: { service: true } }, review: true } });
  if (!a || a.status !== 'COMPLETADA') return { error: 'Cita no encontrada.' };
  if (a.review) return { ok: true };
  if (!(rating >= 1 && rating <= 5)) return { error: 'Elige de 1 a 5 estrellas.' };
  await saveReview(a, { rating, comment: String(comment || '').trim(), authorName: a.customer.name, userId: a.customer.userId });
  return { ok: true };
}

/** Registra que abrió el enlace de Google (para medir cuántas se publican). */
export async function googleClicked(code: string, t: string) {
  if (!okToken(code, t)) return;
  const a = await db.appointment.findFirst({ where: { code }, select: { id: true } });
  if (a) await db.review.updateMany({ where: { appointmentId: a.id, googleClickedAt: null }, data: { googleClickedAt: new Date() } });
}
