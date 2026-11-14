// Planes y estado de suscripción de cada negocio. Los negocios nuevos tienen 14 días gratis sin tarjeta.
export const TRIAL_DAYS = 14;
export const PLANS = [
  { id: 'BASICO', name: 'Básico', price: Number(process.env.PLAN_PRICE_BASICO || 49900), desc: '1 profesional, agenda, reservas online y recordatorios' },
  { id: 'PRO', name: 'Pro', price: Number(process.env.PLAN_PRICE_PRO || 99900), desc: 'Hasta 8 profesionales, caja POS, inventario, gastos, fidelización y marketing' },
  { id: 'PREMIUM', name: 'Premium', price: Number(process.env.PLAN_PRICE_PREMIUM || 189900), desc: 'Profesionales ilimitados, facturación electrónica y reportes avanzados' }
] as const;

type B = { subscriptionStatus: string; trialEndsAt: Date | null; paidUntil: Date | null };
export function subscriptionState(b: B, now = new Date()) {
  const day = 86400000;
  if (b.paidUntil && b.paidUntil > now) return { state: 'ACTIVA' as const, daysLeft: Math.ceil((b.paidUntil.getTime() - now.getTime()) / day) };
  if (b.subscriptionStatus === 'PRUEBA' && b.trialEndsAt) {
    const left = Math.ceil((b.trialEndsAt.getTime() - now.getTime()) / day);
    return left > 0 ? { state: 'PRUEBA' as const, daysLeft: left } : { state: 'VENCIDA' as const, daysLeft: 0 };
  }
  if (b.subscriptionStatus === 'VENCIDA' || (b.paidUntil && b.paidUntil <= now)) return { state: 'VENCIDA' as const, daysLeft: 0 };
  return { state: 'ACTIVA' as const, daysLeft: null as number | null }; // negocios antiguos o activados manualmente sin fecha
}

export function isPlatformAdmin(email?: string | null) {
  if (!email) return false;
  return (process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean).includes(email.toLowerCase());
}
