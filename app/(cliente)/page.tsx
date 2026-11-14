import Link from 'next/link';
import { ClientHeader } from '@/components/cliente/Header';
import { BusinessCard } from '@/components/cliente/BusinessCard';
import { Icon } from '@/components/ui/Icon';
import { searchBusinesses } from '@/lib/search';
import { IMG } from '@/lib/images';

export const dynamic = 'force-dynamic';
const CATS = [['PELUQUERIA', 'Peluquería', 'content_cut'], ['BARBERIA', 'Barbería', 'face'], ['SPA', 'Spa', 'spa'], ['UNAS', 'Uñas', 'back_hand']] as const;

export default async function Home() {
  const top = (await searchBusinesses({})).slice(0, 6);
  return (
    <>
      <ClientHeader />
      <main className="pt-16">
        <section className="relative overflow-hidden">
          <img src={IMG.salon} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-primary-container/80 via-primary-container/70 to-surface" />
          <div className="relative max-w-[1280px] mx-auto px-margin md:px-margin-tablet lg:px-margin-desktop pt-12 pb-16 md:pt-20 md:pb-24">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-fixed/90 text-on-secondary-fixed font-label-sm text-label-sm uppercase tracking-wider"><Icon name="verified" fill className="text-[14px]" />Bogotá · Medellín · Cali</span>
            <h1 className="mt-4 font-headline-lg-mobile text-headline-lg-mobile md:font-display md:text-display text-white max-w-2xl">Tu próxima cita de <i className="text-secondary-fixed">belleza</i>, a un toque.</h1>
            <p className="mt-3 text-white/80 font-body-lg text-body-lg max-w-xl">Reserva en peluquerías, barberías y spas. Paga con Nequi, PSE o tarjeta y recibe recordatorios por WhatsApp.</p>
            <form action="/buscar" className="mt-6 max-w-2xl relative">
              <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input name="q" className="input h-14 pl-12 pr-32 rounded-2xl shadow-raised" placeholder="Corte, barba, masaje, uñas…" />
              <button className="btn-gold btn-sm absolute right-2 top-1/2 -translate-y-1/2 h-10">Buscar</button>
            </form>
          </div>
        </section>
        <div className="max-w-[1280px] mx-auto px-margin md:px-margin-tablet lg:px-margin-desktop">
          <section className="-mt-8 relative grid grid-cols-4 gap-2 md:gap-4">
            {CATS.map(([k, l, i]) => (
              <Link key={k} href={`/buscar?cat=${k}`} className="card py-4 flex flex-col items-center gap-1.5 hover:border-gold/40 hover:shadow-raised transition">
                <span className="w-11 h-11 rounded-full bg-secondary-fixed/50 flex items-center justify-center"><Icon name={i} className="text-secondary" /></span>
                <span className="font-label-md text-label-md text-primary-container dark:text-primary">{l}</span>
              </Link>
            ))}
          </section>
          <section className="mt-space-xl">
            <div className="flex items-end justify-between mb-4">
              <div><p className="eyebrow">Recomendados</p><h2 className="font-headline-md text-headline-md text-primary-container dark:text-primary">Los mejor calificados</h2></div>
              <Link href="/buscar" className="font-label-md text-label-md text-secondary font-bold">Ver todos</Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-gutter lg:gap-gutter-desktop">{top.map(b => <BusinessCard key={b.id} b={b} />)}</div>
          </section>
          <section className="my-space-xl card-raised p-6 md:p-10 flex flex-col md:flex-row items-start md:items-center gap-6 justify-between bg-primary-container dark:bg-surface-container text-white">
            <div>
              <p className="eyebrow !text-secondary-fixed">Para negocios</p>
              <h2 className="font-headline-md text-headline-md text-white dark:text-on-surface mt-1">Agenda, caja, inventario y facturación electrónica en un solo lugar.</h2>
              <p className="text-white/70 dark:text-on-surface-variant mt-2">Comparte tu link de reservas por Instagram y WhatsApp.</p>
            </div>
            <Link href="/panel" className="btn-gold shrink-0">Registrar mi negocio</Link>
          </section>
        </div>
      </main>
    </>
  );
}
