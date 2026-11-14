// Envío de mensajes por WhatsApp Cloud API (Meta). Si no hay credenciales, se registra en consola (modo simulado).
// Variables: WHATSAPP_TOKEN, WHATSAPP_PHONE_ID (número por defecto), WHATSAPP_VERIFY_TOKEN y WHATSAPP_APP_SECRET (webhook).
// Fuera de la ventana de 24 h, Meta solo permite mensajes con plantilla aprobada: si define WHATSAPP_TPL_<TIPO>
// (p. ej. WHATSAPP_TPL_RECORDATORIO=recordatorio_cita) se envía esa plantilla con los parámetros indicados.
export type WaTemplate = { kind: 'RECORDATORIO' | 'CONFIRMACION' | 'CUMPLEANOS' | 'RECUPERAR' | 'CAMPANA'; params: string[] };

export function waConfigured() { return !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID); }

export function normalizePhone(to: string) {
  const phone = (to || '').replace(/\D/g, '');
  return phone.length === 10 ? '57' + phone : phone;
}

export async function sendWhatsapp(to: string, text: string, opts: { phoneId?: string | null; template?: WaTemplate } = {}) {
  const full = normalizePhone(to);
  if (!full) return { ok: false, simulated: true };
  const phoneId = opts.phoneId || process.env.WHATSAPP_PHONE_ID;
  if (!process.env.WHATSAPP_TOKEN || !phoneId) {
    console.log(`[WhatsApp simulado] → +${full}: ${text}`);
    return { ok: true, simulated: true };
  }
  const tpl = opts.template && process.env[`WHATSAPP_TPL_${opts.template.kind}`];
  const body = tpl
    ? { messaging_product: 'whatsapp', to: full, type: 'template', template: { name: tpl, language: { code: process.env.WHATSAPP_TPL_LANG || 'es' }, components: [{ type: 'body', parameters: opts.template!.params.map(t => ({ type: 'text', text: t })) }] } }
    : { messaging_product: 'whatsapp', to: full, type: 'text', text: { body: text } };
  try {
    const r = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
      method: 'POST', headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    if (!r.ok) console.error('[WhatsApp] error', r.status, await r.text().catch(() => ''));
    return { ok: r.ok, simulated: false };
  } catch (e) {
    console.error('[WhatsApp] error', e);
    return { ok: false, simulated: false };
  }
}

export function waLink(phone: string | null | undefined, text: string) {
  const p = (phone || '').replace(/\D/g, '');
  return `https://wa.me/${p ? (p.length === 10 ? '57' + p : p) : ''}?text=${encodeURIComponent(text)}`;
}

/** Reemplaza variables {nombre}, {negocio}, {link}, {cupon}, {puntos} en un mensaje */
export function fillVars(msg: string, v: Record<string, string | number | null | undefined>) {
  return msg.replace(/\{(\w+)\}/g, (m, k) => (v[k] !== undefined && v[k] !== null ? String(v[k]) : m));
}
