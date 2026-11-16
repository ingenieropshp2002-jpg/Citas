import { db } from '@/lib/db';
import { PageHeader } from '@/components/panel/PageHeader';
import { Drawer } from '@/components/ui/Drawer';
import { ActionForm } from '@/components/ui/ActionForm';
import { Submit } from '@/components/ui/Submit';
import { Icon } from '@/components/ui/Icon';
import { fechaCorta } from '@/lib/format';
import { requireSuperAdmin } from '@/lib/auth';
import { impersonateAction, saveUserAction } from '../actions';
import { ResetLinkButton } from './ResetLink';

export const metadata = { title: 'Usuarios' };
const ROLES: Record<string, string> = { CLIENT: 'Cliente', OWNER: 'Dueño de negocio', STAFF: 'Profesional', ADMIN: 'Administrador' };
export default async function Usuarios({ searchParams }: { searchParams: Promise<{ q?: string; rol?: string }> }) {
  const me = await requireSuperAdmin();
  const { q = '', rol = '' } = await searchParams;
  const list = await db.user.findMany({
    where: { ...(rol === 'SUPER' ? { superAdmin: true } : rol ? { role: rol } : {}), ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }, { phone: { contains: q } }] } : {}) },
    orderBy: { createdAt: 'desc' }, take: 200, include: { businesses: { select: { name: true } } }
  });
  return (
    <>
      <PageHeader eyebrow="Plataforma" title="Usuarios" subtitle={`${list.length}${list.length === 200 ? '+' : ''} resultados`} />
      <form className="flex flex-wrap gap-2 mb-3">
        <input name="q" defaultValue={q} placeholder="Buscar por nombre, correo o celular" className="input flex-1 min-w-[220px]" />
        <select name="rol" defaultValue={rol} className="input !w-auto"><option value="">Todos</option>{Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}<option value="SUPER">Superadmin</option></select>
        <button className="btn-ghost">Buscar</button>
      </form>
      <section className="card overflow-x-auto">
        <table className="table min-w-[760px]"><thead><tr><th>Usuario</th><th>Rol</th><th>Negocio</th><th>Registro</th><th className="text-right">Acciones</th></tr></thead>
          <tbody>{list.map(u => (
            <tr key={u.id} className={u.blocked ? 'opacity-60' : ''}>
              <td><p className="font-label-lg">{u.name}{u.superAdmin && <span className="ml-2 px-1.5 rounded bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm">Superadmin</span>}{u.blocked && <span className="ml-2 px-1.5 rounded bg-[#FFE4E6] text-[#9F1239] font-label-sm text-label-sm">Suspendido</span>}</p><p className="font-body-sm text-on-surface-variant">{[u.email, u.phone].filter(Boolean).join(' · ') || 'Sin contacto'}</p></td>
              <td>{ROLES[u.role] || u.role}</td>
              <td className="font-body-sm">{u.businesses.map(b => b.name).join(', ') || '—'}</td>
              <td className="font-body-sm">{fechaCorta(u.createdAt)}</td>
              <td><div className="flex justify-end gap-1">
                {u.id !== me.id && !u.blocked && <form action={impersonateAction}><input type="hidden" name="userId" value={u.id} /><input type="hidden" name="to" value={u.role === 'CLIENT' ? '/mis-citas' : '/panel'} /><button className="btn-ghost btn-sm" title="Entrar como este usuario"><Icon name="login" className="text-[16px]" />Entrar</button></form>}
                <Drawer title={`Editar a ${u.name.split(' ')[0]}`} trigger={<><Icon name="edit" className="text-[16px]" />Editar</>}>
                  <ActionForm action={saveUserAction} success="Usuario actualizado.">
                    <input type="hidden" name="id" value={u.id} />
                    <label className="block"><span className="label">Nombre</span><input name="name" defaultValue={u.name} className="input" required /></label>
                    <label className="block"><span className="label">Correo</span><input name="email" type="email" defaultValue={u.email || ''} className="input" /></label>
                    <label className="block"><span className="label">Celular</span><input name="phone" defaultValue={u.phone || ''} className="input" inputMode="numeric" /></label>
                    <label className="block"><span className="label">Rol</span><select name="role" defaultValue={u.role} className="input">{Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
                    <label className="block"><span className="label">Nueva contraseña (opcional)</span><input name="password" type="text" minLength={8} autoComplete="off" className="input" placeholder="Déjalo vacío para no cambiarla" /></label>
                    <label className="flex items-center gap-3"><input type="checkbox" name="superAdmin" defaultChecked={u.superAdmin} className="w-5 h-5 accent-primary-container" /><span className="font-label-lg">Superadmin (controla toda la plataforma)</span></label>
                    <label className="flex items-center gap-3"><input type="checkbox" name="blocked" defaultChecked={u.blocked} className="w-5 h-5 accent-primary-container" /><span className="font-label-lg">Suspender cuenta (no puede ingresar)</span></label>
                    <Submit className="btn-primary w-full">Guardar</Submit>
                  </ActionForm>
                  <div className="mt-6 pt-4 border-t border-parchment"><p className="font-label-lg mb-2">Enlace para crear contraseña</p><ResetLinkButton id={u.id} phone={u.phone} name={u.name} /></div>
                </Drawer>
              </div></td>
            </tr>
          ))}</tbody></table>
        {!list.length && <p className="p-6 text-center text-on-surface-variant">No hay usuarios con ese filtro.</p>}
      </section>
    </>
  );
}
