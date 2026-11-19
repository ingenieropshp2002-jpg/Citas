import QRCode from 'qrcode';
import { requireBusiness } from '@/lib/auth';
import { PageHeader } from '@/components/panel/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { appColor, isLight } from '@/lib/appBrand';
import { CopyLink } from '../configuracion/CopyLink';
import { StoryMaker } from './Story';

export const metadata = { title: 'Instagram' };
export default async function Instagram() {
  const { business: b } = await requireBusiness('marketing');
  const base = `${(process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '')}/negocio/${b.slug}`;
  const bio = `${base}?utm_source=instagram&utm_medium=bio`;
  const story = `${base}?utm_source=instagram&utm_medium=historia`;
  const qr = await QRCode.toDataURL(story, { margin: 1, width: 440, color: { dark: '#0d2538' } });
  const color = appColor(b.appColor);
  const handle = (b.instagram || '').replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/.*$/, '');
  return (
    <>
      <PageHeader eyebrow="Marketing" title="Instagram" subtitle="Convierte a tus seguidores en reservas: enlace en tu perfil, botón de reservar e historias con tu QR." />
      <div className="grid xl:grid-cols-2 gap-4">
        <section className="card p-5">
          <h2 className="h-section mb-1">1. Enlace en tu perfil</h2>
          <p className="text-on-surface-variant font-body-sm">Instagram → Editar perfil → Enlaces → Agregar enlace externo. Ponle de título «Reserva tu cita».</p>
          <div className="mt-3 flex items-center gap-2"><input readOnly value={bio} className="input font-mono text-[12px]" aria-label="Enlace para la biografía" /><CopyLink url={bio} /></div>
          <h2 className="h-section mt-6 mb-1">2. Botón «Reservar» en tu perfil</h2>
          <p className="text-on-surface-variant font-body-sm">Si tu cuenta es de empresa o creador: Editar perfil → Botones de acción → Reservar (o «Agregar enlace»), y pega el mismo enlace. Si Instagram no te muestra esa opción, el enlace del punto 1 cumple la misma función.</p>
          <h2 className="h-section mt-6 mb-1">3. Responde mensajes con tu enlace</h2>
          <p className="text-on-surface-variant font-body-sm">En Instagram → Herramientas para empresas → Respuestas guardadas, crea una con el atajo «/reserva» y este texto:</p>
          <p className="mt-2 p-3 rounded-xl bg-surface-container-low font-body-sm">¡Hola! Puedes reservar tu cita aquí, eliges servicio, profesional y hora: {bio}</p>
          {handle ? <a href={`https://instagram.com/${handle}`} target="_blank" rel="noopener" className="btn-outline btn-sm mt-4"><Icon name="open_in_new" className="text-[16px]" />Abrir @{handle}</a>
            : <p className="mt-4 font-body-sm text-on-surface-variant">Agrega tu usuario de Instagram en Configuración para mostrarlo en tu página.</p>}
        </section>
        <section className="card p-5">
          <h2 className="h-section mb-3">4. Historias con tu QR</h2>
          <StoryMaker name={b.name} color={color} light={isLight(color)} icon={`/negocio/${b.slug}/icono/192`} qr={qr} url={base} />
        </section>
      </div>
    </>
  );
}
