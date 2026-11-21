import Link from 'next/link';
import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
import { PageHeader } from '@/components/panel/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { Submit } from '@/components/ui/Submit';
import { cop, fechaLarga, METHOD_LABEL } from '@/lib/format';
import { subscriptionState } from '@/lib/subscription';
import { getSettings, yearPrice } from '@/lib/settings';
import { provider } from '@/lib/payments';
import { paySubscription, startMpSubscription } from '../_actions/subscription';
import { AutoRenew } from './AutoRenew';
import { dueDate } from '@/lib/billing';
import { principalId } from '@/lib/sedes';

export const metadata = { title: 'Suscripción' };
export default async function Suscripcion({ searchParams }: { searchParams: Promise<{ pago?: string; error?: string; auto?: string }> }) {
  const { business: b, perms, user } = await requireBusiness(undefined, { allowExpired: true });
  const PLANS = (await getSettings()).plans;
  const sp = await searchParams;
  const s = subscriptionState(b);
  const payments = await db.payment.findMany({ where: { businessId: b.id, appointmentId: null, saleId: null }, orderBy: { createdAt: 'desc' }, take: 6 });
  const owner = perms === 'ALL';
  const main = b.parentId ? await db.business.findUniqueOrThrow({ where: { id: await principalId(b.id) } }) : b;
  const prov = await provider();
  const autoPlan = PLANS.find(p => p.id === main.plan) || PLANS[0];
  const autoAmount = main.billingPeriod === 'ANUAL' ? yearPrice(autoPlan) : autoPlan.price;
  return (
    <>
      <PageHeader eyebrow="Tu cuenta" title="Suscripción" />
      {sp.pago === 'ok' && <p className="mb-4 p-3 rounded-xl bg-[#ECFDF5] text-[#065F46] font-label-lg">✓ Pago aprobado. Tu suscripción quedó activa.</p>}
      {sp.pago === 'rechazado' && <p className="mb-4 p-3 rounded-xl bg-[#FFF1F2] text-danger font-label-lg">El pago fue rechazado. Intenta con otro medio de pago.</p>}
      <section className={`card-raised p-5 mb-4 ${s.state === 'VENCIDA' ? 'border border-danger/40' : ''}`}>
        {s.state === 'PRUEBA' && <><p className="eyebrow">Prueba gratis</p><h2 className="font-headline-sm text-headline-sm">Te quedan {s.daysLeft} {s.daysLeft === 1 ? 'día' : 'días'} de prueba</h2><p className="text-on-surface-variant mt-1">Estás usando todas las funciones del plan Pro sin pagar y sin tarjeta. La prueba termina el {fechaLarga(b.trialEndsAt!)}.</p></>}
        {s.state === 'ACTIVA' && <><p className="eyebrow">Activa</p><h2 className="font-headline-sm text-headline-sm">Plan {PLANS.find(p => p.id === b.plan)?.name || b.plan}</h2><p className="text-on-surface-variant mt-1">{b.paidUntil ? `Pagado hasta el ${fechaLarga(b.paidUntil)}.` : 'Tu cuenta está activa.'}</p></>}
        {s.state === 'GRACIA' && <><p className="eyebrow !text-danger">Período de gracia</p><h2 className="font-headline-sm text-headline-sm">Tu plan venció: te quedan {s.graceLeft} {s.graceLeft === 1 ? 'día' : 'días'} para pagar</h2><p className="text-on-surface-variant mt-1">Todo sigue funcionando por ahora. Si no pagas a tiempo, tu negocio se suspende y deja de recibir reservas.</p></>}
        {s.state === 'VENCIDA' && <><p className="eyebrow !text-danger">Suspendido</p><h2 className="font-headline-sm text-headline-sm">Tu negocio está suspendido por falta de pago</h2><p className="text-on-surface-variant mt-1">Tus datos están guardados y tu página de reservas sigue funcionando. Para volver a usar el Admin, elige un plan.</p></>}
      </section>
      {sp.auto === 'mp' && <p className="mb-4 p-3 rounded-xl bg-[#ECFDF5] text-[#065F46] font-label-lg">Listo. Cuando Mercado Pago confirme la autorización, verás la renovación automática activa aquí.</p>}
      {sp.error === 'mp' && <p className="mb-4 p-3 rounded-xl bg-[#FFF1F2] text-danger font-label-lg">Mercado Pago no respondió. Intenta de nuevo en unos minutos.</p>}
      {owner && <AutoRenew on={main.autoRenew} card={main.billingCard} provider={main.autoRenew ? main.billingProvider || prov : prov} plans={PLANS.map(p => ({ id: p.id, name: p.name, price: p.price, year: yearPrice(p) }))} plan={autoPlan.id} period={main.billingPeriod} nextAt={fechaLarga(dueDate(main))} amount={autoAmount} fails={main.billingFails} error={main.billingError} trial={s.state === 'PRUEBA'} />}
      {owner && prov === 'MERCADOPAGO' && !main.autoRenew && (
        <form action={startMpSubscription} className="card-raised p-5 mb-4 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]"><h2 className="h-section">Renovación automática con Mercado Pago</h2><p className="text-on-surface-variant font-body-sm">Autorizas una sola vez en Mercado Pago y el plan se cobra solo{s.state === 'PRUEBA' ? ' desde que termine la prueba' : ''}. Lo cancelas cuando quieras.</p></div>
          <select name="plan" defaultValue={autoPlan.id} className="input !w-auto">{PLANS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <select name="period" defaultValue="MENSUAL" className="input !w-auto"><option value="MENSUAL">Cada mes</option><option value="ANUAL">Cada año</option></select>
          <Submit className="btn-primary">Continuar en Mercado Pago</Submit>
        </form>
      )}
      {!owner && <p className="mb-4 text-on-surface-variant">Solo el dueño del negocio puede pagar la suscripción.</p>}
      <p className="mb-3 text-on-surface-variant">{main.autoRenew ? '¿Prefieres pagar ya? También puedes pagar a mano:' : 'O paga a mano: mes a mes o el año completo con descuento.'}</p>
      <div className="grid md:grid-cols-3 gap-4">{PLANS.map(p => {
        const year = yearPrice(p); const save = p.price * 12 - year; const freeMonths = Math.round(save / Math.max(1, p.price));
        return (
        <form key={p.id} action={paySubscription} className={`card p-5 flex flex-col ${b.plan === p.id ? 'border-gold' : ''}`}>
          <input type="hidden" name="plan" value={p.id} />
          <p className="font-title-lg text-title-lg">{p.name}{b.plan === p.id && <span className="ml-2 font-label-sm px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed align-middle">Actual</span>}</p>
          <p className="font-label-md text-secondary mt-0.5">{p.maxStaff ? (p.maxStaff === 1 ? '1 profesional' : `Hasta ${p.maxStaff} profesionales`) : 'Profesionales ilimitados'}</p>
          <p className="font-currency-display text-currency-display mt-2 tnum">{cop(p.price)}<span className="font-body-sm text-on-surface-variant"> /mes</span></p>
          <p className="font-body-sm text-on-surface-variant tnum">o {cop(year)} al año{save > 0 && <> · <b className="text-[#059669]">ahorras {cop(save)}{freeMonths > 0 ? ` (${freeMonths} ${freeMonths === 1 ? 'mes gratis' : 'meses gratis'})` : ''}</b></>}</p>
          <p className="text-on-surface-variant mt-3 flex-1">{p.desc}</p>
          {owner && <>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <label className="flex flex-col items-center gap-0.5 p-2 rounded-xl border border-parchment has-[:checked]:border-gold has-[:checked]:bg-secondary-fixed/20 cursor-pointer text-center"><input type="radio" name="period" value="MENSUAL" defaultChecked className="sr-only" /><span className="font-label-lg">Mensual</span><span className="font-label-sm text-on-surface-variant tnum">{cop(p.price)}</span></label>
              <label className="relative flex flex-col items-center gap-0.5 p-2 rounded-xl border border-parchment has-[:checked]:border-gold has-[:checked]:bg-secondary-fixed/20 cursor-pointer text-center"><input type="radio" name="period" value="ANUAL" className="sr-only" /><span className="font-label-lg">Anual</span><span className="font-label-sm text-on-surface-variant tnum">{cop(year)}</span>{save > 0 && <span className="absolute -top-2 right-1 px-1.5 rounded-full bg-[#059669] text-white text-[10px] font-bold">-{Math.round(save / (p.price * 12) * 100)}%</span>}</label>
            </div>
            <select name="method" className="input !h-10 mt-2">{['TARJETA', 'PSE', 'NEQUI'].map(m => <option key={m} value={m}>{METHOD_LABEL[m]}</option>)}</select>
            <Submit className="btn-primary w-full mt-2">Pagar</Submit></>}
        </form>
      ); })}</div>
      {prov === 'SIMULADO' && <p className="mt-3 font-body-sm text-on-surface-variant">La pasarela está en modo de prueba: configura Wompi o Mercado Pago para cobrar de verdad.</p>}
      {payments.length > 0 && <section className="card p-5 mt-4"><h2 className="h-section mb-3">Pagos de suscripción</h2><ul className="space-y-1">{payments.map(p => <li key={p.id} className="flex justify-between"><span>{fechaLarga(p.createdAt)} · {METHOD_LABEL[p.method] || p.method}</span><span className="tnum">{cop(p.amount)} · {p.status.toLowerCase()}</span></li>)}</ul></section>}
    </>
  );
}
