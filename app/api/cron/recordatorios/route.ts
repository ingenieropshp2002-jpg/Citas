import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createHmac, timingSafeEqual } from 'crypto';
import { runAutomations } from '@/lib/automations';

/** Clave del cron de Cloudflare (custom-worker.ts la calcula igual con WebCrypto). */
const internalKey = () => process.env.AUTH_SECRET ? createHmac('sha256', process.env.AUTH_SECRET).update('cron-interno').digest('base64url') : '';
const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
// Lo llama cada 10 minutos el cron de Cloudflare (scheduled en custom-worker.ts) con Authorization: Bearer cron:<clave interna>.
// También acepta Bearer <CRON_SECRET> para llamarlo desde fuera.
// Envía recordatorios con pedido de confirmación, saludos de cumpleaños y actualiza el estado de las pruebas gratis.
export async function GET(req: NextRequest) {
  // La clave puede venir de Cloudflare (CRON_SECRET) o de la base de datos (la usa el pg_cron de Supabase).
  const auth = req.headers.get('authorization') || '';
  const dbSecret = await db.platformSetting.findUnique({ where: { key: 'cronSecret' } }).then(r => (r ? JSON.parse(r.value) as string : '')).catch(() => '');
  const ik = internalKey();
  const ok = (ik && same(auth, `Bearer cron:${ik}`)) || [process.env.CRON_SECRET, dbSecret].some(s => s && s.length >= 24 && same(auth, `Bearer ${s}`));
  if (!ok) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const out = { reminders: 0, birthdays: 0, reviews: 0, businesses: 0 };
  for (const b of await db.business.findMany({ where: { active: true }, select: { id: true } })) {
    try { const r = await runAutomations(b.id); out.reminders += r.reminders; out.birthdays += r.birthdays; out.reviews += r.reviews; out.businesses++; } catch (e) { console.error('[cron]', b.id, e); }
  }
  const waitlistExpired = await (await import('@/lib/espera')).expireWaitlist().catch(() => 0);
  const gcal = await (await import('@/lib/gcal')).syncAllGcal().catch(e => { console.error('[cron gcal]', e); return 0; });
  const charged = await (await import('@/lib/billing')).chargeDueSubscriptions().catch(e => { console.error('[cron cobro]', e); return 0; });
  const resumenes = await (await import('@/lib/avisos')).resumenesDelDia().catch(e => { console.error('[cron resumen]', e); return 0; });
  return NextResponse.json({ ok: true, ...out, waitlistExpired, gcal, charged, resumenes });
}
