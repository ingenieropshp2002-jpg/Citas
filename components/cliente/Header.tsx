import Link from 'next/link';
import { UserChip } from './UserChip';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { BackButton } from './BackButton';
import { getSettings } from '@/lib/settings';
import { AppMark } from '@/components/ui/AppMark';

export async function ClientHeader({ title, back = false }: { title?: string; back?: boolean }) {
  const s = await getSettings();
  return (
    <header className="fixed top-0 w-full z-50 bg-surface/85 backdrop-blur-xl pt-safe shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="h-16 px-margin md:px-margin-tablet lg:px-margin-desktop max-w-[1280px] mx-auto flex items-center justify-between">
        <div className="flex items-center gap-space-sm min-w-0">
          {back && <BackButton />}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <AppMark s={s} />
            {!title && <span className="font-headline-sm text-headline-sm text-primary-container dark:text-primary">{s.appName}</span>}
          </Link>
          {title && <h1 className="font-title-md text-title-md text-primary-container dark:text-primary truncate max-w-[200px] md:max-w-none">{title}</h1>}
        </div>
        <nav className="hidden md:flex items-center gap-6 font-label-lg text-label-lg text-on-surface-variant">
          <Link href="/buscar" className="hover:text-primary">Explorar</Link>
          <Link href="/mis-citas" className="hover:text-primary">Mis citas</Link>
          <Link href="/admin" className="hover:text-primary">Para negocios</Link>
        </nav>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <UserChip href="/perfil" label="Mi perfil" loginHref="/login" />
        </div>
      </div>
    </header>
  );
}

export function ShopMark({ shop, size = 8 }: { shop: { name: string; logo: string | null }; size?: 8 | 9 }) {
  const cls = size === 9 ? 'w-9 h-9' : 'w-8 h-8';
  return shop.logo
    ? <img src={shop.logo} alt="" className={`${cls} rounded-lg object-cover shrink-0 bg-surface-container`} />
    : <span className={`${cls} rounded-lg bg-primary-container text-secondary-fixed flex items-center justify-center font-headline-sm text-[18px] italic shrink-0`}>{shop.name.charAt(0)}</span>;
}

// Encabezado del enlace propio de cada negocio: solo su marca, sin buscador ni enlaces a otros negocios.
export async function ShopHeader({ shop, title, back = false }: { shop: { slug: string; name: string; logo: string | null }; title?: string; back?: boolean }) {
  const home = `/negocio/${shop.slug}`;
  const citas = `/mis-citas?negocio=${shop.slug}`;
  return (
    <header className="fixed top-0 w-full z-50 bg-surface/85 backdrop-blur-xl pt-safe shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="h-16 px-margin md:px-margin-tablet lg:px-margin-desktop max-w-[1280px] mx-auto flex items-center justify-between">
        <div className="flex items-center gap-space-sm min-w-0">
          {back && <BackButton fallback={home} />}
          <Link href={home} className="flex items-center gap-2 min-w-0">
            <ShopMark shop={shop} />
            <span className="font-title-md text-title-md text-primary-container dark:text-primary truncate max-w-[180px] md:max-w-none">{title || shop.name}</span>
          </Link>
        </div>
        <nav className="hidden md:flex items-center gap-6 font-label-lg text-label-lg text-on-surface-variant">
          <Link href={home} className="hover:text-primary">Servicios</Link>
          <Link href={`/reservar/${shop.slug}`} className="hover:text-primary">Reservar</Link>
          <Link href={citas} className="hover:text-primary">Mis citas</Link>
        </nav>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <UserChip href={citas} label="Mis citas" loginHref={`/login?next=${encodeURIComponent(home)}`} />
        </div>
      </div>
    </header>
  );
}
