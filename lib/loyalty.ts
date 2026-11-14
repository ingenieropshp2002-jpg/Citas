import type { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;
/** Suma puntos por una venta pagada: pointsPerThousand puntos por cada $1.000 (sin propina). */
export async function earnPoints(tx: Tx, b: { id: string; loyaltyEnabled: boolean; pointsPerThousand: number }, customerId: string, amount: number, saleId: string, saleNumber: number) {
  if (!b.loyaltyEnabled || b.pointsPerThousand <= 0) return 0;
  const pts = Math.floor(amount / 1000) * b.pointsPerThousand;
  if (pts <= 0) return 0;
  await tx.pointMovement.create({ data: { businessId: b.id, customerId, points: pts, reason: `Compra #${saleNumber}`, saleId } });
  await tx.customer.update({ where: { id: customerId }, data: { points: { increment: pts } } });
  return pts;
}

/** Revierte los puntos de una venta anulada */
export async function revertPoints(tx: Tx, businessId: string, saleId: string) {
  const moves = await tx.pointMovement.findMany({ where: { businessId, saleId, points: { gt: 0 } } });
  for (const m of moves) {
    await tx.pointMovement.create({ data: { businessId, customerId: m.customerId, points: -m.points, reason: 'Anulación de venta', saleId } });
    await tx.customer.update({ where: { id: m.customerId }, data: { points: { decrement: m.points } } });
  }
}
