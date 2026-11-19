import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { ShopHeader } from '@/components/cliente/Header';
import { Icon } from '@/components/ui/Icon';
import { cop, fechaCorta, parseJson } from '@/lib/format';
import { normCode, prepaidState } from '@/lib/prepago';

export const metadata = { title: 'Tarjeta de regalo', robots: { index: false } };
export default async function Regalo({ params }: { params: Promise<{ code: string }> }) {
  const p = await db.prepaid.findFirst({ where: { code: normCode(decodeURIComponent((await params).code)), kind: 'REGALO' } });
  if (!p) notFound();
  const b = await db.business.findFirst({ where: { id: p.businessId }, select: { slug: true, name: true, logo: true, images: true, address: true } });
  if (!b) notFound();
  const st = prepaidState(p);
  return (
    <>
      <ShopHeader shop={{ slug: b.slug, name: b.name, logo: b.logo || parseJson<string[]>(b.images, [])[0] || null }} title="Tarjeta de regalo" />
      <main className="max-w-md mx-auto px-4 py-6">
        <div className="rounded-3xl p-6 bg-gradient-to-br from-primary-container to-[#0b2537] text-white shadow-sheet">
          <div className="flex items-center justify-between"><span className="font-label-sm tracking-[.3em] text-secondary-fixed">TARJETA DE REGALO</span><Icon name="redeem" className="text-secondary-fixed" /></div>
          {p.recipientName && <p className="mt-4 text-white/80">Para <b className="text-white">{p.recipientName}</b>{p.buyerName ? <> · de {p.buyerName}</> : null}</p>}
          <p className="font-headline-md text-headline-md mt-2">{b.name}</p>
          <p className="text-[40px] leading-tight font-bold tnum mt-2">{cop(p.balance)}</p>
          <p className="text-white/70 font-body-sm">Saldo disponible{p.balance !== p.price ? ` de ${cop(p.price)}` : ''}</p>
          {p.message && <p className="mt-3 italic text-white/90">“{p.message}”</p>}
          <div className="mt-5 flex items-end justify-between"><p className="text-white/60 font-label-sm">{p.expiresAt ? `Válida hasta ${fechaCorta(p.expiresAt)}` : ''}</p><p className="font-title-lg tracking-[.2em] text-secondary-fixed">{p.code}</p></div>
        </div>
        {st !== 'ACTIVO' && <p className="mt-4 p-3 rounded-xl bg-[#FFF7ED] text-[#9A3412] font-label-lg">Esta tarjeta está {st.toLowerCase()}.</p>}
        <p className="mt-5 text-on-surface-variant">Reserva tu cita y, al pagar en {b.name}, muestra este código. El valor se descuenta de tu saldo.</p>
        {st === 'ACTIVO' && <Link href={`/reservar/${b.slug}`} className="btn-primary w-full mt-4"><Icon name="calendar_month" className="text-[18px]" />Reservar cita</Link>}
        {b.address && <p className="mt-3 font-body-sm text-on-surface-variant flex items-center gap-1"><Icon name="location_on" className="text-[16px]" />{b.address}</p>}
      </main>
    </>
  );
}
