import { cache } from 'react';
import { isPlatformAdmin, subscriptionState } from './subscription';
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

/** Usuario de la sesión (una sola consulta por petición). */
export const getUser = cache(async function getUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const u = await db.user.findUnique({ where: { id: String(payload.uid) } });
    return u && !u.blocked ? u : null;
  } catch { return null; }
});

/** Superadmin: marcado en la base de datos o incluido en ADMIN_EMAILS. */
export function isSuperAdmin(u: { superAdmin?: boolean; email?: string | null } | null | undefined) {
  return !!u && (!!u.superAdmin || isPlatformAdmin(u.email));
}
export async function requireSuperAdmin() {
  const u = await getUser();
  if (!isSuperAdmin(u)) redirect('/admin/ingresar');
  return u!;
}

// "Entrar como": el superadmin abre la cuenta de un dueño y puede volver a la suya.
const BACK = 'rc_admin_back';
export async function startImpersonation(adminId: string, targetId: string) {
  const t = await new SignJWT({ uid: adminId }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('8h').sign(secret());
  (await cookies()).set(BACK, t, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 8 * 3600 });
  await createSession(targetId);
}
export async function getImpersonator() {
  const t = (await cookies()).get(BACK)?.value;
  if (!t) return null;
  try { const { payload } = await jwtVerify(t, secret()); const u = await db.user.findUnique({ where: { id: String(payload.uid) } }); return isSuperAdmin(u) ? u : null; } catch { return null; }
}
export async function stopImpersonation() {
  const admin = await getImpersonator();
  (await cookies()).delete(BACK);
  if (admin) await createSession(admin.id);
  return admin;
}

export async function requireUser(next = '/') {
  const u = await getUser();
  if (!u) redirect(`/login?next=${encodeURIComponent(next)}`);
  return u;
}

export type Perm = 'agenda' | 'clientes' | 'caja' | 'inventario' | 'reportes' | 'configuracion' | 'marketing' | 'servicios' | 'equipo' | 'facturacion' | 'gastos' | 'fidelizacion';

/** Devuelve el negocio que administra el usuario (dueño o profesional con permisos). */
export async function requireBusiness(perm?: Perm, opts: { allowExpired?: boolean } = {}) {
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
  // Prueba gratis o suscripción vencida: solo puede entrar a la página de suscripción
  if (!opts.allowExpired && subscriptionState(business).state === 'VENCIDA' && !isSuperAdmin(user)) redirect('/panel/suscripcion');
  return { user, business, perms, staffId };
}
