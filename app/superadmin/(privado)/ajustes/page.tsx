import { getSettings } from '@/lib/settings';
import { PageHeader } from '@/components/panel/PageHeader';
import { ActionForm } from '@/components/ui/ActionForm';
import { Submit } from '@/components/ui/Submit';
import { ImageInput } from '@/components/ui/ImageInput';
import { saveSettingsAction } from '@/app/superadmin/actions';

export const metadata = { title: 'Ajustes de la app' };
export default async function Ajustes() {
  const s = await getSettings();
  const F = ({ name, label, value, hint, area, ...rest }: { name: string; label: string; value: string | number; hint?: string; area?: boolean } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value'>) => (
    <label className="block"><span className="label">{label}</span>
      {area ? <textarea name={name} defaultValue={String(value)} rows={2} className="input !h-auto py-3" /> : <input name={name} defaultValue={String(value)} className="input" {...rest} />}
      {hint && <span className="block mt-1 font-body-sm text-body-sm text-on-surface-variant">{hint}</span>}</label>
  );
  return (
    <>
      <PageHeader eyebrow="Plataforma" title="Ajustes de la app" subtitle="Lo que cambies aquí se ve de inmediato en toda la aplicación, sin tocar código." />
      <ActionForm action={saveSettingsAction} className="grid xl:grid-cols-2 gap-4 items-start" success="Ajustes guardados. Ya se ven en la app.">
        <section className="card p-5 space-y-3">
          <h2 className="h-section">Marca</h2>
          <F name="appName" label="Nombre de la aplicación" value={s.appName} required minLength={2} />
          <F name="shortName" label="Nombre corto (debajo del ícono en el teléfono)" value={s.shortName} maxLength={14} />
          <F name="tagline" label="Descripción corta" value={s.tagline} area />
          <div><span className="label">Logo</span><ImageInput name="logoUrl" defaultValue={s.logoUrl || null} /><span className="block mt-1 font-body-sm text-body-sm text-on-surface-variant">Si no subes logo, se usa la inicial del nombre.</span></div>
        </section>
        <section className="card p-5 space-y-3">
          <h2 className="h-section">Página de inicio</h2>
          <F name="heroBadge" label="Etiqueta superior" value={s.heroBadge} />
          <F name="heroTitle" label="Título principal" value={s.heroTitle} area />
          <F name="heroSubtitle" label="Texto debajo del título" value={s.heroSubtitle} area />
          <F name="businessTitle" label="Título del bloque para negocios" value={s.businessTitle} area />
          <F name="businessSubtitle" label="Texto del bloque para negocios" value={s.businessSubtitle} area />
        </section>
        <section className="card p-5 space-y-3">
          <h2 className="h-section">Operación</h2>
          <F name="announcement" label="Aviso para todos (opcional)" value={s.announcement} hint="Aparece como franja arriba en todas las pantallas. Déjalo vacío para ocultarlo." />
          <F name="trialDays" label="Días de prueba gratis para negocios nuevos" value={s.trialDays} type="number" min={0} max={365} />
          <label className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low"><input type="checkbox" name="registrationsOpen" defaultChecked={s.registrationsOpen} className="w-5 h-5 accent-primary-container" /><span><span className="block font-label-lg">Permitir que se registren negocios nuevos</span><span className="font-body-sm text-on-surface-variant">Los clientes siempre pueden crear su cuenta.</span></span></label>
          <F name="supportWhatsapp" label="WhatsApp de soporte" value={s.supportWhatsapp} inputMode="numeric" placeholder="300 000 0000" />
          <F name="supportEmail" label="Correo de soporte" value={s.supportEmail} type="email" />
        </section>
        <section id="planes" className="card p-5 space-y-4 scroll-mt-32">
          <h2 className="h-section">Planes y precios</h2>
          <p className="font-body-sm text-on-surface-variant">El empresario elige pagar mes a mes o un año completo. Si dejas el anual en 0, se cobra 10 meses (2 gratis).</p>
          {s.plans.map(p => (
            <fieldset key={p.id} className="p-3 rounded-xl bg-surface-container-low space-y-2">
              <legend className="eyebrow px-1">{p.id}</legend>
              <div className="grid grid-cols-2 gap-2">
                <F name={`plan_${p.id}_name`} label="Nombre" value={p.name} />
                <F name={`plan_${p.id}_price`} label="Precio mensual (COP)" value={p.price} inputMode="numeric" />
                <F name={`plan_${p.id}_priceYear`} label="Precio anual (COP)" value={p.priceYear ?? p.price * 10} inputMode="numeric" />
                <F name={`plan_${p.id}_maxStaff`} label="Profesionales activos (0 = ilimitado)" value={p.maxStaff ?? 0} inputMode="numeric" />
              </div>
              <F name={`plan_${p.id}_desc`} label="Qué incluye" value={p.desc} area />
            </fieldset>
          ))}
        </section>
        <div className="xl:col-span-2 sticky bottom-0 py-3 bg-gradient-to-t from-surface via-surface/95 to-transparent flex justify-end"><Submit className="btn-primary min-w-[200px]">Guardar ajustes</Submit></div>
      </ActionForm>
    </>
  );
}
