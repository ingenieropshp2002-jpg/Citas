import Link from 'next/link';
import { requireUser, ownedBusinesses } from '@/lib/auth';
import { PageHeader } from '@/components/panel/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { TwoFactor } from './TwoFactor';

export const metadata = { title: 'Seguridad' };
export default async function Seguridad() {
  const u = await requireUser('/admin/seguridad');
  const owner = !!(await ownedBusinesses(u.id)).current;
  let left = 0; try { left = (JSON.parse(u.totpRecovery || '[]') as string[]).length; } catch { /* vacío */ }
  return (
    <>
      <PageHeader eyebrow="Cuenta" title="Seguridad" subtitle="Protege tu cuenta y los datos de tu negocio." />
      <div className="grid xl:grid-cols-2 gap-4">
        <section className="card p-5 xl:col-span-2">
          <h2 className="h-section mb-2">Verificación en dos pasos</h2>
          <TwoFactor enabled={!!u.totpEnabledAt} left={left} />
        </section>
        {owner && (
          <section className="card p-5">
            <h2 className="h-section mb-2">Copias de respaldo</h2>
            <p className="text-on-surface-variant">Cada noche guardamos una copia cifrada de toda la información de la plataforma. Además, puedes descargar cuando quieras una copia de los datos de tu negocio: clientes, citas, ventas, servicios, productos, paquetes y fichas.</p>
            <a href="/api/respaldo" className="btn-primary mt-3"><Icon name="download" className="text-[18px]" />Descargar copia de mis datos</a>
            <p className="mt-2 font-body-sm text-on-surface-variant">Archivo JSON. Guárdalo en un lugar seguro: tiene datos personales de tus clientes.</p>
          </section>
        )}
        {owner && (
          <section className="card p-5">
            <h2 className="h-section mb-2">Permisos por rol</h2>
            <p className="text-on-surface-variant">Da a cada persona del equipo solo lo que necesita: <b>Profesional</b> ve su agenda y sus clientes; <b>Recepción</b> maneja la agenda de todos, clientes y caja; <b>Administrador</b> ve todo el panel.</p>
            <Link href="/admin/equipo" className="btn-outline mt-3"><Icon name="badge" className="text-[18px]" />Asignar roles en Equipo</Link>
          </section>
        )}
      </div>
    </>
  );
}
