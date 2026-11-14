import Link from 'next/link';
import { requireBusiness } from '@/lib/auth';
import { PageHeader } from '@/components/panel/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { Importer } from './Importer';
export const metadata = { title: 'Cargar productos' };
export default async function Importar() {
  await requireBusiness('inventario');
  return (
    <div className="max-w-4xl">
      <Link href="/panel/inventario" className="font-label-md text-secondary inline-flex items-center gap-1"><Icon name="arrow_back" className="text-[16px]" />Inventario</Link>
      <PageHeader eyebrow="Inventario" title="Cargar productos desde Excel" subtitle="Sube todos tus productos con precio y cantidad de una sola vez." />
      <Importer />
    </div>
  );
}
