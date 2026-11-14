import Link from 'next/link';
import { getUser } from '@/lib/auth';
import { Icon } from '@/components/ui/Icon';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { BackButton } from './BackButton';

export async function ClientHeader({ title, back = false }: { title?: string; back?: boolean }) {
  const user = await getUser();
  return (
    <header className="fixed top-0 w-full z-50 bg-surface/85 backdrop-blur-xl pt-safe shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="h-16 px-margin md:px-margin-tablet lg:px-margin-desktop max-w-[1280px] mx-auto flex items-center justify-between">
        <div className="flex items-center gap-space-sm min-w-0">
          {back && <BackButton />}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="w-8 h-8 rounded-lg bg-primary-container text-secondary-fixed flex items-center justify-center font-headline-sm text-[18px] italic">R</span>
            {!title && <span className="font-headline-sm text-headline-sm text-primary-container dark:text-primary">Registro Citas</span>}
          </Link>
          {title && <h1 className="font-title-md text-title-md text-primary-container dark:text-primary truncate max-w-[200px] md:max-w-none">{title}</h1>}
        </div>
        <nav className="hidden md:flex items-center gap-6 font-label-lg text-label-lg text-on-surface-variant">
          <Link href="/buscar" className="hover:text-primary">Explorar</Link>
          <Link href="/mis-citas" className="hover:text-primary">Mis citas</Link>
          <Link href="/panel" className="hover:text-primary">Para negocios</Link>
        </nav>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          {user ? (
            <Link href="/perfil" aria-label="Mi perfil" className="w-9 h-9 rounded-full bg-secondary-fixed p-[1px] overflow-hidden flex items-center justify-center">
              {user.avatar ? <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : <span className="font-label-lg text-on-secondary-fixed">{user.name.charAt(0)}</span>}
            </Link>
          ) : (
            <Link href="/login" className="btn-primary btn-sm"><Icon name="login" className="text-[18px]" />Ingresar</Link>
          )}
        </div>
      </div>
    </header>
  );
}
