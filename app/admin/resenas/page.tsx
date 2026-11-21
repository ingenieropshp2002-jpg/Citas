import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
import { PageHeader, Stat } from '@/components/panel/PageHeader';
import { ActionForm } from '@/components/ui/ActionForm';
import { Icon } from '@/components/ui/Icon';
import { fechaCorta, hm, time12 } from '@/lib/format';
import { waLink, waReady } from '@/lib/notify';
import { npsOf, pendingReviewRequests, reviewText } from '@/lib/resenas';
import Link from 'next/link';
import { saveReviewSettings } from '../_actions/resenas';
import { MarkSent } from './MarkSent';

export const metadata = { title: 'Reseñas' };
const PERIODS = [[30, '30 días'], [90, '3 meses'], [365, '1 año']] as const;
const npsTone = (n: number | null) => n === null ? 'text-on-surface-variant' : n >= 50 ? 'text-[#059669]' : n >= 0 ? 'text-secondary' : 'text-danger';
export default async function Resenas({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const { business: b } = await requireBusiness('marketing');
  const per = (await searchParams).p;
  const days = PERIODS.find(([d]) => String(d) === per)?.[0] || 90;
  const since = new Date(Date.now() - 30 * 86400e3);
  const [auto, pending, reviews, asked, survey, staff] = await Promise.all([
    waReady(),
    pendingReviewRequests(b.id, b.reviewDelayHours),
    db.review.findMany({ where: { businessId: b.id }, orderBy: { createdAt: 'desc' }, take: 30, include: { staff: { select: { name: true } } } }),
    db.appointment.count({ where: { businessId: b.id, reviewRequestedAt: { gte: since } } }),
    db.review.findMany({ where: { businessId: b.id, createdAt: { gte: new Date(Date.now() - days * 86400e3) } }, select: { staffId: true, rating: true, nps: true } }),
    db.staff.findMany({ where: { businessId: b.id }, select: { id: true, name: true, active: true }, orderBy: { name: 'asc' } })
  ]);
  const general = npsOf(survey.map(r => r.nps));
  const perStaff = staff.map(st => { const mine = survey.filter(r => r.staffId === st.id); return { ...st, n: mine.length, stars: mine.length ? mine.reduce((a, r) => a + r.rating, 0) / mine.length : 0, nps: npsOf(mine.map(r => r.nps)) }; })
    .filter(s => s.n || s.active).sort((a, z) => (z.nps.score ?? -999) - (a.nps.score ?? -999) || z.n - a.n);
  const recent = reviews.filter(r => r.createdAt >= since);
  const avg = recent.length ? recent.reduce((a, r) => a + r.rating, 0) / recent.length : 0;
  const toGoogle = recent.filter(r => r.googleClickedAt).length;
  return (
    <>
      <PageHeader eyebrow="Crecimiento" title="Reseñas" subtitle="Encuesta de satisfacción que se pide sola por WhatsApp después de cada cita: estrellas, comentario y qué tan probable es que te recomienden" />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <Stat label="Pedidas (30 días)" value={String(asked)} icon="send" />
        <Stat label="Respondidas (30 días)" value={String(recent.length)} icon="rate_review" hint={asked ? `${Math.round((recent.length / asked) * 100)}% de respuesta` : undefined} />
        <Stat label="Calificación promedio" value={avg ? avg.toFixed(1) + ' ★' : '—'} icon="star" tone="gold" hint={`General: ${b.rating.toFixed(1)} (${b.reviewCount})`} />
        <Stat label="Fueron a Google" value={String(toGoogle)} icon="travel_explore" hint="Abrieron el enlace para publicar" />
      </div>
      <section className="card p-5 mt-4">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <h2 className="h-section flex-1">Satisfacción por profesional (NPS)</h2>
          <nav className="flex gap-1" aria-label="Periodo">{PERIODS.map(([d, l]) => <Link key={d} href={`/admin/resenas?p=${d}`} aria-current={d === days ? 'page' : undefined} className={`px-3 py-1 rounded-full font-label-md border ${d === days ? 'bg-primary-container text-white border-primary-container' : 'border-parchment'}`}>{l}</Link>)}</nav>
        </div>
        <p className="font-body-sm text-on-surface-variant mb-4">En la encuesta el cliente responde de 0 a 10 qué tan probable es que nos recomiende. NPS = % que pone 9 o 10 (promotores) menos % que pone 0 a 6 (detractores). Va de −100 a 100: más de 50 es excelente. Si alguien queda inconforme te avisamos al instante.</p>
        <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl bg-surface-container-low mb-4">
          <div><p className="label !mb-0">NPS del negocio</p><p className={`font-headline-md text-headline-md tnum ${npsTone(general.score)}`}>{general.score === null ? '—' : general.score > 0 ? `+${general.score}` : general.score}</p></div>
          {general.n > 0 && <div className="flex-1 min-w-[220px]">
            <div className="flex h-3 rounded-full overflow-hidden" role="img" aria-label={`${general.pro} promotores, ${general.pas} pasivos, ${general.det} detractores`}>
              <span style={{ width: `${(general.pro / general.n) * 100}%` }} className="bg-[#059669]" /><span style={{ width: `${(general.pas / general.n) * 100}%` }} className="bg-gold" /><span style={{ width: `${(general.det / general.n) * 100}%` }} className="bg-danger" />
            </div>
            <p className="font-body-sm text-on-surface-variant mt-1">{general.pro} promotores · {general.pas} pasivos · {general.det} detractores · {general.n} respuestas</p>
          </div>}
        </div>
        {perStaff.length === 0 ? <p className="text-on-surface-variant">Aún no hay respuestas.</p> : (
          <div className="overflow-x-auto"><table className="w-full font-body-sm">
            <thead><tr className="text-left text-on-surface-variant border-b border-parchment"><th className="py-2 font-label-md">Profesional</th><th className="py-2 font-label-md text-right">Respuestas</th><th className="py-2 font-label-md text-right">Estrellas</th><th className="py-2 font-label-md text-right">Promotores</th><th className="py-2 font-label-md text-right">Detractores</th><th className="py-2 font-label-md text-right">NPS</th></tr></thead>
            <tbody>{perStaff.map(s => (
              <tr key={s.id} className="border-b border-parchment last:border-0">
                <td className="py-2.5 font-label-lg">{s.name}{!s.active && <span className="font-normal text-on-surface-variant"> (inactivo)</span>}</td>
                <td className="py-2.5 text-right tnum">{s.n}</td>
                <td className="py-2.5 text-right tnum">{s.n ? `${s.stars.toFixed(1)} ★` : '—'}</td>
                <td className="py-2.5 text-right tnum">{s.nps.n ? s.nps.pro : '—'}</td>
                <td className="py-2.5 text-right tnum">{s.nps.n ? s.nps.det : '—'}</td>
                <td className={`py-2.5 text-right tnum font-label-lg ${npsTone(s.nps.score)}`}>{s.nps.score === null ? '—' : s.nps.score > 0 ? `+${s.nps.score}` : s.nps.score}{s.nps.n > 0 && s.nps.n < 5 && <span className="block font-body-sm font-normal text-on-surface-variant">pocas respuestas</span>}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </section>
      <div className="grid xl:grid-cols-3 gap-4 mt-4">
        <section className="card p-5 xl:col-span-2">
          {!auto && <>
            <h2 className="h-section mb-1">Por enviar</h2>
            <p className="text-on-surface-variant font-body-sm mb-3">Mientras la API oficial de WhatsApp no esté activa, envíalas desde aquí con un toque. Al activarla salen solas.</p>
            {pending.length === 0 ? <p className="text-on-surface-variant mb-6">No hay pedidos pendientes.</p> : <ul className="divide-y divide-parchment mb-6">{pending.map(a => (
              <li key={a.id} className="py-2.5 flex flex-wrap items-center gap-3">
                <span className="flex-1 min-w-[160px]"><b>{a.customer.name}</b> <span className="text-on-surface-variant font-body-sm">· terminó {fechaCorta(a.end)} {time12(hm(a.end))}</span></span>
                <MarkSent id={a.id} href={waLink(a.customer.phone, reviewText(a, b))} />
              </li>
            ))}</ul>}
          </>}
          <h2 className="h-section mb-3">Últimas opiniones</h2>
          {reviews.length === 0 ? <p className="text-on-surface-variant">Aún no hay opiniones.</p> : <ul className="divide-y divide-parchment">{reviews.map(r => (
            <li key={r.id} className="py-3">
              <div className="flex flex-wrap items-center gap-2"><span className="text-secondary tracking-tight" aria-label={`${r.rating} de 5`}>{'★'.repeat(r.rating)}<span className="text-on-surface-variant/40">{'★'.repeat(5 - r.rating)}</span></span><b>{r.authorName}</b><span className="text-on-surface-variant font-body-sm">· {r.serviceName}{r.staff ? ` con ${r.staff.name}` : ''} · {fechaCorta(r.createdAt)}</span>{r.nps !== null && <span className={`px-2 py-0.5 rounded-full font-label-sm ${r.nps >= 9 ? 'bg-[#ECFDF5] text-[#065F46]' : r.nps >= 7 ? 'bg-secondary-fixed/40 text-on-secondary-fixed' : 'bg-[#FFF1F2] text-danger'}`}>Recomendaría {r.nps}/10</span>}{r.googleClickedAt && <span className="px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#1D4ED8] font-label-sm">Fue a Google</span>}</div>
              {r.comment && <p className="mt-1">{r.comment}</p>}
            </li>
          ))}</ul>}
        </section>
        <section className="card p-5 h-fit">
          <h2 className="h-section mb-3">Ajustes</h2>
          <ActionForm action={saveReviewSettings}>
            <label className="flex items-center gap-2"><input type="checkbox" name="reviewEnabled" defaultChecked={b.reviewEnabled} className="accent-primary-container" />Pedir reseña después de cada cita</label>
            <label className="block"><span className="label">Horas después de la cita</span><input name="reviewDelayHours" type="number" min={0} max={48} defaultValue={b.reviewDelayHours} className="input" /></label>
            <label className="block"><span className="label">Enlace para reseñas en Google</span><input name="googleReviewUrl" defaultValue={b.googleReviewUrl || ''} className="input" placeholder="https://g.page/r/…/review" /></label>
            <p className="font-body-sm text-on-surface-variant">Encuéntralo en tu Perfil de Empresa de Google → «Pedir reseñas». Después de calificar, a todos los clientes se les ofrece publicar en Google: Google no permite pedírselo solo a los que quedaron contentos.</p>
            <button className="btn-primary w-full">Guardar</button>
          </ActionForm>
          <p className="font-body-sm text-on-surface-variant mt-4 flex gap-2"><Icon name="info" className="text-[18px] shrink-0" />{auto ? 'WhatsApp oficial activo: los pedidos salen solos.' : 'WhatsApp oficial aún en modo de prueba: usa la lista «Por enviar».'}</p>
        </section>
      </div>
    </>
  );
}
