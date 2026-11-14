import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { business } = await requireBusiness('facturacion');
  const d = await db.electronicDocument.findFirst({ where: { id: (await params).id, businessId: business.id } });
  if (!d) return new Response('No encontrado', { status: 404 });
  return new Response(d.xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Content-Disposition': `attachment; filename="${d.fullNumber}.xml"` } });
}
