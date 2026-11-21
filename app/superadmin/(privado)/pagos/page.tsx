import Link from 'next/link';
import { db } from '@/lib/db';
import { getPay } from '@/lib/payments';
import { PageHeader } from '@/components/panel/PageHeader';
import { ActionForm } from '@/components/ui/ActionForm';
import { Submit } from '@/components/ui/Submit';
import { Icon } from '@/components/ui/Icon';
import { cop, fechaLarga } from '@/lib/format';
import { savePagosAction } from '@/app/superadmin/pagos-actions';

export const metadata = { title: 'Pagos' };
const NAMES = { SIMULADO: 'Modo de prueba', WOMPI: 'Wompi', MERCADOPAGO: 'Mercado Pago' } as const;
export default async function Pagos() {
  const c = await getPay();
  const webhook = `${(process.env.APP_URL || 'https://reserva-citas.ingenieropshp2002.workers.dev').replace(/\/$/, '')}/api/pagos/webhook`;
  const since = new Date(Date.now() - 30 * 86400e3);
  const [auto, subs] = await Promise.all([
    db.business.findMany({ where: { autoRenew: true, parentId: null }, select: { id: true, name: true, plan: true, billingPeriod: true, billingProvider: true, billingCard: true, billingFails: true, billingError: true, paidUntil: true, trialEndsAt: true } }),
    db.payment.findMany({ where: { appointmentId: null, saleId: null, createdAt: { gte: since } }, include: { business: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 40 })
  ]);
  const approved = subs.filter(s => s.status === 'APROBADO').reduce((a, s) => a + s.amount, 0);
  const F = ({ name, label, value, hint, secret, saved }: { name: string; label: string; value?: string; hint?: string; secret?: boolean; saved?: boolean }) => (
    <label className="block"><span className="label">{label}</span>
      <input name={name} defaultValue={secret ? '' : value ?? ''} type={secret ? 'password' : 'text'} className="input font-mono text-[13px]" autoComplete="off" placeholder={secret && saved ? '•••••••• guardada (déjala vacía para no cambiarla)' : ''} />
      {secret && saved && <span className="flex items-center gap-1 mt-1 font-body-sm"><input type="checkbox" name={`clear_${name}`} className="accent-primary-container" />Borrar</span>}
      {hint && <span className="block mt-1 font-body-sm text-on-surface-variant">{hint}</span>}
    </label>
  );
  return (
    <>
      <PageHeader eyebrow="Plataforma" title="Pagos y cobro automático" subtitle="Pasarela con la que los negocios pagan su plan. Con la renovación automática, la tarjeta se cobra sola cada mes o cada año." />
      <div className={`card p-4 mb-4 flex items-start gap-3 border ${c.provider === 'SIMULADO' ? 'border-gold/50' : 'border-[#059669]/40'}`}>
        <Icon name={c.provider === 'SIMULADO' ? 'science' : 'check_circle'} className={`text-[26px] ${c.provider === 'SIMULADO' ? 'text-secondary' : 'text-[#059669]'}`} />
        <div><p className="font-title-md">Pasarela: {NAMES[c.provider]}{c.provider === 'WOMPI' ? ` (${c.wompi.env === 'production' ? 'producción' : 'pruebas'})` : ''}</p>
          <p className="font-body-sm text-on-surface-variant">{c.provider === 'SIMULADO' ? 'Nadie paga de verdad. Para probar el rechazo, usa una tarjeta que termine en 0002.' : 'Los pagos son reales según el ambiente de las llaves.'} {auto.length} {auto.length === 1 ? 'negocio' : 'negocios'} con renovación automática · {cop(approved)} cobrados en 30 días.</p></div>
      </div>
      <div className="grid xl:grid-cols-2 gap-4 items-start">
        <ActionForm action={savePagosAction} className="card p-5 space-y-3" success="Pasarela guardada.">
          <h2 className="h-section">Pasarela</h2>
          <div className="grid grid-cols-3 gap-2">{(['WOMPI', 'MERCADOPAGO', 'SIMULADO'] as const).map(p => (
            <label key={p} className="flex items-center gap-2 p-2.5 rounded-xl border border-parchment has-[:checked]:border-gold has-[:checked]:bg-secondary-fixed/20 cursor-pointer"><input type="radio" name="provider" value={p} defaultChecked={c.provider === p} className="accent-primary-container" />{NAMES[p]}</label>
          ))}</div>
          <h3 className="font-title-md pt-2">Wompi <span className="font-body-sm text-on-surface-variant">(recomendado en Colombia)</span></h3>
          <p className="font-body-sm text-on-surface-variant">En comercios.wompi.co → Desarrolladores → Llaves del API. Para guardar tarjetas, Wompi debe tener activos los <b>cobros recurrentes / fuentes de pago</b> en tu cuenta (se pide a soporte de Wompi).</p>
          <F name="wPublic" label="Llave pública" value={c.wompi.publicKey} hint="pub_test_… o pub_prod_…" />
          <F name="wPrivate" label="Llave privada" secret saved={!!c.wompi.privateKey} />
          <F name="wIntegrity" label="Secreto de integridad" secret saved={!!c.wompi.integritySecret} />
          <F name="wEvents" label="Secreto de eventos" secret saved={!!c.wompi.eventsSecret} />
          <input type="hidden" name="wEnv" value={c.wompi.env} />
          <h3 className="font-title-md pt-2">Mercado Pago</h3>
          <p className="font-body-sm text-on-surface-variant">En mercadopago.com.co/developers → Tus integraciones → Credenciales de producción.</p>
          <F name="mpPublic" label="Public key" value={c.mp.publicKey} />
          <F name="mpToken" label="Access token" secret saved={!!c.mp.accessToken} />
          <div className="p-3 rounded-xl bg-surface-container-low font-body-sm"><p className="label !mb-1">URL de eventos / webhook (la misma para las dos)</p><code className="break-all select-all">{webhook}</code>
            <p className="mt-1 text-on-surface-variant">Wompi: Desarrolladores → URL de eventos. Mercado Pago: Webhooks → eventos <b>Pagos</b>, <b>Planes y suscripciones</b>.</p></div>
          <Submit className="btn-primary w-full">Guardar</Submit>
        </ActionForm>
        <div className="space-y-4">
          <section className="card overflow-hidden">
            <h2 className="h-section p-4 border-b border-parchment">Renovación automática</h2>
            {auto.length ? <ul className="divide-y divide-parchment">{auto.map(b => (
              <li key={b.id} className="p-3 font-body-sm flex flex-wrap gap-x-3"><Link href={`/superadmin/negocios?q=${encodeURIComponent(b.name)}`} className="font-label-lg flex-1">{b.name}</Link><span>{b.plan} · {b.billingPeriod === 'ANUAL' ? 'anual' : 'mensual'} · {b.billingCard || b.billingProvider}</span>
                <span className="w-full text-on-surface-variant">Próximo cobro: {fechaLarga(b.paidUntil || b.trialEndsAt || new Date())}{b.billingFails ? <b className="text-danger"> · {b.billingFails} rechazos: {b.billingError}</b> : ''}</span></li>
            ))}</ul> : <p className="p-4 text-on-surface-variant">Todavía ningún negocio la activó.</p>}
          </section>
          <section className="card overflow-hidden">
            <h2 className="h-section p-4 border-b border-parchment">Pagos de planes (30 días)</h2>
            {subs.length ? <ul className="divide-y divide-parchment max-h-[480px] overflow-y-auto">{subs.map(p => (
              <li key={p.id} className="p-3 font-body-sm flex gap-2"><span className="flex-1">{p.business.name} · {p.method === 'AUTOMATICO' ? 'automático' : p.method.toLowerCase()} · {p.provider}</span><span className="tnum">{cop(p.amount)}</span><span className={p.status === 'APROBADO' ? 'text-[#059669]' : p.status === 'RECHAZADO' ? 'text-danger' : 'text-on-surface-variant'}>{p.status.toLowerCase()}</span></li>
            ))}</ul> : <p className="p-4 text-on-surface-variant">Sin pagos todavía.</p>}
          </section>
        </div>
      </div>
    </>
  );
}
