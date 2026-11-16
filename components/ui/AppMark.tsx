import type { Settings } from '@/lib/settings';
import { initial } from '@/lib/settings';
/** Logo de la plataforma: imagen configurada o inicial del nombre. */
export function AppMark({ s, size = 8 }: { s: Pick<Settings, 'appName' | 'logoUrl'>; size?: 8 | 9 | 14 }) {
  const cls = size === 14 ? 'w-14 h-14 text-[26px] rounded-2xl' : size === 9 ? 'w-9 h-9 text-[20px] rounded-lg' : 'w-8 h-8 text-[18px] rounded-lg';
  return s.logoUrl
    ? <img src={s.logoUrl} alt="" className={`${cls} object-cover shrink-0 bg-surface-container`} />
    : <span className={`${cls} bg-primary-container text-secondary-fixed flex items-center justify-center font-headline-sm italic shrink-0`}>{initial(s.appName)}</span>;
}
