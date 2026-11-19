import Link from 'next/link';
import { ClientHeader } from '@/components/cliente/Header';
import { Icon } from '@/components/ui/Icon';
import { IMG } from '@/lib/images';
import { getSettings, yearPrice } from '@/lib/settings';
import { Plans } from './Plans';

export const dynamic = 'force-dynamic';
export async function generateMetadata() {
  const s = await getSettings();
  return { title: { absolute: `${s.appName} para negocios: agenda, caja y reservas en línea` }, description: `Software para peluquerías, barberías, spas y uñas en Colombia. Reservas por Instagram y WhatsApp, recordatorios, caja con factura electrónica. Prueba gratis ${s.trialDays} días.` };
}

const SIGNUP = '/registro?next=%2Fadmin%2Fregistro';
const DEMO = '/negocio/bella-forma-peluqueria';
const FEATURES: [string, string, string][] = [
  ['calendar_month', 'Agenda en línea 24/7', 'Tus clientes reservan solos desde Instagram, WhatsApp o Google, y tú ves todo en una agenda por profesional.'],
  ['notifications_active', 'Recordatorios por WhatsApp', 'Confirmación y recordatorio automáticos. Si no confirman, el horario se libera y avisamos a la lista de espera.'],
  ['point_of_sale', 'Caja y factura electrónica', 'Cobra servicios y productos, cierra caja y emite factura electrónica DIAN.'],
  ['inventory_2', 'Inventario', 'Controla productos e insumos, con alertas cuando se están acabando.'],
  ['payments', 'Comisiones del equipo', 'Calcula lo de cada profesional por servicio y producto, y liquida en un clic.'],
  ['redeem', 'Paquetes y tarjetas de regalo', 'Vende bonos, membresías y tarjetas de regalo que se descuentan solas en la caja.'],
  ['star', 'Reseñas en Google', 'Después de cada cita pedimos la opinión y llevamos a tus clientes felices a Google.'],
  ['install_mobile', 'Tu propia app', 'Tus clientes instalan una app con tu logo y tus colores, sin tiendas de aplicaciones.'],
  ['insights', 'Métricas claras', 'Ingresos, ocupación, clientes nuevos y perdidos, y tu mejor profesional del mes.']
];
const STEPS: [string, string][] = [
  ['Crea tu cuenta', 'Con tu correo o con Google, en un minuto.'],
  ['Configura tu negocio', 'Una guía te lleva paso a paso: servicios, horario, equipo y fotos.'],
  ['Comparte tu enlace', 'Ponlo en tu Instagram y WhatsApp y empieza a recibir reservas.']
];
const FAQ: [string, string][] = [
  ['¿Tengo que pagar para probar?', 'No. Tienes la prueba gratis con todas las funciones y no pedimos tarjeta. Al final eliges el plan que necesites.'],
  ['¿Mis clientes tienen que descargar algo?', 'No. Reservan desde el navegador con tu enlace. Si quieren, instalan tu app desde la misma página.'],
  ['¿Sirve si tengo varias sedes?', 'Sí. Manejas todas las sedes desde una sola cuenta y cambias entre ellas en el panel.'],
  ['¿Puedo cambiar de plan?', 'Sí, cuando quieras. El plan depende de cuántos profesionales trabajan contigo.'],
  ['¿Mis datos están seguros?', 'Hacemos copias de respaldo automáticas, puedes activar la verificación en dos pasos y dar a cada persona del equipo solo los permisos que necesita.']
];

export default async function Negocios() {
  const s = await getSettings();
  const staffLabel = (n?: number) => (!n ? 'Profesionales ilimitados' : n === 1 ? '1 profesional' : `Hasta ${n} profesionales`);
  const plans = s.plans.map(p => ({ id: p.id, name: p.name, price: p.price, year: yearPrice(p), desc: p.desc, staff: staffLabel(p.maxStaff) }));
  const wa = s.supportWhatsapp.replace(/\D/g, '');
  const demoWa = wa ? `https://wa.me/${wa.length === 10 ? `57${wa}` : wa}?text=${encodeURIComponent(`Hola, quiero una demo de ${s.appName} para mi negocio.`)}` : null;
  return (
    <>
      <ClientHeader />
      <main className="pt-16">
        <section className="relative overflow-hidden">
          <img src={IMG.salon} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-primary-container/90 via-primary-container/80 to-primary-container" />
          <div className="relative max-w-[1100px] mx-auto px-margin md:px-margin-tablet pt-14 pb-16 md:pt-24 md:pb-24 text-center">
            <p className="eyebrow !text-secondary-fixed">Para peluquerías, barberías, spas y uñas</p>
            <h1 className="mt-3 font-headline-lg-mobile text-headline-lg-mobile md:font-display md:text-display text-white max-w-3xl mx-auto">{s.businessTitle}</h1>
            <p className="mt-4 text-white/80 font-body-lg text-body-lg max-w-2xl mx-auto">{s.businessSubtitle} Menos mensajes, menos citas perdidas y más clientes que vuelven.</p>
            <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
              <Link href={SIGNUP} className="btn-gold">Prueba gratis {s.trialDays} días</Link>
              <Link href={DEMO} className="btn-outline !text-white !border-white/50 hover:!bg-white/10"><Icon name="play_circle" className="text-[20px]" />Ver la demo</Link>
            </div>
            <p className="mt-3 text-white/70 font-body-sm">Sin tarjeta · Cancelas cuando quieras</p>
          </div>
        </section>

        <section className="max-w-[1100px] mx-auto px-margin md:px-margin-tablet py-14">
          <h2 className="font-headline-md text-headline-md text-primary-container dark:text-primary text-center">Todo lo que tu negocio necesita</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
            {FEATURES.map(([icon, t, d]) => (
              <div key={t} className="card p-5">
                <span className="w-11 h-11 rounded-xl bg-secondary-fixed/50 flex items-center justify-center"><Icon name={icon} className="text-secondary" /></span>
                <h3 className="mt-3 font-title-lg text-title-lg">{t}</h3>
                <p className="mt-1 text-on-surface-variant">{d}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="demo" className="bg-surface-container-low dark:bg-surface-container py-14">
          <div className="max-w-[1100px] mx-auto px-margin md:px-margin-tablet grid md:grid-cols-2 gap-8 items-center">
            <div>
              <p className="eyebrow">Demo</p>
              <h2 className="font-headline-md text-headline-md text-primary-container dark:text-primary">Mira cómo reservan tus clientes</h2>
              <p className="mt-2 text-on-surface-variant">Abre la página de un salón de ejemplo y haz una reserva como si fueras cliente: servicio, profesional, fecha y hora en menos de un minuto.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href={DEMO} className="btn-primary"><Icon name="storefront" className="text-[20px]" />Abrir el salón de ejemplo</Link>
                {demoWa && <a href={demoWa} target="_blank" rel="noopener" className="btn-outline"><Icon name="chat" className="text-[20px]" />Pedir una demo guiada</a>}
              </div>
            </div>
            <ol className="space-y-3">
              {STEPS.map(([t, d], i) => (
                <li key={t} className="card p-4 flex gap-3 items-start">
                  <span className="w-9 h-9 rounded-full bg-primary-container text-secondary-fixed flex items-center justify-center font-title-md shrink-0">{i + 1}</span>
                  <div><p className="font-title-md text-title-md">{t}</p><p className="text-on-surface-variant">{d}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="planes" className="max-w-[1100px] mx-auto px-margin md:px-margin-tablet py-14">
          <h2 className="font-headline-md text-headline-md text-primary-container dark:text-primary text-center">Planes y precios</h2>
          <p className="text-center text-on-surface-variant mt-1">Precios en pesos colombianos. Todos incluyen la prueba gratis de {s.trialDays} días.</p>
          <Plans plans={plans} trialDays={s.trialDays} signup={SIGNUP} />
        </section>

        <section className="max-w-[800px] mx-auto px-margin md:px-margin-tablet pb-14">
          <h2 className="font-headline-sm text-headline-sm text-primary-container dark:text-primary mb-3">Preguntas frecuentes</h2>
          <div className="space-y-2">
            {FAQ.map(([q, a]) => (
              <details key={q} className="card p-4 group">
                <summary className="cursor-pointer list-none flex items-center gap-2 font-title-md"><span className="flex-1">{q}</span><Icon name="expand_more" className="transition group-open:rotate-180" /></summary>
                <p className="mt-2 text-on-surface-variant">{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="bg-primary-container py-12 text-center px-margin">
          <h2 className="font-headline-md text-headline-md text-white">Empieza hoy, gratis</h2>
          <p className="text-white/80 mt-1">Tu negocio queda listo para recibir reservas en minutos.</p>
          <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href={SIGNUP} className="btn-gold">Crear mi cuenta gratis</Link>
            <Link href="/login?next=%2Fadmin" className="btn-outline !text-white !border-white/50 hover:!bg-white/10">Ya tengo cuenta</Link>
          </div>
        </section>
      </main>
    </>
  );
}
