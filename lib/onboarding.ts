// Guía de primeros pasos para un negocio recién registrado. Casi todo se deduce de los datos; lo demás lo marca el dueño.
import { db } from './db';
import { parseJson } from './format';

export type Onboarding = { done: string[]; hidden: boolean };
export const readOnboarding = (s: string | null | undefined): Onboarding => { const o = parseJson<Partial<Onboarding>>(s || '{}', {}); return { done: Array.isArray(o.done) ? o.done : [], hidden: !!o.hidden }; };

export type Step = { key: string; title: string; text: string; href: string; cta: string; done: boolean; manual?: boolean };

export async function onboardingSteps(b: { id: string; slug: string; logo: string | null; images: string; onboarding: string; createdAt: Date }) {
  const o = readOnboarding(b.onboarding);
  const [services, staff, appts] = await Promise.all([
    db.service.count({ where: { businessId: b.id, active: true } }),
    db.staff.count({ where: { businessId: b.id, active: true } }),
    db.appointment.count({ where: { businessId: b.id } })
  ]);
  const has = (k: string) => o.done.includes(k);
  const steps: Step[] = [
    { key: 'servicios', title: 'Agrega tus servicios', text: 'Con precio y duración. Puedes cargar unos sugeridos y ajustarlos.', href: '/admin/servicios', cta: 'Ir a servicios', done: services > 0 },
    { key: 'horario', title: 'Revisa tu horario y tus datos', text: 'Días y horas de atención, dirección, WhatsApp y reglas de abono.', href: '/admin/configuracion', cta: 'Revisar', done: has('horario') },
    { key: 'fotos', title: 'Sube tu logo y fotos', text: 'Los negocios con fotos reciben muchas más reservas.', href: '/admin/app', cta: 'Subir logo', done: !!b.logo || parseJson<string[]>(b.images, []).length > 0 },
    { key: 'equipo', title: 'Agrega a tu equipo', text: 'Cada profesional con sus servicios, horario y comisión.', href: '/admin/equipo', cta: 'Ir a equipo', done: staff > 1 || has('equipo'), manual: true },
    { key: 'compartir', title: 'Comparte tu enlace de reservas', text: 'En tu Instagram, WhatsApp y en un afiche con código QR.', href: '/admin/instagram', cta: 'Compartir', done: has('compartir'), manual: true },
    { key: 'cita', title: 'Haz una reserva de prueba', text: 'Reserva como si fueras cliente para ver cómo funciona.', href: `/reservar/${b.slug}`, cta: 'Probar', done: appts > 0 }
  ];
  return { steps, hidden: o.hidden, done: steps.filter(s => s.done).length };
}

/** Marca un paso de la guía (o la oculta) sin tocar lo demás. */
export async function markOnboarding(businessId: string, patch: { done?: string; hidden?: boolean }) {
  const b = await db.business.findUnique({ where: { id: businessId }, select: { onboarding: true } });
  if (!b) return;
  const o = readOnboarding(b.onboarding);
  if (patch.done && !o.done.includes(patch.done)) o.done.push(patch.done);
  if (patch.hidden !== undefined) o.hidden = patch.hidden;
  await db.business.update({ where: { id: businessId }, data: { onboarding: JSON.stringify(o) } });
}

/** Servicios sugeridos por tipo de negocio (precios de referencia en Colombia, el dueño los ajusta). */
export const SUGGESTED: Record<string, { name: string; category: string; durationMin: number; price: number }[]> = {
  PELUQUERIA: [
    { name: 'Corte de cabello', category: 'Cortes', durationMin: 45, price: 35000 },
    { name: 'Cepillado', category: 'Peinados', durationMin: 45, price: 30000 },
    { name: 'Tinte completo', category: 'Color', durationMin: 120, price: 120000 },
    { name: 'Mechas o balayage', category: 'Color', durationMin: 180, price: 220000 },
    { name: 'Keratina', category: 'Tratamientos', durationMin: 150, price: 180000 },
    { name: 'Hidratación profunda', category: 'Tratamientos', durationMin: 60, price: 60000 }
  ],
  BARBERIA: [
    { name: 'Corte clásico', category: 'Cortes', durationMin: 40, price: 25000 },
    { name: 'Corte y barba', category: 'Cortes', durationMin: 60, price: 40000 },
    { name: 'Arreglo de barba', category: 'Barba', durationMin: 30, price: 18000 },
    { name: 'Afeitado con toalla caliente', category: 'Barba', durationMin: 40, price: 28000 },
    { name: 'Diseño o líneas', category: 'Cortes', durationMin: 15, price: 8000 },
    { name: 'Corte niño', category: 'Cortes', durationMin: 30, price: 20000 }
  ],
  SPA: [
    { name: 'Masaje relajante', category: 'Masajes', durationMin: 60, price: 120000 },
    { name: 'Masaje descontracturante', category: 'Masajes', durationMin: 60, price: 140000 },
    { name: 'Limpieza facial profunda', category: 'Faciales', durationMin: 75, price: 130000 },
    { name: 'Exfoliación corporal', category: 'Corporal', durationMin: 45, price: 90000 },
    { name: 'Día de spa', category: 'Paquetes', durationMin: 180, price: 320000 }
  ],
  UNAS: [
    { name: 'Manicure tradicional', category: 'Manos', durationMin: 45, price: 25000 },
    { name: 'Manicure semipermanente', category: 'Manos', durationMin: 60, price: 45000 },
    { name: 'Pedicure tradicional', category: 'Pies', durationMin: 60, price: 30000 },
    { name: 'Uñas acrílicas', category: 'Manos', durationMin: 120, price: 90000 },
    { name: 'Retiro de semipermanente', category: 'Manos', durationMin: 20, price: 10000 }
  ]
};
