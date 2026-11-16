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
function currentPool() {
  const key = requestKey();
  if (!key) return (shared ??= new pg.Pool(config));
  let p = perRequest.get(key);
  if (!p) { p = new pg.Pool(config); perRequest.set(key, p); }
  return p;
}

/** Pool fachada: Prisma lo cree un Pool normal, pero cada consulta usa el pool de la petición actual. */
class RequestScopedPool extends pg.Pool {
  query(...args: any[]) { const p = currentPool(); return (p.query as any).apply(p, args); }
  connect(...args: any[]) { const p = currentPool(); return (p.connect as any).apply(p, args); }
  async end() { /* cada pool por petición se descarta con la petición */ }
}

function make() {
  const adapter = new PrismaPg(new RequestScopedPool(config), { schema });
  return new PrismaClient({ adapter });
}
const g = globalThis as unknown as { prisma?: PrismaClient };
export const db: PrismaClient = (g.prisma ??= make());
