import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
import { Icon } from '@/components/ui/Icon';
import { ConfirmButton } from '@/components/ui/Confirm';
import { cop, fechaLarga, METHOD_LABEL } from '@/lib/format';
import { anularLiquidacion } from '../../../_actions/comisiones';
import { PrintButton } from './PrintButton';

export const metadata = { title: 'Comprobante de liquidación' };
export default async function Liquidacion({ params }: { params: Promise<{ id: string }> }) {
  const { business: b, perms, staffId } = await requireBusiness();
  const manager = perms === 'ALL' || perms.includes('equipo');
  const p = await db.commissionPayout.findFirst({ where: { id: (await params).id, businessId: b.id, ...(manager ? {} : { staffId: staffId || '-' }) } });
  if (!p) notFound();
  const items = await db.saleItem.findMany({ where: { payoutId: p.id }, include: { sale: { select: { number: true, createdAt: true } } }, orderBy: { sale: { createdAt: 'asc' } } });
  const R = ({ l, v, strong }: { l: string; v: number; strong?: boolean }) => <div className={`flex justify-between py-1 ${strong ? 'border-t border-parchment pt-2 font-title-md' : ''}`}><span className={strong ? '' : 'text-on-surface-variant'}>{l}</span><span className="tnum">{cop(v)}</span></div>;
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4 print:hidden"><Link href="/admin/equipo/comisiones" className="btn-ghost btn-sm">← Comisiones</Link><div className="flex gap-2"><PrintButton />{manager && <ConfirmButton action={anularLiquidacion} title="¿Anular esta liquidación?" text="Las comisiones vuelven a quedar pendientes por pagar." confirmLabel="Anular" fields={<input type="hidden" name="id" value={p.id} />}>Anular</ConfirmButton>}</div></div>
      <article className="card-raised p-6">
        <div className="flex items-start justify-between gap-4"><div><p className="eyebrow">Comprobante de liquidación</p><h1 className="font-headline-sm text-headline-sm">{p.staffName}</h1><p className="text-on-surface-variant">{b.name} · período del {p.fromDate} al {p.toDate}</p></div><Icon name="payments" className="text-secondary text-[32px]" /></div>
        <div className="mt-5"><R l={`Comisión por ${p.servicesCount} servicios (${cop(p.servicesBase)} sin IVA)`} v={p.servicesCommission} /><R l="Comisión por productos" v={p.productsCommission} /><R l="Propinas" v={p.tips} />{p.adjustment !== 0 && <R l={p.adjustment > 0 ? 'Bono' : 'Anticipos y descuentos'} v={p.adjustment} />}<R l="Total pagado" v={p.total} strong /></div>
        <p className="mt-3 font-body-sm text-on-surface-variant">Pagado el {fechaLarga(p.createdAt)} por {METHOD_LABEL[p.method] || p.method}{p.createdBy ? ` · registró ${p.createdBy}` : ''}.{p.notes ? ` Nota: ${p.notes}` : ''}</p>
        <table className="w-full mt-5 font-body-sm"><thead><tr className="text-left text-on-surface-variant"><th className="py-1">Venta</th><th>Detalle</th><th className="text-right">Base</th><th className="text-right">Comisión</th></tr></thead>
          <tbody>{items.map(i => <tr key={i.id} className="border-t border-parchment"><td className="py-1">#{i.sale.number}</td><td>{i.description}{i.kind === 'PRODUCTO' ? ' (producto)' : ''}</td><td className="text-right tnum">{cop(i.base)}</td><td className="text-right tnum">{cop(i.commission)}</td></tr>)}</tbody></table>
        <div className="grid grid-cols-2 gap-8 mt-12 font-body-sm text-center"><div className="border-t border-on-surface/40 pt-1">Firma {b.name}</div><div className="border-t border-on-surface/40 pt-1">Recibí: {p.staffName}</div></div>
      </article>
    </div>
  );
}
