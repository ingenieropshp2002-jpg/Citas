import { NextRequest, NextResponse } from 'next/server';
import { linkCel, rememberDevice } from '@/lib/celular';

// Enlace personal de Mis citas: recuerda este dispositivo y abre la lista.
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const app = (process.env.APP_URL || req.nextUrl.origin).replace(/\/$/, '');
  const phone = await linkCel((await params).token);
  if (phone) await rememberDevice(phone);
  return NextResponse.redirect(`${app}/mis-citas${phone ? '' : '?enlace=vencido'}`, { headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
}
