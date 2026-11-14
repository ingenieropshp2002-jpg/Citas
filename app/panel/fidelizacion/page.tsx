import Link from 'next/link';
import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
import { PageHeader, Stat } from '@/components/panel/PageHeader';
import { ActionForm } from '@/components/ui/ActionForm';
import { Icon } from '@/components/ui/Icon';
import { bogota, fechaCorta } from '@/lib/format';
import { waLink, fillVars, waConfigured } from '@/lib/notify';
import { adjustPoints, redeemReward, saveLoyaltySettings, saveReward, sendWinback } from '../_actions/loyalty';
import { BirthdaysNow, ToggleReward } from './Buttons';

export const metadata = { title: 'Fidelización' };
const WINBACK = 'Hola {nombre} 👋, ¡te extrañamos en {negocio}! Vuelve esta semana y consiéntete. Reserva aquí: {link}';
export default async function Fidelizacion() {
  const { business: b } = await requireBusiness('fidelizacion');
  const now = new Date(); const t = bogota(now);
  const limit = new Date(now.getTime() - b.inactiveDays * 86400000);
  const [rewards, customers, moves] = await Promise.all([
    db.reward.findMany({ where: { businessId: b.id }, orderBy: { points: 'asc' } }),
    db.customer.findMany({ where: { businessId: b.id }, orderBy: { name: 'asc' } }),
    db.pointMovement.findMany({ where: { businessId: b.id }, orderBy: { createdAt: 'desc' }, take: 12, include: { customer: true } })
  ]);
  const withPoints = customers.filter(c => c.points > 0).sort((a, c) => c.points - a.points);
  const bdays = customers.filter(c => c.birthday && bogota(c.birthday).m === t.m).sort((a, c) => bogota(a.birthday!).d - bogota(c.birthday!).d);
  const inactive = customers.filter(c => c.visits > 0 && (!c.lastVisit || c.lastVisit < limit)).sort((a, c) => (a.lastVisit?.getTime() || 0) - (c.lastVisit?.getTime() || 0));
  const link = `${process.env.APP_URL || ''}/reservar/${b.slug}`;
  const activeRewards = rewards.filter(r => r.active);
  return (
    <>
      <PageHeader eyebrow="Crecimiento" title="Fidelización" subtitle="Puntos y premios, cumpleaños y recuperación de clientes" />
      {!waConfigured() && <p className="mb-4 p-3 rounded-xl bg-secondary-fixed/40 font-body-sm">WhatsApp está en modo simulado: los mensajes automáticos se registran pero no salen hasta configurar las claves de WhatsApp Business. Usa los botones verdes: abren tu WhatsApp con el mensaje listo y solo tocas enviar.</p>}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
        <Stat label="Clientes con puntos" value={String(withPoints.length)} icon="loyalty" tone="gold" />
        <Stat label="Puntos por canjear" value={withPoints.reduce((a, c) => a + c.points, 0).toLocaleString('es-CO')} icon="stars" />
        <Stat label="Cumpleaños este mes" value={String(bdays.length)} icon="cake" />
        <Stat label="Clientes inactivos" value={String(inactive.length)} icon="person_off" tone="danger" hint={`Sin visita en ${b.inactiveDays} días`} />
      </div>
      <div className="grid xl:grid-cols-3 gap-4">
        <section className="card p-5">
          <h2 className="h-section mb-3 flex items-center gap-2"><Icon name="settings" className="text-secondary" />Programa de puntos</h2>
          <ActionForm action={saveLoyaltySettings} success="Programa guardado">
            <label className="flex items-center gap-2"><input type="checkbox" name="loyaltyEnabled" defaultChecked={b.loyaltyEnabled} className="accent-primary-container" />Acumular puntos en cada compra</label>
            <label className="block"><span className="label">Puntos por cada $1.000 pagados</span><input type="number" name="pointsPerThousand" min={0} defaultValue={b.pointsPerThousand} className="input" /></label>
            <label className="block"><span className="label">Cliente inactivo después de (días)</span><input type="number" name="inactiveDays" min={15} defaultValue={b.inactiveDays} className="input" /></label>
            <label className="flex items-center gap-2"><input type="checkbox" name="birthdayEnabled" defaultChecked={b.birthdayEnabled} className="accent-primary-container" />Saludo automático de cumpleaños por WhatsApp</label>
            <label className="block"><span className="label">Mensaje de cumpleaños</span><textarea name="birthdayMessage" rows={4} defaultValue={b.birthdayMessage} className="input" /></label>
            <label className="block"><span className="label">Cupón de regalo (opcional)</span><input name="birthdayCoupon" defaultValue={b.birthdayCoupon || ''} className="input uppercase" placeholder="CUMPLE10" /></label>
            <p className="font-body-sm text-on-surface-variant">Variables: {'{nombre}'}, {'{negocio}'}, {'{link}'}, {'{cupon}'}, {'{puntos}'}. El cupón debe existir en Marketing.</p>
            <button className="btn-primary w-full">Guardar</button>
          </ActionForm>
        </section>
        <section className="card p-5">
          <h2 className="h-section mb-3 flex items-center gap-2"><Icon name="redeem" className="text-secondary" />Premios</h2>
          <ul className="space-y-2 mb-4">{rewards.map(r => (
            <li key={r.id} className={`flex items-center justify-between gap-2 p-2.5 rounded-xl bg-surface-container-low ${r.active ? '' : 'opacity-50'}`}><div><p className="font-label-lg">{r.name}</p><p className="font-body-sm text-on-surface-variant">{r.points.toLocaleString('es-CO')} puntos</p></div><ToggleReward id={r.id} active={r.active} /></li>
          ))}{!rewards.length && <li className="text-on-surface-variant">Crea premios como “Corte gratis” o “20% en un tratamiento”.</li>}</ul>
          <ActionForm action={saveReward} resetOnSuccess className="space-y-2" success="Premio creado">
            <input name="name" className="input" placeholder="Premio (ej. Manicure gratis)" required />
            <input name="points" type="number" min={1} className="input" placeholder="Puntos necesarios" required />
            <button className="btn-ghost btn-sm w-full">Crear premio</button>
          </ActionForm>
          <h3 className="font-title-md text-title-md mt-6 mb-2">Canjear premio</h3>
          <ActionForm action={redeemReward} className="space-y-2" success="Premio canjeado">
            <select name="customerId" className="input" required><option value="">Cliente…</option>{withPoints.map(c => <option key={c.id} value={c.id}>{c.name} · {c.points} pts</option>)}</select>
            <select name="rewardId" className="input" required><option value="">Premio…</option>{activeRewards.map(r => <option key={r.id} value={r.id}>{r.name} · {r.points} pts</option>)}</select>
            <button className="btn-primary btn-sm w-full">Canjear</button>
          </ActionForm>
          <details className="mt-4"><summary className="font-label-md text-secondary cursor-pointer">Ajustar puntos manualmente</summary>
            <ActionForm action={adjustPoints} className="space-y-2 mt-2" success="Puntos ajustados">
              <select name="customerId" className="input" required><option value="">Cliente…</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name} · {c.points} pts</option>)}</select>
              <div className="grid grid-cols-2 gap-2"><input name="points" type="number" className="input" placeholder="+50 o -20" required /><input name="reason" className="input" placeholder="Motivo" /></div>
              <button className="btn-ghost btn-sm w-full">Aplicar</button>
            </ActionForm>
          </details>
        </section>
        <section className="card p-5">
          <h2 className="h-section mb-3 flex items-center gap-2"><Icon name="stars" className="text-secondary" />Mejores clientes</h2>
          <ol className="space-y-2">{withPoints.slice(0, 10).map((c, i) => <li key={c.id} className="flex items-center gap-2"><span className="w-6 text-on-surface-variant tnum">{i + 1}.</span><Link href={`/panel/clientes/${c.id}`} className="flex-1 truncate font-label-lg hover:text-secondary">{c.name}</Link><span className="tnum font-label-md text-secondary">{c.points} pts</span></li>)}</ol>
          {!withPoints.length && <p className="text-on-surface-variant">Los clientes suman puntos cuando les cobras en Caja con su nombre.</p>}
          <h3 className="font-title-md text-title-md mt-6 mb-2">Últimos movimientos</h3>
          <ul className="space-y-1 font-body-sm">{moves.map(m => <li key={m.id} className="flex justify-between gap-2"><span className="truncate">{m.customer.name} · {m.reason}</span><span className={`tnum ${m.points > 0 ? 'text-success' : 'text-danger'}`}>{m.points > 0 ? '+' : ''}{m.points}</span></li>)}</ul>
        </section>
      </div>
      <div className="grid xl:grid-cols-2 gap-4 mt-4">
        <section className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3"><h2 className="h-section flex items-center gap-2"><Icon name="cake" className="text-secondary" />Cumpleaños de este mes</h2>{waConfigured() && <BirthdaysNow />}</div>
          <p className="font-body-sm text-on-surface-variant mb-3">{b.birthdayEnabled ? 'El saludo sale solo el día del cumpleaños a partir de las 9 a. m.' : 'El saludo automático está apagado.'} Registra la fecha de nacimiento en la ficha del cliente.</p>
          <ul className="space-y-2">{bdays.map(c => { const d = bogota(c.birthday!); const today = d.d === t.d; return (
            <li key={c.id} className={`flex items-center justify-between gap-2 p-2.5 rounded-xl ${today ? 'bg-secondary-fixed/40' : 'bg-surface-container-low'}`}>
              <div><p className="font-label-lg">{c.name}{today && ' 🎉'}</p><p className="font-body-sm text-on-surface-variant">{d.d} de este mes{c.birthdayGreetedYear === t.y ? ' · saludo enviado' : ''}</p></div>
              {c.phone && <a target="_blank" rel="noreferrer" className="btn-sm btn bg-[#25D366] text-white" href={waLink(c.phone, fillVars(b.birthdayMessage, { nombre: c.name.split(' ')[0], negocio: b.name, link, cupon: b.birthdayCoupon || '', puntos: c.points }))}><Icon name="chat" className="text-[16px]" />Saludar</a>}
            </li>); })}{!bdays.length && <li className="text-on-surface-variant">Nadie cumple años este mes.</li>}</ul>
        </section>
        <section className="card p-5">
          <h2 className="h-section mb-1 flex items-center gap-2"><Icon name="restore" className="text-secondary" />Recuperar clientes inactivos</h2>
          <p className="font-body-sm text-on-surface-variant mb-3">Clientes que no vienen hace más de {b.inactiveDays} días.</p>
          <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">{inactive.slice(0, 50).map(c => (
            <li key={c.id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-surface-container-low">
              <div className="min-w-0"><Link href={`/panel/clientes/${c.id}`} className="font-label-lg truncate block hover:text-secondary">{c.name}</Link><p className="font-body-sm text-on-surface-variant">Última visita: {c.lastVisit ? fechaCorta(c.lastVisit) : '—'} · {c.visits} visitas{c.winbackSentAt ? ` · contactado ${fechaCorta(c.winbackSentAt)}` : ''}</p></div>
              {c.phone && <a target="_blank" rel="noreferrer" className="btn-sm btn bg-[#25D366] text-white shrink-0" href={waLink(c.phone, fillVars(WINBACK, { nombre: c.name.split(' ')[0], negocio: b.name, link }))}><Icon name="chat" className="text-[16px]" />Escribir</a>}
            </li>))}{!inactive.length && <li className="text-on-surface-variant">¡Excelente! No tienes clientes inactivos.</li>}</ul>
          {inactive.length > 0 && waConfigured() && <ActionForm action={sendWinback} className="space-y-2 mt-4" success="Mensajes enviados">
            <label className="block"><span className="label">Mensaje para todos los inactivos</span><textarea name="message" rows={3} defaultValue={WINBACK} className="input" /></label>
            <input name="coupon" className="input uppercase" placeholder="Cupón para {cupon} (opcional)" />
            <button className="btn-primary btn-sm w-full"><Icon name="send" className="text-[16px]" />Enviar por WhatsApp</button>
            <p className="font-body-sm text-on-surface-variant">No se repite a quien ya recibió un mensaje en los últimos 30 días. Envía solo a clientes que autorizaron comunicaciones (Ley 1581 de 2012).</p>
          </ActionForm>}
        </section>
      </div>
    </>
  );
}
