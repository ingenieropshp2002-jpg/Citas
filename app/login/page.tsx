import Link from 'next/link';
import { LoginForms } from './LoginForms';
import { waConfigured } from '@/lib/notify';
import { IMG } from '@/lib/images';
import { getShop, slugFromPath } from '@/lib/shop';
import { ShopMark } from '@/components/cliente/Header';
export const metadata = { title: 'Ingresar' };
export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = (await searchParams).next || '/';
  const shop = await getShop(slugFromPath(next));
  return (
    <main className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:block relative"><img src={IMG.salon} alt="" className="absolute inset-0 w-full h-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-primary-container via-primary-container/40" />
        <div className="absolute bottom-12 left-12 right-12 text-white"><p className="eyebrow !text-secondary-fixed">{shop?.name || 'Registro Citas'}</p><h2 className="font-display text-display mt-2">Belleza sin filas, <i>sin llamadas</i>.</h2></div></div>
      <div className="flex flex-col justify-center px-margin py-10 max-w-md w-full mx-auto">
        {shop
          ? <Link href={`/negocio/${shop.slug}`} className="flex items-center gap-2 mb-8"><ShopMark shop={shop} size={9} /><span className="font-headline-sm text-headline-sm text-primary-container dark:text-primary">{shop.name}</span></Link>
          : <Link href="/" className="flex items-center gap-2 mb-8"><span className="w-9 h-9 rounded-lg bg-primary-container text-secondary-fixed flex items-center justify-center font-headline-sm italic">R</span><span className="font-headline-sm text-headline-sm text-primary-container dark:text-primary">Registro Citas</span></Link>}
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary-container dark:text-primary">Te damos la bienvenida</h1>
        <p className="text-on-surface-variant mb-6">Ingresa para reservar y gestionar tus citas.</p>
        <LoginForms next={next} google={!!process.env.GOOGLE_CLIENT_ID} phone={waConfigured()} />
        {process.env.SHOW_DEMO === '1' && <p className="mt-6 text-center font-body-sm text-body-sm text-on-surface-variant">Demo: dueno@demo.co · cliente@demo.co (clave demo1234)</p>}
      </div>
    </main>
  );
}
