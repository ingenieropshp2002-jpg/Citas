import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { ShopHeader } from '@/components/cliente/Header';
import { fechaLarga, parseJson } from '@/lib/format';
import { reviewToken } from '@/lib/resenas';
import { Stars } from './Stars';

export const metadata = { title: 'Tu opinión', robots: { index: false } };
export default async function Opinion({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ t?: string }> }) {
  const code = (await params).code; const t = (await searchParams).t || '';
  if (t !== reviewToken(code)) notFound();
  const a = await db.appointment.findFirst({ where: { code }, include: { business: true, staff: true, services: { include: { service: true } }, review: true } });
  if (!a || a.status !== 'COMPLETADA') notFound();
  const b = a.business;
  return (
    <>
      <ShopHeader shop={{ slug: b.slug, name: b.name, logo: b.logo || parseJson<string[]>(b.images, [])[0] || null }} title="Tu opinión" />
      <main className="max-w-md mx-auto px-4 py-6">
        <p className="text-on-surface-variant text-center mb-4">{a.services.map(s => s.service.name).join(' + ')} con {a.staff.name.split(' ')[0]} · {fechaLarga(a.start)}</p>
        <Stars code={code} t={t} google={b.googleReviewUrl} done={!!a.review} business={b.name} />
      </main>
    </>
  );
}
