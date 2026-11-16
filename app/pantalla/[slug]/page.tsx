import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { Icon } from '@/components/ui/Icon';
import { AutoRefresh } from '@/components/ui/AutoRefresh';
import { time12, timeOf } from '@/lib/format';
import { attentionPlan, shortName } from '@/lib/turnos';
import { queueStatus } from '@/lib/fila';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const b = await db.business.findUnique({ where: { slug: (await params).slug }, select: { name: true } });
  return { title: { absolute: b ? `Turnos · ${b.name}` : 'Turnos' }, robots: { index: false, follow: false } };
}

// Pantalla para el televisor o tablet del local: orden de atención con citas y fila mezcladas.
export default async function Pantalla({ params }: { params: Promise<{ slug: string }> }) {
  const b = await db.business.findUnique({ where: { slug: (await params).slug } });
  if (!b) notFound();
  const plan = await attentionPlan(b);
  const now = plan.items.filter(i => i.inService);
  const next = plan.items.filter(i => !i.inService && i.start < 1440).slice(0, 10);
  const st = queueStatus(b);
  const Tag = ({ kind, number }: { kind: 'CITA' | 'FILA'; number?: number }) => kind === 'CITA'
    ? <span className="px-3 py-1 rounded-full bg-[#e9c349] text-[#0d2538] text-[15px] font-bold whitespace-nowrap">Cita</span>
    : <span className="px-3 py-1 rounded-full bg-white/15 text-white text-[15px] font-bold whitespace-nowrap">Fila #{number}</span>;
  return (
    <div className="min-h-screen bg-[#0d2538] text-white p-6 md:p-10">
      <AutoRefresh seconds={20} />
      <header className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div><p className="uppercase tracking-[0.25em] text-[#e9c349] text-[14px] font-bold">{b.name}</p><h1 className="font-display text-[40px] md:text-[56px] leading-tight">Orden de atención</h1></div>
        <p className="text-white/70 text-[18px] max-w-md">Las citas se atienden a su hora. Quienes llegan sin cita entran en los espacios libres.{st.open ? ' ¿Sin cita? Escanea el QR de la entrada.' : ''}</p>
      </header>
      <div className="grid lg:grid-cols-[1fr_1.4fr] gap-6">
        <section className="rounded-3xl bg-white/5 p-6">
          <h2 className="text-[#e9c349] uppercase tracking-widest text-[15px] font-bold mb-4 flex items-center gap-2"><Icon name="content_cut" className="text-[20px]" />Atendiendo ahora</h2>
          {now.length === 0 ? <p className="text-white/60 text-[20px]">Nadie en este momento.</p> : <ul className="space-y-3">{now.map(i => (
            <li key={i.id} className="flex items-center gap-3 text-[24px]"><Tag kind={i.kind} number={i.number} /><span className="font-semibold truncate">{shortName(i.label)}</span><span className="ml-auto text-white/60 text-[18px] whitespace-nowrap">{i.staffName?.split(' ')[0]}</span></li>
          ))}</ul>}
        </section>
        <section className="rounded-3xl bg-white/5 p-6">
          <h2 className="text-[#e9c349] uppercase tracking-widest text-[15px] font-bold mb-4 flex items-center gap-2"><Icon name="format_list_numbered" className="text-[20px]" />Siguen</h2>
          {next.length === 0 ? <p className="text-white/60 text-[20px]">No hay nadie esperando.</p> : <ol className="space-y-3">{next.map((i, n) => (
            <li key={i.id} className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${n === 0 ? 'bg-white/10' : ''}`}>
              <span className="w-9 text-white/50 text-[20px] tnum">{n + 1}</span>
              <span className="text-[28px] font-semibold tnum w-[130px] shrink-0">{time12(timeOf(i.start))}</span>
              <Tag kind={i.kind} number={i.number} />
              <span className="text-[24px] truncate">{shortName(i.label)}</span>
              <span className="ml-auto text-white/60 text-[18px] whitespace-nowrap">{i.staffName?.split(' ')[0] || ''}{i.kind === 'CITA' && i.delay > 5 ? ` · +${i.delay} min` : ''}</span>
            </li>
          ))}</ol>}
        </section>
      </div>
    </div>
  );
}
