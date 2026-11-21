import { ClientHeader } from '@/components/cliente/Header';
import { FavoritesList } from '@/components/cliente/Favorites';

export const metadata = { title: 'Favoritos' };
export default function Favoritos() {
  return (
    <>
      <ClientHeader title="Favoritos" />
      <main className="pt-20 pb-24 px-margin max-w-3xl mx-auto">
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary-container dark:text-primary">Tus favoritos</h1>
        <p className="mt-1 text-on-surface-variant">Los negocios que guardaste en este dispositivo. No necesitas cuenta.</p>
        <FavoritesList />
      </main>
    </>
  );
}
