// Reseñas que se piden solas: unas horas después de cada cita completada se le escribe al cliente por WhatsApp
// con un enlace para calificar. Después de calificar, a todos se les ofrece publicarla en Google
// (Google no permite pedir reseñas solo a los clientes satisfechos).
import { createHmac } from 'crypto';
import { db } from './db';
import { sendWhatsapp, waReady } from './notify';

const appUrl = () => (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
export const reviewToken = (code: string) => createHmac('sha256', (process.env.AUTH_SECRET || 'dev-secret-change-me') + ':resena').update(code).digest('base64url').slice(0, 16);
export const reviewLink = (code: string) => `${appUrl()}/opinion/${code}?t=${reviewToken(code)}`;
export const WINDOW_H = 48; // solo citas que terminaron hace menos de 2 días

export function reviewText(a: { code: string; customer: { name: string } }, b: { name: string }) {
  return `Hola ${a.customer.name.split(' ')[0]}, gracias por visitarnos en ${b.name} 💛 ¿Nos regalas tu opinión? Toma menos de un minuto: ${reviewLink(a.code)}`;
}

/** Citas completadas a las que ya toca pedirles la reseña. */
export async function pendingReviewRequests(businessId: string, delayHours: number) {
  const now = Date.now();
  return db.appointment.findMany({
    where: { businessId, status: 'COMPLETADA', reviewRequestedAt: null, review: null, end: { lte: new Date(now - delayHours * 3600e3), gt: new Date(now - WINDOW_H * 3600e3) }, customer: { phone: { not: null } } },
    include: { customer: true }, orderBy: { end: 'asc' }, take: 50
  });
}

/** Envía los pedidos de reseña por WhatsApp (solo con la API de Meta activa; si no, quedan en /admin/resenas para enviarlos a mano). */
export async function sendReviewRequests(businessId: string) {
  if (!(await waReady())) return 0;
  const b = await db.business.findFirst({ where: { id: businessId }, select: { id: true, name: true, reviewEnabled: true, reviewDelayHours: true, waPhoneId: true } });
  if (!b?.reviewEnabled) return 0;
  const list = await pendingReviewRequests(b.id, b.reviewDelayHours);
  for (const a of list) {
    // Se marca antes de enviar para que dos procesos a la vez no le escriban dos veces.
    const n = await db.appointment.updateMany({ where: { id: a.id, reviewRequestedAt: null }, data: { reviewRequestedAt: new Date() } });
    if (!n.count) continue;
    await sendWhatsapp(a.customer.phone!, reviewText(a, b), { phoneId: b.waPhoneId, businessId: b.id, template: { kind: 'RESENA', params: [a.customer.name.split(' ')[0], b.name, reviewLink(a.code)] } });
  }
  return list.length;
}

/** Guarda la calificación y actualiza el promedio del negocio. */
export async function saveReview(a: { id: string; businessId: string; staffId: string; services: { service: { name: string } }[] }, o: { rating: number; comment: string; authorName: string; userId?: string | null; nps?: number | null }) {
  const r = Math.min(5, Math.max(1, Math.round(o.rating)));
  const nps = typeof o.nps === 'number' && o.nps >= 0 && o.nps <= 10 ? Math.round(o.nps) : null;
  const rev = await db.review.create({ data: { businessId: a.businessId, appointmentId: a.id, userId: o.userId || null, staffId: a.staffId, authorName: o.authorName, rating: r, nps, comment: o.comment.slice(0, 1000), serviceName: a.services[0]?.service.name } });
  // Cliente insatisfecho: se avisa al dueño enseguida para que lo llame antes de que lo cuente por ahí.
  if (r <= 2 || (nps !== null && nps <= 6)) {
    const { pushToBusiness } = await import('./push');
    await pushToBusiness(a.businessId, { title: '⚠️ Un cliente quedó inconforme', body: `${o.authorName}: ${r} ★${nps !== null ? ` · recomendaría ${nps}/10` : ''}${o.comment ? ` · «${o.comment.slice(0, 80)}»` : ''}`, url: '/admin/resenas', tag: `resena-${a.id}` }).catch(() => null);
  }
  const biz = await db.business.findFirstOrThrow({ where: { id: a.businessId }, select: { rating: true, reviewCount: true } });
  // Mantiene el histórico (reviewCount puede incluir reseñas importadas)
  await db.business.update({ where: { id: a.businessId }, data: { reviewCount: biz.reviewCount + 1, rating: Math.round(((biz.rating * biz.reviewCount + r) / (biz.reviewCount + 1)) * 10) / 10 } });
  return rev;
}

/** NPS: % de promotores (9-10) menos % de detractores (0-6). */
export function npsOf(list: (number | null)[]) {
  const v = list.filter((n): n is number => typeof n === 'number');
  if (!v.length) return { score: null as number | null, n: 0, pro: 0, pas: 0, det: 0 };
  const pro = v.filter(n => n >= 9).length, det = v.filter(n => n <= 6).length;
  return { score: Math.round(((pro - det) / v.length) * 100), n: v.length, pro, pas: v.length - pro - det, det };
}
