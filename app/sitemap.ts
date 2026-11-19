import type { MetadataRoute } from 'next';
import { db } from '@/lib/db';
import { isSuspended } from '@/lib/subscription';

// Mapa del sitio para Google: páginas de cada negocio y búsquedas por ciudad y categoría.
export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  const list = (await db.business.findMany({ where: { active: true }, select: { slug: true, city: true, category: true, subscriptionStatus: true, trialEndsAt: true, paidUntil: true } })).filter(b => !isSuspended(b));
  const combos = [...new Set(list.map(b => `${b.city}|${b.category}`))];
  return [
    { url: `${base}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/buscar`, changeFrequency: 'daily', priority: 0.8 },
    ...combos.map(c => { const [city, cat] = c.split('|'); return { url: `${base}/buscar?ciudad=${encodeURIComponent(city)}&cat=${cat}`, changeFrequency: 'weekly' as const, priority: 0.6 }; }),
    ...list.map(b => ({ url: `${base}/negocio/${b.slug}`, changeFrequency: 'weekly' as const, priority: 0.7 }))
  ];
}
