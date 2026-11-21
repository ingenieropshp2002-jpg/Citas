import { requireSuperAdmin } from '@/lib/auth';
import { hyperdriveUrl, usingHyperdrive } from '@/lib/db';
import { comparar, copiar, type Conteo } from '@/lib/migrar';
import { PageHeader } from '@/components/panel/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { revalidatePath } from 'next/cache';

export const metadata = { title: 'Base de datos' };
export const dynamic = 'force-dynamic';

let ultimo: { at: string; error?: string } | null = null;

async function copiarAhora() {
  'use server';
  await requireSuperAdmin();
  // Nunca se copia cuando la app ya trabaja sobre la base nueva: borraría sus datos.
  if (usingHyperdrive() || !hyperdriveUrl() || !process.env.DATABASE_URL) return;
  try { await copiar(process.env.DATABASE_URL, hyperdriveUrl()!); ultimo = { at: new Date().toISOString() }; }
  catch (e) { ultimo = { at: new Date().toISOString(), error: String((e as Error).message || e).slice(0, 300) }; }
  revalidatePath('/superadmin/base-de-datos');
}

export default async function BaseDeDatos() {
  await requireSuperAdmin();
  const hd = hyperdriveUrl(); const usando = usingHyperdrive();
  let filas: Conteo[] = []; let err = '';
  if (hd && !usando && process.env.DATABASE_URL) { try { filas = await comparar(process.env.DATABASE_URL, hd); } catch (e) { err = String((e as Error).message || e).slice(0, 300); } }
  const iguales = filas.length > 0 && filas.every(f => f.origen === f.destino);
  return (
    <>
      <PageHeader eyebrow="Plataforma" title="Base de datos" subtitle="Mover la información de la app a la base nueva (Supabase de ingenieropshp2002)." />
      <section className="card p-5 space-y-3 max-w-3xl">
        {usando ? <p className="flex items-center gap-2 font-title-md"><Icon name="check_circle" className="text-[#059669]" />La app ya trabaja sobre la base nueva.</p>
          : !hd ? <p>Falta conectar Hyperdrive al Worker.</p>
          : <>
            <p className="font-body-md">Copia toda la información de la base actual a la nueva. Se puede repetir: cada vez la base nueva se vacía y se vuelve a llenar. La app sigue usando la base actual hasta el cambio final.</p>
            {ultimo && <p className={`p-3 rounded-xl font-label-md ${ultimo.error ? 'bg-[#FFF1F2] text-danger' : 'bg-[#ECFDF5] text-[#065F46]'}`}>{ultimo.error ? `No se pudo copiar: ${ultimo.error}` : `Copia hecha (${new Date(ultimo.at).toLocaleTimeString('es-CO', { timeZone: 'America/Bogota' })}).`}</p>}
            {err && <p className="p-3 rounded-xl bg-[#FFF1F2] text-danger font-label-md">No se pudo leer la base nueva: {err}</p>}
            <form action={copiarAhora}><button className="btn-primary"><Icon name="content_copy" className="text-[18px]" />Copiar ahora</button></form>
            {filas.length > 0 && <>
              <p className={`font-label-lg ${iguales ? 'text-[#059669]' : ''}`}>{iguales ? '✓ Las dos bases tienen exactamente las mismas filas.' : 'Filas por tabla (actual → nueva):'}</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1 font-body-sm">{filas.filter(f => f.origen || f.destino > 0).map(f => <p key={f.tabla} className={`flex justify-between ${f.origen !== f.destino ? 'text-danger font-semibold' : ''}`}><span>{f.tabla}</span><span className="tnum">{f.origen} → {f.destino < 0 ? '—' : f.destino}</span></p>)}</div>
            </>}
          </>}
      </section>
    </>
  );
}
