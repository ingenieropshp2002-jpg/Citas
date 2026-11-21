import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signIn } from '@/lib/auth';
import { appleIdentity, readAppleState } from '@/lib/apple';

// Apple devuelve el código con un POST (response_mode=form_post). El nombre solo llega la primera vez.
export async function POST(req: NextRequest) {
  const app = (process.env.APP_URL || req.nextUrl.origin).replace(/\/$/, '');
  const fd = await req.formData();
  const next = await readAppleState(String(fd.get('state') || ''));
  const code = String(fd.get('code') || '');
  if (!next || !code) return NextResponse.redirect(`${app}/login`, 303);
  const id = await appleIdentity(code).catch(() => null);
  if (!id) return NextResponse.redirect(`${app}/login`, 303);
  let name = '';
  try { const u = JSON.parse(String(fd.get('user') || '{}')); name = [u.name?.firstName, u.name?.lastName].filter(Boolean).join(' '); } catch { /* sin nombre */ }
  let user = await db.user.findFirst({ where: { OR: [{ appleId: id.sub }, ...(id.email ? [{ email: id.email }] : [])] } });
  if (user?.blocked) return NextResponse.redirect(`${app}/login`, 303);
  if (!user) user = await db.user.create({ data: { appleId: id.sub, email: id.email, name: name || (id.email ? id.email.split('@')[0] : 'Cliente') } });
  else if (!user.appleId) user = await db.user.update({ where: { id: user.id }, data: { appleId: id.sub } });
  return NextResponse.redirect(`${app}${await signIn(user.id, next)}`, 303);
}
