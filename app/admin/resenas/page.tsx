import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
import { PageHeader, Stat } from '@/components/panel/PageHeader';
import { ActionForm } from '@/components/ui/ActionForm';
import { Icon } from '@/components/ui/Icon';
import { fechaCorta, hm, time12 } from '@/lib/format';
import { waLink, waReady } from '@/lib/notify';
import { pendingReviewRequests, reviewText } from '@/lib/resenas';
import { saveReviewSettings } from '../_actions/resenas';
import { MarkSent } from './MarkSent';

export const metadata = { title: 'Reseñas' };
export default async function Resenas() {
  const { business: b } = await requireBusiness('marketing');
  const since = new Date(Date.now() - 30 * 86400e3);
  const [auto, pending, reviews, asked] = await Promise.all([
    waReady(),
    pendingReviewRequests(b.id, b.reviewDelayHours),
    db.review.findMany({ where: { businessId: b.id }, orderBy: { createdAt: 'desc' }, take: 30, include: { staff: { select: { name: true } } } }),
    db.appointment.count({ where: { businessId: b.id, reviewRequestedAt: { gte: since } } })
  ]);
  const recent = reviews.filter(r => r.createdAt >= since);
  const avg = recent.length ? recent.reduce((a, r) => a + r.rating, 0) / recent.length : 0;
  const toGoogle = recent.filter(r => r.googleClickedAt).length;
  return (
    <>
      <PageHeader eyebrow="Crecimiento" title="Reseñas" subtitle="Se piden solas por WhatsApp después de cada cita completada" />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <Stat label="Pedidas (30 días)" value={String(asked)} icon="send" />
        <Stat label="Respondidas (30 días)" value={String(recent.length)} icon="rate_review" hint={asked ? `${Math.round((recent.length / asked) * 100)}% de respuesta` : undefined} />
        <Stat label="Calificación promedio" value={avg ? avg.toFixed(1) + ' ★' : '—'} icon="star" tone="gold" hint={`General: ${b.rating.toFixed(1)} (${b.reviewCount})`} />
        <Stat label="Fueron a Google" value={String(toGoogle)} icon="travel_explore" hint="Abrieron el enlace para publicar" />
      </div>
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
              <div className="flex flex-wrap items-center gap-2"><span className="text-secondary tracking-tight" aria-label={`${r.rating} de 5`}>{'★'.repeat(r.rating)}<span className="text-on-surface-variant/40">{'★'.repeat(5 - r.rating)}</span></span><b>{r.authorName}</b><span className="text-on-surface-variant font-body-sm">· {r.serviceName}{r.staff ? ` con ${r.staff.name}` : ''} · {fechaCorta(r.createdAt)}</span>{r.googleClickedAt && <span className="px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#1D4ED8] font-label-sm">Fue a Google</span>}</div>
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
