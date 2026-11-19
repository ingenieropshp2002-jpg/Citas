import Link from 'next/link';
import { cop, CATEGORY_LABEL } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';

type Card = {
  slug: string; name: string; category: string; zone: string | null; city: string; rating: number; reviewCount: number; imgs: string[]; from: number; distance: number | null; tagline: string | null;
  open?: boolean; featured?: boolean; hasPlans?: boolean; matches?: { id: string; name: string; price: number; durationMin: number }[];
};
export function BusinessCard({ b }: { b: Card }) {
  return (
    <article className="group card overflow-hidden hover:shadow-raised hover:border-gold/40 transition-all flex flex-col">
      <Link href={`/negocio/${b.slug}`} className="block">
        <div className="relative aspect-video overflow-hidden bg-surface-container">
          {b.imgs[0] && <img src={b.imgs[0]} alt={b.name} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />}
          <div className="absolute inset-0 bg-gradient-to-t from-primary-container/60 via-transparent" />
          <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm uppercase tracking-wider">{CATEGORY_LABEL[b.category]}</span>
          {b.featured && <span className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-container/90 text-secondary-fixed font-label-sm text-label-sm"><Icon name="workspace_premium" fill className="text-[14px]" />Destacado</span>}
          <span className="absolute bottom-3 left-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-lowest/90 backdrop-blur text-on-surface font-label-md text-label-md">
            {b.reviewCount ? <><Icon name="star" fill className="text-[16px] text-gold" />{b.rating.toFixed(1)} <span className="text-on-surface-variant font-normal">({b.reviewCount})</span></> : <><Icon name="new_releases" className="text-[16px] text-secondary" />Nuevo</>}
          </span>
          {b.open !== undefined && <span className={`absolute bottom-3 right-3 px-2 py-0.5 rounded-full font-label-sm text-label-sm backdrop-blur ${b.open ? 'bg-[#ECFDF5]/95 text-[#065F46]' : 'bg-surface-container-lowest/90 text-on-surface-variant'}`}>{b.open ? 'Abierto ahora' : 'Cerrado'}</span>}
        </div>
        <div className="p-4 pb-3">
          <h3 className="font-title-lg text-title-lg text-primary-container dark:text-primary truncate">{b.name}</h3>
          <p className="flex items-center gap-1 text-on-surface-variant font-body-sm text-body-sm mt-0.5"><Icon name="location_on" className="text-[16px] text-secondary" />{b.zone ? `${b.zone}, ` : ''}{b.city}{b.distance != null && ` · ${b.distance.toFixed(1)} km`}</p>
          <div className="flex items-baseline justify-between gap-2 mt-3">
            <span className="font-label-md text-label-md text-on-surface-variant truncate">{b.hasPlans ? <span className="inline-flex items-center gap-1 text-secondary"><Icon name="redeem" className="text-[15px]" />Paquetes y membresías</span> : b.tagline}</span>
            <span className="font-label-md text-label-md text-on-surface-variant shrink-0">Desde <b className="font-title-md text-title-md text-primary-container dark:text-primary tnum">{cop(b.from)}</b></span>
          </div>
        </div>
      </Link>
      {!!b.matches?.length && (
        <ul className="px-4 pb-4 mt-auto space-y-1.5 border-t border-parchment pt-3">
          {b.matches.map(s => (
            <li key={s.id}><Link href={`/reservar/${b.slug}?servicio=${s.id}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 -mx-2 hover:bg-surface-container-low">
              <span className="flex-1 min-w-0 truncate font-label-lg">{s.name} <span className="text-on-surface-variant font-normal">· {s.durationMin} min</span></span>
              <span className="tnum font-label-lg">{cop(s.price)}</span><span className="text-secondary font-label-md">Reservar</span>
            </Link></li>
          ))}
        </ul>
      )}
    </article>
  );
}
