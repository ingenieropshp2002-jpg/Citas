import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { cache } from 'react';

// Conexión a PostgreSQL (Supabase) con el adaptador "pg": funciona en Node y en Cloudflare Workers.
// En Workers no se puede reutilizar una conexión entre peticiones, por eso el cliente se crea por petición
// (Proxy perezoso) y se guarda en globalThis solo en Node.
const schema = process.env.DB_SCHEMA || 'citas';
function make() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 1 }, { schema });
  return new PrismaClient({ adapter });
}
// En componentes de servidor React deduplica por petición; en acciones crea uno nuevo.
const perRequest = cache(make);
const isWorker = typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers';
const g = globalThis as unknown as { prisma?: PrismaClient };
export const db: PrismaClient = isWorker
  ? new Proxy({} as PrismaClient, { get: (_t, k) => { const c = perRequest() as any; const v = c[k]; return typeof v === 'function' ? v.bind(c) : v; } })
  : (g.prisma ??= make());
