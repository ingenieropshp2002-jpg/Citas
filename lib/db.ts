import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

// Conexión a PostgreSQL (Supabase) con el adaptador "pg": funciona en Node y en Cloudflare Workers.
// En Workers una conexión (socket) no puede pasar de una petición a otra, pero crear un PrismaClient por
// petición es caro en CPU (el plan gratis da 10 ms). Por eso hay UN solo PrismaClient por isolate y lo único
// que se crea por petición es el pool de "pg", que el pool fachada de abajo entrega según la petición en curso.
const schema = process.env.DB_SCHEMA || 'citas';
const config: pg.PoolConfig = { connectionString: process.env.DATABASE_URL, max: 1 };
const isWorker = typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers';

const perRequest = new WeakMap<object, pg.Pool>();
let shared: pg.Pool | null = null;
function requestKey(): object | null {
  if (!isWorker) return null;
  try {
    // El contexto de OpenNext es único por petición.
    const ctx = (globalThis as any)[Symbol.for('__cloudflare-context__')];
    return ctx?.ctx ?? null;
  } catch { return null; }
}
/** Conexión de Hyperdrive (base nueva), si el Worker la tiene. */
export function hyperdriveUrl(): string | null {
  try { return (globalThis as any)[Symbol.for('__cloudflare-context__')]?.env?.HYPERDRIVE?.connectionString || null; } catch { return null; }
}
/** true cuando la app ya trabaja sobre la base nueva (variable DB_HYPERDRIVE=1 en wrangler.jsonc). */
export const usingHyperdrive = () => process.env.DB_HYPERDRIVE === '1' && !!hyperdriveUrl();
function currentPool() {
  const key = requestKey();
  if (!key) return (shared ??= new pg.Pool(config));
  let p = perRequest.get(key);
  if (!p) { p = new pg.Pool(usingHyperdrive() ? { ...config, connectionString: hyperdriveUrl()! } : config); perRequest.set(key, p); }
  return p;
}

/** Pool fachada: Prisma lo cree un Pool normal, pero cada consulta usa el pool de la petición actual. */
class RequestScopedPool extends pg.Pool {
  query(...args: any[]) { const p = currentPool(); return (p.query as any).apply(p, args); }
  connect(...args: any[]) { const p = currentPool(); return (p.connect as any).apply(p, args); }
  async end() { /* cada pool por petición se descarta con la petición */ }
}

// Prisma junta en un solo lote los findUnique que llegan en el mismo instante, aunque vengan de peticiones
// distintas. En Workers eso deja una petición esperando una respuesta que se resuelve en otra y el runtime la
// cancela ("code had hung"). Por eso findUnique se ejecuta como findFirst (mismo resultado, sin lotes).
const flat = (where: Record<string, unknown> = {}) => {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(where)) {
    if (k.includes('_') && v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date) && Object.keys(v).join('_') === k) Object.assign(out, v);
    else out[k] = v;
  }
  return out;
};
function make() {
  const adapter = new PrismaPg(new RequestScopedPool(config), { schema });
  const base = new PrismaClient({ adapter });
  const delegate = (model: string) => (base as any)[model[0].toLowerCase() + model.slice(1)];
  return base.$extends({ query: { $allModels: {
    findUnique({ model, args }) { return delegate(model).findFirst({ ...args, where: flat(args.where as any) }); },
    findUniqueOrThrow({ model, args }) { return delegate(model).findFirstOrThrow({ ...args, where: flat(args.where as any) }); }
  } } }) as unknown as PrismaClient;
}
const g = globalThis as unknown as { prisma?: PrismaClient };
export const db: PrismaClient = (g.prisma ??= make());
