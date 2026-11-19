import { redirect } from 'next/navigation';
import { getUser, isSuperAdmin } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { AppMark } from '@/components/ui/AppMark';
import { LoginForms } from '@/app/login/LoginForms';

export const metadata = { title: 'Acceso superadmin', robots: { index: false, follow: false } };
// Entrada propia del superadmin, separada del ingreso de clientes y negocios.
export default async function AdminLogin() {
  const [u, s] = await Promise.all([getUser(), getSettings()]);
  if (isSuperAdmin(u)) redirect('/superadmin');
  return (
    <main className="min-h-screen flex items-center justify-center px-margin py-10 bg-[#0b1220]">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-6 text-white"><AppMark s={s} size={9} /><span className="font-headline-sm text-headline-sm">{s.appName}</span><span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm font-bold uppercase tracking-wide">Superadmin</span></div>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-white">Acceso restringido</h1>
        <p className="text-white/70 mb-6">Solo para la administración de la plataforma.</p>
        {u && <p role="alert" className="mb-4 p-3 rounded-lg bg-[#FFF1F2] text-danger font-label-md">La cuenta {u.email || u.name} no tiene permiso de superadmin. Ingresa con la cuenta correcta.</p>}
        <LoginForms next="/superadmin" google={!!process.env.GOOGLE_CLIENT_ID} phone={false} />
      </div>
    </main>
  );
}
