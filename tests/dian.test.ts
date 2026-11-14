import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeCufe, cufeString, nitDv } from '../lib/dian/cufe';
import { splitTax, computeLine } from '../lib/tax';
import { buildUbl } from '../lib/dian/ubl';

// Ejemplo oficial del Anexo Técnico de Factura Electrónica de Venta (DIAN)
const ex = { number: '323200000129', date: '2019-01-16', time: '10:53:10-05:00', lineExtension: 1500000, iva: 285000, total: 1785000, issuerNit: '700085371', buyerId: '800199436', key: '693ff6f2a553c3646a063436fd4dd9ded0311471', environment: '1' as const };

test('cadena del CUFE en el orden del anexo técnico', () => {
  assert.equal(cufeString(ex), '3232000001292019-01-1610:53:10-05:001500000.0001285000.00040.00030.001785000.00700085371800199436693ff6f2a553c3646a063436fd4dd9ded03114711');
});
test('CUFE coincide con el ejemplo del anexo técnico', () => {
  assert.equal(computeCufe(ex), '8bb918b19ba22a694f1da11c643b5e9de39adf60311cf179179e9b33381030bcd4c3c3f156c506ed5908f9276f5bd9b4');
});
test('dígito de verificación del NIT', () => {
  assert.equal(nitDv('900373115'), '3');
  assert.equal(nitDv('800197268'), '4'); // NIT de la DIAN
});
test('IVA incluido se separa correctamente', () => {
  assert.deepEqual(splitTax(119000, 19), { base: 100000, tax: 19000 });
  assert.deepEqual(splitTax(50000, 0), { base: 50000, tax: 0 });
  const l = computeLine({ unitPrice: 72000, quantity: 2, discount: 4000, taxRate: 19 });
  assert.equal(l.total, 140000); assert.equal(l.base + l.taxAmount, 140000);
});
test('XML UBL contiene CUFE, tipo de documento y totales', () => {
  const xml = buildUbl({ kind: 'POS', typeCode: '20', prefix: 'POS', number: 1, fullNumber: 'POS1', date: '2026-01-01', time: '10:00:00-05:00', cufe: 'abc', qr: 'https://x', environment: '2', software: { id: 'id', pin: 'pin', providerNit: '1' },
    issuer: { docType: '31', id: '901234567', dv: '1', name: 'Demo SAS', regime: '48', responsibilities: 'O-13' }, buyer: { docType: '13', id: '222222222222', name: 'Consumidor final' },
    lines: [{ code: 'S1', description: 'Corte', unit: 'E48', quantity: 1, unitPrice: 119000, base: 100000, taxRate: 19, taxAmount: 19000 }], taxes: [{ rate: 19, base: 100000, tax: 19000 }], subtotal: 100000, taxTotal: 19000, total: 119000, tip: 0, paymentMeans: '10',
    pos: { terminal: 'CAJA-01', cashier: 'Ana', softwareName: 'RC', manufacturer: 'RC' } });
  assert.match(xml, /<cbc:InvoiceTypeCode>20<\/cbc:InvoiceTypeCode>/);
  assert.match(xml, /CUDE-SHA384">abc</);
  assert.match(xml, /<cbc:PayableAmount currencyID="COP">119000.00</);
  assert.match(xml, /Caja: CAJA-01/);
});
