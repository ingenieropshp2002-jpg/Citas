// Configuración del asistente con IA (Claude, de Anthropic). La llave se pega en /superadmin/ia.
import { db } from './db';

export const IA_MODELS = [
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5 (el más inteligente)', inUsd: 4, outUsd: 20 },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5 (equilibrado)', inUsd: 2, outUsd: 10 },
  { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5 (el más económico)', inUsd: 0.1, outUsd: 0.5 }
] as const;
export type IaConfig = { apiKey: string; model: string; enabled: boolean };

let memo: { at: number; v: IaConfig } | null = null;
export async function getIa(): Promise<IaConfig> {
  if (memo && Date.now() - memo.at < 60_000) return memo.v;
  let saved: Partial<IaConfig> = {};
  try { const r = await db.platformSetting.findUnique({ where: { key: 'ia' } }); if (r) saved = JSON.parse(r.value); } catch { /* sin valor */ }
  const model = IA_MODELS.some(m => m.id === saved.model) ? saved.model! : IA_MODELS[0].id;
  const v: IaConfig = { apiKey: saved.apiKey || process.env.ANTHROPIC_API_KEY || '', model, enabled: saved.enabled ?? true };
  memo = { at: Date.now(), v };
  return v;
}
export function resetIaMemo() { memo = null; }
export async function iaReady() { const c = await getIa(); return !!(c.apiKey && c.enabled); }

/** Costo aproximado en dólares de unos tokens con un modelo. */
export function usd(model: string, inTokens: number, outTokens: number) {
  const m = IA_MODELS.find(x => x.id === model) || IA_MODELS[0];
  return (inTokens * m.inUsd + outTokens * m.outUsd) / 1e6;
}
