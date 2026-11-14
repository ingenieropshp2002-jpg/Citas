import { Prisma } from '@prisma/client';
import { db } from './db';

type Tx = Prisma.TransactionClient;

/** Registra un movimiento de kárdex y actualiza el stock (y costo promedio ponderado en entradas). */
export async function moveStock(tx: Tx, p: { businessId: string; productId: string; type: string; quantity: number; unitCost?: number; reference?: string; note?: string; userName?: string; supplierId?: string | null }) {
  const prod = await tx.product.findUniqueOrThrow({ where: { id: p.productId } });
  const newStock = Math.round((prod.stock + p.quantity) * 1000) / 1000;
  let cost = prod.cost;
  if (p.type === 'ENTRADA' && p.quantity > 0 && p.unitCost) {
    const prevValue = Math.max(prod.stock, 0) * prod.cost;
    cost = Math.round((prevValue + p.quantity * p.unitCost) / (Math.max(prod.stock, 0) + p.quantity));
  }
  await tx.product.update({ where: { id: prod.id }, data: { stock: newStock, cost } });
  return tx.stockMovement.create({ data: { businessId: p.businessId, productId: p.productId, type: p.type, quantity: p.quantity, unitCost: p.unitCost ?? prod.cost, balance: newStock, reference: p.reference, note: p.note, userName: p.userName, supplierId: p.supplierId || undefined } });
}

/** Descarga los insumos configurados para los servicios de una cita completada. */
export async function consumeSupplies(tx: Tx, businessId: string, serviceIds: string[], reference: string) {
  const supplies = await tx.serviceSupply.findMany({ where: { serviceId: { in: serviceIds } } });
  for (const s of supplies) await moveStock(tx, { businessId, productId: s.productId, type: 'CONSUMO', quantity: -s.quantity, reference, note: 'Consumo automático por servicio' });
}

export async function lowStock(businessId: string) {
  const all = await db.product.findMany({ where: { businessId, active: true } });
  return all.filter(p => p.stock <= p.minStock);
}
