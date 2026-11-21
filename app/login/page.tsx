import Link from 'next/link';
import { appleConfigured } from '@/lib/apple';
import { LoginForms } from './LoginForms';
import { AccountTabs } from './AccountTabs';
import { Icon } from '@/components/ui/Icon';
import { waReady } from '@/lib/notify';
import { getSettings } from '@/lib/settings';
import { AppMark } from '@/components/ui/AppMark';
import { IMG } from '@/lib/images';
import { getShop, slugFromPath } from '@/lib/shop';
import { ShopMark } from '@/components/cliente/Header';
export const metadata = { title: 'Mi cuenta' };
export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; crear?: string }> }) {
  const sp = await searchParams; const next = sp.next || '/';
  // Para clientes la cuenta es opcional; el panel de negocios y el superadmin siempre piden ingresar.
  const cliente = !/^\/(admin|superadmin|pantalla)/.test(next);
  const shop = await getShop(slugFromPath(next));
  const s = await getSettings();
  return (
    <main className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:block relative"><img src={IMG.salon} alt="" className="absolute inset-0 w-full h-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-primary-container via-primary-container/40" />
        <div className="absolute bottom-12 left-12 right-12 text-white"><p className="eyebrow !text-secondary-fixed">{shop?.name || s.appName}</p><h2 className="font-display text-display mt-2">Belleza sin filas, <i>sin llamadas</i>.</h2></div></div>
      <div className="flex flex-col justify-center px-margin py-10 max-w-md w-full mx-auto">
        {shop
          ? <Link href={`/negocio/${shop.slug}`} className="flex items-center gap-2 mb-8"><ShopMark shop={shop} size={9} /><span className="font-headline-sm text-headline-sm text-primary-container dark:text-primary">{shop.name}</span></Link>
          : <Link href="/" className="flex items-center gap-2 mb-8"><AppMark s={s} size={9} /><span className="font-headline-sm text-headline-sm text-primary-container dark:text-primary">{s.appName}</span></Link>}
        {cliente ? <>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary-container dark:text-primary">Mi cuenta</h1>
          <p className="text-on-surface-variant mb-5">Es opcional: puedes usar toda la app sin registrarte.</p>
          <div className="card p-space-md mb-5">
            <p className="font-title-md text-title-md mb-2">Con tu cuenta:</p>
            <ul className="space-y-2 font-body-md text-on-surface-variant">
              <li className="flex items-start gap-2"><Icon name="favorite" className="text-[20px] text-secondary mt-0.5" />Tus citas y tu historial quedan guardados aunque borres la app o cambies de celular.</li>
              <li className="flex items-start gap-2"><Icon name="bolt" className="text-[20px] text-secondary mt-0.5" />Tus datos se llenan solos cuando reservas, y puedes reprogramar o cancelar en un toque.</li>
            </ul>
          </div>
          <AccountTabs next={next} google={!!process.env.GOOGLE_CLIENT_ID} apple={appleConfigured()} phone={(await waReady())} initial={sp.crear ? 'crear' : 'entrar'} />
        </> : <>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary-container dark:text-primary">Te damos la bienvenida</h1>
          <p className="text-on-surface-variant mb-6">Ingresa para administrar tu negocio.</p>
          <LoginForms next={next} google={!!process.env.GOOGLE_CLIENT_ID} apple={appleConfigured()} phone={(await waReady())} />
        </>}
        {process.env.SHOW_DEMO === '1' && <p className="mt-6 text-center font-body-sm text-body-sm text-on-surface-variant">Demo: dueno@demo.co · cliente@demo.co (clave demo1234)</p>}
      </div>
    </main>
  );
}
