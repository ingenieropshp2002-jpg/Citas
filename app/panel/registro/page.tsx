import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import { ActionForm } from '@/components/ui/ActionForm';
import { createBusiness } from '../_actions/catalog';
import { getSettings } from '@/lib/settings';
export const metadata = { title: 'Registrar negocio' };
export default async function Registro() {
  const u = await requireUser('/panel/registro');
  if (await db.business.findFirst({ where: { ownerId: u.id } })) redirect('/panel');
  return (
    <main className="min-h-screen flex items-center justify-center px-margin py-10">
      <div className="w-full max-w-lg">
        <p className="eyebrow">{(await getSettings()).appName} para negocios</p>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary-container dark:text-primary">Registra tu negocio</h1>
        <p className="text-on-surface-variant mb-6">Prueba todo gratis durante 14 días. No necesitas tarjeta.</p>
        <div className="card-raised p-6">
          <ActionForm action={createBusiness}>
            <label className="block"><span className="label">Nombre del negocio</span><input name="name" className="input" required /></label>
            <label className="block"><span className="label">Tipo</span><select name="category" className="input"><option value="PELUQUERIA">Peluquería</option><option value="BARBERIA">Barbería</option><option value="SPA">Spa</option><option value="UNAS">Uñas</option></select></label>
            <div className="grid grid-cols-2 gap-3"><label><span className="label">Ciudad</span><input name="city" className="input" required defaultValue="Bogotá" /></label><label><span className="label">WhatsApp</span><input name="phone" className="input" inputMode="numeric" /></label></div>
            <label className="block"><span className="label">Dirección</span><input name="address" className="input" required /></label>
            <button className="btn-primary w-full">Empezar prueba gratis de 14 días</button>
          </ActionForm>
        </div>
      </div>
    </main>
  );
}
