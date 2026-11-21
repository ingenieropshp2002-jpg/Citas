'use server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';

/** Activa o desactiva el asistente y guarda los datos extra que puede contar. */
export async function saveAssistant(_: unknown, fd: FormData) {
  const { business } = await requireBusiness('configuracion');
  await db.business.update({ where: { id: business.id }, data: { aiAssistant: !!fd.get('aiAssistant'), aiNotes: String(fd.get('aiNotes') || '').trim().slice(0, 1500) || null } });
  revalidatePath('/admin/asistente');
  return { ok: true };
}

/** Una persona toma la conversación (el asistente deja de responder 12 h) o se la devuelve al asistente. */
export async function setHuman(id: string, on: boolean) {
  const { business } = await requireBusiness('clientes');
  await db.waChat.updateMany({ where: { id, businessId: business.id }, data: { humanUntil: on ? new Date(Date.now() + 12 * 3600e3) : null } });
  revalidatePath('/admin/asistente');
}

type Line = { role: 'user' | 'assistant'; content: string };
/** Simulador del panel: conversa con el asistente sin WhatsApp y sin crear citas reales. */
export async function simulate(history: Line[], text: string) {
  const { business } = await requireBusiness('configuracion');
  if (!text.trim()) return { error: 'Escribe un mensaje.' };
  const { chat } = await import('@/lib/asistente');
  const clean = (Array.isArray(history) ? history : []).filter(l => (l.role === 'user' || l.role === 'assistant') && typeof l.content === 'string').slice(-16).map(l => ({ role: l.role, content: l.content.slice(0, 2000) }));
  const r = await chat(business.id, '3000000000', text.trim(), { sim: true, history: clean });
  if (!r.reply) return { error: r.error?.includes('configurada') ? 'El asistente todavía no está disponible en la plataforma. Te avisamos cuando lo esté.' : 'El asistente no pudo responder. Intenta de nuevo.' };
  return { reply: r.reply, history: r.history };
}
