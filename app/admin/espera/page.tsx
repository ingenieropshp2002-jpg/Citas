import Link from 'next/link';
import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
import { PageHeader, Stat } from '@/components/panel/PageHeader';
import { Empty } from '@/components/ui/Empty';
import { Icon } from '@/components/ui/Icon';
import { fechaCorta, fromBogota, ymd } from '@/lib/format';
import { WINDOWS } from '@/lib/espera';
import { WaitActions } from './Actions';

export const metadata = { title: 'Lista de espera' };
const STATUS: Record<string, string> = { RESERVADA: 'Reservó', ATENDIDA: 'Atendida', CANCELADA: 'Salió', VENCIDA: 'Venció' };
const d = (s: string) => fechaCorta(fromBogota(s, '12:00'));

export default async function Espera() {
  const { business: b } = await requireBusiness('agenda');
  const since = new Date(Date.now() - 30 * 86400e3);
  const [active, history, staff] = await Promise.all([
    db.waitEntry.findMany({ where: { businessId: b.id, status: 'ACTIVA', dateTo: { gte: ymd(new Date()) } }, include: { user: { select: { name: true, phone: true } } }, orderBy: [{ dateFrom: 'asc' }, { createdAt: 'asc' }] }),
    db.waitEntry.findMany({ where: { businessId: b.id, status: { not: 'ACTIVA' }, createdAt: { gte: since } }, include: { user: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 30 }),
    db.staff.findMany({ where: { businessId: b.id }, select: { id: true, name: true } })
  ]);
  const services = await db.service.findMany({ where: { businessId: b.id }, select: { id: true, name: true } });
  const svcName = (json: string) => { try { return (JSON.parse(json) as string[]).map(id => services.find(s => s.id === id)?.name).filter(Boolean).join(', '); } catch { return ''; } };
  const won = history.filter(h => h.status === 'RESERVADA').length;
  return (
    <>
      <PageHeader eyebrow="Agenda" title="Lista de espera" subtitle="Clientes que esperan un cupo. Cuando alguien cancela o se libera un horario, les avisamos solos por WhatsApp y notificación, en orden de llegada." />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <Stat label="Esperando" value={String(active.length)} icon="hourglass_top" />
        <Stat label="Consiguieron cita" value={String(won)} icon="event_available" tone="gold" hint="Últimos 30 días" />
        <Stat label="Avisos enviados" value={String(active.reduce((a, w) => a + w.notifyCount, 0) + history.reduce((a, w) => a + w.notifyCount, 0))} icon="notifications" hint="Últimos 30 días" />
      </div>
      <section className="card p-5">
        <h2 className="h-section mb-3">Esperando cupo</h2>
        {active.length ? (
          <ul className="space-y-2">
            {active.map((w, i) => {
              const phone = w.phone || w.user.phone; const st = staff.find(s => s.id === w.staffId);
              const wa = phone ? `https://wa.me/57${phone.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(`Hola ${w.user.name.split(' ')[0]}, te escribimos de ${b.name}: se abrió un cupo. ¿Te sirve?`)}` : null;
              return (
                <li key={w.id} className="p-3 rounded-xl border border-parchment flex flex-wrap items-center gap-3">
                  <span className="w-9 h-9 shrink-0 rounded-full bg-primary-container text-white flex items-center justify-center font-label-lg tnum">{i + 1}</span>
                  <div className="flex-1 min-w-[200px]">
                    <p className="font-label-lg">{w.user.name}{phone && <span className="font-normal text-on-surface-variant"> · {phone}</span>}</p>
                    <p className="font-body-sm text-on-surface-variant">{w.dateFrom === w.dateTo ? d(w.dateFrom) : `${d(w.dateFrom)} a ${d(w.dateTo)}`} · {WINDOWS[w.window as keyof typeof WINDOWS] || w.window} · {st ? `con ${st.name.split(' ')[0]}` : 'cualquier profesional'}</p>
                    <p className="font-body-sm text-on-surface-variant">{[svcName(w.serviceIds), w.notifyCount ? `${w.notifyCount} ${w.notifyCount === 1 ? 'aviso' : 'avisos'}` : 'sin avisos aún'].filter(Boolean).join(' · ')}</p>
                  </div>
                  <WaitActions id={w.id} wa={wa} />
                </li>
              );
            })}
          </ul>
        ) : <Empty icon="hourglass_empty" title="Nadie esperando" text="Cuando un día esté lleno, tus clientes podrán anotarse desde tu página de reservas." />}
      </section>
      {!!history.length && (
        <section className="card p-5 mt-4">
          <h2 className="h-section mb-3">Últimos 30 días</h2>
          <ul className="divide-y divide-parchment">
            {history.map(h => <li key={h.id} className="py-2 flex items-center gap-3 font-body-sm"><span className="flex-1">{h.user.name} · {h.dateFrom === h.dateTo ? d(h.dateFrom) : `${d(h.dateFrom)} a ${d(h.dateTo)}`}</span><span className={`px-2 rounded-full font-label-sm ${h.status === 'RESERVADA' ? 'bg-[#ECFDF5] text-[#065F46]' : 'bg-surface-container text-on-surface-variant'}`}>{STATUS[h.status] || h.status}</span></li>)}
          </ul>
        </section>
      )}
      <p className="mt-4 font-body-sm text-on-surface-variant flex items-center gap-1"><Icon name="info" className="text-[16px]" />El aviso por WhatsApp usa la plantilla «cupo_liberado». Mientras WhatsApp esté en modo de prueba, sale la notificación del celular. <Link href="/admin/fila" className="text-secondary font-bold">Ver fila y huecos</Link></p>
    </>
  );
}
