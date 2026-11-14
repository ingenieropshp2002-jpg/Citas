import { db } from './db';
import { parseJson } from './format';

export function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371, dLat = (b.lat - a.lat) * Math.PI / 180, dLng = (b.lng - a.lng) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export type SearchParams = { q?: string; ciudad?: string; cat?: string; max?: string; rating?: string; lat?: string; lng?: string; orden?: string };

export async function searchBusinesses(p: SearchParams) {
  const list = await db.business.findMany({ where: { active: true }, include: { services: { where: { active: true }, select: { name: true, price: true, category: true } } } });
  const q = (p.q || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const here = p.lat && p.lng ? { lat: Number(p.lat), lng: Number(p.lng) } : null;
  let out = list.map(b => ({
    ...b, imgs: parseJson<string[]>(b.images, []),
    from: b.services.length ? Math.min(...b.services.map(s => s.price)) : 0,
    distance: here && b.lat != null && b.lng != null ? km(here, { lat: b.lat, lng: b.lng! }) : null
  }));
  if (q) out = out.filter(b => norm(b.name).includes(q) || norm(b.city).includes(q) || norm(b.zone || '').includes(q) || b.services.some(s => norm(s.name).includes(q) || norm(s.category).includes(q)));
  if (p.ciudad) out = out.filter(b => norm(b.city) === norm(p.ciudad!));
  if (p.cat) out = out.filter(b => b.category === p.cat);
  if (p.max) out = out.filter(b => b.from <= Number(p.max));
  if (p.rating) out = out.filter(b => b.rating >= Number(p.rating));
  if (p.orden === 'precio') out.sort((a, b) => a.from - b.from);
  else if (p.orden === 'distancia' && here) out.sort((a, b) => (a.distance ?? 1e9) - (b.distance ?? 1e9));
  else out.sort((a, b) => b.rating - a.rating);
  return out;
}
export async function cities() {
  return [...new Set((await db.business.findMany({ select: { city: true } })).map(b => b.city))].sort();
}
