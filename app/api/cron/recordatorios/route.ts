import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendRemindersFor } from '@/app/panel/_actions/agenda';
// Llamar cada 15 minutos (Vercel Cron, cron-job.org, etc.) con el encabezado Authorization: Bearer <CRON_SECRET>
export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  let total = 0;
  for (const b of await db.business.findMany({ where: { active: true }, select: { id: true } })) total += await sendRemindersFor(b.id);
  return NextResponse.json({ ok: true, sent: total });
}
