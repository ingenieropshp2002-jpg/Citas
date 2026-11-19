'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
import { ALL_LESSONS, findLesson } from '@/lib/academy';

export async function completeLesson(fd: FormData) {
  const { user } = await requireBusiness();
  const id = String(fd.get('id'));
  if (!findLesson(id)) return;
  await db.lessonProgress.upsert({ where: { userId_lessonId: { userId: user.id, lessonId: id } }, update: {}, create: { userId: user.id, lessonId: id } });
  revalidatePath('/admin/academia');
  const i = ALL_LESSONS.findIndex(l => l.id === id);
  const next = ALL_LESSONS[i + 1];
  redirect(next && next.course.id === ALL_LESSONS[i].course.id ? `/admin/academia/${next.id}` : '/admin/academia?ok=1');
}
