// Google Calendar de cada profesional:
// 1) Enlace iCal privado (funciona ya, sin credenciales): Google lo lee cada pocas horas.
// 2) Sincronización directa con OAuth (necesita GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET y la API de Calendar activa):
//    el cron copia, cambia o borra los eventos en su calendario.
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'crypto';
import { db } from './db';
import { ymd } from './format';

const secret = () => process.env.AUTH_SECRET || 'dev-secret';
const appUrl = () => (process.env.APP_URL || '').replace(/\/$/, '');
export const gcalConfigured = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
export const GCAL_REDIRECT = () => `${appUrl()}/api/google/calendario/callback`;

// ───── Cifrado del refresh token ─────
const key = () => createHash('sha256').update(`${secret()}:gcal`).digest();
export function seal(text: string) {
  const iv = randomBytes(12); const c = createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([c.update(text, 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), enc].map(b => b.toString('base64url')).join('.');
}
export function unseal(s: string) {
  const [iv, tag, enc] = s.split('.').map(x => Buffer.from(x, 'base64url'));
  const d = createDecipheriv('aes-256-gcm', key(), iv); d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString('utf8');
}

// ───── Enlace iCal ─────
export const icsToken = (staffId: string) => createHmac('sha256', secret()).update(`${staffId}:ics`).digest('base64url').slice(0, 24);
export const icsUrl = (staffId: string) => `${appUrl()}/api/calendario/${staffId}?t=${icsToken(staffId)}`;
export const stateFor = (staffId: string) => `${staffId}.${createHmac('sha256', secret()).update(`${staffId}:gcal-state`).digest('base64url').slice(0, 20)}`;
export const staffFromState = (state: string) => { const [id] = state.split('.'); return id && stateFor(id) === state ? id : null; };

export function authUrl(staffId: string) {
  const q = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '', redirect_uri: GCAL_REDIRECT(), response_type: 'code', access_type: 'offline', prompt: 'consent',
    scope: 'openid email https://www.googleapis.com/auth/calendar.events', state: stateFor(staffId), include_granted_scopes: 'true'
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}

async function token(body: Record<string, string>) {
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, ...body }) });
  return r.json() as Promise<{ access_token?: string; refresh_token?: string; id_token?: string; error?: string; error_description?: string }>;
}
export async function exchangeCode(code: string) {
  const t = await token({ code, redirect_uri: GCAL_REDIRECT(), grant_type: 'authorization_code' });
  if (!t.refresh_token || !t.access_token) throw new Error(t.error_description || t.error || 'Google no entregó el permiso sin conexión.');
  const info = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${t.access_token}` } }).then(r => r.json()).catch(() => ({})) as { email?: string };
  return { refresh: t.refresh_token, email: info.email || null };
}

type Appt = { id: string; start: Date; end: Date; status: string; code: string; notes: string | null; gcalEventId: string | null; gcalHash: string | null; customer: { name: string; phone: string | null }; services: { service: { name: string } }[] };
const LIVE = ['PENDIENTE', 'CONFIRMADA', 'EN_SERVICIO', 'COMPLETADA'];
function eventOf(a: Appt, businessName: string) {
  const svc = a.services.map(s => s.service.name).join(', ');
  return {
    summary: `${a.customer.name} · ${svc}`,
    description: [`Cita ${a.code} en ${businessName}`, a.customer.phone && `Cel: ${a.customer.phone}`, a.status === 'PENDIENTE' && 'Sin confirmar', a.notes].filter(Boolean).join('\n'),
    start: { dateTime: a.start.toISOString(), timeZone: 'America/Bogota' }, end: { dateTime: a.end.toISOString(), timeZone: 'America/Bogota' },
    source: { title: businessName, url: `${appUrl()}/admin/agenda?fecha=${ymd(a.start)}` }
  };
}
const hashOf = (a: Appt) => createHash('sha1').update([a.start.toISOString(), a.end.toISOString(), a.status, a.customer.name, a.customer.phone, a.notes, a.services.map(s => s.service.name).join(',')].join('|')).digest('base64url').slice(0, 16);

/** Copia los cambios de la agenda de un profesional a su Google Calendar (máx. 25 cambios por pasada). */
export async function syncStaff(staffId: string) {
  const st = await db.staff.findUnique({ where: { id: staffId }, select: { gcalToken: true, business: { select: { name: true } } } });
  if (!st?.gcalToken) return 0;
  const t = await token({ refresh_token: unseal(st.gcalToken), grant_type: 'refresh_token' });
  if (!t.access_token) {
    await db.staff.update({ where: { id: staffId }, data: { gcalError: t.error === 'invalid_grant' ? 'Google retiró el permiso. Vuelve a conectar.' : (t.error_description || t.error || 'Error de Google') } });
    if (t.error === 'invalid_grant') await db.staff.update({ where: { id: staffId }, data: { gcalToken: null } });
    return 0;
  }
  const now = Date.now();
  const list: Appt[] = await db.appointment.findMany({
    where: { staffId, start: { gte: new Date(now - 86400e3), lte: new Date(now + 60 * 86400e3) }, OR: [{ status: { in: LIVE } }, { gcalEventId: { not: null } }] },
    select: { id: true, start: true, end: true, status: true, code: true, notes: true, gcalEventId: true, gcalHash: true, customer: { select: { name: true, phone: true } }, services: { select: { service: { select: { name: true } } } } },
    orderBy: { start: 'asc' }
  });
  const api = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
  const auth = { Authorization: `Bearer ${t.access_token}`, 'Content-Type': 'application/json' };
  let ops = 0; let error: string | null = null;
  for (const a of list) {
    if (ops >= 25) break;
    const live = LIVE.includes(a.status);
    try {
      if (!live && a.gcalEventId) {
        const r = await fetch(`${api}/${a.gcalEventId}`, { method: 'DELETE', headers: auth });
        if (!r.ok && r.status !== 404 && r.status !== 410) throw new Error(`Google ${r.status}`);
        await db.appointment.update({ where: { id: a.id }, data: { gcalEventId: null, gcalHash: null } }); ops++;
      } else if (live) {
        const h = hashOf(a);
        if (h === a.gcalHash && a.gcalEventId) continue;
        const body = JSON.stringify(eventOf(a, st.business.name));
        let r = a.gcalEventId ? await fetch(`${api}/${a.gcalEventId}`, { method: 'PUT', headers: auth, body }) : null;
        if (!r || r.status === 404 || r.status === 410) r = await fetch(api, { method: 'POST', headers: auth, body });
        if (!r.ok) throw new Error(`Google ${r.status}: ${(await r.text()).slice(0, 160)}`);
        const ev = await r.json() as { id: string };
        await db.appointment.update({ where: { id: a.id }, data: { gcalEventId: ev.id, gcalHash: h } }); ops++;
      }
    } catch (e) { error = (e as Error).message; break; }
  }
  await db.staff.update({ where: { id: staffId }, data: { gcalSyncedAt: new Date(), gcalError: error } });
  return ops;
}

/** Lo llama el cron: sincroniza a todos los profesionales conectados. */
export async function syncAllGcal() {
  if (!gcalConfigured()) return 0;
  let n = 0;
  for (const s of await db.staff.findMany({ where: { gcalToken: { not: null }, active: true }, select: { id: true } })) {
    try { n += await syncStaff(s.id); } catch (e) { console.error('[gcal]', s.id, e); }
  }
  return n;
}

// ───── iCal ─────
const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, m => `\\${m}`);
export async function staffIcs(staffId: string) {
  const st = await db.staff.findUnique({ where: { id: staffId }, select: { name: true, business: { select: { name: true } } } });
  if (!st) return null;
  const now = Date.now();
  const list = await db.appointment.findMany({
    where: { staffId, status: { in: LIVE }, start: { gte: new Date(now - 30 * 86400e3), lte: new Date(now + 90 * 86400e3) } },
    select: { id: true, start: true, end: true, status: true, code: true, notes: true, customer: { select: { name: true, phone: true } }, services: { select: { service: { select: { name: true } } } } }, orderBy: { start: 'asc' }, take: 1500
  });
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Registro Citas//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${esc(`${st.business.name} · ${st.name}`)}`, 'X-WR-TIMEZONE:America/Bogota', 'REFRESH-INTERVAL;VALUE=DURATION:PT1H'];
  for (const a of list) {
    lines.push('BEGIN:VEVENT', `UID:${a.id}@registro-citas`, `DTSTAMP:${icsDate(new Date())}`, `DTSTART:${icsDate(a.start)}`, `DTEND:${icsDate(a.end)}`,
      `SUMMARY:${esc(`${a.customer.name} · ${a.services.map(s => s.service.name).join(', ')}`)}`,
      `DESCRIPTION:${esc([`Cita ${a.code}`, a.customer.phone && `Cel: ${a.customer.phone}`, a.status === 'PENDIENTE' && 'Sin confirmar', a.notes].filter(Boolean).join('\n'))}`,
      `STATUS:${a.status === 'PENDIENTE' ? 'TENTATIVE' : 'CONFIRMED'}`, 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
