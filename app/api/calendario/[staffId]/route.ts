import { NextRequest } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { icsToken, staffIcs } from '@/lib/gcal';

export const dynamic = 'force-dynamic';

// Calendario privado de un profesional en formato iCal (Google Calendar, Apple o Outlook se suscriben con este enlace).
export async function GET(req: NextRequest, { params }: { params: Promise<{ staffId: string }> }) {
  const { staffId } = await params;
  const t = req.nextUrl.searchParams.get('t') || '';
  const want = icsToken(staffId);
  if (t.length !== want.length || !timingSafeEqual(Buffer.from(t), Buffer.from(want))) return new Response('No autorizado', { status: 401 });
  const ics = await staffIcs(staffId);
  if (!ics) return new Response('No encontrado', { status: 404 });
  return new Response(ics, { headers: { 'content-type': 'text/calendar; charset=utf-8', 'cache-control': 'private, max-age=300', 'content-disposition': 'inline; filename="citas.ics"' } });
}
