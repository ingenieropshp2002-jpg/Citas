import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { runAutomations } from '@/lib/automations';
// Lo llama cada 10 minutos el pg_cron de Supabase (job registro_citas_automatizaciones) con el encabezado Authorization: Bearer <CRON_SECRET>.
// Envía recordatorios con pedido de confirmación, saludos de cumpleaños y actualiza el estado de las pruebas gratis.
export async function GET(req: NextRequest) {
  // La clave puede venir de Cloudflare (CRON_SECRET) o de la base de datos (la usa el pg_cron de Supabase).
  const auth = req.headers.get('authorization') || '';
  const dbSecret = await db.platformSetting.findUnique({ where: { key: 'cronSecret' } }).then(r => (r ? JSON.parse(r.value) as string : '')).catch(() => '');
  const ok = [process.env.CRON_SECRET, dbSecret].some(s => s && s.length >= 24 && auth === `Bearer ${s}`);
  if (!ok) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const out = { reminders: 0, birthdays: 0, businesses: 0 };
  for (const b of await db.business.findMany({ where: { active: true }, select: { id: true } })) {
    try { const r = await runAutomations(b.id); out.reminders += r.reminders; out.birthdays += r.birthdays; out.businesses++; } catch (e) { console.error('[cron]', b.id, e); }
  }
  return NextResponse.json({ ok: true, ...out });
}
