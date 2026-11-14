'use server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
import { moveStock } from '@/lib/inventory';

const num = (v: unknown, d = 0) => { const n = Number(String(v ?? '').replace(/[^\d.-]/g, '')); return Number.isFinite(n) ? n : d; };

/** Acepta una URL https o una imagen comprimida en el navegador (data URL de máx. ~350 KB). undefined = inválida */
function cleanImage(v: FormDataEntryValue | null): string | null | undefined {
  const s = String(v || '').trim();
  if (!s) return null;
  if (/^https:\/\/\S+$/i.test(s)) return s.slice(0, 1000);
  if (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s)) return s.length <= 480_000 ? s : undefined;
  return null;
}
async function autoSku(businessId: string, name: string) {
  const base = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 6) || 'PROD';
  for (let i = 1; ; i++) { const sku = `${base}-${String(i).padStart(3, '0')}`; if (!(await db.product.findFirst({ where: { businessId, sku } }))) return sku; }
}

export async function saveProduct(_: unknown, fd: FormData) {
  const { business, user } = await requireBusiness('inventario');
  const id = String(fd.get('id') || '');
  const data = { sku: String(fd.get('sku')).trim().toUpperCase(), barcode: String(fd.get('barcode') || '') || null, name: String(fd.get('name')).trim(), brand: String(fd.get('brand') || '') || null, category: String(fd.get('category') || 'General'), kind: String(fd.get('kind') || 'VENTA'), unit: String(fd.get('unit') || 'UND'), price: Math.round(num(fd.get('price'))), taxRate: Math.round(num(fd.get('taxRate'), 19)), minStock: num(fd.get('minStock')), active: !!fd.get('active'), description: String(fd.get('description') || '').trim() || null, image: cleanImage(fd.get('image')), showInShop: !!fd.get('showInShop') };
  if (!data.sku) data.sku = await autoSku(business.id, data.name);
  if (!data.name) return { error: 'El nombre es obligatorio.' };
  if (data.image === undefined) return { error: 'La foto es muy pesada. Usa una imagen más pequeña.' };
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

export type ImportRow = { nombre: string; precio?: number; cantidad?: number; costo?: number; categoria?: string; marca?: string; sku?: string; codigo_barras?: string; descripcion?: string; iva?: number };
/** Carga masiva de productos (desde un CSV/Excel). Crea los nuevos y actualiza los existentes (por SKU o por nombre). La cantidad es el conteo actual. */
export async function importProducts(rows: ImportRow[]) {
  const { business, user } = await requireBusiness('inventario');
  if (!Array.isArray(rows) || rows.length === 0) return { error: 'No hay filas para importar.' };
  if (rows.length > 1000) return { error: 'Máximo 1.000 productos por archivo.' };
  let created = 0, updated = 0; const errors: string[] = [];
  for (const [i, r] of rows.entries()) {
    const name = String(r.nombre || '').trim();
    if (!name) { errors.push(`Fila ${i + 2}: falta el nombre`); continue; }
    try {
      const sku = String(r.sku || '').trim().toUpperCase();
      const existing = (sku && await db.product.findFirst({ where: { businessId: business.id, sku } })) || await db.product.findFirst({ where: { businessId: business.id, name: { equals: name, mode: 'insensitive' } } });
      const iva = [0, 5, 19].includes(Number(r.iva)) ? Number(r.iva) : undefined;
      const fields = {
        name, ...(r.precio !== undefined && !isNaN(r.precio) ? { price: Math.round(r.precio) } : {}), ...(r.categoria ? { category: r.categoria } : {}), ...(r.marca ? { brand: r.marca } : {}),
        ...(r.codigo_barras ? { barcode: String(r.codigo_barras) } : {}), ...(r.descripcion ? { description: r.descripcion } : {}), ...(iva !== undefined ? { taxRate: iva } : {})
      };
      const cost = r.costo !== undefined && !isNaN(r.costo) ? Math.round(r.costo) : undefined;
      await db.$transaction(async tx => {
        let p = existing;
        if (p) { p = await tx.product.update({ where: { id: p.id }, data: { ...fields, active: true } }); updated++; }
        else { p = await tx.product.create({ data: { ...fields, businessId: business.id, sku: sku || await autoSku(business.id, name), category: r.categoria || 'General', cost: cost || 0 } }); created++; }
        if (r.cantidad !== undefined && !isNaN(r.cantidad)) {
          const diff = Math.round((r.cantidad - p.stock) * 1000) / 1000;
          if (diff !== 0) await moveStock(tx, { businessId: business.id, productId: p.id, type: existing ? 'AJUSTE' : 'ENTRADA', quantity: diff, unitCost: diff > 0 ? cost : undefined, note: 'Carga masiva', userName: user.name });
        }
      });
    } catch (e) { errors.push(`Fila ${i + 2} (${name}): ${(e as Error).message.slice(0, 120)}`); }
  }
  revalidatePath('/panel/inventario');
  return { ok: true, created, updated, errors };
}
