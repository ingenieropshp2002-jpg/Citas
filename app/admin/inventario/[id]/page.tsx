import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
import { PageHeader, Stat } from '@/components/panel/PageHeader';
import { Drawer } from '@/components/ui/Drawer';
import { ActionForm } from '@/components/ui/ActionForm';
import { Icon } from '@/components/ui/Icon';
import { registerMovement } from '../../_actions/inventory';
import { MovementFields, MoveType } from '../fields';
import { cop, fechaCorta, hm } from '@/lib/format';

export default async function Kardex({ params }: { params: Promise<{ id: string }> }) {
  const { business: b } = await requireBusiness('inventario');
  const p = await db.product.findFirst({ where: { id: (await params).id, businessId: b.id }, include: { movements: { include: { supplier: true }, orderBy: { createdAt: 'desc' } }, supplies: { include: { service: true } } } });
  if (!p) notFound();
  const suppliers = await db.supplier.findMany({ where: { businessId: b.id } });
  const sold = p.movements.filter(m => m.type === 'VENTA').reduce((a, m) => a - m.quantity, 0);
  const used = p.movements.filter(m => m.type === 'CONSUMO').reduce((a, m) => a - m.quantity, 0);
  return (
    <>
      <PageHeader eyebrow={`Kárdex · ${p.sku}`} title={p.name} subtitle={p.supplies.length ? `Insumo de: ${p.supplies.map(s => s.service.name).join(', ')}` : undefined}
        actions={<Drawer title="Registrar movimiento" trigger={<><Icon name="swap_vert" className="text-[18px]" />Movimiento</>}><ActionForm action={registerMovement} resetOnSuccess><MovementFields products={[{ id: p.id, name: p.name, unit: p.unit, stock: p.stock }]} suppliers={suppliers} productId={p.id} /><button className="btn-primary w-full">Registrar</button></ActionForm></Drawer>} />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
        <Stat label="Stock actual" value={`${p.stock} ${p.unit.toLowerCase()}`} icon="inventory" tone={p.stock <= p.minStock ? 'danger' : 'default'} hint={`Mínimo ${p.minStock}`} />
        <Stat label="Costo promedio" value={cop(p.cost)} icon="price_change" />
        <Stat label="Vendido" value={String(sold)} icon="shopping_bag" tone="gold" />
        <Stat label="Consumido en servicios" value={String(used)} icon="content_cut" />
      </div>
      <div className="card overflow-x-auto">
        <table className="table"><thead><tr><th>Fecha</th><th>Tipo</th><th className="text-right">Entrada</th><th className="text-right">Salida</th><th className="text-right">Saldo</th><th className="text-right">Costo u.</th><th>Referencia</th><th>Usuario</th></tr></thead>
          <tbody>{p.movements.map(m => <tr key={m.id}><td>{fechaCorta(m.createdAt)} {hm(m.createdAt)}</td><td><MoveType t={m.type} /></td><td className="text-right tnum text-success">{m.quantity > 0 ? m.quantity : ''}</td><td className="text-right tnum text-danger">{m.quantity < 0 ? -m.quantity : ''}</td><td className="text-right tnum font-bold">{m.balance}</td><td className="text-right tnum">{cop(m.unitCost)}</td><td className="text-on-surface-variant">{[m.reference, m.supplier?.name, m.note].filter(Boolean).join(' · ')}</td><td>{m.userName}</td></tr>)}</tbody></table>
      </div>
    </>
  );
}
