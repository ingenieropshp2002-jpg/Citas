export const metadata = { title: 'Sin conexión' };
export const dynamic = 'force-static';
export default function SinConexion() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center px-margin">
      <span className="w-14 h-14 rounded-2xl bg-primary-container text-secondary-fixed flex items-center justify-center font-headline-sm italic text-[26px]">R</span>
      <h1 className="mt-6 font-headline-md text-headline-md text-primary-container dark:text-primary">Estás sin conexión</h1>
      <p className="mt-2 text-on-surface-variant max-w-sm">Revisa tu internet e inténtalo de nuevo. Tus citas siguen guardadas.</p>
      <a href="" className="btn-primary mt-6">Reintentar</a>
    </main>
  );
}
