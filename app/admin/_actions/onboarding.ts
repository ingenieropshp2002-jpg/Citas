'use server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
import { markOnboarding, SUGGESTED } from '@/lib/onboarding';

const STEPS = ['horario', 'equipo', 'compartir'];

export async function markGuideStep(key: string) {
  const { business } = await requireBusiness();
  if (!STEPS.includes(key)) return;
  await markOnboarding(business.id, { done: key });
  revalidatePath('/admin');
}

export async function setGuideHidden(hidden: boolean) {
  const { business } = await requireBusiness();
  await markOnboarding(business.id, { hidden });
  revalidatePath('/admin');
}

/** Crea los servicios sugeridos para su tipo de negocio (solo si todavía no tiene ninguno). */
export async function loadSuggestedServices() {
  const { business } = await requireBusiness('servicios');
  if (await db.service.count({ where: { businessId: business.id } })) return { error: 'Ya tienes servicios creados.' };
  const list = SUGGESTED[business.category] || SUGGESTED.PELUQUERIA;
  const staff = await db.staff.findMany({ where: { businessId: business.id, active: true }, select: { id: true } });
  for (const [i, s] of list.entries()) {
    const svc = await db.service.create({ data: { ...s, businessId: business.id, popular: i < 2 } });
    if (staff.length) await db.serviceStaff.createMany({ data: staff.map(st => ({ serviceId: svc.id, staffId: st.id })) });
  }
  revalidatePath('/admin'); revalidatePath('/admin/servicios');
  return { ok: true, count: list.length };
}
