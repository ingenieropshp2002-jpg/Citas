import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSession } from '@/lib/auth';
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code'); const state = req.nextUrl.searchParams.get('state') || '/';
  const app = process.env.APP_URL || req.nextUrl.origin;
  if (!code) return NextResponse.redirect(`${app}/login`);
  const tok = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, redirect_uri: `${app}/api/auth/google/callback`, grant_type: 'authorization_code' }) }).then(r => r.json());
  const info = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${tok.access_token}` } }).then(r => r.json());
  if (!info.sub) return NextResponse.redirect(`${app}/login`);
  let user = await db.user.findFirst({ where: { OR: [{ googleId: info.sub }, ...(info.email ? [{ email: info.email }] : [])] } });
  if (!user) user = await db.user.create({ data: { googleId: info.sub, email: info.email, name: info.name || info.email, avatar: info.picture } });
  else if (!user.googleId) user = await db.user.update({ where: { id: user.id }, data: { googleId: info.sub } });
  await createSession(user.id);
  return NextResponse.redirect(`${app}${state.startsWith('/') && !state.startsWith('//') ? state : '/'}`);
}
