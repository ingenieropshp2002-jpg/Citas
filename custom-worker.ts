// Punto de entrada del Worker: envuelve el de OpenNext y guarda en memoria, por pocos segundos,
// las páginas públicas que ve un visitante sin sesión. En el plan gratis de Cloudflare cada visita
// tiene 10 ms de procesador; servir una copia reciente cuesta casi nada.
// @ts-expect-error: lo genera OpenNext al compilar
import handler from './.open-next/worker.js';

const TTL_MS = 30_000;
const MAX_ENTRIES = 80;
const cache = new Map<string, { at: number; status: number; headers: [string, string][]; body: ArrayBuffer }>();
const PUBLIC = [/^\/$/, /^\/buscar$/, /^\/negocio\/[^/]+$/];
const VARY = ['rsc', 'next-router-state-tree', 'next-router-prefetch', 'next-router-segment-prefetch', 'next-url'];

function cacheKey(req: Request) {
  if (req.method !== 'GET') return null;
  const url = new URL(req.url);
  if (!PUBLIC.some(r => r.test(url.pathname))) return null;
  const cookie = req.headers.get('cookie') || '';
  if (/(?:^|;\s*)(rc_session|rc_admin_back)=/.test(cookie)) return null;
  return [url.pathname + url.search, ...VARY.map(h => req.headers.get(h) || '')].join('|');
}

export default {
  async fetch(req: Request, env: unknown, ctx: ExecutionContext) {
    const key = cacheKey(req);
    if (key) {
      const hit = cache.get(key);
      if (hit && Date.now() - hit.at < TTL_MS) {
        const h = new Headers(hit.headers); h.set('x-cache', 'HIT');
        return new Response(hit.body, { status: hit.status, headers: h });
      }
    }
    const res: Response = await handler.fetch(req, env, ctx);
    if (!key || res.status !== 200 || res.headers.has('set-cookie')) return res;
    const body = await res.arrayBuffer();
    if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value!);
    cache.set(key, { at: Date.now(), status: res.status, headers: [...res.headers.entries()], body });
    const h = new Headers(res.headers); h.set('x-cache', 'MISS');
    return new Response(body, { status: res.status, headers: h });
  }
};

// @ts-expect-error: lo genera OpenNext al compilar
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from './.open-next/worker.js';
