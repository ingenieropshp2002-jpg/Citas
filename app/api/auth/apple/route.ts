import { NextRequest, NextResponse } from 'next/server';
import { APPLE_REDIRECT, appleConfigured, appleState } from '@/lib/apple';
export async function GET(req: NextRequest) {
  const app = (process.env.APP_URL || req.nextUrl.origin).replace(/\/$/, '');
  if (!appleConfigured()) return NextResponse.redirect(`${app}/login`);
  const q = new URLSearchParams({ client_id: process.env.APPLE_CLIENT_ID!, redirect_uri: APPLE_REDIRECT(), response_type: 'code', response_mode: 'form_post', scope: 'name email', state: await appleState(req.nextUrl.searchParams.get('next') || '/') });
  return NextResponse.redirect(`https://appleid.apple.com/auth/authorize?${q}`);
}
