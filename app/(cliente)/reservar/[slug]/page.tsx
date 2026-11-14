import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { ShopHeader } from '@/components/cliente/Header';
import { BookingWizard } from '@/components/cliente/BookingWizard';
import { parseJson } from '@/lib/format';

export const metadata = { title: 'Agendar cita' };
export default async function Reservar({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ servicio?: string; profesional?: string; servicios?: string }> }) {
  const { slug } = await params; const sp = await searchParams;
  const q = new URLSearchParams(sp as Record<string, string>).toString();
  const user = await requireUser(`/reservar/${slug}${q ? '?' + q : ''}`);
  const b = await db.business.findUnique({ where: { slug }, include: { services: { where: { active: true }, include: { staff: true }, orderBy: [{ popular: 'desc' }, { name: 'asc' }] }, staff: { where: { active: true } } } });
  if (!b) notFound();
  return (
    <>
      <ShopHeader shop={{ slug: b.slug, name: b.name, logo: b.logo || parseJson<string[]>(b.images, [])[0] || null }} title="Agendar cita" back />
      <main className="pt-16">
        <BookingWizard
          business={{ id: b.id, name: b.name, depositPercent: b.depositPercent, requireDeposit: b.requireDeposit, cancellationHours: b.cancellationHours, image: parseJson<string[]>(b.images, [])[0] }}
          services={b.services.map(s => ({ id: s.id, name: s.name, description: s.description, durationMin: s.durationMin, price: s.price, category: s.category, staffIds: s.staff.map(x => x.staffId) }))}
          staff={b.staff.map(s => ({ id: s.id, name: s.name, title: s.title, photo: s.photo, rating: s.rating }))}
          initialService={sp.servicio} initialStaff={sp.profesional} userPhone={user.phone || ''} />
      </main>
    </>
  );
}
