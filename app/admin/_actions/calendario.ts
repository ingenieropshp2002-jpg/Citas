'use server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
import { syncStaff } from '@/lib/gcal';

async function own(staffId: string) {
  const { business, perms, staffId: me } = await requireBusiness();
  const st = await db.staff.findFirst({ where: { id: staffId, businessId: business.id }, select: { id: true } });
  if (!st || (perms !== 'ALL' && st.id !== me && !perms.includes('equipo'))) throw new Error('Sin permiso');
  return st.id;
}
export async function disconnectGcal(staffId: string) {
  const id = await own(staffId);
  await db.staff.update({ where: { id }, data: { gcalToken: null, gcalEmail: null, gcalError: null } });
  await db.appointment.updateMany({ where: { staffId: id, gcalEventId: { not: null } }, data: { gcalEventId: null, gcalHash: null } });
  revalidatePath('/admin/calendario');
}
export async function syncNow(staffId: string) {
  const id = await own(staffId);
  const n = await syncStaff(id);
  revalidatePath('/admin/calendario');
  return n;
}
