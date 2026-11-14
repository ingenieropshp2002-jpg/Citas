'use server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
import { moveStock } from '@/lib/inventory';

const num = (v: unknown, d = 0) => { const n = Number(String(v ?? '').replace(/[^\d.-]/g, '')); return Number.isFinite(n) ? n : d; };

export async function saveProduct(_: unknown, fd: FormData) {
  const { business, user } = await requireBusiness('inventario');
  const id = String(fd.get('id') || '');
  const data = { sku: String(fd.get('sku')).trim().toUpperCase(), barcode: String(fd.get('barcode') || '') || null, name: String(fd.get('name')).trim(), brand: String(fd.get('brand') || '') || null, category: String(fd.get('category') || 'General'), kind: String(fd.get('kind') || 'VENTA'), unit: String(fd.get('unit') || 'UND'), price: Math.round(num(fd.get('price'))), taxRate: Math.round(num(fd.get('taxRate'), 19)), minStock: num(fd.get('minStock')), active: !!fd.get('active') };
  if (!data.sku || !data.name) return { error: 'SKU y nombre son obligatorios.' };
  const dup = await db.product.findFirst({ where: { businessId: business.id, sku: data.sku, ...(id ? { id: { not: id } } : {}) } });
  if (dup) return { error: 'Ya existe un producto con ese SKU.' };
  if (id) await db.product.update({ where: { id, businessId: business.id }, data });
  else {
    const initial = num(fd.get('initialStock')); const cost = Math.round(num(fd.get('cost')));
    await db.$transaction(async tx => {
      const p = await tx.product.create({ data: { ...data, businessId: business.id, cost } });
      if (initial > 0) await moveStock(tx, { businessId: business.id, productId: p.id, type: 'ENTRADA', quantity: initial, unitCost: cost, note: 'Inventario inicial', userName: user.name });
    });
  }
  revalidatePath('/panel/inventario');
  return { ok: true };
}

export async function registerMovement(_: unknown, fd: FormData) {
  const { business, user } = await requireBusiness('inventario');
  const productId = String(fd.get('productId')); const type = String(fd.get('type'));
  const p = await db.product.findFirst({ where: { id: productId, businessId: business.id } });
  if (!p) return { error: 'Producto no encontrado' };
  let qty = num(fd.get('quantity'));
  if (type === 'AJUSTE') qty = num(fd.get('quantity')) - p.stock; // conteo físico → diferencia
  else if (type === 'SALIDA') qty = -Math.abs(qty);
  else qty = Math.abs(qty);
  if (!qty) return { error: 'La cantidad no puede ser cero.' };
  if (p.stock + qty < 0) return { error: 'La salida supera el stock disponible.' };
  await db.$transaction(tx => moveStock(tx, { businessId: business.id, productId, type, quantity: qty, unitCost: Math.round(num(fd.get('unitCost'))) || undefined, supplierId: String(fd.get('supplierId') || '') || null, reference: String(fd.get('reference') || '') || undefined, note: String(fd.get('note') || '') || undefined, userName: user.name }));
  revalidatePath('/panel/inventario');
  return { ok: true };
}

export async function saveSupplier(_: unknown, fd: FormData) {
  const { business } = await requireBusiness('inventario');
  if (!String(fd.get('name') || '').trim()) return { error: 'Nombre obligatorio' };
  await db.supplier.create({ data: { businessId: business.id, name: String(fd.get('name')), nit: String(fd.get('nit') || '') || null, phone: String(fd.get('phone') || '') || null, email: String(fd.get('email') || '') || null } });
  revalidatePath('/panel/inventario');
  return { ok: true };
}
