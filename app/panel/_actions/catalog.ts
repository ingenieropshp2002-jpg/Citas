'use server';
import { fromBogota } from '@/lib/format';
import { TRIAL_DAYS } from '@/lib/subscription';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { requireBusiness, requireUser } from '@/lib/auth';

const int = (v: FormDataEntryValue | null, d = 0) => { const n = Number(String(v ?? '').replace(/[^\d.-]/g, '')); return Number.isFinite(n) ? Math.round(n) : d; };
const hoursFrom = (fd: FormData, prefix: string) => {
  const o: Record<string, [string, string] | null> = {};
  for (let d = 0; d < 7; d++) o[String(d)] = fd.get(`${prefix}on${d}`) ? [String(fd.get(`${prefix}from${d}`) || '08:00'), String(fd.get(`${prefix}to${d}`) || '18:00')] : null;
  return JSON.stringify(o);
};

// ───── Clientes ─────
export async function saveCustomer(_: unknown, fd: FormData) {
  const { business } = await requireBusiness('clientes');
  const id = String(fd.get('id') || '');
  const data = { name: String(fd.get('name')).trim(), phone: String(fd.get('phone') || '').replace(/\D/g, '') || null, email: String(fd.get('email') || '') || null, docType: String(fd.get('docType') || '13'), docNumber: String(fd.get('docNumber') || '') || null, notes: String(fd.get('notes') || '') || null, preferences: String(fd.get('preferences') || '') || null, tags: JSON.stringify(String(fd.get('tags') || '').split(',').map(t => t.trim()).filter(Boolean)), birthday: fd.get('birthday') ? fromBogota(String(fd.get('birthday')), '12:00') : null };
  if (!data.name) return { error: 'El nombre es obligatorio.' };
  if (id) await db.customer.updateMany({ where: { id, businessId: business.id }, data });
  else { const c = await db.customer.create({ data: { ...data, businessId: business.id } }); redirect(`/panel/clientes/${c.id}`); }
  revalidatePath('/panel/clientes');
  return { ok: true };
}

// ───── Servicios ─────
export async function saveService(_: unknown, fd: FormData) {
  const { business } = await requireBusiness('servicios');
  const id = String(fd.get('id') || '');
  const data = { name: String(fd.get('name')).trim(), description: String(fd.get('description') || ''), category: String(fd.get('category') || 'General'), tag: String(fd.get('tag') || '') || null, durationMin: int(fd.get('durationMin'), 30), price: int(fd.get('price')), taxRate: int(fd.get('taxRate'), 19), popular: !!fd.get('popular'), active: !!fd.get('active') };
  if (!data.name || data.durationMin <= 0) return { error: 'Nombre y duración son obligatorios.' };
  const staffIds = fd.getAll('staffIds').map(String);
  const supplies = fd.getAll('supplyProduct').map((p, i) => ({ productId: String(p), quantity: Number(fd.getAll('supplyQty')[i]) })).filter(s => s.productId && s.quantity > 0);
  await db.$transaction(async tx => {
    const s = id ? await tx.service.update({ where: { id, businessId: business.id }, data }) : await tx.service.create({ data: { ...data, businessId: business.id } });
    await tx.serviceStaff.deleteMany({ where: { serviceId: s.id } });
    if (staffIds.length) await tx.serviceStaff.createMany({ data: staffIds.map(staffId => ({ serviceId: s.id, staffId })) });
    await tx.serviceSupply.deleteMany({ where: { serviceId: s.id } });
    if (supplies.length) await tx.serviceSupply.createMany({ data: supplies.map(x => ({ ...x, serviceId: s.id })) });
  });
  revalidatePath('/panel/servicios');
  return { ok: true };
}

// ───── Equipo ─────
export async function saveStaff(_: unknown, fd: FormData) {
  const { business } = await requireBusiness('equipo');
  const id = String(fd.get('id') || '');
  const data = { name: String(fd.get('name')).trim(), title: String(fd.get('title') || 'Profesional'), photo: String(fd.get('photo') || '') || null, color: String(fd.get('color') || '#0d2538'), commissionPct: int(fd.get('commissionPct'), 40), permissions: JSON.stringify(fd.getAll('permissions').map(String)), workHours: fd.get('customHours') ? hoursFrom(fd, 'w') : '{}', daysOff: JSON.stringify(String(fd.get('daysOff') || '').split(',').map(s => s.trim()).filter(s => /^\d{4}-\d{2}-\d{2}$/.test(s))), active: !!fd.get('active') };
  if (!data.name) return { error: 'El nombre es obligatorio.' };
  const email = String(fd.get('loginEmail') || '').toLowerCase().trim(); const pass = String(fd.get('loginPassword') || '');
  let userId: string | undefined;
  if (email) {
    let u = await db.user.findUnique({ where: { email } });
    if (!u) { if (pass.length < 8) return { error: 'Para crear el acceso, la contraseña debe tener al menos 8 caracteres.' }; u = await db.user.create({ data: { email, name: data.name, role: 'STAFF', passwordHash: await bcrypt.hash(pass, 10) } }); }
    const taken = await db.staff.findUnique({ where: { userId: u.id } });
    if (taken && taken.id !== id) return { error: 'Ese correo ya está vinculado a otro profesional.' };
    userId = u.id;
  }
  if (id) await db.staff.update({ where: { id, businessId: business.id }, data: { ...data, ...(userId ? { userId } : {}) } });
  else await db.staff.create({ data: { ...data, businessId: business.id, userId } });
  revalidatePath('/panel/equipo');
  return { ok: true };
}

// ───── Configuración ─────
export async function saveSettings(_: unknown, fd: FormData) {
  const { business } = await requireBusiness('configuracion');
  const images = String(fd.get('images') || '').split('\n').map(s => s.trim()).filter(Boolean);
  await db.business.update({ where: { id: business.id }, data: {
    name: String(fd.get('name')), tagline: String(fd.get('tagline') || ''), description: String(fd.get('description') || ''), category: String(fd.get('category')),
    city: String(fd.get('city')), zone: String(fd.get('zone') || ''), address: String(fd.get('address')), phone: String(fd.get('phone') || ''), whatsapp: String(fd.get('whatsapp') || ''), instagram: String(fd.get('instagram') || ''),
    lat: fd.get('lat') ? Number(fd.get('lat')) : null, lng: fd.get('lng') ? Number(fd.get('lng')) : null, images: JSON.stringify(images),
    openingHours: hoursFrom(fd, 'h'), slotStepMin: int(fd.get('slotStepMin'), 15), cancellationHours: int(fd.get('cancellationHours'), 24), depositPercent: Math.min(100, int(fd.get('depositPercent'), 30)), requireDeposit: !!fd.get('requireDeposit'),
    reminderHours: int(fd.get('reminderHours'), 24), notifyWhatsapp: !!fd.get('notifyWhatsapp'), notifyEmail: !!fd.get('notifyEmail'), autoConfirmRequest: !!fd.get('autoConfirmRequest'), waPhoneId: String(fd.get('waPhoneId') || '').trim() || null
  } });
  revalidatePath('/panel/configuracion');
  return { ok: true };
}

export async function createBusiness(_: unknown, fd: FormData) {
  const user = await requireUser('/panel/registro');
  const name = String(fd.get('name') || '').trim();
  if (!name) return { error: 'Escribe el nombre del negocio.' };
  const base = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  let slug = base; let i = 1; while (await db.business.findUnique({ where: { slug } })) slug = `${base}-${++i}`;
  const h = JSON.stringify({ '1': ['08:00', '19:00'], '2': ['08:00', '19:00'], '3': ['08:00', '19:00'], '4': ['08:00', '19:00'], '5': ['08:00', '19:00'], '6': ['08:00', '18:00'], '0': null });
  const b = await db.business.create({ data: { name, slug, category: String(fd.get('category')), city: String(fd.get('city')), address: String(fd.get('address')), phone: String(fd.get('phone') || ''), whatsapp: String(fd.get('phone') || ''), description: `Bienvenido a ${name}.`, ownerId: user.id, openingHours: h, plan: 'PRO', subscriptionStatus: 'PRUEBA', trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 86400000) } });
  await db.staff.create({ data: { businessId: b.id, name: user.name, title: 'Propietario', userId: null } });
  await db.user.update({ where: { id: user.id }, data: { role: 'OWNER' } });
  await db.dianConfig.create({ data: { businessId: b.id } });
  redirect('/panel/configuracion?nuevo=1');
}
