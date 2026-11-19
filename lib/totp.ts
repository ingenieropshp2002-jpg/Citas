// Verificación en dos pasos con códigos de 6 dígitos (RFC 6238), compatible con Google Authenticator, Microsoft Authenticator y Authy.
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function base32(buf: Buffer) {
  let bits = 0, val = 0, out = '';
  for (const b of buf) { val = (val << 8) | b; bits += 8; while (bits >= 5) { out += B32[(val >>> (bits - 5)) & 31]; bits -= 5; } }
  if (bits > 0) out += B32[(val << (5 - bits)) & 31];
  return out;
}
function unbase32(s: string) {
  const clean = s.toUpperCase().replace(/[^A-Z2-7]/g, ''); const out: number[] = []; let bits = 0, val = 0;
  for (const c of clean) { val = (val << 5) | B32.indexOf(c); bits += 5; if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; } }
  return Buffer.from(out);
}

export const newSecret = () => base32(randomBytes(20));
export function code(secret: string, step = Math.floor(Date.now() / 30000)) {
  const msg = Buffer.alloc(8); msg.writeBigUInt64BE(BigInt(step));
  const h = createHmac('sha1', unbase32(secret)).update(msg).digest();
  const o = h[h.length - 1] & 15;
  return String(((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000)).padStart(6, '0');
}
/** Acepta el código actual y el de 30 s antes o después (relojes desfasados). */
export function verify(secret: string, input: string) {
  const c = input.replace(/\D/g, ''); if (c.length !== 6) return false;
  const now = Math.floor(Date.now() / 30000);
  return [-1, 0, 1].some(d => { const a = Buffer.from(code(secret, now + d)), b = Buffer.from(c); return timingSafeEqual(a, b); });
}
export const otpauth = (secret: string, account: string, issuer: string) => `otpauth://totp/${encodeURIComponent(`${issuer}:${account}`)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

// Secreto guardado cifrado en la base
const key = () => createHash('sha256').update(`${process.env.AUTH_SECRET || 'dev-secret'}:totp`).digest();
export function sealSecret(s: string) {
  const iv = randomBytes(12); const c = createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([c.update(s, 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), enc].map(b => b.toString('base64url')).join('.');
}
export function openSecret(s: string) {
  const [iv, tag, enc] = s.split('.').map(x => Buffer.from(x, 'base64url'));
  const d = createDecipheriv('aes-256-gcm', key(), iv); d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString('utf8');
}

// Códigos de respaldo (uso único) por si pierde el celular
const hashCode = (c: string) => createHash('sha256').update(c.toUpperCase().replace(/[^A-Z0-9]/g, '')).digest('base64url');
export function newRecoveryCodes() {
  const codes = Array.from({ length: 8 }, () => { const r = base32(randomBytes(5)); return `${r.slice(0, 4)}-${r.slice(4, 8)}`; });
  return { codes, stored: JSON.stringify(codes.map(hashCode)) };
}
/** Si el código de respaldo es válido, devuelve la lista sin él (para guardarla); si no, null. */
export function consumeRecovery(stored: string | null, input: string) {
  let list: string[] = []; try { list = JSON.parse(stored || '[]'); } catch { /* vacío */ }
  const h = hashCode(input); const i = list.indexOf(h);
  if (i < 0) return null;
  list.splice(i, 1); return JSON.stringify(list);
}
