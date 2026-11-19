import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
import { Icon } from '@/components/ui/Icon';
import { findLesson } from '@/lib/academy';
import { completeLesson } from '../../_actions/academy';

export default async function Leccion({ params }: { params: Promise<{ leccion: string }> }) {
  const { user } = await requireBusiness();
  const l = findLesson((await params).leccion);
  if (!l) notFound();
  const done = await db.lessonProgress.findUnique({ where: { userId_lessonId: { userId: user.id, lessonId: l.id } } });
  const i = l.course.lessons.findIndex(x => x.id === l.id);
  const blocks: { type: 'p' | 'ul'; lines: string[] }[] = [];
  for (const line of l.body.split('\n').map(s => s.trim()).filter(Boolean)) {
    const bullet = line.startsWith('- ');
    const last = blocks[blocks.length - 1];
    if (bullet && last?.type === 'ul') last.lines.push(line.slice(2));
    else blocks.push({ type: bullet ? 'ul' : 'p', lines: [bullet ? line.slice(2) : line] });
  }
  return (
    <article className="max-w-2xl">
      <Link href="/admin/academia" className="font-label-md text-secondary inline-flex items-center gap-1"><Icon name="arrow_back" className="text-[16px]" />Academia</Link>
      <p className="eyebrow mt-4">{l.course.title} · Lección {i + 1} de {l.course.lessons.length}</p>
      <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-primary-container dark:text-primary">{l.title}</h1>
      <p className="font-body-sm text-on-surface-variant mt-1">{l.minutes} minutos de lectura</p>
      <div className="card p-6 mt-5 space-y-4 text-[16px] leading-relaxed">{blocks.map((b, k) => b.type === 'p' ? <p key={k}>{b.lines[0]}</p> : <ul key={k} className="space-y-2">{b.lines.map((x, j) => <li key={j} className="flex gap-2"><Icon name="check" className="text-[18px] text-secondary mt-0.5 shrink-0" /><span>{x}</span></li>)}</ul>)}</div>
      <form action={completeLesson} className="mt-5 flex flex-wrap items-center gap-3">
        <input type="hidden" name="id" value={l.id} />
        <button className="btn-primary"><Icon name="check_circle" className="text-[18px]" />{done ? 'Completada · siguiente' : 'Marcar como completada'}</button>
        {i > 0 && <Link href={`/admin/academia/${l.course.lessons[i - 1].id}`} className="btn-ghost btn-sm">Lección anterior</Link>}
      </form>
    </article>
  );
}
