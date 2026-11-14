import { ImageInput } from '@/components/ui/ImageInput';
type P = { id: string; description?: string | null; image?: string | null; showInShop?: boolean; sku: string; barcode: string | null; name: string; brand: string | null; category: string; kind: string; unit: string; cost: number; price: number; taxRate: number; minStock: number; active: boolean };
export function ProductFields({ p }: { p?: P }) {
  return (
    <>
      {p && <input type="hidden" name="id" value={p.id} />}
      <ImageInput name="image" defaultValue={p?.image} label="Foto del producto" />
      <label className="block"><span className="label">Nombre *</span><input name="name" defaultValue={p?.name} className="input" required /></label>
      <label className="block"><span className="label">Descripción (se ve en tu tienda)</span><textarea name="description" defaultValue={p?.description || ''} className="input" rows={2} placeholder="Tamaño, beneficios, para qué tipo de cabello…" /></label>
      <div className="grid grid-cols-2 gap-3">
        <label><span className="label">SKU (código interno)</span><input name="sku" defaultValue={p?.sku} className="input uppercase" placeholder="Automático" /></label>
        <label><span className="label">Código de barras</span><input name="barcode" defaultValue={p?.barcode || ''} className="input" /></label>
        <label><span className="label">Marca</span><input name="brand" defaultValue={p?.brand || ''} className="input" /></label>
        <label><span className="label">Categoría</span><input name="category" defaultValue={p?.category || 'Cuidado capilar'} className="input" /></label>
        <label><span className="label">Uso</span><select name="kind" defaultValue={p?.kind || 'VENTA'} className="input"><option value="VENTA">Para venta</option><option value="INSUMO">Insumo (uso interno)</option><option value="AMBOS">Venta e insumo</option></select></label>
        <label><span className="label">Unidad</span><select name="unit" defaultValue={p?.unit || 'UND'} className="input"><option value="UND">Unidad</option><option value="ML">Mililitro</option><option value="GR">Gramo</option></select></label>
        <label><span className="label">Precio de venta (IVA incl.)</span><input name="price" type="number" min={0} step={100} defaultValue={p?.price ?? 0} className="input" /></label>
        <label><span className="label">IVA</span><select name="taxRate" defaultValue={p?.taxRate ?? 19} className="input"><option value={19}>19%</option><option value={5}>5%</option><option value={0}>0% / Excluido</option></select></label>
        <label><span className="label">Stock mínimo (alerta)</span><input name="minStock" type="number" min={0} step="any" defaultValue={p?.minStock ?? 0} className="input" /></label>
        {!p && <><label><span className="label">Stock inicial</span><input name="initialStock" type="number" min={0} step="any" defaultValue={0} className="input" /></label><label><span className="label">Costo unitario</span><input name="cost" type="number" min={0} defaultValue={0} className="input" /></label></>}
      </div>
      <label className="flex items-center gap-2"><input type="checkbox" name="showInShop" defaultChecked={p?.showInShop ?? true} className="accent-primary-container" />Mostrar en mi tienda online (precio y cantidad disponible)</label>
      <label className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={p?.active ?? true} className="accent-primary-container" />Activo</label>
    </>
  );
}
export function MovementFields({ products, suppliers, productId }: { products: { id: string; name: string; unit: string; stock: number }[]; suppliers: { id: string; name: string }[]; productId?: string }) {
  return (
    <>
      <label className="block"><span className="label">Producto</span><select name="productId" defaultValue={productId} className="input" required>{products.map(p => <option key={p.id} value={p.id}>{p.name} (stock {p.stock} {p.unit.toLowerCase()})</option>)}</select></label>
      <label className="block"><span className="label">Tipo</span><select name="type" className="input"><option value="ENTRADA">Entrada (compra a proveedor)</option><option value="SALIDA">Salida (merma, uso, daño)</option><option value="AJUSTE">Ajuste por conteo físico</option></select></label>
      <label className="block"><span className="label">Cantidad (en ajuste: cantidad contada)</span><input name="quantity" type="number" step="any" min={0} className="input" required /></label>
      <div className="grid grid-cols-2 gap-3">
        <label><span className="label">Costo unitario (entradas)</span><input name="unitCost" type="number" min={0} className="input" /></label>
        <label><span className="label">Proveedor</span><select name="supplierId" className="input"><option value="">—</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      </div>
      <label className="block"><span className="label">Referencia (n.º factura proveedor)</span><input name="reference" className="input" /></label>
      <label className="block"><span className="label">Nota</span><input name="note" className="input" /></label>
    </>
  );
}

export function MoveType({ t }: { t: string }) {
  const m: Record<string, string> = { ENTRADA: 'Entrada', SALIDA: 'Salida', AJUSTE: 'Ajuste', VENTA: 'Venta', CONSUMO: 'Consumo servicio', DEVOLUCION: 'Devolución' };
  return <span className="font-label-md">{m[t] || t}</span>;
}
