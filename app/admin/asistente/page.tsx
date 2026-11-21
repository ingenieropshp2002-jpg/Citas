import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
import { PageHeader, Stat } from '@/components/panel/PageHeader';
import { ActionForm } from '@/components/ui/ActionForm';
import { Submit } from '@/components/ui/Submit';
import { Icon } from '@/components/ui/Icon';
import { iaReady } from '@/lib/ia';
import { waReady } from '@/lib/notify';
import { parseJson } from '@/lib/format';
import { saveAssistant } from '../_actions/asistente';
import { Simulator } from './Simulator';
import { HumanToggle } from './HumanToggle';

export const metadata = { title: 'Asistente con IA' };
const fmt = (d: Date) => new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' }).format(d);

export default async function Asistente({ searchParams }: { searchParams: Promise<{ chat?: string }> }) {
  const { business: b, perms } = await requireBusiness('clientes');
  const sp = await searchParams;
  const canEdit = perms === 'ALL' || perms.includes('configuracion');
  const since = new Date(Date.now() - 30 * 86400e3);
  const [ready, wa, chats, agg] = await Promise.all([
    iaReady(), waReady(),
    db.waChat.findMany({ where: { businessId: b.id, updatedAt: { gte: since } }, orderBy: { updatedAt: 'desc' }, take: 30 }),
    db.waChat.aggregate({ where: { businessId: b.id, updatedAt: { gte: since } }, _sum: { turns: true, bookings: true }, _count: true })
  ]);
  const now = new Date();
  return (
    <>
      <PageHeader eyebrow="Marketing" title="Asistente con IA" subtitle="Responde el WhatsApp del negocio a cualquier hora: contesta preguntas, busca cupos y agenda, mueve o cancela citas. Si el cliente pide una persona, te avisa." />
      {!ready && <div className="card p-4 mb-4 flex items-start gap-3 border border-gold/50"><Icon name="schedule" className="text-[24px] text-secondary" /><p className="font-body-sm text-on-surface-variant">El asistente se está activando en la plataforma. Puedes dejarlo configurado; empezará a responder apenas esté disponible.</p></div>}
      {ready && !wa && <div className="card p-4 mb-4 flex items-start gap-3 border border-gold/50"><Icon name="info" className="text-[24px] text-secondary" /><p className="font-body-sm text-on-surface-variant">Para que conteste en WhatsApp hace falta el WhatsApp oficial conectado. Mientras tanto puedes probarlo aquí abajo.</p></div>}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <Stat label="Conversaciones" value={String(agg._count)} icon="forum" hint="Últimos 30 días" />
        <Stat label="Mensajes respondidos" value={String(agg._sum.turns || 0)} icon="smart_toy" hint="Últimos 30 días" />
        <Stat label="Citas agendadas" value={String(agg._sum.bookings || 0)} icon="event_available" tone="gold" hint="Por el asistente" />
      </div>
      <div className="grid xl:grid-cols-2 gap-4 items-start">
        <div className="space-y-4">
          {canEdit && (
            <ActionForm action={saveAssistant} className="card p-5 space-y-3" success="Asistente guardado.">
              <h2 className="h-section">Configuración</h2>
              <label className="flex items-start gap-3 p-3 rounded-xl bg-surface-container-low"><input type="checkbox" name="aiAssistant" defaultChecked={b.aiAssistant} className="mt-1 accent-primary-container" />
                <span><span className="font-label-lg block">Que el asistente responda mi WhatsApp</span><span className="font-body-sm text-on-surface-variant">Conoce tus servicios, precios, profesionales, horario y la agenda en tiempo real. Las respuestas a recordatorios («1», «Confirmo») siguen funcionando igual.</span></span></label>
              <label className="block"><span className="label">Qué más debe saber (opcional)</span>
                <textarea name="aiNotes" defaultValue={b.aiNotes || ''} rows={5} maxLength={1500} className="input" placeholder="Ej.: Hay parqueadero gratis. Aceptamos Nequi y tarjeta. Para alisados se debe venir con el cabello seco. No atendemos niños menores de 5 años." />
                <span className="block mt-1 font-body-sm text-on-surface-variant">Políticas, parqueadero, medios de pago, recomendaciones antes de un servicio… Solo dirá lo que esté aquí o en tu configuración.</span></label>
              <Submit className="btn-primary w-full">Guardar</Submit>
            </ActionForm>
          )}
          {canEdit && <Simulator ready={ready} />}
        </div>
        <section className="card overflow-hidden">
          <h2 className="h-section p-4 border-b border-parchment">Conversaciones recientes</h2>
          {chats.length === 0 ? <p className="p-4 text-on-surface-variant">Todavía no hay conversaciones.</p> : (
            <ul className="divide-y divide-parchment">
              {chats.map(c => {
                const lines = parseJson<{ role: string; content: string }[]>(c.messages, []);
                const human = !!c.humanUntil && c.humanUntil > now;
                return (
                  <li key={c.id}>
                    <details open={sp.chat === c.phone} className="group">
                      <summary className="p-3 px-4 flex flex-wrap items-center gap-2 cursor-pointer list-none">
                        <Icon name={human ? 'support_agent' : 'smart_toy'} className={`text-[20px] ${human ? 'text-danger' : 'text-secondary'}`} />
                        <span className="font-label-lg">{c.name || 'Cliente'}</span><span className="font-body-sm text-on-surface-variant tnum">{c.phone}</span>
                        {human && <span className="px-2 rounded-full bg-[#FFF1F2] text-danger font-label-sm">Pidió una persona</span>}
                        {c.bookings > 0 && <span className="px-2 rounded-full bg-[#ECFDF5] text-[#065F46] font-label-sm">{c.bookings} {c.bookings === 1 ? 'cita' : 'citas'}</span>}
                        <span className="ml-auto font-body-sm text-on-surface-variant">{fmt(c.updatedAt)}</span>
                      </summary>
                      <div className="px-4 pb-4 space-y-2">
                        <div className="rounded-xl bg-[#ECE5DD] p-3 max-h-[420px] overflow-y-auto space-y-2">
                          {lines.slice(-20).map((l, i) => <div key={i} className={`max-w-[85%] w-fit px-3 py-2 rounded-xl font-body-sm whitespace-pre-wrap break-words ${l.role === 'user' ? 'bg-white' : 'ml-auto bg-[#DCF8C6]'}`}>{l.content}</div>)}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <a href={`https://wa.me/57${c.phone}`} target="_blank" rel="noopener" className="btn-outline btn-sm"><Icon name="chat" className="text-[18px]" />Escribirle</a>
                          <HumanToggle id={c.id} human={human} />
                        </div>
                      </div>
                    </details>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
