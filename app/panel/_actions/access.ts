'use server';
import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
import { resetLink } from '@/lib/reset';
import { waLink } from '@/lib/notify';

/** Arma un mensaje de WhatsApp con un enlace para que el cliente cree o cambie su contraseña. */
export async function customerAccessLink(customerId: string) {
  const { business: b } = await requireBusiness('clientes');
  const c = await db.customer.findFirst({ where: { id: customerId, businessId: b.id } });
  if (!c) return { error: 'Cliente no encontrado.' };
  if (!c.phone) return { error: 'El cliente no tiene celular registrado.' };
  const user = c.userId ? await db.user.findUnique({ where: { id: c.userId } })
    : c.email ? await db.user.findUnique({ where: { email: c.email.toLowerCase() } }) : null;
  const first = c.name.split(' ')[0];
  if (!user) {
    const reg = `${(process.env.APP_URL || '').replace(/\/$/, '')}/registro?next=${encodeURIComponent(`/negocio/${b.slug}`)}`;
    return { url: waLink(c.phone, `Hola ${first}, crea tu cuenta en ${b.name} para reservar y ver tus citas: ${reg}`), created: false };
  }
  const link = await resetLink(user, `/negocio/${b.slug}`);
  return { url: waLink(c.phone, `Hola ${first}, este es tu enlace para crear tu contraseña en ${b.name}. Vence en 24 horas: ${link}`), created: true };
}
