import { db } from '@/lib/db';
import { getIa, IA_MODELS, usd } from '@/lib/ia';
import { PageHeader, Stat } from '@/components/panel/PageHeader';
import { ActionForm } from '@/components/ui/ActionForm';
import { Submit } from '@/components/ui/Submit';
import { Icon } from '@/components/ui/Icon';
import { saveIaAction } from '@/app/superadmin/ia-actions';

export const metadata = { title: 'Asistente con IA' };
export default async function IaAjustes() {
  const c = await getIa();
  const since = new Date(Date.now() - 30 * 86400e3);
  const [agg, on, top] = await Promise.all([
    db.waChat.aggregate({ where: { updatedAt: { gte: since } }, _sum: { turns: true, bookings: true, inTokens: true, outTokens: true }, _count: true }),
    db.business.count({ where: { aiAssistant: true } }),
    db.waChat.groupBy({ by: ['businessId'], where: { updatedAt: { gte: since } }, _sum: { turns: true, bookings: true, inTokens: true, outTokens: true }, orderBy: { _sum: { turns: 'desc' } }, take: 10 })
  ]);
  const names = await db.business.findMany({ where: { id: { in: top.map(t => t.businessId) } }, select: { id: true, name: true } });
  const cost = usd(c.model, agg._sum.inTokens || 0, agg._sum.outTokens || 0);
  const ready = !!(c.apiKey && c.enabled);
  const money = (n: number) => `US$ ${n.toFixed(2)}`;
  return (
    <>
      <PageHeader eyebrow="Plataforma" title="Asistente con IA" subtitle="Claude (Anthropic) responde el WhatsApp de los negocios que lo activan y agenda citas. La llave y el costo son de la plataforma." />
      <div className={`card p-4 mb-4 flex items-start gap-3 border ${ready ? 'border-[#059669]/40' : 'border-gold/50'}`}>
        <Icon name={ready ? 'check_circle' : 'key'} className={`text-[26px] ${ready ? 'text-[#059669]' : 'text-secondary'}`} />
        <div><p className="font-title-md">{ready ? 'Activo' : c.apiKey ? 'Apagado' : 'Falta la llave de Anthropic'}</p>
          <p className="font-body-sm text-on-surface-variant">{ready ? `${on} negocios lo tienen encendido.` : 'Crea una llave en console.anthropic.com → API keys, cárgale saldo y pégala aquí. Mientras tanto, los negocios ven el asistente como "activándose".'}</p></div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="Conversaciones" value={String(agg._count)} icon="forum" hint="30 días" />
        <Stat label="Mensajes" value={String(agg._sum.turns || 0)} icon="smart_toy" hint="30 días" />
        <Stat label="Citas agendadas" value={String(agg._sum.bookings || 0)} icon="event_available" tone="gold" hint="30 días" />
        <Stat label="Costo aproximado" value={money(cost)} icon="payments" hint={agg._sum.turns ? `${money(cost / (agg._sum.turns || 1))} por mensaje` : 'Con el modelo actual'} />
      </div>
      <div className="grid xl:grid-cols-2 gap-4 items-start">
        <ActionForm action={saveIaAction} className="card p-5 space-y-3" success="Asistente guardado.">
          <h2 className="h-section">Llave y modelo</h2>
          <label className="block"><span className="label">Llave de la API de Anthropic</span><input name="apiKey" type="password" className="input" autoComplete="off" placeholder={c.apiKey ? '•••••••• guardada (déjala vacía para no cambiarla)' : 'sk-ant-…'} /></label>
          {c.apiKey && <label className="flex items-center gap-2 font-body-sm"><input type="checkbox" name="clearKey" className="accent-primary-container" />Borrar la llave guardada</label>}
          <label className="block"><span className="label">Modelo</span><select name="model" defaultValue={c.model} className="input">{IA_MODELS.map(m => <option key={m.id} value={m.id}>{m.label} · US$ {m.inUsd}/{m.outUsd} por millón de tokens</option>)}</select>
            <span className="block mt-1 font-body-sm text-on-surface-variant">Opus entiende mejor y se equivoca menos; Haiku cuesta unas 40 veces menos. Si el modelo rechaza una pregunta, se reintenta solo con otro modelo (Opus y Sonnet).</span></label>
          <label className="flex items-center gap-2"><input type="checkbox" name="enabled" defaultChecked={c.enabled} className="accent-primary-container" />Asistente encendido en la plataforma</label>
          <Submit className="btn-primary w-full">Guardar</Submit>
        </ActionForm>
        <section className="card overflow-hidden">
          <h2 className="h-section p-4 border-b border-parchment">Negocios que más lo usan (30 días)</h2>
          {top.length === 0 ? <p className="p-4 text-on-surface-variant">Todavía no hay uso.</p> : (
            <ul className="divide-y divide-parchment">{top.map(t => (
              <li key={t.businessId} className="p-3 px-4 flex items-center gap-3 font-body-sm"><span className="flex-1 font-label-lg">{names.find(n => n.id === t.businessId)?.name || t.businessId}</span><span className="tnum">{t._sum.turns || 0} msj</span><span className="tnum">{t._sum.bookings || 0} citas</span><span className="tnum text-on-surface-variant">{money(usd(c.model, t._sum.inTokens || 0, t._sum.outTokens || 0))}</span></li>
            ))}</ul>
          )}
        </section>
      </div>
    </>
  );
}
