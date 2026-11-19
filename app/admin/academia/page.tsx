import Link from 'next/link';
import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
import { PageHeader } from '@/components/panel/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { COURSES } from '@/lib/academy';

export const metadata = { title: 'Academia' };
export default async function Academia() {
  const { user } = await requireBusiness();
  const done = new Set((await db.lessonProgress.findMany({ where: { userId: user.id }, select: { lessonId: true } })).map(p => p.lessonId));
  return (
    <>
      <PageHeader eyebrow="Aprende" title="Academia" subtitle="Cursos cortos para ti y tu equipo: usar la app, atender mejor y hacer crecer el negocio." />
      <div className="grid md:grid-cols-2 gap-4">{COURSES.map(c => {
        const n = c.lessons.filter(l => done.has(l.id)).length; const pct = Math.round(n / c.lessons.length * 100);
        const nextLesson = c.lessons.find(l => !done.has(l.id)) || c.lessons[0];
        return (
          <section key={c.id} className="card p-5 flex flex-col">
            <div className="flex items-start gap-3"><span className="w-11 h-11 rounded-xl bg-secondary-fixed/50 text-secondary flex items-center justify-center shrink-0"><Icon name={c.icon} /></span>
              <div className="min-w-0"><h2 className="font-title-lg text-title-lg">{c.title}</h2><p className="font-body-sm text-on-surface-variant">{c.audience} · {c.lessons.length} lecciones · {c.lessons.reduce((a, l) => a + l.minutes, 0)} min</p></div></div>
            <div className="h-2 mt-4 rounded-full bg-surface-container"><div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} /></div>
            <p className="font-label-md text-on-surface-variant mt-1">{n} de {c.lessons.length} completadas</p>
            <ol className="mt-3 space-y-1.5 flex-1">{c.lessons.map(l => <li key={l.id}><Link href={`/admin/academia/${l.id}`} className="flex items-center gap-2 hover:text-secondary"><Icon name={done.has(l.id) ? 'check_circle' : 'radio_button_unchecked'} fill={done.has(l.id)} className={`text-[18px] ${done.has(l.id) ? 'text-success' : 'text-on-surface-variant'}`} />{l.title}<span className="ml-auto font-body-sm text-on-surface-variant">{l.minutes} min</span></Link></li>)}</ol>
            <Link href={`/admin/academia/${nextLesson.id}`} className="btn-primary btn-sm mt-4 self-start">{n === 0 ? 'Empezar' : n === c.lessons.length ? 'Repasar' : 'Continuar'}</Link>
          </section>
        );
      })}</div>
    </>
  );
}
