import QRCode from 'qrcode';
import { requireBusiness } from '@/lib/auth';
import { PageHeader } from '@/components/panel/PageHeader';
import { ActionForm } from '@/components/ui/ActionForm';
import { HoursFields } from '@/components/panel/HoursFields';
import { Icon } from '@/components/ui/Icon';
import { saveSettings } from '../_actions/catalog';
import { parseJson } from '@/lib/format';
import { CopyLink } from './CopyLink';
import { waConfigured, waLink } from '@/lib/notify';
import Link from 'next/link';

export const metadata = { title: 'Configuración' };
export default async function Configuracion({ searchParams }: { searchParams: Promise<{ nuevo?: string }> }) {
  const { business: b } = await requireBusiness('configuracion');
  const nuevo = (await searchParams).nuevo;
  const url = `${process.env.APP_URL || 'http://localhost:3000'}/negocio/${b.slug}`;
  const qr = await QRCode.toDataURL(url, { margin: 1, width: 220, color: { dark: '#0d2538' } });
  const Sec = ({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) => <section className="card p-5"><h2 className="font-title-lg text-title-lg flex items-center gap-2 mb-4"><Icon name={icon} className="text-secondary" />{title}</h2><div className="space-y-3">{children}</div></section>;
  return (
    <>
      <PageHeader eyebrow="Ajustes" title="Configuración" />
      {nuevo && <div className="mb-4 p-4 rounded-xl bg-secondary-fixed/40">¡Tu negocio fue creado! Completa los datos, agrega servicios y profesionales, y comparte tu link de reservas.</div>}
      <section className="card-raised p-5 mb-4 grid md:grid-cols-[1fr_auto] gap-4 items-center">
        <div>
          <h2 className="font-title-lg text-title-lg">Link de reservas para Instagram y WhatsApp</h2>
          <p className="text-on-surface-variant">Pégalo en la biografía de Instagram, en tu perfil de WhatsApp Business o imprime el QR en recepción.</p>
          <div className="flex flex-wrap items-center gap-2 mt-3"><code className="px-3 py-2 rounded-lg bg-surface-container-low font-mono text-[13px] break-all">{url}</code><CopyLink url={url} /><a className="btn-sm btn bg-[#25D366] text-white" href={waLink('', `Reserva tu cita en ${b.name}: ${url}`)} target="_blank" rel="noreferrer"><Icon name="share" className="text-[16px]" />WhatsApp</a><Link href="/panel/qr" className="btn-outline btn-sm"><Icon name="qr_code_2" className="text-[16px]" />Afiche QR para recepción</Link></div>
          {b.whatsapp && <p className="mt-3 font-body-sm text-on-surface-variant">Reserva por WhatsApp: <a className="text-secondary font-bold break-all" href={waLink(b.whatsapp, `Hola ${b.name}, quiero reservar una cita.`)} target="_blank" rel="noreferrer">{waLink(b.whatsapp, `Hola ${b.name}, quiero reservar una cita.`)}</a>. Con WhatsApp Business conectado, el sistema responde solo con tu enlace de reservas.</p>}
        </div>
        <img src={qr} alt="QR del link de reservas" className="w-36 h-36 rounded-xl border border-parchment" />
      </section>
      <ActionForm action={saveSettings} className="grid xl:grid-cols-2 gap-4" success="Configuración guardada">
        <Sec title="Datos del negocio" icon="storefront">
          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2"><span className="label">Nombre</span><input name="name" defaultValue={b.name} className="input" required /></label>
            <label><span className="label">Categoría</span><select name="category" defaultValue={b.category} className="input"><option value="PELUQUERIA">Peluquería</option><option value="BARBERIA">Barbería</option><option value="SPA">Spa</option><option value="UNAS">Uñas</option></select></label>
            <label><span className="label">Lema</span><input name="tagline" defaultValue={b.tagline || ''} className="input" /></label>
            <label className="col-span-2"><span className="label">Descripción</span><textarea name="description" defaultValue={b.description} className="input" rows={3} /></label>
            <label><span className="label">Ciudad</span><input name="city" defaultValue={b.city} className="input" required /></label>
            <label><span className="label">Barrio / zona</span><input name="zone" defaultValue={b.zone || ''} className="input" /></label>
            <label className="col-span-2"><span className="label">Dirección</span><input name="address" defaultValue={b.address} className="input" required /></label>
            <label><span className="label">Latitud</span><input name="lat" defaultValue={b.lat ?? ''} className="input" /></label>
            <label><span className="label">Longitud</span><input name="lng" defaultValue={b.lng ?? ''} className="input" /></label>
            <label><span className="label">Teléfono</span><input name="phone" defaultValue={b.phone || ''} className="input" /></label>
            <label><span className="label">WhatsApp</span><input name="whatsapp" defaultValue={b.whatsapp || ''} className="input" /></label>
            <label className="col-span-2"><span className="label">Instagram</span><input name="instagram" defaultValue={b.instagram || ''} className="input" placeholder="usuario sin @" /></label>
            <label className="col-span-2"><span className="label">Fotos (una URL por línea; la primera es la portada)</span><textarea name="images" defaultValue={parseJson<string[]>(b.images, []).join('\n')} className="input font-mono text-[12px]" rows={4} /></label>
          </div>
        </Sec>
        <div className="space-y-4">
          <Sec title="Horario de atención" icon="schedule"><HoursFields prefix="h" value={b.openingHours} /><label className="block"><span className="label">Intervalo entre franjas (min)</span><select name="slotStepMin" defaultValue={b.slotStepMin} className="input"><option value={10}>10</option><option value={15}>15</option><option value={30}>30</option></select></label></Sec>
          <Sec title="Política de cancelación y depósito" icon="policy">
            <label className="flex items-center gap-2"><input type="checkbox" name="requireDeposit" defaultChecked={b.requireDeposit} className="accent-primary-container" />Cobrar depósito al reservar online</label>
            <div className="grid grid-cols-2 gap-3"><label><span className="label">Depósito (%)</span><input name="depositPercent" type="number" min={0} max={100} defaultValue={b.depositPercent} className="input" /></label><label><span className="label">Cancelación gratis hasta (horas antes)</span><input name="cancellationHours" type="number" min={0} defaultValue={b.cancellationHours} className="input" /></label></div>
          </Sec>
          <Sec title="Notificaciones" icon="notifications">
            <label className="flex items-center gap-2"><input type="checkbox" name="notifyWhatsapp" defaultChecked={b.notifyWhatsapp} className="accent-primary-container" />Confirmaciones y recordatorios por WhatsApp</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="notifyEmail" defaultChecked={b.notifyEmail} className="accent-primary-container" />Enviar factura y confirmaciones por correo</label>
            <label className="block"><span className="label">Recordatorio (horas antes)</span><input name="reminderHours" type="number" min={1} defaultValue={b.reminderHours} className="input" /></label>
            <label className="flex items-center gap-2"><input type="checkbox" name="autoConfirmRequest" defaultChecked={b.autoConfirmRequest} className="accent-primary-container" />Pedir al cliente que confirme respondiendo 1 (o 2 para reprogramar)</label>
            <label className="block"><span className="label">ID del número de WhatsApp del negocio (opcional)</span><input name="waPhoneId" defaultValue={b.waPhoneId || ''} className="input" placeholder="Phone number ID de Meta" /></label>
            <p className="font-body-sm text-on-surface-variant">{waConfigured() ? '✓ WhatsApp Business conectado.' : 'WhatsApp está en modo simulado: los mensajes no salen hasta configurar WHATSAPP_TOKEN y WHATSAPP_PHONE_ID en Cloudflare (ver README).'}</p>
          </Sec>
          <Sec title="Plan de suscripción" icon="workspace_premium">
            <p className="text-on-surface-variant">Plan actual: <b>{b.plan}</b>. Cambia de plan o paga tu suscripción desde la página de suscripción.</p>
            <Link href="/panel/suscripcion" className="btn-outline btn-sm mt-3 inline-flex">Ver suscripción</Link>
          </Sec>
        </div>
        <div className="xl:col-span-2 sticky bottom-4"><button className="btn-primary w-full md:w-auto shadow-raised">Guardar configuración</button></div>
      </ActionForm>
    </>
  );
}
