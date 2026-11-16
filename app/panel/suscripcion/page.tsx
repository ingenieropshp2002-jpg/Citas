import Link from 'next/link';
import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
import { PageHeader } from '@/components/panel/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { Submit } from '@/components/ui/Submit';
import { cop, fechaLarga, METHOD_LABEL } from '@/lib/format';
import { subscriptionState } from '@/lib/subscription';
import { isSuperAdmin } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { provider } from '@/lib/payments';
import { paySubscription } from '../_actions/subscription';

export const metadata = { title: 'Suscripción' };
export default async function Suscripcion({ searchParams }: { searchParams: Promise<{ pago?: string; error?: string }> }) {
  const { business: b, perms, user } = await requireBusiness(undefined, { allowExpired: true });
  const PLANS = (await getSettings()).plans;
  const sp = await searchParams;
  const s = subscriptionState(b);
  const payments = await db.payment.findMany({ where: { businessId: b.id, appointmentId: null, saleId: null }, orderBy: { createdAt: 'desc' }, take: 6 });
  const owner = perms === 'ALL';
  return (
    <>
      <PageHeader eyebrow="Tu cuenta" title="Suscripción" actions={isSuperAdmin(user) ? <Link href="/admin" className="btn-ghost btn-sm"><Icon name="admin_panel_settings" className="text-[18px]" />Administrar negocios</Link> : undefined} />
      {sp.pago === 'ok' && <p className="mb-4 p-3 rounded-xl bg-[#ECFDF5] text-[#065F46] font-label-lg">✓ Pago aprobado. Tu suscripción quedó activa.</p>}
      {sp.pago === 'rechazado' && <p className="mb-4 p-3 rounded-xl bg-[#FFF1F2] text-danger font-label-lg">El pago fue rechazado. Intenta con otro medio de pago.</p>}
      <section className={`card-raised p-5 mb-4 ${s.state === 'VENCIDA' ? 'border border-danger/40' : ''}`}>
        {s.state === 'PRUEBA' && <><p className="eyebrow">Prueba gratis</p><h2 className="font-headline-sm text-headline-sm">Te quedan {s.daysLeft} {s.daysLeft === 1 ? 'día' : 'días'} de prueba</h2><p className="text-on-surface-variant mt-1">Estás usando todas las funciones del plan Pro sin pagar y sin tarjeta. La prueba termina el {fechaLarga(b.trialEndsAt!)}.</p></>}
        {s.state === 'ACTIVA' && <><p className="eyebrow">Activa</p><h2 className="font-headline-sm text-headline-sm">Plan {PLANS.find(p => p.id === b.plan)?.name || b.plan}</h2><p className="text-on-surface-variant mt-1">{b.paidUntil ? `Pagado hasta el ${fechaLarga(b.paidUntil)}.` : 'Tu cuenta está activa.'}</p></>}
        {s.state === 'VENCIDA' && <><p className="eyebrow !text-danger">Vencida</p><h2 className="font-headline-sm text-headline-sm">Tu prueba gratis o tu suscripción terminó</h2><p className="text-on-surface-variant mt-1">Tus datos están guardados y tu página de reservas sigue funcionando. Para volver a usar el panel, elige un plan.</p></>}
      </section>
      {!owner && <p className="mb-4 text-on-surface-variant">Solo el dueño del negocio puede pagar la suscripción.</p>}
      <div className="grid md:grid-cols-3 gap-4">{PLANS.map(p => (
        <form key={p.id} action={paySubscription} className={`card p-5 flex flex-col ${b.plan === p.id ? 'border-gold' : ''}`}>
          <input type="hidden" name="plan" value={p.id} />
          <p className="font-title-lg text-title-lg">{p.name}{b.plan === p.id && <span className="ml-2 font-label-sm px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed align-middle">Actual</span>}</p>
          <p className="font-currency-display text-currency-display mt-1 tnum">{cop(p.price)}<span className="font-body-sm text-on-surface-variant"> /mes</span></p>
          <p className="text-on-surface-variant mt-2 flex-1">{p.desc}</p>
          {owner && <><select name="method" className="input !h-10 mt-4">{['TARJETA', 'PSE', 'NEQUI'].map(m => <option key={m} value={m}>{METHOD_LABEL[m]}</option>)}</select>
            <Submit className="btn-primary w-full mt-2">Pagar 1 mes</Submit></>}
        </form>
      ))}</div>
      {provider() === 'SIMULADO' && <p className="mt-3 font-body-sm text-on-surface-variant">La pasarela está en modo de prueba: configura Wompi o Mercado Pago para cobrar de verdad.</p>}
      {payments.length > 0 && <section className="card p-5 mt-4"><h2 className="h-section mb-3">Pagos de suscripción</h2><ul className="space-y-1">{payments.map(p => <li key={p.id} className="flex justify-between"><span>{fechaLarga(p.createdAt)} · {METHOD_LABEL[p.method] || p.method}</span><span className="tnum">{cop(p.amount)} · {p.status.toLowerCase()}</span></li>)}</ul></section>}
    </>
  );
}
