import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { db } from '@/lib/db';
import { fechaLarga, hm, time12 } from '@/lib/format';
import { getWa, sendWhatsapp } from '@/lib/notify';

// Webhook de WhatsApp Cloud API (Meta). Configúrelo en Meta > WhatsApp > Configuración con la URL
// https://SU-DOMINIO/api/whatsapp/webhook y el token de verificación de /superadmin/whatsapp; suscriba el campo "messages".
// - "1", "sí", "confirmo"  → confirma la próxima cita del cliente.
// - "2", "reprogramar"      → envía el enlace para reprogramar.
// - saludo o palabras como cita/reservar/agendar → responde con el enlace para reservar en ese negocio (reserva por WhatsApp).
const appUrl = () => process.env.APP_URL || 'http://localhost:3000';

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const { verifyToken } = await getWa();
  if (p.get('hub.mode') === 'subscribe' && verifyToken && p.get('hub.verify_token') === verifyToken) return new NextResponse(p.get('hub.challenge') || '', { status: 200 });
  return new NextResponse('Forbidden', { status: 403 });
}

function validSignature(raw: string, sig: string | null, secret: string) {
  if (!secret) return true; // sin secreto configurado no se valida (solo para pruebas)
  if (!sig?.startsWith('sha256=')) return false;
  const a = Buffer.from(sig.slice(7), 'hex'); const b = createHmac('sha256', secret).update(raw).digest();
  return a.length === b.length && timingSafeEqual(a, b);
}

const last10 = (p: string) => p.replace(/\D/g, '').slice(-10);

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!validSignature(raw, req.headers.get('x-hub-signature-256'), (await getWa()).appSecret)) return NextResponse.json({ error: 'firma inválida' }, { status: 401 });
  let body: any; try { body = JSON.parse(raw); } catch { return NextResponse.json({ ok: true }); }
  for (const entry of body.entry || []) for (const ch of entry.changes || []) {
    const v = ch.value || {}; const phoneId: string | undefined = v.metadata?.phone_number_id;
    for (const m of v.messages || []) {
      try { await handle(m.from as string, (m.text?.body || m.button?.text || m.interactive?.button_reply?.title || '').trim(), phoneId); } catch (e) { console.error('[WhatsApp webhook]', e); }
    }
  }
  return NextResponse.json({ ok: true });
}

async function handle(from: string, text: string, phoneId?: string) {
  const phone = last10(from);
  const customers = await db.customer.findMany({ where: { phone: { endsWith: phone } }, include: { business: true }, orderBy: { lastVisit: 'desc' } });
  // El negocio: el dueño del número de WhatsApp que recibió el mensaje, o el último donde estuvo el cliente
  const business = (phoneId && await db.business.findFirst({ where: { waPhoneId: phoneId } })) || customers[0]?.business || null;
  const opts = { phoneId: business?.waPhoneId || phoneId };
  const t = text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const ids = customers.filter(c => !business || c.businessId === business.id).map(c => c.id);
  const next = ids.length ? await db.appointment.findFirst({ where: { customerId: { in: ids }, status: { in: ['PENDIENTE', 'CONFIRMADA'] }, start: { gt: new Date() } }, orderBy: { start: 'asc' }, include: { business: true } }) : null;

  if (next && /^(1|si|confirmo|confirmar|ok)\b/.test(t)) {
    await db.appointment.update({ where: { id: next.id }, data: { clientConfirmedAt: new Date() } });
    await sendWhatsapp(from, `✅ ¡Gracias! Tu asistencia quedó confirmada para el ${fechaLarga(next.start)} a las ${time12(hm(next.start))} en ${next.business.name}.`, opts);
    return;
  }
  if (next && /^(cancelo|cancelar|no puedo|no voy)\b/.test(t)) {
    await db.appointment.update({ where: { id: next.id }, data: { status: 'CANCELADA', notes: [next.notes, 'Cancelada por el cliente (WhatsApp)'].filter(Boolean).join(' · ') } });
    await sendWhatsapp(from, `Listo, cancelamos tu cita del ${fechaLarga(next.start)} a las ${time12(hm(next.start))} en ${next.business.name}. Cuando quieras, reserva de nuevo aquí: ${appUrl()}/reservar/${next.business.slug}`, opts);
    return;
  }
  if (next && /^(2|reprogramar|cambiar)\b/.test(t)) {
    await sendWhatsapp(from, `Puedes elegir otro horario aquí: ${appUrl()}/mis-citas/${next.code}/reprogramar\nSi prefieres, escríbenos y te ayudamos.`, opts);
    return;
  }
  // Para no interrumpir conversaciones normales, el enlace de reserva solo se envía cuando el mensaje lo pide
  if (business && /(hola|buen|cita|reserv|agend|turno|horario|precio|disponib|menu)/.test(t)) {
    await sendWhatsapp(from, `Hola 👋, gracias por escribir a ${business.name}.\n\n📅 Reserva tu cita en segundos aquí: ${appUrl()}/reservar/${business.slug}\n\n${next ? `Tu próxima cita es el ${fechaLarga(next.start)} a las ${time12(hm(next.start))}. Responde *1* para confirmarla o *2* para reprogramar.` : 'Si tienes una pregunta, en breve te responde una persona del equipo.'}`, opts);
  }
}
