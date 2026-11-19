'use server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';

/** Logo, color y nombre corto de la app instalable del negocio. */
export async function saveAppBrand(_: unknown, fd: FormData) {
  const { business } = await requireBusiness('configuracion');
  const logo = String(fd.get('logo') || '');
  if (logo && !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(logo)) return { error: 'El logo debe ser una imagen JPG, PNG o WEBP.' };
  if (logo.length > 600_000) return { error: 'El logo pesa demasiado.' };
  const color = String((fd.get('appColor') === 'custom' ? fd.get('appColorCustom') : fd.get('appColor')) || '').trim();
  if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) return { error: 'Color no válido.' };
  const short = String(fd.get('appShortName') || '').trim().slice(0, 14);
  await db.business.update({ where: { id: business.id }, data: { logo: logo || null, appColor: color.toLowerCase() || null, appShortName: short || null } });
  revalidatePath('/admin/app'); revalidatePath(`/negocio/${business.slug}`);
  return { ok: true, message: 'Guardado. Quienes ya la instalaron verán el ícono nuevo cuando su teléfono actualice la app.' };
}
