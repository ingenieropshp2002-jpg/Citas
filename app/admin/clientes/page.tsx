import Link from 'next/link';
import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
import { PageHeader } from '@/components/panel/PageHeader';
import { Drawer } from '@/components/ui/Drawer';
import { ActionForm } from '@/components/ui/ActionForm';
import { Empty } from '@/components/ui/Empty';
import { Icon } from '@/components/ui/Icon';
import { saveCustomer } from '../_actions/catalog';
import { cop, fechaCorta, parseJson } from '@/lib/format';
import { CustomerFields } from './fields';

export const metadata = { title: 'Clientes' };
export default async function Clientes({ searchParams }: { searchParams: Promise<{ q?: string; tag?: string }> }) {
  const { business: b, perms, staffId } = await requireBusiness('clientes');
  // El rol Profesional ve solo a sus clientes (los que ha atendido o tienen cita con él).
  const mine = perms !== 'ALL' && !perms.includes('agenda_todos') && !perms.includes('configuracion') && staffId ? staffId : null;
  const { q = '', tag = '' } = await searchParams;
  let list = await db.customer.findMany({ where: { businessId: b.id, ...(mine ? { appointments: { some: { staffId: mine } } } : {}) }, orderBy: { lastVisit: { sort: 'desc', nulls: 'last' } } });
  const tags = [...new Set(list.flatMap(c => parseJson<string[]>(c.tags, [])))];
  if (q) { const n = q.toLowerCase(); list = list.filter(c => c.name.toLowerCase().includes(n) || (c.phone || '').includes(n) || (c.email || '').toLowerCase().includes(n) || (c.docNumber || '').includes(n)); }
  if (tag) list = list.filter(c => parseJson<string[]>(c.tags, []).includes(tag));
  return (
    <>
      <PageHeader eyebrow="CRM" title="Clientes" subtitle={`${list.length} clientes`} actions={<><Link href="/admin/clientes/incumplidos" className="btn-ghost btn-sm"><Icon name="person_alert" className="text-[18px]" />Incumplidos</Link><Drawer title="Nuevo cliente" trigger={<><Icon name="person_add" className="text-[18px]" />Nuevo cliente</>}><ActionForm action={saveCustomer}><CustomerFields /><button className="btn-primary w-full">Crear cliente</button></ActionForm></Drawer></>} />
      <form className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px]"><Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" /><input name="q" defaultValue={q} className="input pl-10" placeholder="Nombre, celular, correo o documento" /></div>
        <select name="tag" defaultValue={tag} className="input !w-auto"><option value="">Todas las etiquetas</option>{tags.map(t => <option key={t}>{t}</option>)}</select>
        <button className="btn-ghost">Filtrar</button>
      </form>
      {list.length === 0 ? <div className="card"><Empty icon="group_off" title="Sin clientes" text="Los clientes se crean al reservar o desde aquí." /></div> : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead><tr><th>Cliente</th><th>Contacto</th><th>Etiquetas</th><th className="text-right">Visitas</th><th className="text-right">Gasto total</th><th>Última visita</th></tr></thead>
            <tbody>{list.map(c => (
              <tr key={c.id} className="hover:bg-surface-container-low">
                <td><Link href={`/admin/clientes/${c.id}`} className="flex items-center gap-3 font-label-lg"><span className="w-9 h-9 rounded-full bg-primary-container text-secondary-fixed flex items-center justify-center">{c.name.split(' ').map(x => x[0]).slice(0, 2).join('')}</span>{c.name}</Link></td>
                <td className="text-on-surface-variant">{c.phone && `+57 ${c.phone}`}<br />{c.email}</td>
                <td>{parseJson<string[]>(c.tags, []).map(t => <span key={t} className="mr-1 px-2 py-0.5 rounded-full bg-secondary-fixed/50 text-on-secondary-fixed font-label-sm text-label-sm">{t}</span>)}</td>
                <td className="text-right tnum">{c.visits}</td><td className="text-right tnum font-bold">{cop(c.totalSpent)}</td>
                <td className="text-on-surface-variant">{c.lastVisit ? fechaCorta(c.lastVisit) : '—'}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </>
  );
}
