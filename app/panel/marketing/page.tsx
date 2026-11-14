import Link from 'next/link';
import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
import { PageHeader, Stat } from '@/components/panel/PageHeader';
import { ActionForm } from '@/components/ui/ActionForm';
import { Drawer } from '@/components/ui/Drawer';
import { Icon } from '@/components/ui/Icon';
import { audience, saveCampaign, saveCoupon } from '../_actions/marketing';
import { cop, fechaCorta } from '@/lib/format';
import { fillVars, waConfigured, waLink } from '@/lib/notify';
import { RemindersNow, SendCampaign, ToggleCoupon } from './Buttons';

export const metadata = { title: 'Marketing' };
const AUD: Record<string, string> = { TODOS: 'Todos los clientes', INACTIVOS: 'Inactivos (+60 días)', CUMPLEANOS: 'Cumpleañeros del mes', NUEVOS: 'Nuevos (1 visita)' };
export default async function Marketing() {
  const { business: b } = await requireBusiness('marketing');
  const manual = !waConfigured();
  const link = `${process.env.APP_URL || ''}/negocio/${b.slug}`;
  const [campaigns, coupons, inactive] = await Promise.all([
    db.campaign.findMany({ where: { businessId: b.id }, orderBy: { createdAt: 'desc' } }),
    db.coupon.findMany({ where: { businessId: b.id }, orderBy: { code: 'asc' } }),
    audience(b.id, 'INACTIVOS')
  ]);
  const auds: Record<string, Awaited<ReturnType<typeof audience>>> = manual ? Object.fromEntries(await Promise.all([...new Set(campaigns.map(c => c.audience))].map(async k => [k, await audience(b.id, k)] as const))) : {};
  return (
    <>
      <PageHeader eyebrow="Crecimiento" title="Marketing" actions={<Drawer title="Nueva campaña de WhatsApp" trigger={<><Icon name="campaign" className="text-[18px]" />Nueva campaña</>}>
        <ActionForm action={saveCampaign} resetOnSuccess success="Campaña guardada como borrador">
          <label className="block"><span className="label">Nombre</span><input name="name" className="input" required /></label>
          <label className="block"><span className="label">Audiencia</span><select name="audience" className="input">{Object.entries(AUD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label className="block"><span className="label">Cupón (opcional)</span><select name="couponCode" className="input"><option value="">—</option>{coupons.filter(c => c.active).map(c => <option key={c.id}>{c.code}</option>)}</select></label>
          <label className="block"><span className="label">Mensaje</span><textarea name="message" rows={5} className="input" required defaultValue="Hola {nombre} 👋, te esperamos en {negocio}. Reserva aquí: {link}" /></label>
          <p className="font-body-sm text-on-surface-variant">Variables: {'{nombre}'}, {'{negocio}'}, {'{link}'}, {'{cupon}'}. Envíe solo a clientes que autorizaron comunicaciones (Ley 1581 de 2012). Para envíos masivos, WhatsApp exige plantillas aprobadas por Meta.</p>
          <button className="btn-primary w-full">Guardar</button>
        </ActionForm></Drawer>} />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
        <Stat label="Campañas enviadas" value={String(campaigns.filter(c => c.status === 'ENVIADA').length)} icon="send" />
        <Stat label="Mensajes enviados" value={String(campaigns.reduce((a, c) => a + c.sentCount, 0))} icon="chat" />
        <Stat label="Cupones activos" value={String(coupons.filter(c => c.active).length)} icon="sell" tone="gold" />
        <Stat label="Clientes inactivos" value={String(inactive.length)} icon="person_off" tone="danger" hint="Sin visita en 60 días" />
      </div>
      <div className="grid xl:grid-cols-3 gap-4">
        <section className="card p-5 xl:col-span-2">
          <h2 className="h-section mb-3">Campañas por WhatsApp</h2>
          <ul className="space-y-3">{campaigns.map(c => (
            <li key={c.id} className="p-4 rounded-xl bg-surface-container-low">
              <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-title-md text-title-md">{c.name}</p><span className="font-label-md text-on-surface-variant">{AUD[c.audience]} · {c.status === 'ENVIADA' ? `Enviada a ${c.sentCount}` : 'Borrador'}</span></div>
              <p className="mt-2 text-on-surface-variant whitespace-pre-line">{c.message}</p>
              {manual ? <details className="mt-3"><summary className="btn btn-sm bg-[#25D366] text-white inline-flex cursor-pointer">Enviar uno por uno por WhatsApp</summary>
                <ul className="mt-2 grid sm:grid-cols-2 gap-1.5">{(auds[c.audience] || []).slice(0, 150).map(cu => <li key={cu.id}><a target="_blank" rel="noreferrer" className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-container-lowest hover:bg-surface-container" href={waLink(cu.phone, fillVars(c.message, { nombre: cu.name.split(' ')[0], negocio: b.name, link, cupon: c.couponCode || '' }))}><span className="truncate">{cu.name}</span><Icon name="send" className="text-[16px] text-[#25D366]" /></a></li>)}</ul></details>
              : <div className="mt-3"><SendCampaign id={c.id} label={c.status === 'ENVIADA' ? 'Reenviar' : 'Enviar'} /></div>}
            </li>
          ))}</ul>
          <div className="mt-6 p-4 rounded-xl border border-gold/40">
            <h3 className="font-title-md text-title-md flex items-center gap-2"><Icon name="restore" className="text-secondary" />Recuperar clientes inactivos</h3>
            <p className="text-on-surface-variant mt-1">{inactive.length} clientes no vienen hace más de 60 días{inactive.length ? `: ${inactive.slice(0, 5).map(c => c.name.split(' ')[0]).join(', ')}${inactive.length > 5 ? '…' : ''}` : ''}. Crea una campaña con audiencia “Inactivos” y un cupón.</p>
          </div>
        </section>
        <div className="space-y-4">
          <section className="card p-5">
            <h2 className="h-section mb-1">Recordatorios</h2>
            <p className="text-on-surface-variant mb-3">{manual ? 'Envíalos desde tu WhatsApp con un toque por cliente, el día anterior a cada cita.' : `Se envían por WhatsApp ${b.reminderHours} h antes de cada cita.`}{!manual && <> Programa <code className="px-1 rounded bg-surface-container">/api/cron/recordatorios</code> cada 15 min (ver README) o envíalos ahora.</>}</p>
            <div className="flex flex-wrap gap-2 items-center">{manual ? <Link href="/panel/recordatorios" className="btn btn-sm bg-[#25D366] text-white"><Icon name="chat" className="text-[16px]" />Enviar recordatorios</Link> : <RemindersNow />}<Link href="/panel/configuracion" className="btn-ghost btn-sm">Ajustar</Link></div>
          </section>
          <section className="card p-5">
            <h2 className="h-section mb-3">Cupones</h2>
            <ul className="space-y-2 mb-4">{coupons.map(c => (
              <li key={c.id} className={`flex items-center justify-between gap-2 p-2.5 rounded-xl bg-surface-container-low ${c.active ? '' : 'opacity-50'}`}>
                <div><p className="font-label-lg tracking-wider">{c.code}</p><p className="font-body-sm text-on-surface-variant">{c.type === 'PORCENTAJE' ? `${c.value}%` : cop(c.value)} · {c.uses}{c.maxUses ? `/${c.maxUses}` : ''} usos{c.validUntil ? ` · hasta ${fechaCorta(c.validUntil)}` : ''}</p></div>
                <ToggleCoupon id={c.id} active={c.active} />
              </li>
            ))}</ul>
            <ActionForm action={saveCoupon} resetOnSuccess className="space-y-2">
              <input name="code" className="input uppercase" placeholder="CÓDIGO" required />
              <div className="grid grid-cols-2 gap-2"><select name="type" className="input"><option value="PORCENTAJE">% descuento</option><option value="VALOR">Valor fijo</option></select><input name="value" type="number" min={1} className="input" placeholder="Valor" required /></div>
              <div className="grid grid-cols-2 gap-2"><input name="maxUses" type="number" min={1} className="input" placeholder="Máx. usos" /><input name="validUntil" type="date" className="input" /></div>
              <button className="btn-ghost btn-sm w-full">Crear cupón</button>
            </ActionForm>
          </section>
        </div>
      </div>
    </>
  );
}
