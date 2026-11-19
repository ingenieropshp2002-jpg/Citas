'use server';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireSuperAdmin, startImpersonation, stopImpersonation } from '@/lib/auth';
import { DEFAULT_SETTINGS, saveSettings, type Plan } from '@/lib/settings';
import { resetLink } from '@/lib/reset';

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const num = (fd: FormData, k: string, d = 0) => { const n = Number(str(fd, k).replace(/[^\d.-]/g, '')); return Number.isFinite(n) && str(fd, k) !== '' ? n : d; };
const date = (fd: FormData, k: string) => { const v = str(fd, k); return v ? new Date(`${v}T23:59:00-05:00`) : null; };

export async function saveSettingsAction(_: unknown, fd: FormData) {
  await requireSuperAdmin();
  const appName = str(fd, 'appName');
  if (appName.length < 2) return { error: 'El nombre de la app debe tener al menos 2 caracteres.' };
  const plans: Plan[] = DEFAULT_SETTINGS.plans.map(p => ({ id: p.id, name: str(fd, `plan_${p.id}_name`) || p.name, price: Math.max(0, Math.round(num(fd, `plan_${p.id}_price`, p.price))), priceYear: Math.max(0, Math.round(num(fd, `plan_${p.id}_priceYear`, p.priceYear ?? p.price * 10))), desc: str(fd, `plan_${p.id}_desc`) || p.desc, maxStaff: Math.max(0, Math.round(num(fd, `plan_${p.id}_maxStaff`, p.maxStaff ?? 0))) }));
  const logo = str(fd, 'logoUrl');
  if (logo && !/^(https:\/\/|data:image\/)/.test(logo)) return { error: 'El logo debe ser una dirección https:// o una imagen subida.' };
  await saveSettings({
    appName, shortName: (str(fd, 'shortName') || appName).slice(0, 14), tagline: str(fd, 'tagline'), logoUrl: logo,
    supportWhatsapp: str(fd, 'supportWhatsapp').replace(/\D/g, ''), supportEmail: str(fd, 'supportEmail'),
    heroBadge: str(fd, 'heroBadge'), heroTitle: str(fd, 'heroTitle') || DEFAULT_SETTINGS.heroTitle, heroSubtitle: str(fd, 'heroSubtitle'),
    businessTitle: str(fd, 'businessTitle') || DEFAULT_SETTINGS.businessTitle, businessSubtitle: str(fd, 'businessSubtitle'),
    announcement: str(fd, 'announcement'), registrationsOpen: fd.get('registrationsOpen') === 'on',
    trialDays: Math.min(365, Math.max(0, Math.round(num(fd, 'trialDays', 14)))), plans
  });
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function saveBusinessAction(_: unknown, fd: FormData) {
  await requireSuperAdmin();
  const id = str(fd, 'id');
  const slug = str(fd, 'slug').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!str(fd, 'name')) return { error: 'El nombre es obligatorio.' };
  if (!slug) return { error: 'El enlace es obligatorio.' };
  if (await db.business.findFirst({ where: { slug, id: { not: id } } })) return { error: 'Ese enlace ya lo usa otro negocio.' };
  const ownerEmail = str(fd, 'ownerEmail').toLowerCase();
  let ownerId: string | undefined;
  if (ownerEmail) { const o = await db.user.findUnique({ where: { email: ownerEmail } }); if (!o) return { error: 'No hay ningún usuario con el correo del nuevo dueño.' }; ownerId = o.id; }
  await db.business.update({ where: { id }, data: {
    name: str(fd, 'name'), slug, category: str(fd, 'category'), tagline: str(fd, 'tagline') || null, description: str(fd, 'description'),
    city: str(fd, 'city'), zone: str(fd, 'zone') || null, address: str(fd, 'address'), phone: str(fd, 'phone') || null, whatsapp: str(fd, 'whatsapp') || null,
    instagram: str(fd, 'instagram') || null, logo: str(fd, 'logo') || null, rating: Math.min(5, Math.max(0, num(fd, 'rating'))), reviewCount: Math.max(0, Math.round(num(fd, 'reviewCount'))),
    plan: str(fd, 'plan'), subscriptionStatus: str(fd, 'subscriptionStatus'), trialEndsAt: date(fd, 'trialEndsAt'), paidUntil: date(fd, 'paidUntil'),
    active: fd.get('active') === 'on', ...(ownerId ? { ownerId } : {})
  } });
  if (ownerId) await db.user.update({ where: { id: ownerId }, data: { role: 'OWNER' } });
  revalidatePath('/superadmin', 'layout'); revalidatePath(`/negocio/${slug}`);
  return { ok: true };
}

export async function saveUserAction(_: unknown, fd: FormData) {
  const me = await requireSuperAdmin();
  const id = str(fd, 'id');
  const email = str(fd, 'email').toLowerCase() || null; const phone = str(fd, 'phone').replace(/\D/g, '') || null;
  if (!str(fd, 'name')) return { error: 'El nombre es obligatorio.' };
  if (email && await db.user.findFirst({ where: { email, id: { not: id } } })) return { error: 'Ese correo ya lo usa otra cuenta.' };
  if (phone && await db.user.findFirst({ where: { phone, id: { not: id } } })) return { error: 'Ese celular ya lo usa otra cuenta.' };
  const superAdmin = fd.get('superAdmin') === 'on'; const blocked = fd.get('blocked') === 'on';
  if (id === me.id && (!superAdmin || blocked)) return { error: 'No puedes quitarte el acceso de superadmin ni suspender tu propia cuenta.' };
  const pass = str(fd, 'password');
  if (pass && pass.length < 8) return { error: 'La nueva contraseña debe tener al menos 8 caracteres.' };
  await db.user.update({ where: { id }, data: { name: str(fd, 'name'), email, phone, role: str(fd, 'role'), superAdmin, blocked, ...(pass ? { passwordHash: await bcrypt.hash(pass, 10) } : {}) } });
  revalidatePath('/superadmin/usuarios');
  return { ok: true };
}

export async function userResetLinkAction(id: string) {
  await requireSuperAdmin();
  const u = await db.user.findUnique({ where: { id } });
  if (!u) return { error: 'Usuario no encontrado.' };
  return { link: await resetLink(u) };
}

export async function impersonateAction(fd: FormData) {
  const me = await requireSuperAdmin();
  const target = str(fd, 'userId');
  if (!target || target === me.id) redirect('/admin');
  await startImpersonation(me.id, target);
  redirect(str(fd, 'to') || '/admin');
}

export async function stopImpersonationAction() {
  const admin = await stopImpersonation();
  redirect(admin ? '/superadmin' : '/');
}

export async function deleteBusinessAction(_: unknown, fd: FormData) {
  await requireSuperAdmin();
  const id = str(fd, 'id');
  const b = await db.business.findUnique({ where: { id }, select: { name: true, slug: true } });
  if (!b) return { error: 'El negocio ya no existe.' };
  if (str(fd, 'confirm') !== b.name.trim()) return { error: 'Escribe el nombre exacto del negocio para confirmar.' };
  await db.$transaction([
    db.appointmentService.deleteMany({ where: { appointment: { businessId: id } } }),
    db.appointment.deleteMany({ where: { businessId: id } }),
    db.business.delete({ where: { id } })
  ]);
  revalidatePath('/superadmin', 'layout'); revalidatePath('/'); revalidatePath(`/negocio/${b.slug}`);
  redirect('/superadmin/negocios?eliminado=1');
}

/** Registra un pago de suscripción recibido por fuera (transferencia, efectivo) y reactiva el negocio. */
export async function registerPaymentAction(_: unknown, fd: FormData) {
  await requireSuperAdmin();
  const b = await db.business.findUnique({ where: { id: str(fd, 'id') } });
  if (!b) return { error: 'El negocio ya no existe.' };
  const months = Math.min(12, Math.max(1, Math.round(num(fd, 'months', 1))));
  const plan = str(fd, 'plan') || b.plan;
  const amount = Math.max(0, Math.round(num(fd, 'amount', 0)));
  const now = Date.now();
  const base = Math.max(now, b.paidUntil?.getTime() || 0);
  const paidUntil = new Date(base + (months === 12 ? 365 : months * 30) * 86400000);
  await db.$transaction([
    db.payment.create({ data: { businessId: b.id, method: str(fd, 'method') || 'TRANSFERENCIA', amount, status: 'APROBADO', provider: 'MANUAL', providerRef: `SUB-${plan}-ADMIN-${now}` } }),
    db.business.update({ where: { id: b.id }, data: { plan, subscriptionStatus: 'ACTIVA', paidUntil } })
  ]);
  revalidatePath('/superadmin', 'layout');
  return { ok: true };
}
