import Link from 'next/link';
import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
import { PageHeader, Stat } from '@/components/panel/PageHeader';
import { Drawer } from '@/components/ui/Drawer';
import { ActionForm } from '@/components/ui/ActionForm';
import { Icon } from '@/components/ui/Icon';
import { registerMovement, saveProduct, saveSupplier } from '../_actions/inventory';
import { cop, fechaCorta } from '@/lib/format';
import { ProductFields, MovementFields, MoveType } from './fields';

export const metadata = { title: 'Inventario' };
export default async function Inventario({ searchParams }: { searchParams: Promise<{ q?: string; filtro?: string; tipo?: string }> }) {
  const { business: b } = await requireBusiness('inventario');
  const sp = await searchParams;
  const [all, suppliers, moves] = await Promise.all([
    db.product.findMany({ where: { businessId: b.id }, orderBy: { name: 'asc' } }),
    db.supplier.findMany({ where: { businessId: b.id } }),
    db.stockMovement.findMany({ where: { businessId: b.id }, include: { product: true, supplier: true }, orderBy: { createdAt: 'desc' }, take: 15 })
  ]);
  let list = all;
  if (sp.q) { const n = sp.q.toLowerCase(); list = list.filter(p => p.name.toLowerCase().includes(n) || p.sku.toLowerCase().includes(n) || (p.barcode || '').includes(n) || (p.brand || '').toLowerCase().includes(n)); }
  if (sp.filtro === 'bajo') list = list.filter(p => p.stock <= p.minStock);
  if (sp.tipo) list = list.filter(p => p.kind === sp.tipo || (sp.tipo === 'VENTA' && p.kind === 'AMBOS') || (sp.tipo === 'INSUMO' && p.kind === 'AMBOS'));
  const value = all.reduce((a, p) => a + Math.max(0, p.stock) * p.cost, 0);
  const low = all.filter(p => p.stock <= p.minStock && p.active);
  const products = all.map(p => ({ id: p.id, name: p.name, unit: p.unit, stock: p.stock }));
  return (
    <>
      <PageHeader eyebrow="Inventario" title="Productos e insumos"
        actions={<>
          <Link href="/panel/inventario/importar" className="btn-outline btn-sm"><Icon name="upload_file" className="text-[18px]" />Cargar desde Excel</Link>
          <Drawer title="Registrar movimiento" triggerClass="btn-outline btn-sm" trigger={<><Icon name="swap_vert" className="text-[18px]" />Entrada / salida</>}><ActionForm action={registerMovement} resetOnSuccess success="Movimiento registrado"><MovementFields products={products} suppliers={suppliers} /><button className="btn-primary w-full">Registrar</button></ActionForm></Drawer>
          <Drawer title="Nuevo producto" trigger={<><Icon name="add" className="text-[18px]" />Nuevo producto</>}><ActionForm action={saveProduct} resetOnSuccess><ProductFields /><button className="btn-primary w-full">Crear producto</button></ActionForm></Drawer>
        </>} />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
        <Stat label="Referencias" value={String(all.length)} icon="inventory_2" />
        <Stat label="Valor del inventario" value={cop(value)} icon="account_balance_wallet" tone="gold" hint="A costo promedio" />
        <Stat label="Stock bajo" value={String(low.length)} icon="warning" tone={low.length ? 'danger' : 'default'} />
        <Stat label="Proveedores" value={String(suppliers.length)} icon="local_shipping" />
      </div>
      {low.length > 0 && <div className="mb-4 p-3 rounded-xl bg-[#FFF1F2] text-danger flex items-center gap-2 dark:bg-error-container dark:text-on-error-container"><Icon name="notifications_active" />Alerta: {low.map(p => p.name).join(', ')} {low.length === 1 ? 'está' : 'están'} en o por debajo del mínimo.</div>}
      <form className="flex flex-wrap gap-2 mb-4">
        <input name="q" defaultValue={sp.q} className="input flex-1 min-w-[200px]" placeholder="Buscar por nombre, SKU, código de barras o marca" />
        <select name="tipo" defaultValue={sp.tipo || ''} className="input !w-auto"><option value="">Todos</option><option value="VENTA">Para venta</option><option value="INSUMO">Insumos</option></select>
        <select name="filtro" defaultValue={sp.filtro || ''} className="input !w-auto"><option value="">Todo el stock</option><option value="bajo">Stock bajo</option></select>
        <button className="btn-ghost">Filtrar</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>Producto</th><th>Tipo</th><th className="text-right">Stock</th><th className="text-right">Mínimo</th><th className="text-right">Costo prom.</th><th className="text-right">Precio venta</th><th>IVA</th><th /></tr></thead>
          <tbody>{list.map(p => { const isLow = p.stock <= p.minStock; return (
            <tr key={p.id} className={`hover:bg-surface-container-low ${p.active ? '' : 'opacity-50'}`}>
              <td><div className="flex items-center gap-3">{p.image ? <img src={p.image} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" /> : <span className="w-10 h-10 rounded-lg bg-surface-container shrink-0 flex items-center justify-center"><Icon name="inventory_2" className="text-[18px] text-on-surface-variant" /></span>}<div><Link href={`/panel/inventario/${p.id}`} className="font-label-lg hover:text-secondary">{p.name}</Link><p className="font-body-sm text-on-surface-variant">{p.sku}{p.brand ? ` · ${p.brand}` : ''} · {p.category}{p.showInShop && p.kind !== 'INSUMO' ? ' · En tienda' : ''}</p></div></div></td>
              <td><span className="px-2 py-0.5 rounded-full bg-surface-container font-label-sm text-label-sm">{p.kind === 'VENTA' ? 'Venta' : p.kind === 'INSUMO' ? 'Insumo' : 'Venta e insumo'}</span></td>
              <td className={`text-right tnum font-bold ${isLow ? 'text-danger' : ''}`}>{p.stock} {p.unit.toLowerCase()}{isLow && <Icon name="warning" className="text-[14px] ml-1" />}</td>
              <td className="text-right tnum text-on-surface-variant">{p.minStock}</td>
              <td className="text-right tnum">{cop(p.cost)}</td><td className="text-right tnum">{p.price ? cop(p.price) : '—'}</td><td>{p.taxRate}%</td>
              <td><Drawer title="Editar producto" triggerClass="btn-ghost btn-sm" trigger={<Icon name="edit" className="text-[16px]" />}><ActionForm action={saveProduct}><ProductFields p={p} /><button className="btn-primary w-full">Guardar</button></ActionForm></Drawer></td>
            </tr>); })}</tbody>
        </table>
      </div>
      <div className="grid xl:grid-cols-3 gap-4 mt-4">
        <section className="card p-5 xl:col-span-2">
          <h2 className="h-section mb-3">Últimos movimientos</h2>
          <table className="table"><thead><tr><th>Fecha</th><th>Producto</th><th>Tipo</th><th className="text-right">Cant.</th><th className="text-right">Saldo</th><th>Referencia</th></tr></thead>
            <tbody>{moves.map(m => <tr key={m.id}><td>{fechaCorta(m.createdAt)}</td><td>{m.product.name}</td><td><MoveType t={m.type} /></td><td className={`text-right tnum ${m.quantity < 0 ? 'text-danger' : 'text-success'}`}>{m.quantity > 0 ? '+' : ''}{m.quantity}</td><td className="text-right tnum">{m.balance}</td><td className="text-on-surface-variant">{m.reference || m.note}{m.supplier ? ` · ${m.supplier.name}` : ''}</td></tr>)}</tbody></table>
        </section>
        <section className="card p-5">
          <h2 className="h-section mb-3">Proveedores</h2>
          <ul className="space-y-2 mb-4">{suppliers.map(s => <li key={s.id} className="p-2 rounded-lg bg-surface-container-low"><p className="font-label-lg">{s.name}</p><p className="font-body-sm text-on-surface-variant">{s.nit && `NIT ${s.nit}`} {s.phone}</p></li>)}</ul>
          <ActionForm action={saveSupplier} resetOnSuccess className="space-y-2"><input name="name" className="input" placeholder="Nombre del proveedor" required /><div className="grid grid-cols-2 gap-2"><input name="nit" className="input" placeholder="NIT" /><input name="phone" className="input" placeholder="Teléfono" /></div><button className="btn-ghost btn-sm w-full">Agregar proveedor</button></ActionForm>
        </section>
      </div>
    </>
  );
}
