// Varias sedes: cada sede es un negocio propio (agenda, equipo, caja, inventario) que comparte dueño y suscripción.
import { db } from './db';

/** Copia el plan y la suscripción de la sede principal a las demás sedes. */
export async function syncSedes(businessId: string) {
  const b = await db.business.findFirst({ where: { id: businessId }, select: { id: true, parentId: true } });
  if (!b) return;
  const p = await db.business.findFirst({ where: { id: b.parentId || b.id }, select: { id: true, plan: true, subscriptionStatus: true, trialEndsAt: true, paidUntil: true } });
  if (!p) return;
  await db.business.updateMany({ where: { parentId: p.id }, data: { plan: p.plan, subscriptionStatus: p.subscriptionStatus, trialEndsAt: p.trialEndsAt, paidUntil: p.paidUntil } });
}

/** La suscripción se paga en la sede principal. */
export async function principalId(businessId: string) {
  const b = await db.business.findFirst({ where: { id: businessId }, select: { id: true, parentId: true } });
  return b?.parentId || businessId;
}
