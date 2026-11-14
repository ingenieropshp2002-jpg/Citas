import { NextRequest, NextResponse } from 'next/server';
import { getSlots } from '@/lib/availability';
import { db } from '@/lib/db';
import { addDays, ymd } from '@/lib/format';

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const businessId = p.get('b')!; const dur = Number(p.get('dur') || 30);
  const staff = p.get('staff') || null; const services = (p.get('servicios') || '').split(',').filter(Boolean);
  if (!(await db.business.findUnique({ where: { id: businessId } }))) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
  if (p.get('dias')) {
    // Resumen de disponibilidad para la tira de fechas
    const start = p.get('desde') || ymd(new Date()); const n = Math.min(Number(p.get('dias')), 31);
    const out: Record<string, number> = {};
    for (let i = 0; i < n; i++) { const d = addDays(start, i); out[d] = (await getSlots(businessId, d, dur, staff, services)).length; }
    return NextResponse.json({ days: out });
  }
  return NextResponse.json({ slots: await getSlots(businessId, p.get('fecha')!, dur, staff, services) });
}
