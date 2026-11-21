// Utilidades de formato para Colombia (COP, zona horaria America/Bogota = UTC-5 sin horario de verano)
export const TZ_OFFSET_MIN = -5 * 60;

export function cop(value: number, withCode = false) {
  const n = Math.round(value);
  const s = '$' + (n < 0 ? '-' : '') + Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return withCode ? `${s} COP` : s;
}

/** Componentes de fecha en hora de Bogotá */
export function bogota(d: Date) {
  const t = new Date(d.getTime() + TZ_OFFSET_MIN * 60000);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), h: t.getUTCHours(), min: t.getUTCMinutes(), dow: t.getUTCDay() };
}
const pad = (n: number) => String(n).padStart(2, '0');
/** "YYYY-MM-DD" en Bogotá */
export function ymd(d: Date) { const b = bogota(d); return `${b.y}-${pad(b.m)}-${pad(b.d)}`; }
export function hm(d: Date) { const b = bogota(d); return `${pad(b.h)}:${pad(b.min)}`; }
/** Construye un Date (UTC) a partir de fecha y hora locales de Bogotá */
export function fromBogota(dateStr: string, time = '00:00') {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  return new Date(Date.UTC(y, m - 1, d, h, mi) - TZ_OFFSET_MIN * 60000);
}
export function addDays(dateStr: string, n: number) {
  const d = fromBogota(dateStr, '12:00'); d.setUTCDate(d.getUTCDate() + n); return ymd(d);
}
export const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const DIAS_CORTOS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function time12(t: string) {
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM'; const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${ap}`;
}
export function fechaLarga(d: Date) {
  const b = bogota(d); return `${DIAS[b.dow]} ${b.d} de ${MESES[b.m - 1]} de ${b.y}`;
}
export function fechaCorta(d: Date) {
  const b = bogota(d); return `${DIAS_CORTOS[b.dow].charAt(0) + DIAS_CORTOS[b.dow].slice(1).toLowerCase()} ${b.d} ${MESES[b.m - 1].slice(0, 3)}`;
}
export function minutesOf(t: string) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }
export function timeOf(min: number) { return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`; }
export function parseJson<T>(s: string | null | undefined, fallback: T): T { try { return s ? JSON.parse(s) : fallback; } catch { return fallback; } }

export const STATUS_LABEL: Record<string, string> = {
  PENDIENTE: 'Pendiente', CONFIRMADA: 'Confirmada', EN_SERVICIO: 'En servicio', COMPLETADA: 'Completada', NO_ASISTIO: 'No asistió', CANCELADA: 'Cancelada'
};
export const CATEGORY_LABEL: Record<string, string> = { PELUQUERIA: 'Peluquería', BARBERIA: 'Barbería', SPA: 'Spa', UNAS: 'Uñas' };
export const METHOD_LABEL: Record<string, string> = { EFECTIVO: 'Efectivo', TARJETA: 'Tarjeta', NEQUI: 'Nequi', PSE: 'PSE', DAVIPLATA: 'Daviplata', TRANSFERENCIA: 'Transferencia', EN_LOCAL: 'Pago en el local', PAQUETE: 'Paquete / membresía', REGALO: 'Tarjeta de regalo', AUTOMATICO: 'Cobro automático' };
