// Códigos de cita: 6 caracteres (sin 0/O, 1/I/L para que no se confundan), únicos en toda la plataforma.
// Las citas viejas tienen el formato RC-XXXXXX y siguen funcionando con o sin el prefijo.
import { db } from './db';

const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function random6() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, b => CHARS[b % CHARS.length]).join('');
}
/** Formas en que puede estar guardado un código que escribió el cliente (nuevo o viejo). */
export function codeVariants(raw: string): string[] {
  let c = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (c.length === 8 && c.startsWith('RC')) c = c.slice(2);
  if (c.length !== 6) return [];
  return [c, `RC-${c}`];
}
/** Código nuevo que no existe en ninguna cita (tampoco como código viejo RC-). */
export async function uniqueCode() {
  for (let i = 0; i < 20; i++) {
    const c = random6();
    if (!(await db.appointment.findFirst({ where: { code: { in: [c, `RC-${c}`] } }, select: { id: true } }))) return c;
  }
  throw new Error('No se pudo generar un código de cita único');
}
