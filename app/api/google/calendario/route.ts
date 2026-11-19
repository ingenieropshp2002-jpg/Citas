import { NextRequest, NextResponse } from 'next/server';
import { requireBusiness } from '@/lib/auth';
import { db } from '@/lib/db';
import { authUrl, gcalConfigured } from '@/lib/gcal';

// Inicia la conexión del Google Calendar de un profesional (lo abre el dueño o el mismo profesional).
export async function GET(req: NextRequest) {
  const { business, staffId: me, perms } = await requireBusiness();
  const staff = req.nextUrl.searchParams.get('staff') || me || '';
  const back = new URL('/admin/calendario', req.url);
  if (!gcalConfigured()) { back.searchParams.set('error', 'sin-credenciales'); return NextResponse.redirect(back); }
  const st = await db.staff.findFirst({ where: { id: staff, businessId: business.id }, select: { id: true } });
  if (!st || (perms !== 'ALL' && st.id !== me && !perms.includes('equipo'))) { back.searchParams.set('error', 'permiso'); return NextResponse.redirect(back); }
  return NextResponse.redirect(authUrl(st.id));
}
