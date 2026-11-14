// Cálculo de IVA en Colombia. Los precios se manejan con IVA incluido (como se exhiben al público).
export function splitTax(grossTotal: number, ratePct: number) {
  if (!ratePct) return { base: grossTotal, tax: 0 };
  const base = Math.round(grossTotal / (1 + ratePct / 100));
  return { base, tax: grossTotal - base };
}

export type LineIn = { unitPrice: number; quantity: number; discount?: number; taxRate: number };
export function computeLine(l: LineIn) {
  const gross = Math.round(l.unitPrice * l.quantity) - (l.discount || 0);
  const { base, tax } = splitTax(Math.max(gross, 0), l.taxRate);
  return { total: Math.max(gross, 0), base, taxAmount: tax };
}

export function summarize(lines: { base: number; taxAmount: number; taxRate: number; total: number }[]) {
  const byRate = new Map<number, { base: number; tax: number }>();
  for (const l of lines) {
    const r = byRate.get(l.taxRate) || { base: 0, tax: 0 };
    r.base += l.base; r.tax += l.taxAmount; byRate.set(l.taxRate, r);
  }
  const subtotal = lines.reduce((a, l) => a + l.base, 0);
  const taxTotal = lines.reduce((a, l) => a + l.taxAmount, 0);
  const total = lines.reduce((a, l) => a + l.total, 0);
  return { subtotal, taxTotal, total, byRate: [...byRate.entries()].map(([rate, v]) => ({ rate, ...v })) };
}
