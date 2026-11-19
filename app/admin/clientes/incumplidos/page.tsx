import Link from 'next/link';
import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
import { PageHeader, Stat } from '@/components/panel/PageHeader';
import { Empty } from '@/components/ui/Empty';
import { fechaCorta } from '@/lib/format';
import { attendanceRecord, strikes, RELEASED_NOTE, sweepAppointments } from '@/lib/asistencia';
import { DepositToggle } from './Toggle';

export const metadata = { title: 'Incumplidos' };
// Quién falta, no confirma o llega tarde seguido. A esas personas se les exige anticipo al reservar.
export default async function Incumplidos() {
  const { business: b } = await requireBusiness('clientes');
  await sweepAppointments(b.id);
  const since = new Date(Date.now() - 180 * 864e5);
  const ids = (await db.appointment.findMany({
    where: { businessId: b.id, start: { gte: since, lt: new Date() }, OR: [{ status: 'NO_ASISTIO' }, { status: 'CANCELADA', notes: { contains: RELEASED_NOTE } }, { arrivedLateMin: { gte: 5 } }] },
    select: { customerId: true }, distinct: ['customerId']
  })).map(r => r.customerId);
  const manual = await db.customer.findMany({ where: { businessId: b.id, requireDeposit: true }, select: { id: true } });
  const all = [...new Set([...ids, ...manual.map(m => m.id)])];
  const [customers, rec] = await Promise.all([db.customer.findMany({ where: { id: { in: all } } }), attendanceRecord(b.id, all)]);
  const rows = customers.map(c => { const r = rec.get(c.id)!; const s = strikes(r); return { c, r, s, auto: b.depositForNoShows && s >= b.noShowLimit }; })
    .sort((x, y) => y.s - x.s || y.r.noShows - x.r.noShows);
  const flagged = rows.filter(x => x.auto || x.c.requireDeposit).length;
  return (
    <>
      <PageHeader eyebrow="Clientes" title="Historial de incumplidos" subtitle={`Últimos 6 meses. Desde ${b.noShowLimit} ${b.noShowLimit === 1 ? 'falta' : 'faltas'} se exige anticipo${b.depositForNoShows ? ' automáticamente' : ' (apagado en Configuración)'}. Dos llegadas tarde cuentan como una falta.`}
        actions={<><Link href="/admin/clientes" className="btn-ghost btn-sm">← Clientes</Link><Link href="/admin/configuracion" className="btn-ghost btn-sm">Ajustes</Link></>} />
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Stat label="Con incumplimientos" value={String(rows.length)} icon="person_alert" />
        <Stat label="Deben pagar anticipo" value={String(flagged)} icon="payments" tone="gold" />
        <Stat label="Citas perdidas" value={String(rows.reduce((a, x) => a + x.r.noShows + x.r.released, 0))} icon="event_busy" tone="danger" />
      </div>
      {rows.length === 0 ? <div className="card"><Empty icon="verified" title="Nadie ha incumplido" text="Aquí aparecerá quien no llegue, no confirme o llegue tarde seguido." /></div> : (
        <div className="card overflow-x-auto">
          <table className="table w-full">
            <thead><tr><th className="text-left">Cliente</th><th>No llegó</th><th>No confirmó</th><th>Llegó tarde</th><th>Citas</th><th>Último</th><th className="text-right">Anticipo</th></tr></thead>
            <tbody>{rows.map(({ c, r, s, auto }) => (
              <tr key={c.id}>
                <td><Link href={`/admin/clientes/${c.id}`} className="font-label-lg hover:text-secondary">{c.name}</Link><p className="font-body-sm text-on-surface-variant">{c.phone || 'Sin celular'} · {s} {s === 1 ? 'falta' : 'faltas'}</p></td>
                <td className="text-center tnum">{r.noShows}</td><td className="text-center tnum">{r.released}</td><td className="text-center tnum">{r.lates}</td><td className="text-center tnum">{r.total}</td>
                <td className="text-center whitespace-nowrap">{r.last ? fechaCorta(r.last) : '—'}</td>
                <td className="text-right"><DepositToggle id={c.id} manual={c.requireDeposit} auto={auto} /></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </>
  );
}
