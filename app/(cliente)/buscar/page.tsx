import { Suspense } from 'react';
import Link from 'next/link';
import { ClientHeader } from '@/components/cliente/Header';
import { BusinessCard } from '@/components/cliente/BusinessCard';
import { Filters } from '@/components/cliente/Filters';
import { Empty } from '@/components/ui/Empty';
import { CATEGORY_LABEL, cop } from '@/lib/format';
import { SearchMap } from '@/components/cliente/SearchMap';
import { Icon } from '@/components/ui/Icon';
import { cities, PAGE_SIZE, searchBusinesses, SearchParams } from '@/lib/search';

const PLURAL: Record<string, string> = { PELUQUERIA: 'Peluquerías', BARBERIA: 'Barberías', SPA: 'Spas', UNAS: 'Uñas y manicure' };
function heading(sp: SearchParams) {
  const what = sp.q ? `«${sp.q}»` : sp.cat ? PLURAL[sp.cat] || CATEGORY_LABEL[sp.cat] : 'Peluquerías, barberías y spas';
  return `${what}${sp.ciudad ? ` en ${sp.ciudad}` : ''}`;
}
export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams; const t = heading(sp);
  return { title: t, description: `${t}: compara precios, mira reseñas y reserva tu cita en línea.` };
}

export default async function Buscar({ searchParams }: { searchParams: Promise<SearchParams & { vista?: string }> }) {
  const sp = await searchParams;
  const mapa = sp.vista === 'mapa';
  const toggle = (v: string) => { const q = new URLSearchParams(Object.entries(sp).filter(([k, x]) => typeof x === 'string' && x && k !== 'vista' && k !== 'pagina') as [string, string][]); if (v) q.set('vista', v); const s = q.toString(); return `/buscar${s ? `?${s}` : ''}`; };
  const [all, cs] = await Promise.all([searchBusinesses(sp), cities()]);
  const page = Math.max(1, Math.round(Number(sp.pagina) || 1));
  const list = all.slice(0, page * PAGE_SIZE);
  const more = new URLSearchParams(Object.entries(sp).filter(([, v]) => typeof v === 'string' && v) as [string, string][]); more.set('pagina', String(page + 1));
  return (
    <>
      <ClientHeader title="Explorar" back />
      <main className="pt-20 max-w-[1280px] mx-auto px-margin md:px-margin-tablet lg:px-margin-desktop pb-10">
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-primary-container dark:text-primary mb-4">{sp.q || sp.cat || sp.ciudad ? heading(sp) : 'Encuentra tu lugar'}</h1>
        <Suspense><Filters cities={cs} /></Suspense>
        <div className="flex items-center justify-between gap-2 mt-5 mb-3">
          <p className="font-label-md text-label-md text-on-surface-variant">{all.length} {all.length === 1 ? 'resultado' : 'resultados'}</p>
          <div className="inline-flex rounded-full bg-surface-container p-1">
            <Link href={toggle('')} scroll={false} className={`px-3 h-8 rounded-full font-label-md text-label-md flex items-center gap-1 ${!mapa ? 'bg-primary-container text-white shadow-sm' : 'text-on-surface-variant'}`}><Icon name="view_list" className="text-[16px]" />Lista</Link>
            <Link href={toggle('mapa')} scroll={false} className={`px-3 h-8 rounded-full font-label-md text-label-md flex items-center gap-1 ${mapa ? 'bg-primary-container text-white shadow-sm' : 'text-on-surface-variant'}`}><Icon name="map" className="text-[16px]" />Mapa</Link>
          </div>
        </div>
        {mapa ? (() => {
          const pts = all.filter(b => b.lat != null && b.lng != null).map(b => ({ slug: b.slug, name: b.name, lat: b.lat!, lng: b.lng!, from: cop(b.matches[0]?.price ?? b.from), rating: b.reviewCount ? `★ ${b.rating.toFixed(1)}` : 'Nuevo', img: b.imgs[0] || null, open: !!b.open }));
          return <>
            <SearchMap points={pts} here={sp.lat && sp.lng ? { lat: Number(sp.lat), lng: Number(sp.lng) } : null} />
            {pts.length < all.length && <p className="mt-2 font-body-sm text-on-surface-variant">{all.length - pts.length} {all.length - pts.length === 1 ? 'negocio no aparece' : 'negocios no aparecen'} en el mapa porque aún no tienen ubicación. <Link href={toggle('')} className="text-secondary font-semibold">Ver lista</Link></p>}
          </>;
        })() : list.length ? <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-gutter lg:gap-gutter-desktop">{list.map(b => <BusinessCard key={b.id} b={b} />)}</div>
          : <Empty icon="search_off" title="Sin resultados" text="Prueba con otro servicio, ciudad o quita algunos filtros." />}
        {!mapa && all.length > list.length && <div className="text-center mt-6"><Link href={`/buscar?${more.toString()}`} scroll={false} className="btn-outline">Ver más resultados</Link></div>}
        {!sp.q && !sp.cat && cs.length > 0 && <nav className="mt-10" aria-label="Buscar por ciudad"><h2 className="font-title-md text-title-md mb-2">Por ciudad</h2><div className="flex flex-wrap gap-2">{cs.flatMap(c => ['PELUQUERIA', 'BARBERIA', 'SPA', 'UNAS'].map(k => <Link key={c + k} href={`/buscar?ciudad=${encodeURIComponent(c)}&cat=${k}`} className="chip">{PLURAL[k]} en {c}</Link>))}</div></nav>}
      </main>
    </>
  );
}
