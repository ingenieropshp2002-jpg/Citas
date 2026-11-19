import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';

/** Foto privada de la ficha: solo la ve el equipo del negocio. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { business } = await requireBusiness();
  const p = await db.customerPhoto.findFirst({ where: { id: (await params).id, businessId: business.id } });
  if (!p) return new Response('No encontrada', { status: 404 });
  return new Response(new Uint8Array(p.data), { headers: { 'Content-Type': p.mime, 'Content-Length': String(p.size), 'Cache-Control': 'private, max-age=86400, immutable', 'X-Content-Type-Options': 'nosniff' } });
}
