import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { ShopHeader } from '@/components/cliente/Header';
import { parseJson } from '@/lib/format';
import { Reschedule } from '@/components/cliente/Reschedule';
import { fechaLarga, hm, time12 } from '@/lib/format';
export default async function Reprogramar({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const user = await requireUser(`/mis-citas/${code}/reprogramar`);
  const a = await db.appointment.findUnique({ where: { code }, include: { customer: true, staff: true, business: true } });
  if (!a || a.customer.userId !== user.id) notFound();
  return (
    <>
      <ShopHeader shop={{ slug: a.business.slug, name: a.business.name, logo: a.business.logo || parseJson<string[]>(a.business.images, [])[0] || null }} title="Reprogramar" back />
      <main className="pt-20 pb-10 px-margin max-w-3xl mx-auto">
        <p className="eyebrow">{a.business.name}</p>
        <h1 className="font-headline-sm text-headline-sm">Elige un nuevo horario</h1>
        <p className="text-on-surface-variant">Actual: {fechaLarga(a.start)} · {time12(hm(a.start))} con {a.staff.name}</p>
        <Reschedule code={code} businessId={a.businessId} staffId={a.staffId} duration={(a.end.getTime() - a.start.getTime()) / 60000} />
      </main>
    </>
  );
}
