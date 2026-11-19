// Planes y estado de suscripción de cada negocio. Los negocios nuevos tienen 14 días gratis sin tarjeta.
export const TRIAL_DAYS = 14;
export const PLANS = [
  { id: 'BASICO', name: 'Básico', price: Number(process.env.PLAN_PRICE_BASICO || 49900), maxStaff: 1, desc: '1 profesional, agenda, reservas online y recordatorios' },
  { id: 'PRO', name: 'Pro', price: Number(process.env.PLAN_PRICE_PRO || 99900), maxStaff: 8, desc: 'Hasta 8 profesionales, caja POS, inventario, gastos, fidelización y marketing' },
  { id: 'PREMIUM', name: 'Premium', price: Number(process.env.PLAN_PRICE_PREMIUM || 189900), maxStaff: 0, desc: 'Profesionales ilimitados, facturación electrónica y reportes avanzados' }
] as const;

type B = { subscriptionStatus: string; trialEndsAt: Date | null; paidUntil: Date | null };
export const GRACE_DAYS = 3;
export const WARN_DAYS = 7;
/**
 * PRUEBA / ACTIVA: funciona normal (warn = vence en 7 días o menos).
 * GRACIA: ya venció, pero tiene 3 días para pagar sin perder nada.
 * VENCIDA: suspendido. El panel solo deja pagar y la página pública no recibe reservas.
 */
export function subscriptionState(b: B, now = new Date()) {
  const day = 86400000;
  const trial = b.subscriptionStatus === 'PRUEBA';
  const end = b.paidUntil && (!trial || !b.trialEndsAt || b.paidUntil > b.trialEndsAt) ? b.paidUntil : trial ? b.trialEndsAt : b.paidUntil;
  if (!end) {
    if (b.subscriptionStatus === 'VENCIDA') return { state: 'VENCIDA' as const, daysLeft: 0, graceLeft: 0, warn: false, end: null };
    return { state: 'ACTIVA' as const, daysLeft: null as number | null, graceLeft: 0, warn: false, end: null }; // activado a mano sin fecha
  }
  const left = Math.ceil((end.getTime() - now.getTime()) / day);
  if (left > 0) return { state: (trial && !(b.paidUntil && b.paidUntil > now) ? 'PRUEBA' : 'ACTIVA') as 'PRUEBA' | 'ACTIVA', daysLeft: left, graceLeft: 0, warn: left <= WARN_DAYS, end };
  const graceLeft = Math.ceil((end.getTime() + GRACE_DAYS * day - now.getTime()) / day);
  if (graceLeft > 0) return { state: 'GRACIA' as const, daysLeft: 0, graceLeft, warn: true, end };
  return { state: 'VENCIDA' as const, daysLeft: 0, graceLeft: 0, warn: true, end };
}
export const isSuspended = (b: B) => subscriptionState(b).state === 'VENCIDA';

export function isPlatformAdmin(email?: string | null) {
  if (!email) return false;
  return (process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean).includes(email.toLowerCase());
}
