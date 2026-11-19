import { db } from '@/lib/db';
import { getWa, WA_TEMPLATES } from '@/lib/notify';
import { PageHeader } from '@/components/panel/PageHeader';
import { ActionForm } from '@/components/ui/ActionForm';
import { Submit } from '@/components/ui/Submit';
import { Icon } from '@/components/ui/Icon';
import { saveWhatsappAction, testWhatsappAction } from '@/app/superadmin/whatsapp-actions';

export const metadata = { title: 'WhatsApp' };
const fmt = (d: Date) => new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' }).format(d);
export default async function WhatsappAjustes() {
  const w = await getWa();
  const ready = !!(w.token && w.phoneId);
  const [logs, counts] = await Promise.all([
    db.waLog.findMany({ orderBy: { createdAt: 'desc' }, take: 30 }),
    db.waLog.groupBy({ by: ['status'], where: { createdAt: { gte: new Date(Date.now() - 7 * 864e5) } }, _count: true })
  ]);
  const n = (s: string) => counts.find(c => c.status === s)?._count || 0;
  const webhook = `${(process.env.APP_URL || 'https://reserva-citas.ingenieropshp2002.workers.dev').replace(/\/$/, '')}/api/whatsapp/webhook`;
  const F = ({ name, label, value, hint, ...rest }: { name: string; label: string; value?: string; hint?: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value'>) => (
    <label className="block"><span className="label">{label}</span><input name={name} defaultValue={value ?? ''} className="input" autoComplete="off" {...rest} />{hint && <span className="block mt-1 font-body-sm text-on-surface-variant">{hint}</span>}</label>
  );
  return (
    <>
      <PageHeader eyebrow="Plataforma" title="WhatsApp oficial" subtitle="Cloud API de Meta: confirmaciones, recordatorios y avisos automáticos, sin que nadie toque un botón." />
      <div className={`card p-4 mb-4 flex items-start gap-3 border ${ready ? 'border-[#059669]/40' : 'border-gold/50'}`}>
        <Icon name={ready ? 'check_circle' : 'science'} className={`text-[26px] ${ready ? 'text-[#059669]' : 'text-secondary'}`} />
        <div className="flex-1"><p className="font-title-md">{ready ? 'Conectado: los mensajes salen automáticamente' : 'Modo de prueba'}</p>
          <p className="font-body-sm text-on-surface-variant">{ready ? 'Recordatorios, confirmaciones y avisos se envían solos desde el número configurado.' : 'Todo funciona igual, pero los mensajes no salen: quedan en el registro de abajo. Mientras tanto los negocios usan los botones de WhatsApp manual.'} Últimos 7 días: {n('ENVIADO')} enviados · {n('ERROR')} con error · {n('PRUEBA')} de prueba.</p></div>
      </div>
      <div className="grid xl:grid-cols-2 gap-4 items-start">
        <ActionForm action={saveWhatsappAction} className="card p-5 space-y-3" success="Datos de WhatsApp guardados.">
          <h2 className="h-section">Credenciales de Meta</h2>
          <F name="phoneId" label="ID del número de teléfono (Phone number ID)" value={w.phoneId} inputMode="numeric" placeholder="123456789012345" />
          <F name="token" label="Token de acceso permanente (usuario del sistema)" type="password" placeholder={w.token ? '•••••••• guardado (déjalo vacío para no cambiarlo)' : 'EAAG…'} />
          {w.token && <label className="flex items-center gap-2 font-body-sm"><input type="checkbox" name="clearToken" className="accent-primary-container" />Borrar el token guardado (vuelve al modo de prueba)</label>}
          <F name="appSecret" label="Clave secreta de la app (App secret)" type="password" placeholder={w.appSecret ? '•••••••• guardada' : 'Opcional, recomendado'} hint="Sirve para comprobar que los mensajes que llegan al webhook vienen de Meta." />
          <F name="verifyToken" label="Token de verificación del webhook" value={w.verifyToken} placeholder="una-frase-secreta-que-tu-inventes" />
          <div className="p-3 rounded-xl bg-surface-container-low font-body-sm"><p className="label !mb-1">URL del webhook (pégala en Meta → WhatsApp → Configuración)</p><code className="break-all select-all">{webhook}</code><p className="mt-1 text-on-surface-variant">Suscribe el campo <b>messages</b>. Así, cuando el cliente responde "1", "Confirmo" o "Cancelo", la cita se actualiza sola.</p></div>
          <h2 className="h-section pt-2">Plantillas aprobadas</h2>
          <p className="font-body-sm text-on-surface-variant">Escribe el nombre exacto de cada plantilla aprobada en Meta. Las que dejes vacías se envían como texto normal, que solo llega si el cliente escribió en las últimas 24 horas.</p>
          <F name="lang" label="Idioma de las plantillas" value={w.lang} placeholder="es" hint="Usa el mismo código de idioma con que las creaste en Meta, por ejemplo es o es_CO." />
          {WA_TEMPLATES.map(t => (
            <div key={t.kind} className="p-3 rounded-xl bg-surface-container-low space-y-1.5">
              <F name={`tpl_${t.kind}`} label={t.label} value={w.templates[t.kind] || ''} placeholder={t.name} />
              <p className="font-body-sm text-on-surface-variant">Texto sugerido para crearla: <span className="text-on-surface">{t.body}</span></p>
            </div>
          ))}
          <Submit className="btn-primary w-full">Guardar</Submit>
        </ActionForm>
        <div className="space-y-4">
          <ActionForm action={testWhatsappAction} className="card p-5 space-y-3">
            <h2 className="h-section">Enviar mensaje de prueba</h2>
            <F name="to" label="Celular de destino" inputMode="numeric" placeholder="300 123 4567" required />
            <Submit className="btn-outline w-full">Enviar prueba</Submit>
          </ActionForm>
          <section className="card overflow-hidden">
            <h2 className="h-section p-4 border-b border-parchment">Últimos mensajes</h2>
            {logs.length === 0 ? <p className="p-4 text-on-surface-variant">Todavía no hay mensajes.</p> : (
              <ul className="divide-y divide-parchment max-h-[640px] overflow-y-auto">
                {logs.map(l => (
                  <li key={l.id} className="p-3 px-4 font-body-sm">
                    <div className="flex items-center gap-2"><span className={`px-2 rounded-full font-label-sm ${l.status === 'ENVIADO' ? 'bg-[#ECFDF5] text-[#065F46]' : l.status === 'ERROR' ? 'bg-[#FFF1F2] text-danger' : 'bg-secondary-fixed/40 text-on-secondary-fixed'}`}>{l.status === 'PRUEBA' ? 'Prueba' : l.status === 'ENVIADO' ? 'Enviado' : 'Error'}</span><span className="font-label-md">{l.kind}</span><span className="text-on-surface-variant">+{l.to.slice(0, -4).replace(/\d/g, '•')}{l.to.slice(-4)}</span><span className="ml-auto text-on-surface-variant">{fmt(l.createdAt)}</span></div>
                    <p className="mt-1 text-on-surface-variant line-clamp-2">{l.text}</p>
                    {l.error && <p className="mt-1 text-danger line-clamp-2">{l.error}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
