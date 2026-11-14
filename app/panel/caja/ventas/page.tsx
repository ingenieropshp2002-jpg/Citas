import Link from 'next/link';
import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
import { PageHeader } from '@/components/panel/PageHeader';
import { DocStatus } from '@/components/ui/Status';
import { cop, fechaCorta, hm, time12 } from '@/lib/format';

export const metadata = { title: 'Ventas' };
export default async function Ventas() {
  const { business: b } = await requireBusiness('caja');
  const sales = await db.sale.findMany({ where: { businessId: b.id }, include: { customer: true, documents: true, payments: true }, orderBy: { createdAt: 'desc' }, take: 200 });
  return (
    <>
      <PageHeader eyebrow="Punto de venta" title="Ventas" actions={<Link href="/panel/caja" className="btn-primary btn-sm">Ir a la caja</Link>} />
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>#</th><th>Fecha</th><th>Cliente</th><th>Documento</th><th>Pago</th><th className="text-right">Total</th><th>Estado</th></tr></thead>
          <tbody>{sales.map(s => { const d = s.documents.find(x => x.docType !== 'NC'); return (
            <tr key={s.id} className="hover:bg-surface-container-low">
              <td><Link className="font-label-lg text-secondary" href={`/panel/caja/ventas/${s.id}`}>{s.number}</Link></td>
              <td>{fechaCorta(s.createdAt)} {time12(hm(s.createdAt))}</td>
              <td>{s.customer?.name || 'Consumidor final'}</td>
              <td>{d ? <span className="flex items-center gap-2">{d.fullNumber}<DocStatus status={d.status} /></span> : <span className="text-on-surface-variant">Sin documento</span>}</td>
              <td className="text-on-surface-variant">{s.payments.map(p => p.method.toLowerCase()).join(' + ')}</td>
              <td className="text-right tnum font-bold">{cop(s.total)}</td>
              <td>{s.status === 'ANULADA' ? <span className="text-danger font-label-md">Anulada</span> : 'Pagada'}</td>
            </tr>); })}</tbody>
        </table>
      </div>
    </>
  );
}
