import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Quién tiene la sesión abierta (solo nombre y foto). Lo usa el encabezado público, que se guarda en caché
// igual para todos los visitantes y pinta el usuario en el navegador.
export async function GET() {
  const u = await getUser();
  return NextResponse.json(u ? { name: u.name, avatar: u.avatar } : null, { headers: { 'cache-control': 'private, no-store' } });
}
