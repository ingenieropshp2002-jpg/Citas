'use server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/auth';
import { IA_MODELS, resetIaMemo, type IaConfig } from '@/lib/ia';

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();

/** Guarda la llave de Anthropic y el modelo. La llave vacía conserva la anterior. */
export async function saveIaAction(_: unknown, fd: FormData) {
  await requireSuperAdmin();
  const row = await db.platformSetting.findUnique({ where: { key: 'ia' } });
  const prev: Partial<IaConfig> = row ? JSON.parse(row.value) : {};
  const key = fd.get('clearKey') ? '' : str(fd, 'apiKey') || prev.apiKey || '';
  if (key && !/^sk-ant-[A-Za-z0-9_-]{20,}$/.test(key)) return { error: 'La llave de Anthropic empieza por sk-ant- (cópiala completa de console.anthropic.com).' };
  const model = IA_MODELS.some(m => m.id === str(fd, 'model')) ? str(fd, 'model') : IA_MODELS[0].id;
  if (key && key !== prev.apiKey) {
    // Se comprueba que la llave sirva antes de guardarla
    const r = await fetch('https://api.anthropic.com/v1/models?limit=1', { headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' } }).catch(() => null);
    if (!r || r.status === 401 || r.status === 403) return { error: 'Anthropic rechazó la llave. Revisa que esté activa y que la copiaste completa.' };
  }
  const v: IaConfig = { apiKey: key, model, enabled: !!fd.get('enabled') };
  await db.platformSetting.upsert({ where: { key: 'ia' }, create: { key: 'ia', value: JSON.stringify(v) }, update: { value: JSON.stringify(v) } });
  resetIaMemo();
  revalidatePath('/superadmin/ia');
  return { ok: true };
}
