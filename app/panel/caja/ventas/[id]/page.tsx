import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
import { PageHeader } from '@/components/panel/PageHeader';
import { Receipt } from '@/components/panel/Receipt';
import { DocStatus } from '@/components/ui/Status';
import { Icon } from '@/components/ui/Icon';
import { SaleActions } from './SaleActions';

export default async function Venta({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ docError?: string }> }) {
  const { business: b } = await requireBusiness('caja');
  const { docError } = await searchParams;
  const sale = await db.sale.findFirst({ where: { id: (await params).id, businessId: b.id }, include: { items: true, payments: true, cashSession: true, customer: true, documents: { orderBy: { createdAt: 'asc' } } } });
  if (!sale) notFound();
  const doc = sale.documents.find(d => d.docType !== 'NC') || null;
  const nc = sale.documents.find(d => d.docType === 'NC');
  const res = doc ? await db.numberingResolution.findFirst({ where: { businessId: b.id, docType: doc.docType, prefix: doc.prefix }, orderBy: { validFrom: 'desc' } }) : null;
  return (
    <>
      <div className="print:hidden"><PageHeader eyebrow={`Venta #${sale.number}`} title={doc ? doc.fullNumber : 'Venta sin documento'} actions={<><Link href="/panel/caja" className="btn-primary btn-sm"><Icon name="add" className="text-[18px]" />Nueva venta</Link><SaleActions saleId={sale.id} hasDoc={!!doc} voided={sale.status === 'ANULADA'} /></>} /></div>
      {docError && <div className="print:hidden mb-4 p-3 rounded-xl bg-[#FFFBEB] text-[#92400E]"><b>La venta se registró, pero no se generó el documento electrónico:</b> {docError}</div>}
      <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
        <Receipt business={b} sale={sale} doc={doc} resolution={res} />
        <aside className="card p-5 space-y-3 print:hidden">
          <h2 className="font-title-lg text-title-lg">Estado electrónico</h2>
          {doc ? <><DocStatus status={doc.status} /><p className="font-body-sm text-on-surface-variant">{doc.dianMessage}</p><a href={`/api/documentos/${doc.id}/xml`} className="btn-ghost btn-sm w-full"><Icon name="code" className="text-[16px]" />Descargar XML UBL</a></> : <p className="text-on-surface-variant">Sin documento electrónico.</p>}
          {nc && <div className="p-3 rounded-xl bg-[#FFF1F2]"><p className="font-label-lg text-danger">Anulada con {nc.fullNumber}</p><p className="font-body-sm">{nc.reason}</p><DocStatus status={nc.status} /></div>}
        </aside>
      </div>
    </>
  );
}
