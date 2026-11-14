import { db } from './db';
import { parseJson } from './format';

export type Shop = { slug: string; name: string; logo: string | null };

// Extrae el slug del negocio de una ruta interna (/negocio/x, /reservar/x) para mantener al cliente dentro de esa tienda.
export function slugFromPath(path?: string | null): string | null {
  const m = (path || '').match(/^\/(?:negocio|reservar)\/([a-z0-9-]+)/i);
  return m ? m[1] : null;
}

export async function getShop(slug?: string | null): Promise<Shop | null> {
  if (!slug) return null;
  const b = await db.business.findUnique({ where: { slug }, select: { slug: true, name: true, logo: true, images: true } });
  if (!b) return null;
  return { slug: b.slug, name: b.name, logo: b.logo || parseJson<string[]>(b.images, [])[0] || null };
}

export const shopQuery = (slug?: string | null) => (slug ? `negocio=${encodeURIComponent(slug)}` : '');
