import { NextRequest, NextResponse } from 'next/server';
export async function GET(req: NextRequest) {
  const next = req.nextUrl.searchParams.get('next') || '/';
  const q = new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID || '', redirect_uri: `${process.env.APP_URL}/api/auth/google/callback`, response_type: 'code', scope: 'openid email profile', state: next, prompt: 'select_account' });
  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${q}`);
}
