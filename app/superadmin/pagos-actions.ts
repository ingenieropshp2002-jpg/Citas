'use server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/auth';
import { resetPayMemo, type PayConfig } from '@/lib/payments';

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();

/** Guarda la pasarela y sus llaves. Los campos secretos vacíos conservan el valor anterior. */
export async function savePagosAction(_: unknown, fd: FormData) {
  await requireSuperAdmin();
  const row = await db.platformSetting.findUnique({ where: { key: 'pagos' } });
  const prev: Partial<PayConfig> = row ? JSON.parse(row.value) : {};
  const provider = ['WOMPI', 'MERCADOPAGO', 'SIMULADO'].includes(str(fd, 'provider')) ? str(fd, 'provider') : 'SIMULADO';
  const keep = (k: string, old?: string) => (fd.get(`clear_${k}`) ? '' : str(fd, k) || old || '');
  const wompi = {
    publicKey: str(fd, 'wPublic'), env: str(fd, 'wEnv') === 'production' ? 'production' : 'sandbox',
    privateKey: keep('wPrivate', prev.wompi?.privateKey), integritySecret: keep('wIntegrity', prev.wompi?.integritySecret), eventsSecret: keep('wEvents', prev.wompi?.eventsSecret)
  };
  if (wompi.publicKey && !/^pub_(test|prod)_/.test(wompi.publicKey)) return { error: 'La llave pública de Wompi empieza por pub_test_ o pub_prod_.' };
  if (wompi.privateKey && !/^prv_(test|prod)_/.test(wompi.privateKey)) return { error: 'La llave privada de Wompi empieza por prv_test_ o prv_prod_.' };
  if (wompi.publicKey && wompi.privateKey && wompi.publicKey.includes('_prod_') !== wompi.privateKey.includes('_prod_')) return { error: 'Las dos llaves de Wompi deben ser del mismo ambiente (las dos de prueba o las dos de producción).' };
  if (wompi.publicKey.includes('_prod_')) wompi.env = 'production'; else if (wompi.publicKey.includes('_test_')) wompi.env = 'sandbox';
  const mp = { publicKey: str(fd, 'mpPublic'), accessToken: keep('mpToken', prev.mp?.accessToken) };
  if (provider === 'WOMPI' && !(wompi.publicKey && wompi.privateKey && wompi.integritySecret && wompi.eventsSecret)) return { error: 'Para usar Wompi faltan llaves: pública, privada, integridad y eventos.' };
  if (provider === 'MERCADOPAGO' && !mp.accessToken) return { error: 'Para usar Mercado Pago falta el Access Token.' };
  const v = { provider, wompi, mp };
  await db.platformSetting.upsert({ where: { key: 'pagos' }, create: { key: 'pagos', value: JSON.stringify(v) }, update: { value: JSON.stringify(v) } });
  resetPayMemo();
  revalidatePath('/superadmin/pagos');
  return { ok: true };
}
