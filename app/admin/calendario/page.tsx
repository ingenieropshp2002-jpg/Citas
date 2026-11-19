import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
import { PageHeader } from '@/components/panel/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { CopyLink } from '../configuracion/CopyLink';
import { gcalConfigured, icsUrl } from '@/lib/gcal';
import { GcalButtons } from './Buttons';

export const metadata = { title: 'Google Calendar' };
const ERR: Record<string, string> = {
  'sin-credenciales': 'La conexión directa con Google todavía no está activada en la plataforma. Mientras tanto usa el enlace de calendario.',
  permiso: 'No tienes permiso para conectar el calendario de esa persona.', cancelado: 'Cancelaste el permiso en Google.', invalido: 'El enlace de Google no es válido. Intenta de nuevo.', google: 'Google no aceptó la conexión. Intenta de nuevo.'
};

export default async function Calendario({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { business: b, perms, staffId: me } = await requireBusiness();
  const sp = await searchParams;
  const all = perms === 'ALL' || perms.includes('equipo');
  const staff = await db.staff.findMany({ where: { businessId: b.id, active: true, ...(all ? {} : { id: me || '-' }) }, select: { id: true, name: true, photo: true, gcalToken: true, gcalEmail: true, gcalError: true, gcalSyncedAt: true }, orderBy: { name: 'asc' } });
  const direct = gcalConfigured();
  return (
    <>
      <PageHeader eyebrow="Integraciones" title="Google Calendar" subtitle="Cada profesional ve sus citas en el calendario de su celular. Las cancelaciones y cambios también se copian." />
      {sp.ok && <div className="mb-4 p-3 rounded-xl bg-[#ECFDF5] text-[#065F46] font-label-md">Listo: el calendario quedó conectado y ya copiamos las próximas citas.</div>}
      {sp.error && <div className="mb-4 p-3 rounded-xl bg-[#FFF1F2] text-danger font-label-md">{ERR[sp.error] || 'No se pudo conectar.'}</div>}
      <div className="space-y-3">
        {staff.map(s => (
          <section key={s.id} className="card p-5">
            <div className="flex flex-wrap items-center gap-3">
              {s.photo ? <img src={s.photo} alt="" className="w-10 h-10 rounded-full object-cover" /> : <span className="w-10 h-10 rounded-full bg-primary-container text-white flex items-center justify-center">{s.name[0]}</span>}
              <div className="flex-1 min-w-[180px]">
                <p className="font-title-md text-title-md">{s.name}</p>
                <p className="font-body-sm text-on-surface-variant">{s.gcalToken ? <>Conectado a <b>{s.gcalEmail || 'Google'}</b>{s.gcalSyncedAt ? ` · última copia ${s.gcalSyncedAt.toLocaleString('es-CO', { timeZone: 'America/Bogota', hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'short' })}` : ''}</> : 'Sin conectar'}</p>
                {s.gcalError && <p className="font-body-sm text-danger">{s.gcalError}</p>}
              </div>
              {s.gcalToken ? <GcalButtons staffId={s.id} /> : direct ? <a href={`/api/google/calendario?staff=${s.id}`} className="btn-primary btn-sm"><Icon name="event" className="text-[18px]" />Conectar Google Calendar</a> : null}
            </div>
            <details className="mt-3 group">
              <summary className="cursor-pointer list-none font-label-md text-secondary flex items-center gap-1"><Icon name="link" className="text-[16px]" />{direct ? 'O usa el enlace de calendario (Apple, Outlook, Google)' : 'Enlace de calendario para Google, Apple u Outlook'}<Icon name="expand_more" className="text-[16px] transition group-open:rotate-180" /></summary>
              <div className="mt-2 flex items-center gap-2"><input readOnly value={icsUrl(s.id)} className="input font-mono text-[12px]" aria-label="Enlace de calendario" /><CopyLink url={icsUrl(s.id)} /></div>
              <p className="mt-1 font-body-sm text-on-surface-variant">En Google Calendar (computador): Otros calendarios → + → Desde URL → pega el enlace. Google lo actualiza cada pocas horas. Es privado: no lo compartas.</p>
            </details>
          </section>
        ))}
      </div>
      {!direct && perms === 'ALL' && <p className="mt-4 font-body-sm text-on-surface-variant flex gap-1"><Icon name="info" className="text-[16px]" />La conexión directa (copia al instante) se activa muy pronto. Mientras tanto, el enlace de calendario funciona igual, con unas horas de demora.</p>}
    </>
  );
}
