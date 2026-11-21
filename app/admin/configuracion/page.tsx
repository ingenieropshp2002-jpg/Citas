import QRCode from 'qrcode';
import { requireBusiness } from '@/lib/auth';
import { PageHeader } from '@/components/panel/PageHeader';
import { ActionForm } from '@/components/ui/ActionForm';
import { HoursFields } from '@/components/panel/HoursFields';
import { Icon } from '@/components/ui/Icon';
import { saveSettings } from '../_actions/catalog';
import { parseJson } from '@/lib/format';
import { CopyLink } from './CopyLink';
import { waReady, waLink } from '@/lib/notify';
import Link from 'next/link';

export const metadata = { title: 'Configuración' };
export default async function Configuracion({ searchParams }: { searchParams: Promise<{ nuevo?: string; sede?: string }> }) {
  const { business: b } = await requireBusiness('configuracion');
  const sp = await searchParams; const nuevo = sp.nuevo;
  const url = `${process.env.APP_URL || 'http://localhost:3000'}/negocio/${b.slug}`;
  const qr = await QRCode.toDataURL(url, { margin: 1, width: 220, color: { dark: '#0d2538' } });
  const Sec = ({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) => <section className="card p-5"><h2 className="font-title-lg text-title-lg flex items-center gap-2 mb-4"><Icon name={icon} className="text-secondary" />{title}</h2><div className="space-y-3">{children}</div></section>;
  return (
    <>
      <PageHeader eyebrow="Ajustes" title="Configuración" />
      {sp.sede && <div className="mb-4 p-4 rounded-xl bg-secondary-fixed/40">¡Sede creada! Ya la estás administrando. Revisa sus datos, agrega su equipo y comparte su link de reservas. Cambias de sede desde el menú.</div>}
      {nuevo && <div className="mb-4 p-4 rounded-xl bg-secondary-fixed/40">¡Tu negocio fue creado! Completa los datos, agrega servicios y profesionales, y comparte tu link de reservas.</div>}
      <section className="card-raised p-5 mb-4 grid md:grid-cols-[1fr_auto] gap-4 items-center">
        <div>
          <h2 className="font-title-lg text-title-lg">Link de reservas para Instagram y WhatsApp</h2>
          <p className="text-on-surface-variant">Pégalo en la biografía de Instagram, en tu perfil de WhatsApp Business o imprime el QR en recepción.</p>
          <div className="flex flex-wrap items-center gap-2 mt-3"><code className="px-3 py-2 rounded-lg bg-surface-container-low font-mono text-[13px] break-all">{url}</code><CopyLink url={url} /><a className="btn-sm btn bg-[#25D366] text-white" href={waLink('', `Reserva tu cita en ${b.name}: ${url}`)} target="_blank" rel="noreferrer"><Icon name="share" className="text-[16px]" />WhatsApp</a><Link href="/admin/qr" className="btn-outline btn-sm"><Icon name="qr_code_2" className="text-[16px]" />Afiche QR para recepción</Link></div>
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
          <Sec title="Abono para separar la cita" icon="account_balance">
            <div className="grid grid-cols-2 gap-3">
              <label><span className="label">Porcentaje del abono</span><select name="depositPercentSel" defaultValue={[0, 20, 30, 50, 100].includes(b.depositPercent) ? String(b.depositPercent) : 'otro'} className="input"><option value="0">Ninguno</option><option value="20">20 %</option><option value="30">30 %</option><option value="50">50 %</option><option value="100">100 % (pago total)</option><option value="otro">Otro…</option></select></label>
              <label><span className="label">Otro porcentaje (%)</span><input name="depositPercentOtro" type="number" min={1} max={100} defaultValue={[0, 20, 30, 50, 100].includes(b.depositPercent) ? '' : b.depositPercent} className="input" placeholder="Solo si elegiste Otro" /></label>
              <label><span className="label">Plazo para pagar el abono</span><select name="depositDeadlineMin" defaultValue={b.depositDeadlineMin} className="input">{[30, 60, 90, 120, 180, 240].map(n => <option key={n} value={n}>{n % 60 ? `${n} minutos` : `${n / 60} ${n === 60 ? 'hora' : 'horas'}`}</option>)}</select></label>
              <label><span className="label">Cancelación gratis hasta (horas antes)</span><input name="cancellationHours" type="number" min={0} defaultValue={b.cancellationHours} className="input" /></label>
            </div>
            <label className="flex items-center gap-2"><input type="checkbox" name="requireDeposit" defaultChecked={b.requireDeposit} className="accent-primary-container" />Pedir el abono a todos los clientes que reservan online</label>
            <label className="block"><span className="label">Datos para la transferencia (banco, tipo y número de cuenta, titular, Nequi o llave)</span><textarea name="transferInfo" defaultValue={b.transferInfo} rows={4} className="input !h-auto py-3" placeholder={'Bancolombia ahorros 123-456789-01\nA nombre de: Bella Forma SAS\nNequi: 300 123 4567'} /></label>
            <p className="font-body-sm text-on-surface-variant">Con estos datos el cliente puede pagar por transferencia y subir el comprobante. El horario queda apartado durante el plazo (solo 15 minutos si la cita es en 3 horas o menos); si no llega el comprobante a tiempo, la cita se cancela, el cupo se libera, cuenta como falta y avisamos a quienes estaban esperando ese horario. Revisa y confirma los abonos en <Link href="/admin/abonos" className="text-secondary font-semibold">Abonos</Link>. Con "Ninguno" no se pide abono a nadie.</p>
          </Sec>
          <Sec title="Asistencia: confirmación, tolerancia y anticipos" icon="event_available">
            <label className="flex items-center gap-2"><input type="checkbox" name="reminderHourBefore" defaultChecked={b.reminderHourBefore} className="accent-primary-container" />Enviar también un recordatorio 1 hora antes</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="releaseUnconfirmed" defaultChecked={b.releaseUnconfirmed} className="accent-primary-container" />Si el cliente no confirma, liberar el cupo</label>
            <div className="grid grid-cols-2 gap-3">
              <label><span className="label">Liberar sin confirmar (min antes)</span><select name="releaseBeforeMin" defaultValue={b.releaseBeforeMin} className="input">{[15, 30, 45, 60, 120].map(n => <option key={n} value={n}>{n} minutos</option>)}</select></label>
              <label><span className="label">Tolerancia de retraso</span><select name="lateToleranceMin" defaultValue={b.lateToleranceMin} className="input"><option value={0}>Sin tolerancia automática</option><option value={10}>10 minutos</option><option value={15}>15 minutos</option><option value={20}>20 minutos</option></select></label>
            </div>
            <p className="font-body-sm text-on-surface-variant">Pasada la tolerancia, la cita se marca "No llegó" y el horario queda libre para otra persona. Si llega, márcala "En servicio" en la agenda antes de ese tiempo.</p>
            <label className="flex items-center gap-2"><input type="checkbox" name="depositInPeak" defaultChecked={b.depositInPeak} className="accent-primary-container" />Exigir anticipo en horas pico y temporada alta</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="depositForNoShows" defaultChecked={b.depositForNoShows} className="accent-primary-container" />Exigir anticipo a quien incumple seguido</label>
            <label className="block"><span className="label">Se considera incumplido desde</span><select name="noShowLimit" defaultValue={b.noShowLimit} className="input">{[1, 2, 3, 4].map(n => <option key={n} value={n}>{n} {n === 1 ? 'falta' : 'faltas'} en 6 meses</option>)}</select></label>
            <p className="font-body-sm text-on-surface-variant">Cuenta como falta: no llegar, no confirmar o no pagar el abono a tiempo. Dos llegadas tarde cuentan como una falta. El anticipo usa el porcentaje del abono de arriba. Las horas pico se configuran en <Link href="/admin/fila" className="text-secondary font-semibold">Fila y huecos</Link>; el historial está en <Link href="/admin/clientes/incumplidos" className="text-secondary font-semibold">Clientes › Incumplidos</Link>.</p>
          </Sec>
          <Sec title="Notificaciones" icon="notifications">
            <label className="flex items-center gap-2"><input type="checkbox" name="notifyWhatsapp" defaultChecked={b.notifyWhatsapp} className="accent-primary-container" />Confirmaciones y recordatorios por WhatsApp</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="notifyEmail" defaultChecked={b.notifyEmail} className="accent-primary-container" />Enviar factura y confirmaciones por correo</label>
            <label className="block"><span className="label">Recordatorio (horas antes)</span><input name="reminderHours" type="number" min={1} defaultValue={b.reminderHours} className="input" /></label>
            <label className="flex items-center gap-2"><input type="checkbox" name="autoConfirmRequest" defaultChecked={b.autoConfirmRequest} className="accent-primary-container" />Pedir al cliente que confirme respondiendo 1 (o 2 para reprogramar)</label>
            <div className="rounded-xl border border-parchment p-3 space-y-2">
              <p className="font-label-lg">Avisos de citas nuevas, canceladas o movidas</p>
              <label className="block"><span className="label">¿A quién le llegan por WhatsApp?</span>
                <select name="notifyTo" defaultValue={b.notifyTo || 'RECEPCION'} className="input">
                  <option value="RECEPCION">A la recepción (recomendado)</option>
                  <option value="PROFESIONAL">Al profesional de la cita</option>
                  <option value="AMBOS">A la recepción y al profesional</option>
                  <option value="NADIE">A nadie (solo notificaciones de la app)</option>
                </select></label>
              <label className="block"><span className="label">WhatsApp de la recepción</span><input name="receptionWhatsapp" defaultValue={b.receptionWhatsapp || ''} className="input" inputMode="numeric" placeholder="300 123 4567" /></label>
              <p className="font-body-sm text-on-surface-variant">El WhatsApp de cada profesional se pone en <Link href="/admin/equipo" className="text-secondary font-semibold">Equipo</Link>. Si eliges al profesional, también recibe cada mañana el resumen de sus citas del día.</p>
            </div>
            <label className="block"><span className="label">ID del número de WhatsApp del negocio (opcional)</span><input name="waPhoneId" defaultValue={b.waPhoneId || ''} className="input" placeholder="Phone number ID de Meta" /></label>
            <p className="font-body-sm text-on-surface-variant">{(await waReady()) ? '✓ WhatsApp automático activo: confirmaciones y recordatorios salen solos.' : 'WhatsApp automático aún no está activo en la plataforma: mientras tanto envía los mensajes con los botones de WhatsApp (en Recordatorios). Si tienes tu propio número de WhatsApp Business, escribe su ID abajo.'}</p>
          </Sec>
          <Sec title="Plan de suscripción" icon="workspace_premium">
            <p className="text-on-surface-variant">Plan actual: <b>{b.plan}</b>. Cambia de plan o paga tu suscripción desde la página de suscripción.</p>
            <Link href="/admin/suscripcion" className="btn-outline btn-sm mt-3 inline-flex">Ver suscripción</Link>
          </Sec>
        </div>
        <div className="xl:col-span-2 sticky bottom-4"><button className="btn-primary w-full md:w-auto shadow-raised">Guardar configuración</button></div>
      </ActionForm>
    </>
  );
}
