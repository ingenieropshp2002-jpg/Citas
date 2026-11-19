'use server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { ownedBusinesses, requireBusiness, requireUser, SEDE_COOKIE } from '@/lib/auth';

/** Cambia la sede que se administra en el panel. */
export async function switchSede(fd: FormData) {
  const user = await requireUser('/admin');
  const id = String(fd.get('id') || '');
  const { list } = await ownedBusinesses(user.id);
  if (list.some(b => b.id === id)) (await cookies()).set(SEDE_COOKIE, id, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 365 });
  redirect('/admin');
}

/** Solo el dueño (no los profesionales) maneja las sedes. */
async function requireOwner() {
  const ctx = await requireBusiness('configuracion', { allowExpired: true });
  if (ctx.staffId) redirect('/admin?sinpermiso=1');
  const { list } = await ownedBusinesses(ctx.user.id);
  const principal = list.find(b => !b.parentId) || list[0];
  return { ...ctx, list, principal };
}

/** Crea una sede nueva copiando la configuración (y si se pide, los servicios) de la sede actual. */
export async function createSede(_: unknown, fd: FormData) {
  const { user, business: from, principal } = await requireOwner();
  const name = String(fd.get('name') || '').trim().slice(0, 80);
  const address = String(fd.get('address') || '').trim().slice(0, 160);
  if (!name || !address) return { error: 'Escribe el nombre y la dirección de la sede.' };
  const base = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'sede';
  let slug = base; let i = 1; while (await db.business.findFirst({ where: { slug }, select: { id: true } })) slug = `${base}-${++i}`;
  const {
    id: _id, slug: _s, name: _n, address: _a, zone: _z, lat: _lat, lng: _lng, rating: _r, reviewCount: _rc, createdAt: _c, queueOpenDate: _q, waPhoneId: _w, parentId: _p, ...rest
  } = from;
  const city = String(fd.get('city') || '').trim() || from.city;
  const phone = String(fd.get('phone') || '').replace(/\D/g, '') || from.phone;
  const b = await db.business.create({ data: {
    ...rest, name, slug, address, city, zone: String(fd.get('zone') || '').trim() || null, phone, whatsapp: phone,
    ownerId: user.id, parentId: principal.id,
    // La suscripción es una sola para todas las sedes: se copia de la principal.
    plan: principal.plan, subscriptionStatus: principal.subscriptionStatus, trialEndsAt: principal.trialEndsAt, paidUntil: principal.paidUntil
  } });
  await db.dianConfig.create({ data: { businessId: b.id } });
  if (fd.get('copyServices')) {
    const svcs = await db.service.findMany({ where: { businessId: from.id, active: true } });
    if (svcs.length) await db.service.createMany({ data: svcs.map(({ id: _x, businessId: _b, ...s }) => ({ ...s, businessId: b.id })) });
  }
  (await cookies()).set(SEDE_COOKIE, b.id, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 365 });
  revalidatePath('/admin', 'layout');
  redirect('/admin/configuracion?sede=1');
}
