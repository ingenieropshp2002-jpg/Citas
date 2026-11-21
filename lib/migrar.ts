// Copia toda la información de la app (esquema "citas") de la base actual a una base nueva (Hyperdrive).
// Uso único, desde /superadmin/base-de-datos. Crea las tablas si no existen, vacía la copia y la vuelve a llenar.
import pg from 'pg';
import { ESQUEMA_SQL } from './esquema-sql';

export type Conteo = { tabla: string; origen: number; destino: number };

const q = (t: string) => `citas."${t.replace(/"/g, '')}"`;

async function tablas(c: pg.PoolClient) {
  const r = await c.query(`select table_name from information_schema.tables where table_schema = 'citas' and table_type = 'BASE TABLE' order by table_name`);
  return r.rows.map(x => x.table_name as string);
}

/** Cuenta filas por tabla en las dos bases. */
export async function comparar(origen: string, destino: string): Promise<Conteo[]> {
  const a = new pg.Pool({ connectionString: origen, max: 1 }); const b = new pg.Pool({ connectionString: destino, max: 1 });
  const ca = await a.connect(); const cb = await b.connect();
  try {
    const ts = await tablas(ca); const tb = new Set(await tablas(cb));
    const out: Conteo[] = [];
    for (const t of ts) {
      const o = Number((await ca.query(`select count(*) n from ${q(t)}`)).rows[0].n);
      const d = tb.has(t) ? Number((await cb.query(`select count(*) n from ${q(t)}`)).rows[0].n) : -1;
      out.push({ tabla: t, origen: o, destino: d });
    }
    return out;
  } finally { ca.release(); cb.release(); await a.end(); await b.end(); }
}

/** Copia todo. Sin llaves foráneas durante la copia (se quitan y se vuelven a crear igual). */
export async function copiar(origen: string, destino: string) {
  const a = new pg.Pool({ connectionString: origen, max: 1 }); const b = new pg.Pool({ connectionString: destino, max: 1 });
  const ca = await a.connect(); const cb = await b.connect();
  try {
    const existe = (await cb.query(`select to_regclass('citas."User"') r`)).rows[0].r;
    if (!existe) await cb.query(ESQUEMA_SQL);
    const ts = await tablas(ca); const destinoTablas = new Set(await tablas(cb));
    const faltan = ts.filter(t => !destinoTablas.has(t));
    if (faltan.length) throw new Error(`En la base nueva faltan tablas: ${faltan.join(', ')}`);
    await cb.query('begin');
    const fks = (await cb.query(`select conrelid::regclass::text tbl, conname, pg_get_constraintdef(oid) def from pg_constraint where contype = 'f' and connamespace = 'citas'::regnamespace`)).rows as { tbl: string; conname: string; def: string }[];
    for (const f of fks) await cb.query(`alter table ${f.tbl} drop constraint "${f.conname}"`);
    await cb.query(`truncate ${ts.map(q).join(', ')}`);
    for (const t of ts) {
      const { rows } = await ca.query(`select coalesce(json_agg(x), '[]'::json) j from ${q(t)} x`);
      const data = rows[0].j as unknown[];
      for (let i = 0; i < data.length; i += 500) {
        await cb.query(`insert into ${q(t)} select * from json_populate_recordset(null::${q(t)}, $1::json)`, [JSON.stringify(data.slice(i, i + 500))]);
      }
    }
    for (const f of fks) await cb.query(`alter table ${f.tbl} add constraint "${f.conname}" ${f.def}`);
    await cb.query('commit');
  } catch (e) { await cb.query('rollback').catch(() => {}); throw e; }
  finally { ca.release(); cb.release(); await a.end(); await b.end(); }
  return comparar(origen, destino);
}
