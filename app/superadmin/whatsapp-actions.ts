'use server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/auth';
import { getWa, resetWaMemo, sendWhatsapp, WA_TEMPLATES, type WaConfig, type WaKind } from '@/lib/notify';

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();

/** Guarda las credenciales de WhatsApp. Los campos secretos vacíos conservan el valor anterior. */
export async function saveWhatsappAction(_: unknown, fd: FormData) {
  await requireSuperAdmin();
  const row = await db.platformSetting.findUnique({ where: { key: 'whatsapp' } });
  const prev: Partial<WaConfig> = row ? JSON.parse(row.value) : {};
  const templates: Partial<Record<WaKind, string>> = {};
  for (const t of WA_TEMPLATES) { const v = str(fd, `tpl_${t.kind}`); if (v) { if (!/^[a-z0-9_]{1,512}$/.test(v)) return { error: `El nombre de plantilla "${v}" solo puede tener minúsculas, números y guion bajo.` }; templates[t.kind] = v; } }
  const phoneId = str(fd, 'phoneId').replace(/\D/g, '');
  const v: Partial<WaConfig> = {
    token: fd.get('clearToken') ? '' : str(fd, 'token') || prev.token || '',
    phoneId, verifyToken: str(fd, 'verifyToken'), appSecret: str(fd, 'appSecret') || prev.appSecret || '',
    lang: str(fd, 'lang') || 'es', templates
  };
  await db.platformSetting.upsert({ where: { key: 'whatsapp' }, create: { key: 'whatsapp', value: JSON.stringify(v) }, update: { value: JSON.stringify(v) } });
  resetWaMemo();
  revalidatePath('/superadmin/whatsapp');
  return { ok: true };
}

/** Envía un mensaje de prueba con la plantilla de recordatorio (o texto si no hay plantilla). */
export async function testWhatsappAction(_: unknown, fd: FormData) {
  await requireSuperAdmin();
  const to = str(fd, 'to').replace(/\D/g, '');
  if (to.length < 10) return { error: 'Escribe un número de celular válido.' };
  const r = await sendWhatsapp(to, 'Mensaje de prueba de Registro Citas ✅', { template: { kind: 'RECORDATORIO', params: ['Prueba', 'Registro Citas', 'hoy a las 3:00 p. m.', 'el equipo', `${(process.env.APP_URL || '').replace(/\/$/, '')}/`] } });
  revalidatePath('/superadmin/whatsapp');
  if (r.simulated) return { ok: true, message: 'Modo de prueba: el mensaje quedó en el registro, pero no salió porque faltan el token o el ID del número.' };
  return r.ok ? { ok: true, message: 'Mensaje enviado. Revisa el WhatsApp de ese número.' } : { error: `Meta rechazó el envío: ${String((r as { error?: string }).error || '').slice(0, 300)}` };
}

export async function waStatus() { await requireSuperAdmin(); const w = await getWa(); return { ready: !!(w.token && w.phoneId) }; }
