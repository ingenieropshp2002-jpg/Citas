'use client';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { time12 } from '@/lib/format';
import { clientPushKey, heldSlots, watchSlot } from '@/app/(cliente)/reservar/espera';

type Held = Awaited<ReturnType<typeof heldSlots>>[number];
const toKey = (s: string) => { const t = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)); return Uint8Array.from(t, c => c.charCodeAt(0)); };

/** Pide permiso y suscribe este teléfono a los avisos (si el navegador lo permite). */
export async function subscribeDevice() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return null;
    if ((await Notification.requestPermission()) !== 'granted') return null;
    const r = (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.register('/sw.js'));
    await navigator.serviceWorker.ready;
    const sub = (await r.pushManager.getSubscription()) || (await r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(await clientPushKey()) }));
    return sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  } catch { return null; }
}

/** Horarios apartados por otra persona mientras paga el abono, con "Avísame si se libera". */
export function HeldSlots({ businessId, date, staffId, serviceIds }: { businessId: string; date: string; staffId: string | null; serviceIds: string[] }) {
  const [list, setList] = useState<Held[]>([]); const [busy, setBusy] = useState(''); const [msg, setMsg] = useState<Record<string, string>>({});
  useEffect(() => { let on = true; heldSlots(businessId, date, staffId).then(r => on && setList(r)).catch(() => {}); return () => { on = false; }; }, [businessId, date, staffId]);
  if (!list.length) return null;
  const key = (h: Held) => h.staffId + h.start;
  async function avisar(h: Held) {
    setBusy(key(h));
    const sub = await subscribeDevice();
    const r = await watchSlot({ businessId, staffId: h.staffId, start: h.start, serviceIds, sub });
    setBusy('');
    if ('error' in r && r.error) { setMsg(m => ({ ...m, [key(h)]: r.error! })); return; }
    setList(l => l.map(x => (key(x) === key(h) ? { ...x, watching: true } : x)));
    setMsg(m => ({ ...m, [key(h)]: sub ? 'Te avisaremos con una notificación si se libera.' : `Activa las notificaciones${/iphone|ipad/i.test(navigator.userAgent) ? ' (en iPhone, agrega la app a la pantalla de inicio)' : ''} para recibir el aviso, o vuelve a revisar${h.until ? ` a las ${time12(h.until)}` : ' más tarde'}.` }));
  }
  return (
    <div className="mt-space-md rounded-xl border border-gold/40 bg-secondary-fixed/15 p-space-sm">
      <p className="font-label-lg flex items-center gap-2"><Icon name="hourglass_top" className="text-secondary text-[20px]" />Horarios apartados mientras otra persona paga el abono</p>
      <p className="font-body-sm text-on-surface-variant mt-0.5">Si no paga a tiempo, el horario se libera. Toca "Avísame" y te llega un aviso para tomarlo antes que nadie.</p>
      <ul className="mt-2 space-y-2">
        {list.map(h => (
          <li key={key(h)} className="rounded-lg bg-surface-container-lowest p-2.5">
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0"><p className="font-label-lg tnum">{time12(h.time)} · {h.staffName}</p><p className="font-body-sm text-on-surface-variant">{h.reviewing ? 'El negocio está revisando su comprobante' : h.until ? `Se libera a las ${time12(h.until)} si no paga` : 'Esperando el abono'}</p></div>
              {h.watching ? <span className="font-label-md text-[#059669] flex items-center gap-1"><Icon name="notifications_active" className="text-[18px]" />En espera</span>
                : <button type="button" disabled={busy === key(h)} onClick={() => avisar(h)} className="btn-outline btn-sm shrink-0"><Icon name="notifications" className="text-[16px]" />{busy === key(h) ? '…' : 'Avísame'}</button>}
            </div>
            {msg[key(h)] && <p className="font-body-sm text-on-surface-variant mt-1">{msg[key(h)]}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
