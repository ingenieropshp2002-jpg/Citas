// Adaptador del proveedor tecnológico autorizado por la DIAN.
// La DIAN exige que la transmisión se haga con un software habilitado (propio o de un proveedor tecnológico).
// Este adaptador deja la integración lista: configure URL y token en Panel > Facturación DIAN.
import type { DianConfig } from '@prisma/client';

export type SendResult = { status: 'ENVIADO' | 'ACEPTADO' | 'RECHAZADO' | 'GENERADO' | 'CONTINGENCIA'; trackId?: string; message: string };

export async function sendToProvider(cfg: DianConfig, doc: { docType: string; fullNumber: string; cufe: string; xml: string; buyerEmail?: string | null }): Promise<SendResult> {
  if (cfg.provider === 'SIMULADO' || !cfg.apiUrl) {
    return { status: 'GENERADO', message: 'Modo simulado: el documento se generó pero NO se transmitió a la DIAN. Configure su proveedor tecnológico para enviarlo.' };
  }
  try {
    // Contrato genérico JSON. La mayoría de proveedores (Facture, Siigo, Alegra, Carvajal, The Factory HKA, etc.)
    // ofrecen APIs REST similares; ajuste el mapeo en este archivo según la documentación de su proveedor.
    const res = await fetch(cfg.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiToken || ''}` },
      body: JSON.stringify({
        environment: cfg.environment, testSetId: cfg.testSetId, documentType: doc.docType,
        number: doc.fullNumber, cufe: doc.cufe, xmlBase64: Buffer.from(doc.xml, 'utf8').toString('base64'), notifyEmail: doc.buyerEmail
      }),
      signal: AbortSignal.timeout(20000)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { status: 'RECHAZADO', message: data.message || `Error HTTP ${res.status}` };
    const st = String(data.status || 'ENVIADO').toUpperCase();
    return { status: (['ACEPTADO', 'RECHAZADO', 'ENVIADO'].includes(st) ? st : 'ENVIADO') as SendResult['status'], trackId: data.trackId || data.id, message: data.message || 'Recibido por el proveedor' };
  } catch (e) {
    // Sin conexión: el documento queda en contingencia y se reintenta desde el panel
    return { status: 'CONTINGENCIA', message: 'No fue posible contactar al proveedor: ' + (e as Error).message };
  }
}
