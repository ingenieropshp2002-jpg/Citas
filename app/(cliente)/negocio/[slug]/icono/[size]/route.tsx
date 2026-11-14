import { ImageResponse } from 'next/og';
import { db } from '@/lib/db';

// Ícono PNG del negocio para instalarlo como app (usa su logo o su inicial).
export async function GET(req: Request, { params }: { params: Promise<{ slug: string; size: string }> }) {
  const { slug, size: raw } = await params;
  const size = raw === '512' ? 512 : raw === '180' ? 180 : 192;
  const maskable = new URL(req.url).searchParams.get('maskable') === '1';
  const b = await db.business.findUnique({ where: { slug }, select: { name: true, logo: true } });
  if (!b) return new Response('No encontrado', { status: 404 });
  let logo: string | null = null;
  if (b.logo) {
    try {
      if (b.logo.startsWith('data:image/')) logo = b.logo;
      else {
        const r = await fetch(b.logo, { signal: AbortSignal.timeout(4000) });
        const type = r.headers.get('content-type') || '';
        if (r.ok && /image\/(png|jpe?g|webp)/.test(type)) logo = `data:${type};base64,${Buffer.from(await r.arrayBuffer()).toString('base64')}`;
      }
    } catch { logo = null; }
  }
  const inner = Math.round(size * (maskable ? 0.62 : 0.84));
  return new ImageResponse(
    (
      <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d2538', borderRadius: maskable ? 0 : size * 0.22 }}>
        {logo
          ? <img src={logo} width={inner} height={inner} style={{ borderRadius: size * 0.16, objectFit: 'cover' }} />
          : <div style={{ width: inner, height: inner, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: size * 0.16, border: `${Math.max(2, Math.round(size * 0.018))}px solid #e9c349`, color: '#ffe088', fontSize: inner * 0.62, fontWeight: 700 }}>{b.name.charAt(0).toUpperCase()}</div>}
      </div>
    ),
    { width: size, height: size, headers: { 'cache-control': 'public, max-age=86400' } }
  );
}
