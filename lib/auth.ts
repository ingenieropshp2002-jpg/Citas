import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from './db';

const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET || 'dev-secret-change-me');
const COOKIE = 'rc_session';

export async function createSession(userId: string) {
  const token = await new SignJWT({ uid: userId }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('30d').sign(secret());
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 30 });
}
export async function destroySession() { (await cookies()).delete(COOKIE); }

export async function getUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return await db.user.findUnique({ where: { id: String(payload.uid) } });
  } catch { return null; }
}

export async function requireUser(next = '/') {
  const u = await getUser();
  if (!u) redirect(`/login?next=${encodeURIComponent(next)}`);
  return u;
}

export type Perm = 'agenda' | 'clientes' | 'caja' | 'inventario' | 'reportes' | 'configuracion' | 'marketing' | 'servicios' | 'equipo' | 'facturacion';

/** Devuelve el negocio que administra el usuario (dueño o profesional con permisos). */
export async function requireBusiness(perm?: Perm) {
  const user = await requireUser('/panel');
  let business = await db.business.findFirst({ where: { ownerId: user.id } });
  let perms: string[] | 'ALL' = 'ALL';
  let staffId: string | null = null;
  if (!business) {
    const staff = await db.staff.findUnique({ where: { userId: user.id }, include: { business: true } });
    if (!staff) redirect('/panel/registro');
    business = staff.business; staffId = staff.id;
    try { perms = JSON.parse(staff.permissions); } catch { perms = []; }
  }
  if (perm && perms !== 'ALL' && !perms.includes(perm)) redirect('/panel?sinpermiso=1');
  return { user, business, perms, staffId };
}
