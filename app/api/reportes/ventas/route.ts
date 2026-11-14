import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
import { addDays, fromBogota, hm, ymd } from '@/lib/format';
export async function GET(req: NextRequest) {
  const { business: b } = await requireBusiness('reportes');
  const desde = req.nextUrl.searchParams.get('desde') || ymd(new Date()); const hasta = req.nextUrl.searchParams.get('hasta') || desde;
  const sales = await db.sale.findMany({ where: { businessId: b.id, createdAt: { gte: fromBogota(desde), lt: fromBogota(addDays(hasta, 1)) } }, include: { items: { include: { staff: true } }, payments: true, customer: true, documents: true }, orderBy: { createdAt: 'asc' } });
  const rows = [['fecha', 'hora', 'venta', 'documento', 'estado', 'cliente', 'tipo', 'descripcion', 'profesional', 'cantidad', 'base', 'iva', 'total_linea', 'comision', 'medios_pago']];
  for (const s of sales) for (const i of s.items) rows.push([ymd(s.createdAt), hm(s.createdAt), String(s.number), s.documents.find(d => d.docType !== 'NC')?.fullNumber || '', s.status, s.customer?.name || 'Consumidor final', i.kind, i.description, i.staff?.name || '', String(i.quantity), String(i.base), String(i.taxAmount), String(i.total), String(i.commission), s.payments.map(p => `${p.method}:${p.amount}`).join(' ')]);
  const csv = '﻿' + rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(';')).join('\r\n');
  return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="ventas-${desde}-a-${hasta}.csv"` } });
}
