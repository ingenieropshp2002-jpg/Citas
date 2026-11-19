import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
import { sniffMime } from '@/lib/abono';
import { FORMULA_FIELDS, PHOTO_MAX, PHOTOS_PER_RECORD } from '@/lib/ficha';
import { fromBogota } from '@/lib/format';

const json = (o: unknown, status = 200) => Response.json(o, { status, headers: { 'Cache-Control': 'no-store' } });
const txt = (v: FormDataEntryValue | null, n = 200) => String(v ?? '').trim().slice(0, n);

/** Nueva ficha técnica de una visita: fórmula de color, notas y fotos de antes y después. */
export async function POST(req: Request, { params }: { params: Promise<{ customerId: string }> }) {
  const { user, business, perms } = await requireBusiness();
  if (perms !== 'ALL' && !perms.includes('clientes') && !perms.includes('agenda')) return json({ error: 'No tienes permiso para editar fichas.' }, 403);
  const c = await db.customer.findFirst({ where: { id: (await params).customerId, businessId: business.id }, select: { id: true } });
  if (!c) return json({ error: 'Cliente no encontrado.' }, 404);
  if (Number(req.headers.get('content-length') || 0) > PHOTOS_PER_RECORD * PHOTO_MAX + 256 * 1024) return json({ error: 'Las fotos pesan demasiado.' }, 413);
  const fd = await req.formData().catch(() => null);
  if (!fd) return json({ error: 'Datos inválidos.' }, 400);
  const formula = Object.fromEntries(FORMULA_FIELDS.map(([k]) => [k, txt(fd.get(`f_${k}`))]).filter(([, v]) => v));
  const photos: { kind: string; mime: string; bytes: Uint8Array }[] = [];
  for (const kind of ['ANTES', 'DESPUES']) for (const f of fd.getAll(kind)) {
    if (typeof f === 'string' || !f.size) continue;
    if (f.size > PHOTO_MAX) return json({ error: 'Una de las fotos pesa demasiado.' }, 413);
    const bytes = new Uint8Array(await f.arrayBuffer()); const mime = sniffMime(bytes);
    if (!mime || mime === 'application/pdf') return json({ error: 'Solo se aceptan fotos JPG, PNG o WEBP.' }, 415);
    photos.push({ kind, mime, bytes });
  }
  if (photos.length > PHOTOS_PER_RECORD) return json({ error: `Máximo ${PHOTOS_PER_RECORD} fotos por visita.` }, 400);
  const notes = txt(fd.get('notes'), 2000); const service = txt(fd.get('service'));
  if (!Object.keys(formula).length && !notes && !photos.length) return json({ error: 'Escribe la fórmula, una nota o agrega fotos.' }, 400);
  const d = txt(fd.get('date'), 10);
  const appointmentId = txt(fd.get('appointmentId'), 40) || null;
  await db.$transaction(async tx => {
    const r = await tx.clientRecord.create({ data: {
      businessId: business.id, customerId: c.id, appointmentId, service: service || null, staffName: txt(fd.get('staffName'), 80) || null,
      date: /^\d{4}-\d{2}-\d{2}$/.test(d) ? fromBogota(d, '12:00') : new Date(), formula: Object.keys(formula).length ? JSON.stringify(formula) : null, notes: notes || null, createdBy: user.name
    } });
    for (const p of photos) await tx.customerPhoto.create({ data: { businessId: business.id, customerId: c.id, recordId: r.id, kind: p.kind, mime: p.mime, size: p.bytes.length, data: Buffer.from(p.bytes) } });
  });
  return json({ ok: true });
}
