import { db } from '../db';
import { bogota, ymd } from '../format';
import { computeCufe, qrUrl } from './cufe';
import { buildUbl, UblParty } from './ubl';
import { sendToProvider } from './provider';

const PAYMENT_CODE: Record<string, string> = { EFECTIVO: '10', TARJETA: '48', NEQUI: '47', DAVIPLATA: '47', PSE: '47', TRANSFERENCIA: '47' };
const UNIT_CODE: Record<string, string> = { UND: '94', ML: 'MLT', GR: 'GRM', SERV: 'E48' };
export const CONSUMIDOR_FINAL = '222222222222';

export type Buyer = { docType: string; docNumber: string; name: string; email?: string | null; phone?: string | null; address?: string | null };

/** Regla: el documento equivalente POS solo procede hasta 5 UVT; por encima, o si el comprador la pide, factura electrónica. */
export async function decideDocType(businessId: string, total: number, buyerWantsInvoice: boolean) {
  const cfg = await getConfig(businessId);
  const limit = cfg.uvtValue * cfg.posMaxUvt;
  if (buyerWantsInvoice || total > limit) return { type: 'FE' as const, limit };
  return { type: 'POS' as const, limit };
}

export async function getConfig(businessId: string) {
  return (await db.dianConfig.findUnique({ where: { businessId } })) ?? (await db.dianConfig.create({ data: { businessId } }));
}

async function nextNumber(businessId: string, docType: string) {
  const now = new Date();
  const res = await db.numberingResolution.findFirst({ where: { businessId, docType, active: true, validFrom: { lte: now }, validTo: { gte: now } }, orderBy: { validFrom: 'desc' } });
  if (!res) throw new Error(`No hay una resolución de numeración vigente para ${docType === 'FE' ? 'factura electrónica' : docType === 'POS' ? 'documento equivalente POS' : 'notas crédito'}. Configúrela en Panel > Facturación DIAN.`);
  const updated = await db.numberingResolution.update({ where: { id: res.id }, data: { current: { increment: 1 } } });
  if (updated.current > updated.rangeTo) throw new Error('Se agotó el rango de numeración autorizado. Solicite una nueva resolución a la DIAN.');
  if (updated.current < updated.rangeFrom) {
    await db.numberingResolution.update({ where: { id: res.id }, data: { current: updated.rangeFrom } });
    updated.current = updated.rangeFrom;
  }
  return { res: updated, number: updated.current };
}

function issuerParty(b: Awaited<ReturnType<typeof db.business.findUniqueOrThrow>>): UblParty {
  if (!b.nit) throw new Error('Configure el NIT y los datos fiscales del negocio en Panel > Facturación DIAN.');
  return { docType: b.docType, id: b.nit, dv: b.dv || undefined, name: b.legalName || b.name, email: b.fiscalEmail, phone: b.phone, address: b.address, cityCode: b.municipalityCode, city: b.municipality, deptCode: b.departmentCode, dept: b.department, regime: b.taxRegime, responsibilities: b.taxResponsibilities };
}

export async function issueForSale(saleId: string, opts: { buyer?: Buyer | null; wantsInvoice?: boolean } = {}) {
  const sale = await db.sale.findUniqueOrThrow({ where: { id: saleId }, include: { items: true, payments: true, cashSession: true, business: true, customer: true } });
  const cfg = await getConfig(sale.businessId);
  const { type } = await decideDocType(sale.businessId, sale.total, !!opts.wantsInvoice);
  const buyer: Buyer = opts.buyer && opts.buyer.docNumber ? opts.buyer : { docType: '13', docNumber: CONSUMIDOR_FINAL, name: 'Consumidor final' };
  const { res, number } = await nextNumber(sale.businessId, type);
  const fullNumber = `${res.prefix}${number}`;
  const now = new Date(); const b = bogota(now);
  const date = ymd(now);
  const time = `${String(b.h).padStart(2, '0')}:${String(b.min).padStart(2, '0')}:${String(now.getUTCSeconds()).padStart(2, '0')}-05:00`;
  const taxes = groupTaxes(sale.items);
  const iva = sale.taxTotal;
  const key = type === 'FE' ? (res.technicalKey || cfg.softwarePin || 'CLAVE-TECNICA-PENDIENTE') : (cfg.softwarePin || 'PIN-PENDIENTE');
  const env = (cfg.environment === '1' ? '1' : '2') as '1' | '2';
  const issuer = issuerParty(sale.business);
  const cufe = computeCufe({ number: fullNumber, date, time, lineExtension: sale.subtotal, iva, total: sale.total, issuerNit: issuer.id, buyerId: buyer.docNumber, key, environment: env });
  const qr = qrUrl(cufe, env);
  const xml = buildUbl({
    kind: type, typeCode: type === 'FE' ? '01' : '20', prefix: res.prefix, number, fullNumber, date, time, cufe, qr, environment: env,
    resolution: { number: res.resolutionNumber, from: res.rangeFrom, to: res.rangeTo, validFrom: ymd(res.validFrom), validTo: ymd(res.validTo) },
    software: { id: cfg.softwareId || 'SOFTWARE-ID-PENDIENTE', pin: cfg.softwarePin || '', providerNit: issuer.id },
    issuer, buyer: { docType: buyer.docType, id: buyer.docNumber, name: buyer.name, email: buyer.email, phone: buyer.phone, address: buyer.address, regime: '49', responsibilities: 'R-99-PN' },
    lines: sale.items.map(i => ({ code: i.code, description: i.description, unit: UNIT_CODE[i.unit] || i.unit, quantity: i.quantity, unitPrice: i.unitPrice, base: i.base, taxRate: i.taxRate, taxAmount: i.taxAmount })),
    taxes, subtotal: sale.subtotal, taxTotal: sale.taxTotal, total: sale.total, tip: sale.tip,
    paymentMeans: PAYMENT_CODE[sale.payments[0]?.method || 'EFECTIVO'] || 'ZZZ',
    pos: type === 'POS' ? { terminal: sale.cashSession?.terminal || 'CAJA-01', cashier: sale.cashierName || '', softwareName: 'Registro Citas POS', manufacturer: 'Registro Citas' } : undefined
  });
  const doc = await db.electronicDocument.create({
    data: { businessId: sale.businessId, saleId: sale.id, docType: type, dianTypeCode: type === 'FE' ? '01' : '20', prefix: res.prefix, number, fullNumber, cufe, qrData: qr, xml, buyer: JSON.stringify(buyer), subtotal: sale.subtotal, taxTotal: sale.taxTotal, total: sale.total, environment: env, status: 'GENERADO' }
  });
  if (cfg.autoSend) return transmit(doc.id);
  return doc;
}

export async function transmit(docId: string) {
  const doc = await db.electronicDocument.findUniqueOrThrow({ where: { id: docId } });
  const cfg = await getConfig(doc.businessId);
  const buyer = JSON.parse(doc.buyer) as Buyer;
  const r = await sendToProvider(cfg, { docType: doc.docType, fullNumber: doc.fullNumber, cufe: doc.cufe, xml: doc.xml, buyerEmail: buyer.email });
  return db.electronicDocument.update({ where: { id: doc.id }, data: { status: r.status, providerTrackId: r.trackId, dianMessage: r.message } });
}

function groupTaxes(items: { taxRate: number; base: number; taxAmount: number }[]) {
  const m = new Map<number, { rate: number; base: number; tax: number }>();
  for (const i of items) { const t = m.get(i.taxRate) || { rate: i.taxRate, base: 0, tax: 0 }; t.base += i.base; t.tax += i.taxAmount; m.set(i.taxRate, t); }
  return [...m.values()];
}

/** Nota crédito (FE) o nota de ajuste (POS) que anula totalmente un documento. Concepto 2 = anulación. */
export async function creditNote(docId: string, reason: string) {
  const orig = await db.electronicDocument.findUniqueOrThrow({ where: { id: docId }, include: { sale: { include: { items: true, business: true } } } });
  if (orig.docType === 'NC') throw new Error('No se puede anular una nota crédito.');
  const exists = await db.electronicDocument.findFirst({ where: { referenceId: orig.id } });
  if (exists) throw new Error('Este documento ya tiene una nota crédito.');
  const sale = orig.sale!;
  const cfg = await getConfig(orig.businessId);
  const { res, number } = await nextNumber(orig.businessId, 'NC');
  const fullNumber = `${res.prefix}${number}`;
  const now = new Date(); const b = bogota(now); const date = ymd(now);
  const time = `${String(b.h).padStart(2, '0')}:${String(b.min).padStart(2, '0')}:00-05:00`;
  const env = orig.environment as '1' | '2';
  const issuer = issuerParty(sale.business);
  const buyer = JSON.parse(orig.buyer) as Buyer;
  const cude = computeCufe({ number: fullNumber, date, time, lineExtension: orig.subtotal, iva: orig.taxTotal, total: orig.total, issuerNit: issuer.id, buyerId: buyer.docNumber, key: cfg.softwarePin || 'PIN-PENDIENTE', environment: env });
  const typeCode = orig.docType === 'FE' ? '91' : '94';
  const xml = buildUbl({
    kind: 'NC', typeCode, prefix: res.prefix, number, fullNumber, date, time, cufe: cude, qr: qrUrl(cude, env), environment: env,
    software: { id: cfg.softwareId || 'SOFTWARE-ID-PENDIENTE', pin: cfg.softwarePin || '', providerNit: issuer.id },
    issuer, buyer: { docType: buyer.docType, id: buyer.docNumber, name: buyer.name, email: buyer.email },
    lines: sale.items.map(i => ({ code: i.code, description: i.description, unit: UNIT_CODE[i.unit] || i.unit, quantity: i.quantity, unitPrice: i.unitPrice, base: i.base, taxRate: i.taxRate, taxAmount: i.taxAmount })),
    taxes: groupTaxes(sale.items), subtotal: orig.subtotal, taxTotal: orig.taxTotal, total: orig.total, tip: 0, paymentMeans: '10',
    reference: { number: orig.fullNumber, cufe: orig.cufe, date: ymd(orig.issuedAt), reasonCode: '2', reason }
  });
  const nc = await db.electronicDocument.create({ data: { businessId: orig.businessId, saleId: orig.saleId, docType: 'NC', dianTypeCode: typeCode, prefix: res.prefix, number, fullNumber, cufe: cude, qrData: qrUrl(cude, env), xml, buyer: orig.buyer, subtotal: orig.subtotal, taxTotal: orig.taxTotal, total: orig.total, environment: env, referenceId: orig.id, reason } });
  return cfg.autoSend ? transmit(nc.id) : nc;
}
