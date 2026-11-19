import Link from 'next/link';
import { requireBusiness } from '@/lib/auth';
import { PageHeader } from '@/components/panel/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { addDays, cop, DIAS_CORTOS, fechaCorta, ymd } from '@/lib/format';
import { metrics } from '@/lib/metricas';
import { waLink } from '@/lib/notify';

export const metadata = { title: 'Métricas' };

function presets(today: string) {
  const m0 = today.slice(0, 8) + '01';
  const lastEnd = addDays(m0, -1); const lastStart = lastEnd.slice(0, 8) + '01';
  return [
    { k: 'mes', label: 'Este mes', from: m0, to: today },
    { k: 'pasado', label: 'Mes pasado', from: lastStart, to: lastEnd },
    { k: '30', label: 'Últimos 30 días', from: addDays(today, -29), to: today },
    { k: '90', label: 'Últimos 90 días', from: addDays(today, -89), to: today }
  ];
}
const ok = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '');
const short = (v: number) => (v >= 1e6 ? `$${(v / 1e6).toFixed(v >= 1e7 ? 0 : 1)} M` : v >= 1e3 ? `$${Math.round(v / 1e3)} mil` : `$${v}`);

function Delta({ now, prev, suffix = '' }: { now: number; prev: number; suffix?: string }) {
  if (!prev) return <span className="font-body-sm text-on-surface-variant">Sin datos del período anterior</span>;
  const d = Math.round((now - prev) / prev * 100);
  const up = d >= 0;
  return <span className={`font-label-md inline-flex items-center gap-0.5 ${up ? 'text-[#065F46] dark:text-[#6EE7B7]' : 'text-danger'}`}><Icon name={up ? 'trending_up' : 'trending_down'} className="text-[16px]" />{up ? '+' : ''}{d}%{suffix} <span className="text-on-surface-variant font-normal">vs. período anterior</span></span>;
}
function Kpi({ label, value, icon, children }: { label: string; value: string; icon: string; children?: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between"><span className="font-label-md tracking-wider text-on-surface-variant uppercase">{label}</span><Icon name={icon} className="text-secondary" /></div>
      <p className="font-display-sm text-[32px] leading-tight tnum mt-2">{value}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

export default async function Metricas({ searchParams }: { searchParams: Promise<{ p?: string; desde?: string; hasta?: string }> }) {
  const { business: b } = await requireBusiness('reportes');
  const sp = await searchParams; const today = ymd(new Date());
  const ps = presets(today); const pick = ps.find(x => x.k === sp.p) || ps[0];
  const custom = !!(ok(sp.desde) && ok(sp.hasta) && ok(sp.desde) <= ok(sp.hasta));
  const desde = custom ? ok(sp.desde) : pick.from; const hasta = custom ? ok(sp.hasta) : pick.to;
  const m = await metrics(b.id, desde, hasta);
  const maxDay = Math.max(...m.daily.map(x => x.v), 1);
  const maxHeat = Math.max(...m.heat.flat(), 1);
  const hours = Array.from({ length: 24 }, (_, h) => h).filter(h => m.heat.some(r => r[h] > 0));
  const hRange = hours.length ? Array.from({ length: hours[hours.length - 1] - hours[0] + 1 }, (_, i) => hours[0] + i) : [];
  const best = m.team[0] && m.team[0].revenue > 0 ? m.team[0] : null;
  const maxTeam = Math.max(...m.team.map(t => t.revenue), 1);
  const winback = (name: string) => `Hola ${name.split(' ')[0]} 👋, ¡te extrañamos en ${b.name}! Vuelve esta semana y consiéntete. Reserva aquí: ${(process.env.APP_URL || '').replace(/\/$/, '')}/reservar/${b.slug}`;
  return (
    <>
      <PageHeader eyebrow="Análisis" title="Métricas" subtitle={`Del ${fechaCorta(new Date(desde + 'T17:00:00Z'))} al ${fechaCorta(new Date(hasta + 'T17:00:00Z'))}`}
        actions={<Link href="/admin/reportes" className="btn-ghost btn-sm"><Icon name="table_view" className="text-[18px]" />Reportes detallados</Link>} />
      <div className="flex flex-wrap items-end gap-2 mb-4">
        {ps.map(x => <Link key={x.k} href={`/admin/metricas?p=${x.k}`} className={`chip ${!custom && pick.k === x.k ? 'chip-on' : ''}`}>{x.label}</Link>)}
        <form className="flex items-end gap-2 ml-auto"><label><span className="label">Desde</span><input type="date" name="desde" defaultValue={desde} className="input !h-9" /></label><label><span className="label">Hasta</span><input type="date" name="hasta" defaultValue={hasta} className="input !h-9" /></label><button className="btn-outline btn-sm h-9">Ver</button></form>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <Kpi label="Ingresos" value={cop(m.revenue)} icon="payments"><Delta now={m.revenue} prev={m.prevRevenue} /><p className="font-body-sm text-on-surface-variant">{m.salesCount} ventas · ticket {cop(m.ticket)}</p></Kpi>
        <Kpi label="Ocupación" value={`${m.occupancy}%`} icon="event_seat">
          <div className="h-2 rounded-full bg-surface-container mt-1 overflow-hidden"><div className="h-full rounded-full bg-secondary" style={{ width: `${m.occupancy}%` }} /></div>
          <p className="font-body-sm text-on-surface-variant mt-1">Horas reservadas sobre horas disponibles del equipo ({m.occDays} {m.occDays === 1 ? 'día' : 'días'})</p>
        </Kpi>
        <Kpi label="Citas atendidas" value={String(m.done)} icon="event_available"><Delta now={m.done} prev={m.prevDone} /><p className="font-body-sm text-on-surface-variant">{m.noShow} no llegaron · {m.cancelled} canceladas</p></Kpi>
        <Kpi label="Clientes perdidos" value={String(m.lostCount)} icon="person_off"><p className="font-body-sm text-on-surface-variant">Sin venir hace más de {m.inactiveDays} días · gastaron {cop(m.lostValue)}</p></Kpi>
      </div>

      <div className="grid xl:grid-cols-3 gap-4 mt-4">
        <section className="card p-5 xl:col-span-2">
          <h2 className="h-section mb-1">Ingresos por día</h2>
          <p className="font-body-sm text-on-surface-variant mb-4">Sin propinas. Pasa el dedo o el mouse por una barra para ver el valor.</p>
          <div className="flex items-end gap-[2px] h-48 border-b border-parchment" role="img" aria-label="Ingresos por día">
            {m.daily.map(x => (
              <div key={x.d} className="group relative flex-1 h-full flex items-end">
                <div className="w-full rounded-t-[4px] bg-primary-container dark:bg-primary group-hover:bg-secondary transition-colors" style={{ height: `${Math.max(x.v ? 2 : 0, x.v / maxDay * 100)}%` }} />
                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block whitespace-nowrap px-2 py-1 rounded-lg bg-on-surface text-surface font-label-sm z-10">{fechaCorta(new Date(x.d + 'T17:00:00Z'))}: {cop(x.v)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between font-label-sm text-on-surface-variant mt-1"><span>{fechaCorta(new Date(desde + 'T17:00:00Z'))}</span><span>Máx. {short(maxDay)}</span><span>{fechaCorta(new Date(hasta + 'T17:00:00Z'))}</span></div>
          <details className="mt-3"><summary className="font-label-md text-secondary cursor-pointer">Ver como tabla</summary><table className="table mt-2"><thead><tr><th>Día</th><th className="text-right">Ingresos</th></tr></thead><tbody>{m.daily.filter(x => x.v).map(x => <tr key={x.d}><td>{fechaCorta(new Date(x.d + 'T17:00:00Z'))}</td><td className="text-right tnum">{cop(x.v)}</td></tr>)}</tbody></table></details>
        </section>

        <section className="card p-5">
          <h2 className="h-section mb-3">Clientes</h2>
          <dl className="space-y-2">
            <div className="flex justify-between"><dt className="text-on-surface-variant">Atendidos en el período</dt><dd className="font-title-md tnum">{m.clients}</dd></div>
            <div className="flex justify-between"><dt className="text-on-surface-variant">Nuevos</dt><dd className="tnum">{m.newClients}</dd></div>
            <div className="flex justify-between"><dt className="text-on-surface-variant">Volvieron</dt><dd className="tnum">{m.returningClients}</dd></div>
            <div className="flex justify-between"><dt className="text-on-surface-variant">Retención</dt><dd className="tnum">{m.retention === null ? '—' : `${m.retention}%`}</dd></div>
          </dl>
          <p className="font-body-sm text-on-surface-variant mt-1">Retención: de los {m.prevClients} clientes del período anterior, cuántos volvieron en este.</p>
          {m.clients > 0 && <div className="mt-3 flex h-3 rounded-full overflow-hidden gap-[2px]" role="img" aria-label={`${m.newClients} nuevos y ${m.returningClients} recurrentes`}><div className="bg-secondary" style={{ width: `${m.newClients / m.clients * 100}%` }} title={`Nuevos: ${m.newClients}`} /><div className="bg-primary-container dark:bg-primary flex-1" title={`Volvieron: ${m.returningClients}`} /></div>}
          {m.clients > 0 && <div className="flex gap-4 mt-1 font-label-sm text-on-surface-variant"><span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-secondary" />Nuevos</span><span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-primary-container dark:bg-primary" />Volvieron</span></div>}
        </section>
      </div>

      <div className="grid xl:grid-cols-3 gap-4 mt-4">
        <section className="card p-5 xl:col-span-2 overflow-x-auto">
          <div className="flex flex-wrap items-center gap-3 mb-3"><h2 className="h-section mr-auto">Mejor profesional</h2>{best && <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary-fixed/40 font-label-lg"><Icon name="workspace_premium" className="text-secondary" fill />{best.name} · {cop(best.revenue)}</span>}</div>
          <table className="table">
            <thead><tr><th>Profesional</th><th className="w-1/3">Ventas</th><th className="text-right">Servicios</th><th className="text-right">Clientes</th><th className="text-right">Ocupación</th><th className="text-right">Calificación</th><th className="text-right">No llegaron</th></tr></thead>
            <tbody>{m.team.map((t, i) => (
              <tr key={t.id}>
                <td className="font-label-lg whitespace-nowrap">{i === 0 && best ? <Icon name="workspace_premium" className="text-secondary text-[18px] align-[-4px] mr-1" fill /> : null}{t.name}</td>
                <td><div className="flex items-center gap-2"><div className="h-2 flex-1 rounded-full bg-surface-container"><div className="h-full rounded-full bg-secondary" style={{ width: `${t.revenue / maxTeam * 100}%` }} /></div><span className="tnum w-24 text-right">{cop(t.revenue)}</span></div></td>
                <td className="text-right tnum">{t.services}</td><td className="text-right tnum">{t.clients}</td><td className="text-right tnum">{t.occupancy}%</td>
                <td className="text-right tnum">{t.rating ? `${t.rating.toFixed(1)} ★ (${t.reviews})` : '—'}</td><td className="text-right tnum">{t.noShow}</td>
              </tr>
            ))}</tbody>
          </table>
        </section>

        <section className="card p-5">
          <h2 className="h-section mb-1">Clientes perdidos</h2>
          <p className="font-body-sm text-on-surface-variant mb-3">Los que más gastaban. Escríbeles para que vuelvan.</p>
          {m.lost.length === 0 ? <p className="text-on-surface-variant">¡Ninguno! Todos tus clientes han vuelto.</p> : <ul className="divide-y divide-parchment">{m.lost.map(c => (
            <li key={c.id} className="py-2 flex items-center gap-2">
              <Link href={`/admin/clientes/${c.id}`} className="flex-1 min-w-0"><p className="font-label-lg truncate">{c.name}</p><p className="font-body-sm text-on-surface-variant">Última visita {c.lastVisit ? fechaCorta(c.lastVisit) : '—'} · {cop(c.totalSpent)}</p></Link>
              {c.phone && <a href={waLink(c.phone, winback(c.name))} target="_blank" rel="noreferrer" aria-label={`Escribir a ${c.name}`} className="w-9 h-9 rounded-full hover:bg-surface-container flex items-center justify-center"><Icon name="chat" className="text-[#059669]" /></a>}
            </li>
          ))}</ul>}
          {m.lostCount > m.lost.length && <Link href="/admin/fidelizacion" className="btn-ghost btn-sm w-full mt-2">Ver todos en Fidelización</Link>}
        </section>
      </div>

      {hRange.length > 0 && <section className="card p-5 mt-4 overflow-x-auto">
        <h2 className="h-section mb-1">Horas más pedidas</h2>
        <p className="font-body-sm text-on-surface-variant mb-3">Citas por día y hora de inicio. Más oscuro = más citas. Úsalo para promociones en las horas flojas.</p>
        <table className="border-separate border-spacing-[2px]" role="grid" aria-label="Citas por día y hora">
          <thead><tr><th />{hRange.map(h => <th key={h} className="font-label-sm text-on-surface-variant font-normal w-9">{h}h</th>)}</tr></thead>
          <tbody>{[1, 2, 3, 4, 5, 6, 0].map(d => (
            <tr key={d}><th className="font-label-sm text-on-surface-variant font-normal pr-2 text-left">{DIAS_CORTOS[d]}</th>{hRange.map(h => { const v = m.heat[d][h]; return <td key={h} title={`${DIAS_CORTOS[d]} ${h}:00 · ${v} citas`} className="w-9 h-7 rounded-[4px] text-center font-label-sm" style={{ background: v ? `rgb(var(--c-secondary) / ${0.12 + 0.88 * v / maxHeat})` : 'rgb(var(--c-surface-container))', color: v / maxHeat > 0.55 ? '#fff' : undefined }}>{v || ''}</td>; })}</tr>
          ))}</tbody>
        </table>
      </section>}
    </>
  );
}
