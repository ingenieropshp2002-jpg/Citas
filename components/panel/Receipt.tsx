import QRCode from 'qrcode';
import { cop, fechaLarga, hm, METHOD_LABEL, parseJson } from '@/lib/format';

const DOC_TITLE: Record<string, string> = { FE: 'FACTURA ELECTRÓNICA DE VENTA', POS: 'DOCUMENTO EQUIVALENTE ELECTRÓNICO\nTIQUETE DE MÁQUINA REGISTRADORA CON SISTEMA P.O.S.', NC: 'NOTA CRÉDITO / NOTA DE AJUSTE' };
const REGIME: Record<string, string> = { '48': 'Responsable de IVA', '49': 'No responsable de IVA' };

type Props = { business: any; sale: any; doc: any | null; resolution: any | null };
export async function Receipt({ business: b, sale, doc, resolution }: Props) {
  const qr = doc ? await QRCode.toDataURL(doc.qrData, { margin: 1, width: 180 }) : null;
  const bookUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reservar/${b.slug}?ref=recibo`;
  const bookQr = await QRCode.toDataURL(bookUrl, { margin: 1, width: 160 });
  const buyer = doc ? parseJson<{ docType: string; docNumber: string; name: string }>(doc.buyer, { docType: '13', docNumber: '222222222222', name: 'Consumidor final' }) : null;
  const taxes = sale.items.reduce((m: Record<number, { base: number; tax: number }>, i: any) => { m[i.taxRate] = { base: (m[i.taxRate]?.base || 0) + i.base, tax: (m[i.taxRate]?.tax || 0) + i.taxAmount }; return m; }, {});
  return (
    <article id="ticket" className="bg-white text-black w-full max-w-[380px] mx-auto p-5 font-mono text-[12px] leading-snug shadow-raised rounded-lg print:shadow-none print:rounded-none print:max-w-none">
      <header className="text-center">
        <p className="font-bold text-[14px]">{b.legalName || b.name}</p>
        {b.legalName && <p>{b.name}</p>}
        <p>{b.docType === '31' ? 'NIT' : 'CC'} {b.nit}{b.dv ? `-${b.dv}` : ''} · {REGIME[b.taxRegime] || ''}</p>
        <p>{b.address} · {b.municipality}</p>
        {b.phone && <p>Tel. {b.phone}</p>}
        <p className="mt-2 font-bold whitespace-pre-line">{doc ? DOC_TITLE[doc.docType] : 'COMPROBANTE INTERNO DE VENTA\n(sin documento electrónico)'}</p>
        {doc && <p className="font-bold">No. {doc.fullNumber}</p>}
        {resolution && <p className="text-[10px] mt-1">Resolución DIAN No. {resolution.resolutionNumber} del {resolution.resolutionDate.toISOString().slice(0, 10)}, prefijo {resolution.prefix} del {resolution.rangeFrom} al {resolution.rangeTo}, vigencia hasta {resolution.validTo.toISOString().slice(0, 10)}</p>}
      </header>
      <hr className="my-2 border-dashed border-black/40" />
      <p>Fecha: {fechaLarga(sale.createdAt)} {hm(sale.createdAt)}</p>
      <p>Venta interna #{sale.number} · Caja: {sale.cashSession?.terminal || 'CAJA-01'} · Cajero: {sale.cashierName}</p>
      {buyer && <p>Adquiriente: {buyer.name} · {buyer.docType === '31' ? 'NIT' : 'Doc.'} {buyer.docNumber}</p>}
      <hr className="my-2 border-dashed border-black/40" />
      <table className="w-full">
        <thead><tr className="text-left"><th>Cant</th><th>Descripción</th><th className="text-right">Valor</th></tr></thead>
        <tbody>{sale.items.map((i: any) => (
          <tr key={i.id} className="align-top"><td>{i.quantity}</td><td>{i.description}<br /><span className="text-[10px]">{i.code} · IVA {i.taxRate}%{i.discount ? ` · Desc. ${cop(i.discount)}` : ''}</span></td><td className="text-right">{cop(i.total)}</td></tr>
        ))}</tbody>
      </table>
      <hr className="my-2 border-dashed border-black/40" />
      <div className="space-y-0.5">
        <p className="flex justify-between"><span>Subtotal (base gravable)</span><span>{cop(sale.subtotal)}</span></p>
        {sale.discount > 0 && <p className="flex justify-between"><span>Descuentos</span><span>-{cop(sale.discount)}</span></p>}
        {Object.entries(taxes).map(([r, t]: any) => <p key={r} className="flex justify-between"><span>IVA {r}% (base {cop(t.base)})</span><span>{cop(t.tax)}</span></p>)}
        <p className="flex justify-between font-bold text-[14px]"><span>TOTAL</span><span>{cop(sale.total - sale.tip)}</span></p>
        {sale.tip > 0 && <p className="flex justify-between"><span>Propina voluntaria (no gravada)</span><span>{cop(sale.tip)}</span></p>}
        {sale.tip > 0 && <p className="flex justify-between font-bold"><span>TOTAL PAGADO</span><span>{cop(sale.total)}</span></p>}
        {sale.payments.map((p: any) => <p key={p.id} className="flex justify-between"><span>{METHOD_LABEL[p.method] || p.method}{p.change ? ` (recibido ${cop(p.received)}, cambio ${cop(p.change)})` : ''}</span><span>{cop(p.amount)}</span></p>)}
      </div>
      {doc && (
        <>
          <hr className="my-2 border-dashed border-black/40" />
          <p className="break-all text-[10px]"><b>{doc.docType === 'FE' ? 'CUFE' : 'CUDE'}:</b> {doc.cufe}</p>
          {qr && <img src={qr} alt="Código QR DIAN" className="mx-auto my-2 w-36 h-36" />}
          <p className="text-[10px] text-center">Software: Registro Citas POS · Fabricante/Proveedor: Registro Citas{doc.environment === '2' ? ' · AMBIENTE DE PRUEBAS (sin validez fiscal)' : ''}</p>
        </>
      )}
      {sale.status === 'ANULADA' && <p className="mt-2 text-center font-bold text-[14px]">*** VENTA ANULADA ***</p>}
      <p className="text-center mt-3">¡Gracias por tu visita!</p>
      {sale.status !== 'ANULADA' && <div className="mt-3 pt-3 border-t border-dashed border-black/40 text-center"><p className="font-bold">AGENDA TU PRÓXIMA CITA</p><img src={bookQr} alt="QR para agendar tu próxima cita" className="mx-auto my-1 w-28 h-28" /><p className="text-[10px]">Escanea el código y reserva en segundos</p></div>}
    </article>
  );
}
