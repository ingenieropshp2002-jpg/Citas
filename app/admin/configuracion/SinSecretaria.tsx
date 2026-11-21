import Link from 'next/link';
import { db } from '@/lib/db';
import { Icon } from '@/components/ui/Icon';
import { modoSinSecretaria } from '../_actions/catalog';

/** "No tengo secretaria": cada profesional maneja sus propias citas. Muestra qué le falta a cada uno. */
export async function SinSecretaria({ businessId, notifyTo }: { businessId: string; notifyTo: string }) {
  const on = notifyTo === 'PROFESIONAL' || notifyTo === 'AMBOS';
  if (!on) return (
    <section className="card p-5 mb-4 flex flex-wrap items-center gap-4">
      <Icon name="person_off" className="text-secondary text-[28px]" />
      <div className="flex-1 min-w-[220px]">
        <h2 className="font-title-lg text-title-lg">¿No tienes secretaria?</h2>
        <p className="font-body-sm text-on-surface-variant">Cada profesional maneja sus propias citas: entra a su agenda, la ve en Google Calendar, recibe un WhatsApp por cada reserva y el resumen de la mañana, y le suena el celular cuando le reservan.</p>
      </div>
      <form action={modoSinSecretaria}><input type="hidden" name="on" value="1" /><button className="btn-primary"><Icon name="bolt" className="text-[18px]" />Activar modo sin secretaria</button></form>
    </section>
  );
  const staff = await db.staff.findMany({ where: { businessId, active: true }, select: { id: true, name: true, userId: true, whatsapp: true, gcalToken: true, user: { select: { phone: true } } }, orderBy: { name: 'asc' } });
  const ids = staff.map(s => s.userId).filter(Boolean) as string[];
  const subs = ids.length ? await db.pushSubscription.groupBy({ by: ['userId'], where: { userId: { in: ids } }, _count: true }) : [];
  const hasPush = new Set(subs.map(s => s.userId));
  const Item = ({ ok, label, fix, href }: { ok: boolean; label: string; fix: string; href: string }) => (
    <li className="flex items-center gap-2 font-body-sm"><Icon name={ok ? 'check_circle' : 'radio_button_unchecked'} fill={ok} className={`text-[18px] ${ok ? 'text-[#059669]' : 'text-on-surface-variant'}`} /><span className="flex-1">{label}</span>{!ok && <Link href={href} className="text-secondary font-semibold">{fix}</Link>}</li>
  );
  return (
    <section className="card p-5 mb-4">
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <Icon name="person_off" className="text-secondary text-[24px]" />
        <h2 className="font-title-lg text-title-lg flex-1">Modo sin secretaria activo</h2>
        <form action={modoSinSecretaria}><input type="hidden" name="on" value="0" /><button className="btn-ghost btn-sm">Tengo recepción</button></form>
      </div>
      <p className="font-body-sm text-on-surface-variant mb-4">Los avisos de cada cita van al WhatsApp del profesional y cada mañana recibe su resumen del día. Esto le falta a cada uno:</p>
      {staff.length === 0 ? <p className="font-body-sm">Agrega tu equipo en <Link href="/admin/equipo" className="text-secondary font-semibold">Equipo</Link>.</p> :
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {staff.map(s => (
          <div key={s.id} className="rounded-xl border border-parchment p-3">
            <p className="font-label-lg mb-2">{s.name}</p>
            <ul className="space-y-1.5">
              <Item ok={!!s.userId} label="1. Entra al panel y ve solo su agenda" fix="Crear acceso" href="/admin/equipo" />
              <Item ok={!!s.gcalToken} label="2. Sus citas en Google Calendar" fix="Conectar" href="/admin/calendario" />
              <Item ok={!!(s.whatsapp || s.user?.phone)} label="3. WhatsApp por cada cita y resumen diario" fix="Poner WhatsApp" href="/admin/equipo" />
              <Item ok={!!s.userId && hasPush.has(s.userId)} label="4. Le suena el celular al reservar" fix={s.userId ? 'Lo activa al entrar' : 'Crear acceso'} href={s.userId ? '/admin' : '/admin/equipo'} />
            </ul>
          </div>
        ))}
      </div>}
      <p className="font-body-sm text-on-surface-variant mt-3">El punto 4 lo activa cada profesional en su celular: entra al panel con su acceso y toca "Activar avisos con sonido" en el menú. El 2 también se puede hacer desde su celular en Google Calendar.</p>
    </section>
  );
}
