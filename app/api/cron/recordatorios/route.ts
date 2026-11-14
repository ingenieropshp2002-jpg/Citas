import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { runAutomations } from '@/lib/automations';
// Llamar cada 15 minutos (cron-job.org, pg_cron de Supabase, etc.) con el encabezado Authorization: Bearer <CRON_SECRET>.
// Envía recordatorios con pedido de confirmación, saludos de cumpleaños y actualiza el estado de las pruebas gratis.
export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const out = { reminders: 0, birthdays: 0, businesses: 0 };
  for (const b of await db.business.findMany({ where: { active: true }, select: { id: true } })) {
    try { const r = await runAutomations(b.id); out.reminders += r.reminders; out.birthdays += r.birthdays; out.businesses++; } catch (e) { console.error('[cron]', b.id, e); }
  }
  return NextResponse.json({ ok: true, ...out });
}
