import { STATUS_LABEL } from '@/lib/format';
const STYLES: Record<string, string> = {
  CONFIRMADA: 'bg-[#ECFDF5] text-[#065F46] dark:bg-[#064e3b] dark:text-[#a7f3d0]',
  PENDIENTE: 'bg-[#FFFBEB] text-[#92400E] dark:bg-[#78350f] dark:text-[#fde68a]',
  EN_SERVICIO: 'bg-[#EFF6FF] text-[#1E40AF] dark:bg-[#1e3a8a] dark:text-[#bfdbfe]',
  COMPLETADA: 'bg-surface-container text-primary-container dark:text-primary',
  NO_ASISTIO: 'bg-[#FFF1F2] text-[#9F1239] dark:bg-[#881337] dark:text-[#fecdd3]',
  CANCELADA: 'bg-surface-container-low text-outline line-through'
};
const DOT: Record<string, string> = { CONFIRMADA: 'bg-[#059669]', PENDIENTE: 'bg-[#d97706] animate-pulse', EN_SERVICIO: 'bg-[#2563eb]', COMPLETADA: 'bg-primary-container dark:bg-primary', NO_ASISTIO: 'bg-[#9F1239]', CANCELADA: 'bg-outline' };
export const AGENDA_COLORS: Record<string, string> = {
  CONFIRMADA: 'bg-[#ECFDF5] border-l-[#059669] text-[#065F46] dark:bg-[#064e3b] dark:text-[#d1fae5]',
  PENDIENTE: 'bg-[#FFFBEB] border-l-[#d97706] text-[#92400E] dark:bg-[#78350f] dark:text-[#fef3c7]',
  EN_SERVICIO: 'bg-[#EFF6FF] border-l-[#2563eb] text-[#1E40AF] dark:bg-[#1e3a8a] dark:text-[#dbeafe]',
  COMPLETADA: 'bg-surface-container border-l-primary-container text-on-surface',
  NO_ASISTIO: 'bg-[#FFF1F2] border-l-[#9F1239] text-[#9F1239] dark:bg-[#881337] dark:text-[#ffe4e6]',
  CANCELADA: 'bg-surface-container-low border-l-outline text-outline'
};
export function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-label-sm text-label-sm ${STYLES[status] || ''}`}><span className={`w-1.5 h-1.5 rounded-full ${DOT[status] || ''}`} />{STATUS_LABEL[status] || status}</span>;
}
export function DocStatus({ status }: { status: string }) {
  const s: Record<string, string> = { ACEPTADO: 'bg-[#ECFDF5] text-[#065F46]', ENVIADO: 'bg-[#EFF6FF] text-[#1E40AF]', GENERADO: 'bg-[#FFFBEB] text-[#92400E]', RECHAZADO: 'bg-[#FFF1F2] text-[#9F1239]', CONTINGENCIA: 'bg-[#FFF1F2] text-[#9F1239]' };
  const l: Record<string, string> = { GENERADO: 'Generado (sin transmitir)', ENVIADO: 'Enviado', ACEPTADO: 'Aceptado DIAN', RECHAZADO: 'Rechazado', CONTINGENCIA: 'Contingencia' };
  return <span className={`inline-flex px-2 py-0.5 rounded-full font-label-sm text-label-sm ${s[status] || 'bg-surface-container'}`}>{l[status] || status}</span>;
}
