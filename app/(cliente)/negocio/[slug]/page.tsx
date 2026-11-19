import { isSuspended } from '@/lib/subscription';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { ShopHeader } from '@/components/cliente/Header';
import { ServiceList } from '@/components/cliente/ServiceList';
import { ShopTabs } from '@/components/cliente/ShopTabs';
import { InstallApp } from '@/components/ui/InstallApp';
import { Icon } from '@/components/ui/Icon';
import { bogota, cop, DIAS, parseJson, time12 } from '@/lib/format';
import { waLink } from '@/lib/notify';
import { queueStatus } from '@/lib/fila';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const b = await db.business.findUnique({ where: { slug }, select: { name: true, tagline: true, description: true } });
  if (!b) return { title: 'Negocio no encontrado' };
  const base = `/negocio/${slug}`;
  return {
    title: { absolute: b.name },
    description: b.tagline ? `${b.tagline}. Reserva tu cita en línea.` : b.description.slice(0, 155),
    manifest: `${base}/app.webmanifest`,
    applicationName: b.name,
    icons: { icon: `${base}/icono/192`, apple: `${base}/icono/180` },
    appleWebApp: { capable: true, title: b.name, statusBarStyle: 'default' as const },
    openGraph: { title: b.name, description: b.tagline || undefined, type: 'website' as const }
  };
}

export default async function Negocio({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const b = await db.business.findUnique({ where: { slug }, include: { services: { where: { active: true }, orderBy: [{ popular: 'desc' }, { price: 'desc' }] }, staff: { where: { active: true } }, reviews: { orderBy: { createdAt: 'desc' }, take: 6 } } });
  if (!b || isSuspended(b)) notFound();
  const imgs = parseJson<string[]>(b.images, []);
  const products = await db.product.findMany({ where: { businessId: b.id, active: true, showInShop: true, kind: { in: ['VENTA', 'AMBOS'] }, price: { gt: 0 } }, orderBy: [{ category: 'asc' }, { name: 'asc' }] });
  const cats = [...new Set(products.map(p => p.category))];
  const hours = parseJson<Record<string, [string, string] | null>>(b.openingHours, {});
  const now = bogota(new Date());
  const today = hours[String(now.dow)];
  const nowMin = now.h * 60 + now.min;
  const open = today && nowMin >= Number(today[0].slice(0, 2)) * 60 + Number(today[0].slice(3)) && nowMin < Number(today[1].slice(0, 2)) * 60 + Number(today[1].slice(3));
  const groups: [string, string[]][] = [['Lunes a viernes', ['1', '2', '3', '4', '5']], ['Sábados', ['6']], ['Domingos y festivos', ['0']]];
  const mapQ = b.lat && b.lng ? `${b.lat},${b.lng}` : encodeURIComponent(b.address);
  return (
    <>
      <ShopHeader shop={{ slug: b.slug, name: b.name, logo: b.logo || imgs[0] || null }} />
      <main className="pt-16 pb-28 max-w-[1100px] mx-auto">
        {/* Galería */}
        <section className="relative w-full px-margin pt-space-md">
          <div className="grid grid-cols-12 gap-space-xs rounded-xl overflow-hidden shadow-lg bg-surface-container-high p-space-xs">
            <div className="col-span-8 relative aspect-[4/3] md:aspect-[16/9] rounded-lg overflow-hidden group">
              {imgs[0] && <img alt={b.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" src={imgs[0]} />}
              <div className="absolute inset-0 bg-gradient-to-t from-primary-container/70 via-transparent to-black/20" />
              <div className="absolute top-space-sm left-space-sm flex items-center gap-1.5 px-space-sm py-1 bg-surface-container-lowest/90 backdrop-blur-md rounded-full shadow-sm">
                <Icon name="verified" fill className="text-[16px] text-secondary" /><span className="font-label-sm text-label-sm text-primary-container dark:text-primary tracking-wider uppercase">Verificado</span>
              </div>
              <div className="absolute bottom-space-sm left-space-sm flex items-center gap-1.5 bg-primary-container/85 backdrop-blur-md text-white px-space-sm py-0.5 rounded-full">
                <Icon name="photo_camera" className="text-[14px] text-secondary-fixed" /><span className="font-label-sm text-label-sm">1/{imgs.length} fotos</span>
              </div>
            </div>
            <div className="col-span-4 flex flex-col gap-space-xs">
              <div className="relative flex-1 rounded-lg overflow-hidden">{imgs[1] && <img alt="" className="w-full h-full object-cover" src={imgs[1]} />}</div>
              <div className="relative flex-1 rounded-lg overflow-hidden">
                {imgs[2] && <img alt="" className="w-full h-full object-cover" src={imgs[2]} />}
                {imgs.length > 3 && <div className="absolute inset-0 bg-primary-container/50 backdrop-blur-[1px] flex flex-col items-center justify-center text-white"><Icon name="grid_view" className="text-secondary-fixed text-[20px]" /><span className="font-label-sm text-label-sm mt-0.5 font-bold">+{imgs.length - 3} más</span></div>}
              </div>
            </div>
          </div>
        </section>

        {/* Encabezado */}
        <section className="px-margin pt-space-md">
          <div className="flex items-center gap-space-xs mb-1">
            {b.zone && <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-bold uppercase tracking-wider">{b.zone}</span>}
            <span className="text-outline text-body-sm">•</span><span className="font-label-md text-label-md text-on-surface-variant">{b.tagline}</span>
          </div>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-primary-container dark:text-primary tracking-tight">{b.name}</h1>
          <div className="flex flex-wrap items-center gap-y-2 gap-x-space-md mt-space-sm">
            <div className="flex items-center gap-1.5 bg-secondary-fixed/40 px-space-sm py-1 rounded-full">
              <Icon name="star" fill className="text-[18px] text-secondary" /><span className="font-title-md text-title-md font-bold">{b.rating.toFixed(1)}</span><span className="font-body-sm text-body-sm text-on-surface-variant font-medium">({b.reviewCount} reseñas)</span>
            </div>
            {open ? <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-pulse" /><span className="font-label-md text-label-md font-semibold text-[#065f46] dark:text-[#6ee7b7]">Abierto hoy</span><span className="font-body-sm text-body-sm text-on-surface-variant">hasta las {time12(today![1])}</span></div>
              : <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-outline" /><span className="font-label-md text-label-md text-on-surface-variant">Cerrado ahora</span></div>}
          </div>
          <div className="flex items-center gap-space-xs mt-space-sm text-on-surface-variant"><Icon name="location_on" className="text-[18px] text-secondary" /><p className="font-body-md text-body-md truncate">{b.address}</p></div>
          <p className="mt-3 text-on-surface-variant max-w-3xl">{b.description}</p>
          {queueStatus(b).open && <div className="mt-4 p-3 rounded-2xl border border-parchment bg-surface-container-low flex flex-wrap items-center gap-3 max-w-xl">
            <Icon name="storefront" className="text-secondary text-[22px]" />
            <div className="flex-1 min-w-[180px]"><p className="font-label-lg">¿Ya estás en el local?</p><p className="font-body-sm text-on-surface-variant">Fila abierta hoy, solo para quienes están aquí sin cita.</p></div>
            <Link href={`/negocio/${b.slug}/fila`} className="btn-ghost btn-sm">Únete a la fila</Link>
          </div>}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-sm mt-space-md max-w-2xl">
            {b.phone && <a className="flex flex-col items-center justify-center p-space-sm bg-surface-container-low hover:bg-surface-container active:scale-95 rounded-xl transition-all shadow-sm" href={`tel:+57${b.phone}`}><Icon name="call" className="text-[22px] text-primary mb-1" /><span className="font-label-md text-label-md text-primary font-bold">Llamar</span></a>}
            <a className="flex flex-col items-center justify-center p-space-sm bg-surface-container-low hover:bg-surface-container active:scale-95 rounded-xl transition-all shadow-sm" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${mapQ}`}><Icon name="near_me" className="text-[22px] text-secondary mb-1" /><span className="font-label-md text-label-md text-primary font-bold">Cómo llegar</span></a>
            {b.whatsapp && <a className="flex flex-col items-center justify-center p-space-sm bg-surface-container-low hover:bg-surface-container active:scale-95 rounded-xl transition-all shadow-sm" href={waLink(b.whatsapp, `Hola ${b.name}, quiero reservar una cita.`)} target="_blank" rel="noopener noreferrer"><Icon name="chat" className="text-[22px] text-[#059669] mb-1" /><span className="font-label-md text-label-md text-[#065f46] dark:text-[#6ee7b7] font-bold">WhatsApp</span></a>}
            <InstallApp variant="tile" name={b.name} />
          </div>
        </section>

        <ShopTabs tabs={[{ id: 'servicios', label: 'Servicios' }, ...(b.staff.length ? [{ id: 'equipo', label: 'Profesionales' }] : []), ...(products.length ? [{ id: 'productos', label: `Productos (${products.length})` }] : []), ...(b.reviews.length ? [{ id: 'resenas', label: `Reseñas (${b.reviewCount})` }] : []), { id: 'sede', label: 'Horarios y sede' }]} />

        <section id="servicios" className="px-margin mt-space-md scroll-mt-32">
          <div className="flex items-center justify-between mb-space-sm"><h2 className="h-section">Servicios</h2><span className="font-label-md text-label-md text-secondary font-bold">Carta ({b.services.length})</span></div>
          <ServiceList slug={b.slug} services={b.services} />
        </section>

        {b.staff.length > 0 && <section id="equipo" className="mt-space-lg px-margin scroll-mt-32">
          <h2 className="h-section">Equipo de profesionales</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-sm">Elige con quién quieres tu cita</p>
          <div className="flex gap-space-md overflow-x-auto no-scrollbar pb-2">
            {b.staff.map(s => (
              <Link key={s.id} href={`/reservar/${b.slug}?profesional=${s.id}`} className="group shrink-0 w-[150px] card p-space-md flex flex-col items-center text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-gold/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full p-[2px] bg-gradient-to-tr from-gold to-secondary-fixed">{s.photo ? <img src={s.photo} alt={s.name} className="w-full h-full rounded-full object-cover border-2 border-surface-container-lowest" /> : <div className="w-full h-full rounded-full bg-primary-container text-white flex items-center justify-center font-title-lg">{s.name[0]}</div>}</div>
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary-container text-white font-label-sm text-label-sm"><Icon name="star" fill className="text-[12px] text-secondary-fixed" />{s.rating.toFixed(1)}</span>
                </div>
                <h3 className="mt-3 font-title-md text-title-md text-on-surface">{s.name.split(' ')[0]} {s.name.split(' ')[1]?.[0]}.</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">{s.title}</p>
                <span className="mt-2 px-2 py-0.5 rounded bg-surface-container font-label-sm text-label-sm text-primary-container dark:text-primary transition-colors group-hover:bg-primary-container group-hover:text-on-primary dark:group-hover:text-on-primary-container">Reservar</span>
              </Link>
            ))}
          </div>
        </section>}

        {products.length > 0 && <section id="productos" className="mt-space-lg px-margin scroll-mt-32">
          <div className="flex items-center justify-between mb-space-sm"><h2 className="h-section">Productos a la venta</h2><span className="font-label-md text-label-md text-secondary font-bold">{products.length} productos</span></div>
          {cats.map(cat => (
            <div key={cat} className="mb-space-md">
              {cats.length > 1 && <p className="eyebrow mb-2">{cat}</p>}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">{products.filter(p => p.category === cat).map(p => {
                const out = p.stock <= 0; const qty = p.unit === 'UND' ? Math.floor(p.stock) : null;
                return (
                  <article key={p.id} className={`group card overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${out ? 'opacity-70' : ''}`}>
                    <div className="aspect-square bg-surface-container flex items-center justify-center overflow-hidden">{p.image ? <img src={p.image} alt={p.name} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <Icon name="shopping_bag" className="text-[40px] text-on-surface-variant/50" />}</div>
                    <div className="p-3 flex flex-col flex-1">
                      {p.brand && <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wide">{p.brand}</p>}
                      <h3 className="font-label-lg text-label-lg leading-snug">{p.name}</h3>
                      {p.description && <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 line-clamp-2">{p.description}</p>}
                      <p className="font-title-md text-title-md mt-auto pt-2 tnum">{cop(p.price)}</p>
                      <p className={`font-label-sm text-label-sm ${out ? 'text-danger' : qty !== null && qty <= 3 ? 'text-secondary' : 'text-success'}`}>{out ? 'Agotado' : qty !== null ? `${qty} ${qty === 1 ? 'disponible' : 'disponibles'}` : 'Disponible'}</p>
                      {!out && b.whatsapp && <a href={waLink(b.whatsapp, `Hola ${b.name}, quiero el producto "${p.name}" (${cop(p.price)}). ¿Me lo apartan?`)} target="_blank" rel="noopener noreferrer" className="btn btn-sm bg-[#25D366] hover:bg-[#1ebe5b] text-white mt-2 justify-center transition-colors"><Icon name="chat" className="text-[16px]" />Pedir</a>}
                    </div>
                  </article>
                );
              })}</div>
            </div>
          ))}
        </section>}

        {b.reviews.length > 0 && <section id="resenas" className="mt-space-lg px-margin scroll-mt-32">
          <div className="flex items-center justify-between mb-space-sm"><h2 className="h-section">Opiniones de clientes</h2><span className="font-label-md text-label-md text-secondary font-bold">{b.reviewCount} opiniones</span></div>
          <div className="grid md:grid-cols-2 gap-space-sm">
            {b.reviews.map(r => (
              <article key={r.id} className="card p-space-md transition-shadow duration-300 hover:shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3"><span className="w-10 h-10 rounded-full bg-primary-container text-secondary-fixed flex items-center justify-center font-label-lg">{r.authorName.split(' ').map(x => x[0]).slice(0, 2).join('')}</span>
                    <div><p className="font-title-md text-title-md">{r.authorName}</p><p className="font-body-sm text-body-sm text-on-surface-variant">Cliente verificado</p></div></div>
                  <div className="flex">{Array.from({ length: 5 }).map((_, i) => <Icon key={i} name="star" fill={i < r.rating} className={`text-[16px] ${i < r.rating ? 'text-gold' : 'text-outline-variant'}`} />)}</div>
                </div>
                <p className="mt-3 italic text-on-surface-variant">“{r.comment}”</p>
                {r.serviceName && <span className="inline-block mt-3 px-2 py-0.5 rounded bg-surface-container font-label-sm text-label-sm">Servicio: {r.serviceName}</span>}
              </article>
            ))}
          </div>
        </section>}

        <section id="sede" className="mt-space-lg px-margin scroll-mt-32">
          <div className="flex items-center justify-between mb-space-sm"><h2 className="h-section">Sede y acceso</h2></div>
          <div className="rounded-xl overflow-hidden shadow-md relative">
            <iframe title={`Mapa de ${b.name}`} className="w-full h-56 md:h-72 border-0" loading="lazy" src={`https://maps.google.com/maps?q=${mapQ}&z=15&output=embed`} />
          </div>
          <div className="card mt-space-sm p-space-md space-y-2">
            {groups.map(([l, ds]) => { const h = hours[ds[0]]; return <div key={l} className="flex justify-between"><span className="text-on-surface-variant">{l}</span><span className="font-label-lg text-label-lg tnum">{h ? `${time12(h[0])} – ${time12(h[1])}` : 'Cerrado'}</span></div>; })}
          </div>
        </section>
      </main>
      <div className="fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur-xl border-t border-primary-container/5 shadow-[0_-8px_30px_rgba(13,37,56,0.08)] pb-safe">
        <div className="max-w-[1100px] mx-auto px-margin py-3 flex items-center justify-between gap-4">
          <div><p className="font-label-sm text-label-sm text-on-surface-variant uppercase">Citas online</p><p className="font-title-md text-title-md flex items-center gap-1.5">Cupos hoy <span className="w-2 h-2 rounded-full bg-gold" /></p></div>
          <Link href={`/reservar/${b.slug}`} className="btn-gold"><Icon name="calendar_month" className="text-[18px]" />Reservar cita</Link>
        </div>
      </div>
    </>
  );
}
