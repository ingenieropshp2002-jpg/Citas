import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
import { PageHeader } from '@/components/panel/PageHeader';
import { Drawer } from '@/components/ui/Drawer';
import { ActionForm } from '@/components/ui/ActionForm';
import { Icon } from '@/components/ui/Icon';
import { HoursFields } from '@/components/panel/HoursFields';
import { saveStaff } from '../_actions/catalog';
import { cop, fromBogota, parseJson, ymd } from '@/lib/format';
import Link from 'next/link';
import { getSettings, planMaxStaff } from '@/lib/settings';
import { roleOf } from '@/lib/roles';
import { RolePicker } from './RolePicker';

export const metadata = { title: 'Equipo' };
type S = Awaited<ReturnType<typeof db.staff.findMany>>[number] & { user?: { email: string | null } | null };

function Fields({ s, businessHours }: { s?: S; businessHours: string }) {
  const perms = parseJson<string[]>(s?.permissions, ['agenda']);
  const custom = s && s.workHours !== '{}';
  return (
    <>
      {s && <input type="hidden" name="id" value={s.id} />}
      <div className="grid grid-cols-2 gap-3">
        <label className="col-span-2"><span className="label">Nombre *</span><input name="name" defaultValue={s?.name} className="input" required /></label>
        <label><span className="label">Cargo</span><input name="title" defaultValue={s?.title || ''} className="input" placeholder="Master Stylist" /></label>
        <label><span className="label">WhatsApp (avisos y resumen del día)</span><input name="whatsapp" defaultValue={s?.whatsapp || ''} className="input" inputMode="numeric" placeholder="300 123 4567" /></label>
        <label><span className="label">Comisión servicios (%)</span><input name="commissionPct" type="number" min={0} max={100} defaultValue={s?.commissionPct ?? 40} className="input" /></label>
        <label><span className="label">Comisión productos (%)</span><input name="productCommissionPct" type="number" min={0} max={100} defaultValue={s?.productCommissionPct ?? 10} className="input" /></label>
        <label><span className="label">Color en agenda</span><input name="color" type="color" defaultValue={s?.color || '#0d2538'} className="input !p-1" /></label>
        <label><span className="label">Foto (URL)</span><input name="photo" defaultValue={s?.photo || ''} className="input" /></label>
      </div>
      <fieldset><legend className="label">Horario laboral</legend>
        <label className="flex items-center gap-2 mb-2"><input type="checkbox" name="customHours" defaultChecked={!!custom} className="accent-primary-container" />Usar horario propio (si no, usa el del negocio)</label>
        <HoursFields prefix="w" value={custom ? s!.workHours : businessHours} />
      </fieldset>
      <label className="block"><span className="label">Días libres / vacaciones (AAAA-MM-DD separados por coma)</span><input name="daysOff" defaultValue={parseJson<string[]>(s?.daysOff, []).join(', ')} className="input" placeholder="2026-12-24, 2026-12-31" /></label>
      <RolePicker initial={perms} />
      <fieldset className="p-3 rounded-xl bg-surface-container-low"><legend className="label px-1">Acceso al Admin (opcional)</legend>
        <div className="grid grid-cols-2 gap-2"><input name="loginEmail" type="email" defaultValue={s?.user?.email || ''} className="input" placeholder="correo@ejemplo.com" /><input name="loginPassword" type="password" className="input" placeholder={s?.userId ? 'Sin cambios' : 'Contraseña (mín. 8)'} /></div>
      </fieldset>
      <label className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={s?.active ?? true} className="accent-primary-container" />Activo (recibe reservas)</label>
    </>
  );
}

export default async function Equipo() {
  const { business: b } = await requireBusiness('equipo');
  const monthStart = fromBogota(ymd(new Date()).slice(0, 8) + '01');
  const staff = await db.staff.findMany({ where: { businessId: b.id }, include: { user: { select: { email: true } }, saleItems: { where: { sale: { status: 'PAGADA', createdAt: { gte: monthStart } } } }, _count: { select: { appointments: true } } }, orderBy: { name: 'asc' } });
  const settings = await getSettings();
  const max = planMaxStaff(settings.plans, b.plan); const activeN = staff.filter(s => s.active).length;
  const full = max !== null && activeN >= max;
  const planName = settings.plans.find(p => p.id === b.plan)?.name || b.plan;
  return (
    <>
      <PageHeader eyebrow="Personas" title="Equipo" subtitle={`Horarios, comisiones y permisos · ${activeN}${max !== null ? `/${max}` : ''} profesionales activos (plan ${planName})`} actions={<><Link href="/admin/equipo/comisiones" className="btn-outline"><Icon name="payments" className="text-[18px]" />Comisiones y liquidación</Link>{full ? <Link href="/admin/suscripcion" className="btn-primary"><Icon name="upgrade" className="text-[18px]" />Mejorar plan</Link> : <Drawer title="Nuevo profesional" trigger={<><Icon name="person_add" className="text-[18px]" />Agregar profesional</>}><ActionForm action={saveStaff} resetOnSuccess><Fields businessHours={b.openingHours} /><button className="btn-primary w-full">Crear</button></ActionForm></Drawer>}</>} />
      {full && <div className="card p-4 mb-4 flex flex-wrap items-center gap-3 bg-secondary-fixed/30"><Icon name="info" className="text-[20px]" /><p className="font-body-md flex-1 min-w-[220px]">{activeN > max! ? `Tu plan ${planName} permite ${max} ${max === 1 ? 'profesional activo' : 'profesionales activos'} y hoy tienes ${activeN}.` : `Llegaste al límite de tu plan ${planName}: ${max} ${max === 1 ? 'profesional activo' : 'profesionales activos'}.`} Para agregar o activar a alguien más, mejora tu plan.</p><Link href="/admin/suscripcion" className="btn-primary btn-sm">Mejorar plan</Link></div>}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {staff.map(s => {
          const sales = s.saleItems.reduce((a, i) => a + i.base, 0); const com = s.saleItems.reduce((a, i) => a + i.commission, 0);
          return (
            <div key={s.id} className={`card p-5 ${s.active ? '' : 'opacity-60'}`}>
              <div className="flex items-center gap-3">
                {s.photo ? <img src={s.photo} alt="" className="w-14 h-14 rounded-full object-cover border-2" style={{ borderColor: s.color }} /> : <span className="w-14 h-14 rounded-full text-white flex items-center justify-center font-title-lg" style={{ background: s.color }}>{s.name[0]}</span>}
                <div className="min-w-0"><p className="font-title-lg text-title-lg truncate">{s.name}</p><p className="text-on-surface-variant font-body-sm">{s.title} · {s.commissionPct}% comisión</p></div>
                <span className="ml-auto flex items-center gap-0.5 font-label-md"><Icon name="star" fill className="text-[16px] text-gold" />{s.rating.toFixed(1)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="p-3 rounded-xl bg-surface-container-low"><p className="font-label-sm text-label-sm text-on-surface-variant uppercase">Ventas del mes</p><p className="font-title-md tnum">{cop(sales)}</p></div>
                <div className="p-3 rounded-xl bg-secondary-fixed/30"><p className="font-label-sm text-label-sm text-on-surface-variant uppercase">Comisión del mes</p><p className="font-title-md tnum">{cop(com)}</p></div>
              </div>
              <p className="font-body-sm text-on-surface-variant mt-3">{s.userId ? `Acceso: ${s.user?.email}` : 'Sin acceso al Admin'} · {s.userId ? roleOf(parseJson<string[]>(s.permissions, [])) : 'sin rol'}</p>
              <div className="mt-3"><Drawer title={`Editar: ${s.name}`} triggerClass="btn-ghost btn-sm" trigger={<><Icon name="edit" className="text-[16px]" />Editar</>}><ActionForm action={saveStaff}><Fields s={s} businessHours={b.openingHours} /><button className="btn-primary w-full">Guardar</button></ActionForm></Drawer></div>
            </div>
          );
        })}
      </div>
    </>
  );
}
