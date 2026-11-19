// WhatsApp oficial (Cloud API de Meta). Las credenciales se guardan desde /superadmin/whatsapp (o variables de entorno).
// Sin credenciales funciona en MODO DE PRUEBA: no sale nada, pero cada mensaje queda en el registro para revisarlo.
// Fuera de la ventana de 24 h Meta solo deja enviar PLANTILLAS aprobadas; por eso cada aviso automático tiene su plantilla.
import { db } from './db';

export type WaKind = 'RECORDATORIO' | 'CONFIRMACION' | 'CUMPLEANOS' | 'RECUPERAR' | 'CAMPANA' | 'TURNO' | 'RESENA';
export type WaTemplate = { kind: WaKind; params: string[] };
export type WaConfig = { token: string; phoneId: string; verifyToken: string; appSecret: string; lang: string; templates: Partial<Record<WaKind, string>> };

/** Plantillas sugeridas para crear en Meta (categoría Utilidad salvo CAMPANA y CUMPLEANOS, que son Marketing). */
export const WA_TEMPLATES: { kind: WaKind; name: string; label: string; body: string }[] = [
  { kind: 'RECORDATORIO', name: 'recordatorio_cita', label: 'Recordatorio con Confirmo / Cancelo', body: 'Hola {{1}}, te recordamos tu cita en {{2}} el {{3}} con {{4}}. Confirma o cancela aquí: {{5}}' },
  { kind: 'CONFIRMACION', name: 'cita_confirmada', label: 'Reserva recibida o confirmada', body: 'Hola {{1}}, tu cita en {{2}} para el {{3}} quedó {{4}}. Detalles: {{5}}' },
  { kind: 'TURNO', name: 'turno_fila', label: 'Fila virtual: ya casi es tu turno', body: 'Hola {{1}}, en {{2}} ya casi es tu turno (#{{3}}). Por favor acércate al local.' },
  { kind: 'RESENA', name: 'pedir_resena', label: 'Pedir reseña después de la cita', body: 'Hola {{1}}, gracias por visitarnos en {{2}}. ¿Nos regalas tu opinión? Toma menos de un minuto: {{3}}' },
  { kind: 'CUMPLEANOS', name: 'feliz_cumpleanos', label: 'Saludo de cumpleaños', body: '¡Feliz cumpleaños, {{1}}! 🎉 En {{2}} te tenemos un regalo especial.' },
  { kind: 'CAMPANA', name: 'promocion', label: 'Campañas y promociones', body: 'Hola {{1}}, {{2}} te trae una promoción: {{3}}' },
  { kind: 'RECUPERAR', name: 'codigo_acceso', label: 'Código o enlace de acceso', body: 'Tu código de acceso es {{1}}.' }
];

let memo: { at: number; v: WaConfig } | null = null;
/** Credenciales de WhatsApp: primero las guardadas en /superadmin/whatsapp; si falta algo, las variables de entorno. */
export async function getWa(): Promise<WaConfig> {
  if (memo && Date.now() - memo.at < 60_000) return memo.v;
  let saved: Partial<WaConfig> = {};
  try { const r = await db.platformSetting.findUnique({ where: { key: 'whatsapp' } }); if (r) saved = JSON.parse(r.value); } catch { /* sin tabla o valor dañado */ }
  const env = process.env;
  const templates: Partial<Record<WaKind, string>> = {};
  for (const t of WA_TEMPLATES) { const v = saved.templates?.[t.kind] ?? env[`WHATSAPP_TPL_${t.kind}`]; if (v) templates[t.kind] = v; }
  const v: WaConfig = { token: saved.token || env.WHATSAPP_TOKEN || '', phoneId: saved.phoneId || env.WHATSAPP_PHONE_ID || '', verifyToken: saved.verifyToken || env.WHATSAPP_VERIFY_TOKEN || '', appSecret: saved.appSecret || env.WHATSAPP_APP_SECRET || '', lang: saved.lang || env.WHATSAPP_TPL_LANG || 'es', templates };
  memo = { at: Date.now(), v };
  return v;
}
export function resetWaMemo() { memo = null; }

/** ¿Hay WhatsApp automático (token y número)? Si no, la app trabaja con botones wa.me. */
export async function waReady() { const w = await getWa(); return !!(w.token && w.phoneId); }

export function normalizePhone(to: string) {
  const phone = (to || '').replace(/\D/g, '');
  return phone.length === 10 ? '57' + phone : phone;
}

async function log(data: { businessId?: string | null; to: string; kind: string; text: string; status: string; error?: string | null }) {
  try { await db.waLog.create({ data: { ...data, text: data.text.slice(0, 1500), error: data.error?.slice(0, 500) || null } }); } catch { /* el registro nunca debe frenar el envío */ }
}

/**
 * Envía un WhatsApp. Si se indica plantilla y está configurada, se usa la plantilla aprobada (sirve fuera de la ventana de 24 h);
 * si no, se envía como texto (solo llega si el cliente escribió en las últimas 24 h).
 */
export async function sendWhatsapp(to: string, text: string, opts: { phoneId?: string | null; template?: WaTemplate; businessId?: string | null } = {}) {
  const full = normalizePhone(to);
  if (!full) return { ok: false, simulated: true };
  const w = await getWa();
  const phoneId = opts.phoneId || w.phoneId;
  const kind = opts.template?.kind || 'TEXTO';
  if (!w.token || !phoneId) {
    console.log(`[WhatsApp prueba] → +${full}: ${text}`);
    await log({ businessId: opts.businessId, to: full, kind, text, status: 'PRUEBA' });
    return { ok: true, simulated: true };
  }
  const tpl = opts.template && w.templates[opts.template.kind];
  const body = tpl
    ? { messaging_product: 'whatsapp', to: full, type: 'template', template: { name: tpl, language: { code: w.lang }, components: [{ type: 'body', parameters: opts.template!.params.map(t => ({ type: 'text', text: t.replace(/\s*\n+\s*/g, ' ').slice(0, 900) })) }] } }
    : { messaging_product: 'whatsapp', to: full, type: 'text', text: { body: text } };
  try {
    const r = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
      method: 'POST', headers: { Authorization: `Bearer ${w.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    const err = r.ok ? null : await r.text().catch(() => String(r.status));
    if (err) console.error('[WhatsApp] error', r.status, err);
    await log({ businessId: opts.businessId, to: full, kind: tpl ? `${kind} (${tpl})` : kind, text, status: r.ok ? 'ENVIADO' : 'ERROR', error: err });
    return { ok: r.ok, simulated: false, error: err };
  } catch (e) {
    console.error('[WhatsApp] error', e);
    await log({ businessId: opts.businessId, to: full, kind, text, status: 'ERROR', error: String(e) });
    return { ok: false, simulated: false, error: String(e) };
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
