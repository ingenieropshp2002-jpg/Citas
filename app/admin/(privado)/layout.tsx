import Link from 'next/link';
import { requireSuperAdmin } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { AppMark } from '@/components/ui/AppMark';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { AdminNav } from './Nav';
import { logout } from '@/app/login/actions';

export async function generateMetadata() { const s = await getSettings(); return { title: { default: 'Superadmin', template: `%s · Superadmin · ${s.appName}` }, robots: { index: false, follow: false } }; }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSuperAdmin();
  const s = await getSettings();
  return (
    <div className="min-h-screen bg-surface-container-low/60 dark:bg-surface">
      <header className="sticky top-0 z-40 bg-[#0b1220] text-white">
        <div className="max-w-[1400px] mx-auto px-margin h-14 flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-2 shrink-0"><AppMark s={s} /><span className="font-title-md hidden sm:inline">{s.appName}</span><span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm font-bold uppercase tracking-wide">Superadmin</span></Link>
          <span className="ml-auto font-label-md text-white/70 hidden md:inline">{user.name}</span>
          <form action={logout}><button className="h-9 px-3 rounded-lg bg-white/10 hover:bg-white/15 font-label-md">Salir</button></form>
          <ThemeToggle className="!text-white hover:!bg-white/10" />
        </div>
        <AdminNav />
      </header>
      <main className="max-w-[1400px] mx-auto p-margin md:p-margin-tablet">{children}</main>
    </div>
  );
}
