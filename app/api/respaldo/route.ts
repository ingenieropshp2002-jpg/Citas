import { NextResponse } from 'next/server';
import { requireBusiness } from '@/lib/auth';
import { db } from '@/lib/db';
import { ymd } from '@/lib/format';

export const dynamic = 'force-dynamic';

// Copia de los datos del negocio en un archivo JSON (solo el dueño). Sin contraseñas, tokens ni fotos.
export async function GET() {
  const { business: b, perms } = await requireBusiness(undefined, { allowExpired: true });
  if (perms !== 'ALL') return NextResponse.json({ error: 'Solo el dueño puede descargar la copia.' }, { status: 403 });
  const id = b.id;
  const since = new Date(Date.now() - 2 * 365 * 86400e3);
  const [services, staff, customers, appointments, sales, products, expenses, prepaids, reviews, records] = await Promise.all([
    db.service.findMany({ where: { businessId: id } }),
    db.staff.findMany({ where: { businessId: id }, select: { id: true, name: true, title: true, commissionPct: true, productCommissionPct: true, workHours: true, daysOff: true, active: true } }),
    db.customer.findMany({ where: { businessId: id } }),
    db.appointment.findMany({ where: { businessId: id, start: { gte: since } }, include: { services: true } }),
    db.sale.findMany({ where: { businessId: id, createdAt: { gte: since } }, include: { items: true } }),
    db.product.findMany({ where: { businessId: id } }),
    db.expense.findMany({ where: { businessId: id, createdAt: { gte: since } } }),
    db.prepaid.findMany({ where: { businessId: id } }),
    db.review.findMany({ where: { businessId: id } }),
    db.clientRecord.findMany({ where: { businessId: id } })
  ]);
  const clean = (o: Record<string, unknown>) => { const { gcalEventId: _a, gcalHash: _b, ...rest } = o; return rest; };
  const { onboarding: _o, ...business } = b as Record<string, unknown>;
  const body = JSON.stringify({ exportedAt: new Date().toISOString(), business, services, staff, customers, appointments: appointments.map(a => clean(a as unknown as Record<string, unknown>)), sales, products, expenses, prepaids, reviews, clientRecords: records });
  return new NextResponse(body, { headers: { 'content-type': 'application/json; charset=utf-8', 'content-disposition': `attachment; filename="respaldo-${b.slug}-${ymd(new Date())}.json"`, 'cache-control': 'no-store' } });
}
