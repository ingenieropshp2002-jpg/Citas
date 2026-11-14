import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Diagnóstico: indica si hay variables configuradas y si la base de datos responde (no muestra valores secretos).
export async function GET() {
  const env = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    AUTH_SECRET: !!process.env.AUTH_SECRET,
    APP_URL: process.env.APP_URL || null,
    DB_SCHEMA: process.env.DB_SCHEMA || null,
    dbHost: (process.env.DATABASE_URL || '').split('@')[1]?.split('/')[0] || null
  };
  try {
    const users = await db.user.count();
    return NextResponse.json({ ok: true, env, users });
  } catch (e) {
    const err = e as Error;
    return NextResponse.json({ ok: false, env, error: err.name, message: String(err.message).slice(0, 500) }, { status: 500 });
  }
}
