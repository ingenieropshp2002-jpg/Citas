import { cache } from 'react';
import { db } from './db';

// Ajustes de la plataforma que el superadmin edita desde /superadmin/ajustes (sin tocar código).
export type Plan = { id: string; name: string; price: number; priceYear?: number; desc: string; maxStaff?: number }; // maxStaff 0 = ilimitado; price = mes, priceYear = año
/** Precio anual del plan (si no está definido: 10 meses, o sea 2 gratis). */
export const yearPrice = (p: Plan) => (p.priceYear && p.priceYear > 0 ? p.priceYear : p.price * 10);
export type Settings = {
  appName: string; shortName: string; tagline: string; logoUrl: string;
  supportWhatsapp: string; supportEmail: string;
  heroBadge: string; heroTitle: string; heroSubtitle: string;
  businessTitle: string; businessSubtitle: string;
  announcement: string; registrationsOpen: boolean; trialDays: number; plans: Plan[];
};

export const DEFAULT_SETTINGS: Settings = {
  appName: 'Registro Citas',
  shortName: 'Citas',
  tagline: 'Agenda citas en peluquerías, barberías y spas de Colombia.',
  logoUrl: '',
  supportWhatsapp: '',
  supportEmail: '',
  heroBadge: 'Bogotá · Medellín · Cali',
  heroTitle: 'Tu próxima cita de belleza, a un toque.',
  heroSubtitle: 'Reserva en peluquerías, barberías y spas. Paga con Nequi, PSE o tarjeta y recibe recordatorios por WhatsApp.',
  businessTitle: 'Agenda, caja, inventario y facturación electrónica en un solo lugar.',
  businessSubtitle: 'Comparte tu link de reservas por Instagram y WhatsApp.',
  announcement: '',
  registrationsOpen: true,
  trialDays: 14,
  plans: [
    { id: 'BASICO', name: 'Básico', price: 60000, priceYear: 600000, maxStaff: 1, desc: '1 profesional: agenda, reservas online, recordatorios, abonos y fila virtual' },
    { id: 'PRO', name: 'Pro', price: 90000, priceYear: 900000, maxStaff: 5, desc: 'De 2 a 5 profesionales: todo lo del Básico más caja POS, inventario, gastos, fidelización y marketing' },
    { id: 'PREMIUM', name: 'Premium', price: 150000, priceYear: 1500000, maxStaff: 0, desc: '6 profesionales o más, sin límite: todo lo del Pro más facturación electrónica y reportes avanzados' }
  ]
};

// Copia en memoria del isolate por 30 s: casi todas las páginas leen los ajustes y así no van a la base cada vez.
let memo: { at: number; value: Settings } | null = null;
export const getSettings = cache(async (): Promise<Settings> => {
  if (memo && Date.now() - memo.at < 30_000) return memo.value;
  try {
    const rows = await db.platformSetting.findMany();
    const s: Record<string, unknown> = { ...DEFAULT_SETTINGS };
    for (const r of rows) { if (r.key in s) { try { s[r.key] = JSON.parse(r.value); } catch { /* valor dañado: se ignora */ } } }
    memo = { at: Date.now(), value: s as Settings };
    return memo.value;
  } catch { return DEFAULT_SETTINGS; }
});

export async function saveSettings(patch: Partial<Settings>) {
  memo = null;
  for (const [key, v] of Object.entries(patch)) {
    if (!(key in DEFAULT_SETTINGS) || v === undefined) continue;
    const value = JSON.stringify(v);
    await db.platformSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
  }
}

/** Inicial del nombre de la app (para el logo cuando no hay imagen). */
export const initial = (name: string) => (name.trim()[0] || 'R').toUpperCase();

/** Máximo de profesionales activos del plan (null = ilimitado). Si el plan guardado no trae el dato, usa el de fábrica. */
export function planMaxStaff(plans: Plan[], planId: string): number | null {
  const p = plans.find(x => x.id === planId); const d = DEFAULT_SETTINGS.plans.find(x => x.id === planId);
  const n = p?.maxStaff ?? d?.maxStaff ?? 0;
  return n > 0 ? n : null;
}
