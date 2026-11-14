'use server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
import { sendWhatsapp } from '@/lib/notify';
import { bogota } from '@/lib/format';

export async function saveCampaign(_: unknown, fd: FormData) {
  const { business } = await requireBusiness('marketing');
  await db.campaign.create({ data: { businessId: business.id, name: String(fd.get('name')), audience: String(fd.get('audience')), message: String(fd.get('message')), couponCode: String(fd.get('couponCode') || '') || null, channel: 'WHATSAPP' } });
  revalidatePath('/panel/marketing');
  return { ok: true };
}

export async function audience(businessId: string, kind: string) {
  const all = await db.customer.findMany({ where: { businessId, phone: { not: null } } });
  const now = new Date(); const m = bogota(now).m;
  if (kind === 'INACTIVOS') return all.filter(c => !c.lastVisit || now.getTime() - c.lastVisit.getTime() > 60 * 86400000);
  if (kind === 'CUMPLEANOS') return all.filter(c => c.birthday && bogota(c.birthday).m === m);
  if (kind === 'NUEVOS') return all.filter(c => c.visits <= 1);
  return all;
}

export async function sendCampaign(id: string) {
  const { business } = await requireBusiness('marketing');
  const c = await db.campaign.findFirst({ where: { id, businessId: business.id } });
  if (!c) return { error: 'Campaña no encontrada' };
  const list = await audience(business.id, c.audience);
  const link = `${process.env.APP_URL || ''}/negocio/${business.slug}`;
  for (const cu of list) await sendWhatsapp(cu.phone!, c.message.replaceAll('{nombre}', cu.name.split(' ')[0]).replaceAll('{link}', link).replaceAll('{cupon}', c.couponCode || '').replaceAll('{negocio}', business.name));
  await db.campaign.update({ where: { id }, data: { status: 'ENVIADA', sentCount: c.sentCount + list.length } });
  revalidatePath('/panel/marketing');
  return { ok: true, sent: list.length };
}

export async function saveCoupon(_: unknown, fd: FormData) {
  const { business } = await requireBusiness('marketing');
  const code = String(fd.get('code') || '').toUpperCase().replace(/\s/g, '');
  if (!code) return { error: 'Código obligatorio' };
  if (await db.coupon.findFirst({ where: { businessId: business.id, code } })) return { error: 'Ese código ya existe' };
  await db.coupon.create({ data: { businessId: business.id, code, type: String(fd.get('type')), value: Number(fd.get('value')), maxUses: fd.get('maxUses') ? Number(fd.get('maxUses')) : null, validUntil: fd.get('validUntil') ? new Date(String(fd.get('validUntil')) + 'T23:59:59-05:00') : null } });
  revalidatePath('/panel/marketing');
  return { ok: true };
}
export async function toggleCoupon(id: string) {
  const { business } = await requireBusiness('marketing');
  const c = await db.coupon.findFirst({ where: { id, businessId: business.id } });
  if (c) await db.coupon.update({ where: { id }, data: { active: !c.active } });
  revalidatePath('/panel/marketing');
}
