import { createHash } from 'crypto';

/**
 * CUFE / CUDE según el Anexo Técnico de Factura Electrónica de Venta (v1.9) y el
 * Anexo Técnico del Documento Equivalente Electrónico (Res. DIAN 000165 de 2023).
 *
 *  CUFE (factura, tipo 01) = SHA-384(NumFac + FecFac + HorFac + ValFac + 01 + ValIva + 04 + ValINC + 03 + ValICA + ValTot + NitOFE + NumAdq + ClaveTécnica + TipoAmbiente)
 *  CUDE (POS 20, notas)    = SHA-384(... mismo orden ... + Software-PIN + TipoAmbiente)
 *
 * Valores con dos decimales y punto decimal. Hora en formato HH:MM:SS-05:00.
 * Verifique la versión vigente del anexo con su proveedor tecnológico antes de producción.
 */
export type CufeInput = {
  number: string;        // prefijo + consecutivo, ej. "SETP990000001"
  date: string;          // YYYY-MM-DD
  time: string;          // HH:MM:SS-05:00
  lineExtension: number; // subtotal antes de impuestos
  iva: number; inc?: number; ica?: number;
  total: number;         // valor a pagar
  issuerNit: string;     // sin DV
  buyerId: string;       // 222222222222 para consumidor final
  key: string;           // Clave técnica (CUFE) o PIN del software (CUDE)
  environment: '1' | '2';
};

export const money = (n: number) => n.toFixed(2);

export function cufeString(i: CufeInput) {
  return i.number + i.date + i.time + money(i.lineExtension) +
    '01' + money(i.iva) + '04' + money(i.inc || 0) + '03' + money(i.ica || 0) +
    money(i.total) + i.issuerNit + i.buyerId + i.key + i.environment;
}
export function computeCufe(i: CufeInput) {
  return createHash('sha384').update(cufeString(i), 'utf8').digest('hex');
}
/** Código de seguridad del software: SHA-384(SoftwareID + PIN + NúmeroDocumento) */
export function softwareSecurityCode(softwareId: string, pin: string, number: string) {
  return createHash('sha384').update(softwareId + pin + number, 'utf8').digest('hex');
}
export function qrUrl(cufe: string, env: '1' | '2') {
  const host = env === '1' ? 'https://catalogo-vpfe.dian.gov.co' : 'https://catalogo-vpfe-hab.dian.gov.co';
  return `${host}/document/searchqr?documentkey=${cufe}`;
}
/** Dígito de verificación del NIT (algoritmo DIAN, pesos primos) */
export function nitDv(nit: string) {
  const w = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
  const d = nit.replace(/\D/g, '').split('').reverse();
  const s = d.reduce((a, c, i) => a + Number(c) * w[i], 0) % 11;
  return String(s > 1 ? 11 - s : s);
}
