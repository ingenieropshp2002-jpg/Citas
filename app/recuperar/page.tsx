import Link from 'next/link';
import { ResetRequest } from './Forms';
export const metadata = { title: 'Recuperar contraseña' };
export default async function Recuperar({ searchParams }: { searchParams: Promise<{ next?: string; email?: string }> }) {
  const { next = '/', email = '' } = await searchParams;
  return (
    <main className="min-h-screen flex flex-col justify-center px-margin py-10 max-w-md mx-auto">
      <Link href={`/login?next=${encodeURIComponent(next)}`} className="inline-flex items-center gap-1 font-label-lg text-label-lg text-secondary mb-6">← Volver a ingresar</Link>
      <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary-container dark:text-primary">Recupera tu contraseña</h1>
      <p className="text-on-surface-variant mb-6">Escribe el correo de tu cuenta y te enviamos un enlace para crear una nueva.</p>
      <ResetRequest next={next} email={email} />
    </main>
  );
}
