// Abono por transferencia: plazo, comprobante privado y quién puede verlo.
import { db } from './db';

export const PROOF_MAX = 5 * 1024 * 1024;
export const DEPOSIT_NOTE = 'Cupo liberado: no pagó el abono a tiempo';
export const DEADLINES = [30, 60, 90, 120, 180, 240];

/** Plazo para pagar: N minutos desde ahora, sin pasar de la hora de la cita. */
export const depositDue = (minutes: number, start: Date, now = new Date()) => new Date(Math.min(now.getTime() + minutes * 60000, start.getTime()));

/** Tipo real del archivo según sus primeros bytes (no se confía en el nombre ni en lo que diga el navegador). */
export function sniffMime(b: Uint8Array): string | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return 'application/pdf';
  return null;
}

/** ¿Esta persona puede ver o subir el comprobante? El cliente de la cita, el dueño o alguien del equipo con agenda. */
export async function proofAccess(userId: string, a: { businessId: string; customer: { userId: string | null } }) {
  if (a.customer.userId === userId) return 'CLIENTE' as const;
  const own = await db.business.findFirst({ where: { id: a.businessId, ownerId: userId }, select: { id: true } });
  if (own) return 'NEGOCIO' as const;
  const st = await db.staff.findUnique({ where: { userId }, select: { businessId: true, permissions: true } });
  if (st?.businessId === a.businessId) { try { if ((JSON.parse(st.permissions) as string[]).includes('agenda')) return 'NEGOCIO' as const; } catch {} }
  return null;
}
