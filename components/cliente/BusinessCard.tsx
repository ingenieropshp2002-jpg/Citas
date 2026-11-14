import Link from 'next/link';
import { cop, CATEGORY_LABEL } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';
export function BusinessCard({ b }: { b: { slug: string; name: string; category: string; zone: string | null; city: string; rating: number; reviewCount: number; imgs: string[]; from: number; distance: number | null; tagline: string | null } }) {
  return (
    <Link href={`/negocio/${b.slug}`} className="group card overflow-hidden hover:shadow-raised hover:border-gold/40 transition-all">
      <div className="relative aspect-video overflow-hidden bg-surface-container">
        {b.imgs[0] && <img src={b.imgs[0]} alt={b.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />}
        <div className="absolute inset-0 bg-gradient-to-t from-primary-container/60 via-transparent" />
        <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm uppercase tracking-wider">{CATEGORY_LABEL[b.category]}</span>
        <span className="absolute bottom-3 left-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-lowest/90 backdrop-blur text-on-surface font-label-md text-label-md">
          <Icon name="star" fill className="text-[16px] text-gold" />{b.rating.toFixed(1)} <span className="text-on-surface-variant font-normal">({b.reviewCount})</span>
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-title-lg text-title-lg text-primary-container dark:text-primary truncate">{b.name}</h3>
        <p className="flex items-center gap-1 text-on-surface-variant font-body-sm text-body-sm mt-0.5"><Icon name="location_on" className="text-[16px] text-secondary" />{b.zone ? `${b.zone}, ` : ''}{b.city}{b.distance != null && ` · ${b.distance.toFixed(1)} km`}</p>
        <div className="flex items-baseline justify-between mt-3">
          <span className="font-label-md text-label-md text-on-surface-variant">{b.tagline}</span>
          <span className="font-label-md text-label-md text-on-surface-variant">Desde <b className="font-title-md text-title-md text-primary-container dark:text-primary tnum">{cop(b.from)}</b></span>
        </div>
      </div>
    </Link>
  );
}
