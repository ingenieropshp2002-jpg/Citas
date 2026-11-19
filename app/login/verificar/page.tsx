import { redirect } from 'next/navigation';
import { pendingSignIn } from '@/lib/auth';
import { Icon } from '@/components/ui/Icon';
import { SecondStepForm } from './Form';

export const metadata = { title: 'Verificación en dos pasos' };
export default async function Verificar() {
  if (!(await pendingSignIn())) redirect('/login');
  return (
    <main className="min-h-screen flex flex-col justify-center px-margin py-10 max-w-md mx-auto">
      <span className="w-12 h-12 rounded-xl bg-secondary-fixed/50 flex items-center justify-center mb-3"><Icon name="verified_user" className="text-secondary" /></span>
      <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary-container dark:text-primary">Verificación en dos pasos</h1>
      <p className="text-on-surface-variant mb-6">Abre tu app de autenticación (Google Authenticator, Microsoft Authenticator o Authy) y escribe el código.</p>
      <SecondStepForm />
    </main>
  );
}
