import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
import { PageHeader } from '@/components/panel/PageHeader';
import { Drawer } from '@/components/ui/Drawer';
import { ActionForm } from '@/components/ui/ActionForm';
import { Icon } from '@/components/ui/Icon';
import { saveService } from '../_actions/catalog';
import { cop } from '@/lib/format';

export const metadata = { title: 'Servicios' };
type Svc = Awaited<ReturnType<typeof load>>['services'][number];
async function load(businessId: string) {
  const [services, staff, products] = await Promise.all([
    db.service.findMany({ where: { businessId }, include: { staff: true, supplies: { include: { product: true } } }, orderBy: [{ category: 'asc' }, { name: 'asc' }] }),
    db.staff.findMany({ where: { businessId, active: true } }),
    db.product.findMany({ where: { businessId, kind: { in: ['INSUMO', 'AMBOS'] }, active: true } })
  ]);
  return { services, staff, products };
}

function Fields({ s, staff, products, categories }: { s?: Svc; staff: { id: string; name: string }[]; products: { id: string; name: string; unit: string }[]; categories: string[] }) {
  const supplies = [...(s?.supplies || []), ...Array.from({ length: 3 - Math.min(3, s?.supplies.length || 0) }, () => null)];
  return (
    <>
      {s && <input type="hidden" name="id" value={s.id} />}
      <label className="block"><span className="label">Nombre *</span><input name="name" defaultValue={s?.name} className="input" required /></label>
      <div className="grid grid-cols-2 gap-3">
        <label><span className="label">Categoría</span><input name="category" list="cats" defaultValue={s?.category} className="input" required /><datalist id="cats">{categories.map(c => <option key={c} value={c} />)}</datalist></label>
        <label><span className="label">Etiqueta</span><input name="tag" defaultValue={s?.tag || ''} className="input" placeholder="Top Sell" /></label>
        <label><span className="label">Duración (min) *</span><input name="durationMin" type="number" min={5} step={5} defaultValue={s?.durationMin || 30} className="input" required /></label>
        <label><span className="label">Precio COP (IVA incl.) *</span><input name="price" type="number" min={0} step={500} defaultValue={s?.price} className="input" required /></label>
        <label><span className="label">Comisión propia (%)</span><input name="commissionPct" type="number" min={0} max={100} defaultValue={s?.commissionPct ?? ''} className="input" placeholder="La del profesional" /></label>
        <label><span className="label">IVA</span><select name="taxRate" defaultValue={s?.taxRate ?? 19} className="input"><option value={19}>19%</option><option value={5}>5%</option><option value={0}>0% / Excluido</option></select></label>
      </div>
      <label className="block"><span className="label">Descripción</span><textarea name="description" defaultValue={s?.description || ''} className="input" rows={2} /></label>
      <fieldset><legend className="label">Profesionales que lo realizan</legend><div className="flex flex-wrap gap-2">{staff.map(st => <label key={st.id} className="chip cursor-pointer has-[:checked]:bg-primary-container has-[:checked]:text-white"><input type="checkbox" name="staffIds" value={st.id} defaultChecked={s?.staff.some(x => x.staffId === st.id) ?? true} className="sr-only" />{st.name}</label>)}</div></fieldset>
      <fieldset><legend className="label">Consumo de insumos por servicio (se descuenta al completar)</legend>
        {supplies.map((x, i) => <div key={i} className="grid grid-cols-[1fr_110px] gap-2 mb-2"><select name="supplyProduct" defaultValue={x?.productId || ''} className="input"><option value="">— Sin insumo —</option>{products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}</select><input name="supplyQty" type="number" step="0.01" min={0} defaultValue={x?.quantity || ''} className="input" placeholder="Cant." /></div>)}
      </fieldset>
      <div className="flex gap-4"><label className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={s?.active ?? true} className="accent-primary-container" />Activo (visible para reservar)</label><label className="flex items-center gap-2"><input type="checkbox" name="popular" defaultChecked={s?.popular} className="accent-primary-container" />Destacado</label></div>
    </>
  );
}

export default async function Servicios() {
  const { business: b } = await requireBusiness('servicios');
  const { services, staff, products } = await load(b.id);
  const categories = [...new Set(services.map(s => s.category))];
  const props = { staff, products, categories };
  return (
    <>
      <PageHeader eyebrow="Catálogo" title="Servicios" subtitle={`${services.length} servicios en ${categories.length} categorías`} actions={<Drawer title="Nuevo servicio" trigger={<><Icon name="add" className="text-[18px]" />Nuevo servicio</>}><ActionForm action={saveService} resetOnSuccess><Fields {...props} /><button className="btn-primary w-full">Crear servicio</button></ActionForm></Drawer>} />
      {categories.map(cat => (
        <section key={cat} className="mb-6">
          <h2 className="font-headline-sm text-headline-sm italic mb-3">{cat}</h2>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {services.filter(s => s.category === cat).map(s => (
              <div key={s.id} className={`card p-4 ${s.active ? '' : 'opacity-60'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><p className="font-title-md text-title-md truncate">{s.name}</p><p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1"><Icon name="schedule" className="text-[14px]" />{s.durationMin} min · IVA {s.taxRate}%{!s.active && ' · Inactivo'}</p></div>
                  <span className="font-title-lg text-title-lg tnum">{cop(s.price)}</span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">{s.staff.length} profesionales{s.supplies.length > 0 && ` · insumos: ${s.supplies.map(x => `${x.product.name} ${x.quantity}${x.product.unit.toLowerCase()}`).join(', ')}`}</p>
                <div className="mt-3"><Drawer title="Editar servicio" triggerClass="btn-ghost btn-sm" trigger={<><Icon name="edit" className="text-[16px]" />Editar</>}><ActionForm action={saveService}><Fields s={s} {...props} /><button className="btn-primary w-full">Guardar</button></ActionForm></Drawer></div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
