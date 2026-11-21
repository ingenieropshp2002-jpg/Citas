import { db } from '@/lib/db';
import { getUser } from '@/lib/auth';
import { PROOF_MAX, proofAccess, sniffMime } from '@/lib/abono';
import { pushToBusiness } from '@/lib/push';
import { cop, fechaCorta, hm, time12 } from '@/lib/format';

const find = (code: string) => db.appointment.findUnique({ where: { code }, include: { customer: { select: { userId: true, name: true } } } });
const json = (o: unknown, status = 200) => Response.json(o, { status, headers: { 'Cache-Control': 'no-store' } });

/** Ver el comprobante (privado). */
export async function GET(_: Request, { params }: { params: Promise<{ code: string }> }) {
  const user = await getUser();
  if (!user) return new Response('Inicia sesión para ver el comprobante.', { status: 401 });
  const a = await find((await params).code);
  if (!a || !(await proofAccess(user.id, a))) return new Response('No encontrado', { status: 404 });
  const p = await db.depositProof.findUnique({ where: { appointmentId: a.id } });
  if (!p) return new Response('Todavía no hay comprobante.', { status: 404 });
  const ext = p.mime === 'application/pdf' ? 'pdf' : p.mime.split('/')[1];
  return new Response(new Uint8Array(p.data), { headers: {
    'Content-Type': p.mime, 'Content-Length': String(p.size), 'Cache-Control': 'private, no-store',
    'Content-Disposition': `inline; filename="abono-${a.code}.${ext}"`, 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox"
  } });
}

/** Subir el comprobante (JPG, PNG, WEBP o PDF, hasta 5 MB). */
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const user = await getUser();
  const a = await find((await params).code);
  // Reserva sin cuenta: con el código de la cita basta para subir el comprobante.
  const guest = !!a && !a.customer.userId;
  if (!guest && !user) return json({ error: 'Inicia sesión para subir el comprobante.' }, 401);
  if (!a || (!guest && (await proofAccess(user!.id, a)) !== 'CLIENTE')) return json({ error: 'Cita no encontrada.' }, 404);
  if (a.paymentMethod !== 'TRANSFERENCIA' || a.depositStatus !== 'PENDIENTE' || a.status !== 'PENDIENTE') return json({ error: 'Esta cita ya no espera un comprobante.' }, 409);
  if (Number(req.headers.get('content-length') || 0) > PROOF_MAX + 64 * 1024) return json({ error: 'El archivo pesa más de 5 MB.' }, 413);
  const file = (await req.formData().catch(() => null))?.get('file');
  if (!file || typeof file === 'string') return json({ error: 'Elige el archivo del comprobante.' }, 400);
  if (file.size > PROOF_MAX) return json({ error: 'El archivo pesa más de 5 MB.' }, 413);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffMime(bytes);
  if (!mime) return json({ error: 'Solo se aceptan fotos JPG, PNG o WEBP, o un PDF.' }, 415);
  const data = { mime, size: bytes.length, data: Buffer.from(bytes) };
  await db.$transaction([
    db.depositProof.upsert({ where: { appointmentId: a.id }, create: { appointmentId: a.id, businessId: a.businessId, ...data }, update: { ...data, createdAt: new Date() } }),
    db.appointment.update({ where: { id: a.id }, data: { depositProofAt: new Date() } })
  ]);
  await pushToBusiness(a.businessId, { title: '💸 Comprobante de abono', body: `${a.customer.name} subió el comprobante de ${cop(a.depositAmount)} · cita ${fechaCorta(a.start)} ${time12(hm(a.start))}`, url: '/admin/abonos', tag: `abono-${a.code}` });
  return json({ ok: true });
}
