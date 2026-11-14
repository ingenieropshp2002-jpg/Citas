import Link from 'next/link';
import { readResetToken } from '@/lib/reset';
import { ResetForm } from '../Forms';
export const metadata = { title: 'Nueva contraseña' };
export default async function NuevaClave({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await readResetToken(token);
  return (
    <main className="min-h-screen flex flex-col justify-center px-margin py-10 max-w-md mx-auto">
      {data ? <>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary-container dark:text-primary">Crea tu contraseña</h1>
        <p className="text-on-surface-variant mb-6">Hola, {data.user.name.split(' ')[0]}. Elige una contraseña para ingresar con tu correo{data.user.email ? ` (${data.user.email})` : ''}.</p>
        <ResetForm token={token} />
      </> : <>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary-container dark:text-primary">El enlace ya no sirve</h1>
        <p className="text-on-surface-variant mb-6">Venció o ya se usó. Pide uno nuevo y úsalo en las próximas 24 horas.</p>
        <Link href="/recuperar" className="btn-primary">Pedir otro enlace</Link>
      </>}
    </main>
  );
}
