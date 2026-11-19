// Punto de entrada del Worker: envuelve el de OpenNext y guarda en memoria, por pocos segundos,
// las páginas públicas (iguales para todos los visitantes). En el plan gratis de Cloudflare cada visita
// tiene 10 ms de procesador; servir una copia reciente cuesta casi nada.
// @ts-expect-error: lo genera OpenNext al compilar
import handler from './.open-next/worker.js';

const TTL_MS = 60_000;
const MAX_ENTRIES = 80;
const cache = new Map<string, { at: number; status: number; headers: [string, string][]; body: ArrayBuffer }>();
const PUBLIC = [/^\/$/, /^\/buscar$/, /^\/negocio\/[^/]+$/];
const VARY = ['rsc', 'next-router-state-tree', 'next-router-prefetch', 'next-router-segment-prefetch', 'next-url'];

function cacheKey(req: Request) {
  if (req.method !== 'GET') return null;
  const url = new URL(req.url);
  if (!PUBLIC.some(r => r.test(url.pathname))) return null;
  const cookie = req.headers.get('cookie') || '';
  // La sesión del cliente no cambia el HTML (el avatar se pinta en el navegador con /api/yo). Solo el modo «ver como» sí.
  if (/(?:^|;\s*)rc_admin_back=/.test(cookie)) return null;
  return [url.pathname + url.search, ...VARY.map(h => req.headers.get(h) || '')].join('|');
}

/** Clave interna del cron: HMAC-SHA256(AUTH_SECRET, 'cron-interno'). La ruta /api/cron/recordatorios la calcula igual. */
async function cronKey(secret: string) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode('cron-interno')));
  let s = ''; for (const x of sig) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export default {
  // Cron de Cloudflare (cada 10 minutos, ver wrangler.jsonc): llama a las automatizaciones dentro del mismo Worker.
  async scheduled(_: unknown, env: { AUTH_SECRET?: string; APP_URL?: string }, ctx: ExecutionContext) {
    if (!env.AUTH_SECRET) { console.error('[cron] falta AUTH_SECRET'); return; }
    const base = (env.APP_URL || 'https://reserva-citas.ingenieropshp2002.workers.dev').replace(/\/$/, '');
    const req = new Request(`${base}/api/cron/recordatorios`, { headers: { authorization: `Bearer cron:${await cronKey(env.AUTH_SECRET)}` } });
    const res: Response = await handler.fetch(req, env, ctx);
    console.log('[cron]', res.status, await res.text());
  },
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
