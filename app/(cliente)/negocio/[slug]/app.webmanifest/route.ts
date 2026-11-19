import { db } from '@/lib/db';
import { appColor, isLight, shortName } from '@/lib/appBrand';

// Manifiesto propio de cada negocio: el cliente instala solo el perfil de ese negocio.
export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const b = await db.business.findUnique({ where: { slug }, select: { name: true, tagline: true, slug: true, appColor: true, appShortName: true } });
  if (!b) return new Response('No encontrado', { status: 404 });
  const base = `/negocio/${b.slug}`;
  const short = shortName(b); const color = appColor(b.appColor);
  const body = {
    id: base,
    name: b.name,
    short_name: short,
    description: b.tagline || `Reserva tu cita en ${b.name}`,
    start_url: `${base}?fuente=app`,
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: isLight(color) ? color : '#f8f9ff',
    theme_color: color,
    lang: 'es-CO',
    icons: [
      { src: `${base}/icono/192`, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: `${base}/icono/512`, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: `${base}/icono/512?maskable=1`, sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ],
    shortcuts: [
      { name: 'Reservar cita', url: `/reservar/${b.slug}`, icons: [{ src: `${base}/icono/192`, sizes: '192x192' }] },
      { name: 'Mis citas', url: `/mis-citas?negocio=${b.slug}`, icons: [{ src: `${base}/icono/192`, sizes: '192x192' }] }
    ]
  };
  return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/manifest+json; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}
