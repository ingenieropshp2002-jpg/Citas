import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { PageHeader } from '@/components/panel/PageHeader';
import { ActionForm } from '@/components/ui/ActionForm';
import { Submit } from '@/components/ui/Submit';
import { Icon } from '@/components/ui/Icon';
import { ImageInput } from '@/components/ui/ImageInput';
import { getSettings } from '@/lib/settings';
import { deleteBusinessAction, impersonateAction, registerPaymentAction, saveBusinessAction } from '@/app/admin/actions';
import { subscriptionState } from '@/lib/subscription';

export const metadata = { title: 'Editar negocio' };
const d = (x: Date | null) => (x ? new Date(x.getTime() - 5 * 3600e3).toISOString().slice(0, 10) : '');
export default async function EditarNegocio({ params }: { params: Promise<{ id: string }> }) {
  const b = await db.business.findUnique({ where: { id: (await params).id }, include: { owner: true } });
  if (!b) notFound();
  const plans = (await getSettings()).plans;
  const st = subscriptionState(b);
  const T = ({ name, label, value, ...rest }: { name: string; label: string; value: string | number | null } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value'>) =>
    <label className="block"><span className="label">{label}</span><input name={name} defaultValue={value ?? ''} className="input" {...rest} /></label>;
  return (
    <>
      <PageHeader eyebrow="Negocio" title={b.name} subtitle={`Dueño: ${b.owner.name} · ${b.owner.email || b.owner.phone || 'sin contacto'}`}
        actions={<><a href={`/negocio/${b.slug}`} target="_blank" rel="noreferrer" className="btn-ghost btn-sm"><Icon name="open_in_new" className="text-[16px]" />Ver página</a>
          <form action={impersonateAction}><input type="hidden" name="userId" value={b.ownerId} /><button className="btn-primary btn-sm"><Icon name="login" className="text-[16px]" />Entrar a su panel</button></form></>} />
      <ActionForm action={saveBusinessAction} className="grid xl:grid-cols-2 gap-4 items-start" success="Negocio actualizado.">
        <input type="hidden" name="id" value={b.id} />
        <section className="card p-5 space-y-3">
          <h2 className="h-section">Datos públicos</h2>
          <T name="name" label="Nombre" value={b.name} required />
          <T name="slug" label="Enlace (/negocio/…)" value={b.slug} required />
          <label className="block"><span className="label">Categoría</span><select name="category" defaultValue={b.category} className="input"><option value="PELUQUERIA">Peluquería</option><option value="BARBERIA">Barbería</option><option value="SPA">Spa</option><option value="UNAS">Uñas</option></select></label>
          <T name="tagline" label="Frase corta" value={b.tagline} />
          <label className="block"><span className="label">Descripción</span><textarea name="description" defaultValue={b.description} rows={3} className="input !h-auto py-3" /></label>
          <div><span className="label">Logo</span><ImageInput name="logo" defaultValue={b.logo} /></div>
        </section>
        <section className="card p-5 space-y-3">
          <h2 className="h-section">Contacto y ubicación</h2>
          <div className="grid grid-cols-2 gap-3"><T name="city" label="Ciudad" value={b.city} /><T name="zone" label="Barrio o zona" value={b.zone} /></div>
          <T name="address" label="Dirección" value={b.address} />
          <div className="grid grid-cols-2 gap-3"><T name="phone" label="Teléfono" value={b.phone} inputMode="numeric" /><T name="whatsapp" label="WhatsApp" value={b.whatsapp} inputMode="numeric" /></div>
          <T name="instagram" label="Instagram (sin @)" value={b.instagram} />
          <div className="grid grid-cols-2 gap-3"><T name="rating" label="Calificación (0 a 5)" value={b.rating} inputMode="decimal" /><T name="reviewCount" label="Número de reseñas" value={b.reviewCount} inputMode="numeric" /></div>
        </section>
        <section className="card p-5 space-y-3">
          <h2 className="h-section">Suscripción</h2>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="label">Plan</span><select name="plan" defaultValue={b.plan} className="input">{plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
            <label className="block"><span className="label">Estado</span><select name="subscriptionStatus" defaultValue={b.subscriptionStatus} className="input"><option value="PRUEBA">En prueba</option><option value="ACTIVA">Activa</option><option value="VENCIDA">Suspendido</option></select></label>
            <T name="trialEndsAt" label="Fin de la prueba" value={d(b.trialEndsAt)} type="date" />
            <T name="paidUntil" label="Pagado hasta" value={d(b.paidUntil)} type="date" />
          </div>
          <p className="font-body-sm text-on-surface-variant">Si "Pagado hasta" queda vacío y el estado es Activa, el negocio no vence.</p>
          <label className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low"><input type="checkbox" name="active" defaultChecked={b.active} className="w-5 h-5 accent-primary-container" /><span className="font-label-lg">Visible en el buscador</span></label>
        </section>
        <section className="card p-5 space-y-3">
          <h2 className="h-section">Cambiar de dueño</h2>
          <T name="ownerEmail" label="Correo del nuevo dueño (opcional)" value="" type="email" placeholder={b.owner.email || ''} />
          <p className="font-body-sm text-on-surface-variant">La persona debe tener una cuenta creada con ese correo.</p>
        </section>
        <div className="xl:col-span-2 sticky bottom-0 py-3 bg-gradient-to-t from-surface via-surface/95 to-transparent flex justify-between items-center gap-3"><Link href="/admin/negocios" className="btn-ghost">← Volver</Link><Submit className="btn-primary min-w-[200px]">Guardar cambios</Submit></div>
      </ActionForm>
      <section className="card p-5 mt-6 space-y-3">
        <h2 className="h-section flex items-center gap-2"><Icon name="payments" className="text-[20px]" />Registrar pago de suscripción</h2>
        <p className="font-body-sm text-on-surface-variant">Estado actual: <b>{st.state === 'VENCIDA' ? 'Suspendido' : st.state === 'GRACIA' ? `En gracia (${st.graceLeft} días)` : st.state === 'PRUEBA' ? 'En prueba' : 'Activa'}</b>{b.paidUntil ? ` · pagado hasta ${d(b.paidUntil)}` : ''}. Al registrar el pago el negocio queda activo y se suman los meses desde hoy o desde la fecha de vencimiento, la que sea mayor.</p>
        <ActionForm action={registerPaymentAction} className="grid sm:grid-cols-4 gap-3 items-end" success="Pago registrado. El negocio quedó activo.">
          <input type="hidden" name="id" value={b.id} />
          <label className="block"><span className="label">Plan</span><select name="plan" defaultValue={b.plan} className="input">{plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <label className="block"><span className="label">Meses</span><select name="months" defaultValue="1" className="input">{[1, 2, 3, 6, 12].map(m => <option key={m} value={m}>{m}</option>)}</select></label>
          <label className="block"><span className="label">Valor recibido</span><input name="amount" inputMode="numeric" defaultValue={plans.find(p => p.id === b.plan)?.price ?? ''} className="input" /></label>
          <label className="block"><span className="label">Medio</span><select name="method" className="input"><option value="TRANSFERENCIA">Transferencia</option><option value="EFECTIVO">Efectivo</option><option value="NEQUI">Nequi</option><option value="OTRO">Otro</option></select></label>
          <div className="sm:col-span-4"><Submit className="btn-primary">Registrar pago y activar</Submit></div>
        </ActionForm>
      </section>
      <section className="card p-5 mt-6 border border-danger/40 space-y-3">
        <h2 className="h-section text-danger flex items-center gap-2"><Icon name="warning" className="text-[20px]" />Eliminar negocio</h2>
        <p className="font-body-sm text-on-surface-variant">Se borran para siempre su página, equipo, servicios, clientes, citas, productos, ventas y facturas. Esta acción no se puede deshacer. La cuenta del dueño se conserva.</p>
        <ActionForm action={deleteBusinessAction} className="space-y-3">
          <input type="hidden" name="id" value={b.id} />
          <label className="block"><span className="label">Para confirmar, escribe el nombre: <b className="text-on-surface">{b.name}</b></span><input name="confirm" required autoComplete="off" className="input" placeholder={b.name} /></label>
          <Submit className="btn-danger">Eliminar negocio para siempre</Submit>
        </ActionForm>
      </section>
    </>
  );
}
