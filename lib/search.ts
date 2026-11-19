import { isSuspended } from './subscription';
import { db } from './db';
import { bogota, CATEGORY_LABEL, minutesOf, parseJson } from './format';

export function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371, dLat = (b.lat - a.lat) * Math.PI / 180, dLng = (b.lng - a.lng) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export type SearchParams = { q?: string; ciudad?: string; cat?: string; max?: string; rating?: string; lat?: string; lng?: string; orden?: string; abierto?: string; pagina?: string };
export const PAGE_SIZE = 24;
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** ¿Está abierto ahora (hora Colombia)? */
export function openNow(openingHours: string, now = bogota(new Date())) {
  const h = parseJson<Record<string, [string, string] | null>>(openingHours, {})[String(now.dow)];
  const m = now.h * 60 + now.min;
  return !!h && m >= minutesOf(h[0]) && m < minutesOf(h[1]);
}

export async function searchBusinesses(p: SearchParams) {
  const list = await db.business.findMany({ where: { active: true }, include: { services: { where: { active: true }, select: { id: true, name: true, price: true, category: true, durationMin: true } } } });
  const q = norm(p.q || '').trim();
  const words = q.split(/\s+/).filter(w => w.length > 1);
  const here = p.lat && p.lng ? { lat: Number(p.lat), lng: Number(p.lng) } : null;
  const now = bogota(new Date());
  const withPlans = new Set((await db.prepaidPlan.groupBy({ by: ['businessId'], where: { active: true }, _count: true })).map(x => x.businessId));
  let out = list.filter(b => !isSuspended(b)).map(b => {
    // Servicios que coinciden con lo buscado (para mostrarlos en la tarjeta con su precio)
    const matches = words.length ? b.services.filter(s => words.every(w => norm(`${s.name} ${s.category}`).includes(w))) : [];
    const textHit = words.length ? words.every(w => norm(`${b.name} ${b.city} ${b.zone || ''} ${b.tagline || ''} ${CATEGORY_LABEL[b.category] || ''}`).includes(w)) : true;
    return {
      ...b, imgs: parseJson<string[]>(b.images, []),
      from: b.services.length ? Math.min(...b.services.map(s => s.price)) : 0,
      distance: here && b.lat != null && b.lng != null ? km(here, { lat: b.lat, lng: b.lng! }) : null,
      open: openNow(b.openingHours, now), hasPlans: withPlans.has(b.id),
      matches: matches.sort((a, c) => a.price - c.price).slice(0, 3), hit: textHit || matches.length > 0,
      // Calificación ponderada: 5 estrellas con 2 reseñas no le gana a 4.8 con 200
      score: (b.rating * b.reviewCount + 4.2 * 10) / (b.reviewCount + 10)
    };
  });
  if (words.length) out = out.filter(b => b.hit);
  if (p.ciudad) out = out.filter(b => norm(b.city) === norm(p.ciudad!));
  if (p.cat) out = out.filter(b => b.category === p.cat);
  if (p.max) out = out.filter(b => (b.matches[0]?.price ?? b.from) <= Number(p.max));
  if (p.rating) out = out.filter(b => b.rating >= Number(p.rating));
  if (p.abierto) out = out.filter(b => b.open);
  if (p.orden === 'precio') out.sort((a, b) => (a.matches[0]?.price ?? a.from) - (b.matches[0]?.price ?? b.from));
  else if (p.orden === 'distancia' && here) out.sort((a, b) => (a.distance ?? 1e9) - (b.distance ?? 1e9));
  else if (p.orden === 'resenas') out.sort((a, b) => b.reviewCount - a.reviewCount);
  else out.sort((a, b) => Number(b.featured) - Number(a.featured) || b.score - a.score);
  return out;
}
export type SearchResult = Awaited<ReturnType<typeof searchBusinesses>>[number];

export async function cities() {
  return [...new Set((await db.business.findMany({ where: { active: true }, select: { city: true } })).map(b => b.city))].sort();
}
