import { Suspense } from 'react';
import { ClientHeader } from '@/components/cliente/Header';
import { BusinessCard } from '@/components/cliente/BusinessCard';
import { Filters } from '@/components/cliente/Filters';
import { Empty } from '@/components/ui/Empty';
import { cities, searchBusinesses, SearchParams } from '@/lib/search';

export const metadata = { title: 'Explorar' };
export default async function Buscar({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const [list, cs] = await Promise.all([searchBusinesses(sp), cities()]);
  return (
    <>
      <ClientHeader title="Explorar" back />
      <main className="pt-20 max-w-[1280px] mx-auto px-margin md:px-margin-tablet lg:px-margin-desktop pb-10">
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-primary-container dark:text-primary mb-4">Encuentra tu lugar</h1>
        <Suspense><Filters cities={cs} /></Suspense>
        <p className="font-label-md text-label-md text-on-surface-variant mt-5 mb-3">{list.length} {list.length === 1 ? 'resultado' : 'resultados'}</p>
        {list.length ? <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-gutter lg:gap-gutter-desktop">{list.map(b => <BusinessCard key={b.id} b={b} />)}</div>
          : <Empty icon="search_off" title="Sin resultados" text="Prueba con otro servicio, ciudad o quita algunos filtros." />}
      </main>
    </>
  );
}
