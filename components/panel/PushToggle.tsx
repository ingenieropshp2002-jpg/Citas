'use client';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { pushPublicKey, removePushSubscription, savePushSubscription, testPush } from '@/app/admin/_actions/push';

type St = 'cargando' | 'no' | 'ios' | 'bloqueado' | 'apagado' | 'activo';
const toKey = (s: string) => { const t = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)); return Uint8Array.from(t, c => c.charCodeAt(0)); };

async function registration() {
  const r = (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.register('/sw.js'));
  return navigator.serviceWorker.ready.then(() => r);
}

/** Botón "Activar avisos" del panel: reservas y cancelaciones con sonido, aunque la app esté cerrada. */
export function PushToggle({ variant = 'sidebar' }: { variant?: 'sidebar' | 'banner' }) {
  const [st, setSt] = useState<St>('cargando'); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState('');
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    (async () => {
      try { if (localStorage.getItem('rc_push_oculto') === '1') setHidden(true); } catch {}
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent); const standalone = matchMedia('(display-mode: standalone)').matches;
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) { setSt(ios && !standalone ? 'ios' : 'no'); return; }
      if (Notification.permission === 'denied') { setSt('bloqueado'); return; }
      const r = await navigator.serviceWorker.getRegistration();
      const sub = await r?.pushManager.getSubscription();
      if (sub && Notification.permission === 'granted') { await savePushSubscription(sub.toJSON() as any); setSt('activo'); } else setSt('apagado');
    })().catch(() => setSt('no'));
  }, []);
  async function activar() {
    setBusy(true); setMsg('');
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setSt(perm === 'denied' ? 'bloqueado' : 'apagado'); return; }
      const r = await registration();
      const key = await pushPublicKey();
      let sub = await r.pushManager.getSubscription();
      if (sub && sub.options.applicationServerKey && btoa(String.fromCharCode(...new Uint8Array(sub.options.applicationServerKey))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') !== key) { await sub.unsubscribe(); sub = null; }
      sub ??= await r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(key) });
      const res = await savePushSubscription(sub.toJSON() as any);
      if ('error' in res) { setMsg(res.error!); return; }
      setSt('activo'); await testPush();
    } catch { setMsg('No se pudo activar en este navegador.'); } finally { setBusy(false); }
  }
  async function desactivar() {
    setBusy(true);
    try { const sub = await (await navigator.serviceWorker.getRegistration())?.pushManager.getSubscription(); if (sub) { await removePushSubscription(sub.endpoint); await sub.unsubscribe(); } setSt('apagado'); } finally { setBusy(false); }
  }
  if (variant === 'banner') {
    if (hidden || st !== 'apagado') return null;
    return (
      <div className="card p-4 mb-4 flex flex-wrap items-center gap-3 border border-gold/40">
        <Icon name="notifications_active" className="text-secondary text-[24px]" />
        <p className="flex-1 min-w-[200px] font-body-md"><b>Activa los avisos con sonido</b> en este teléfono para enterarte de cada reserva y cancelación, aunque la app esté cerrada.</p>
        <button onClick={activar} disabled={busy} className="btn-primary btn-sm">{busy ? 'Activando…' : 'Activar'}</button>
        <button onClick={() => { setHidden(true); try { localStorage.setItem('rc_push_oculto', '1'); } catch {} }} className="btn-ghost btn-sm">Ahora no</button>
      </div>
    );
  }
  const cls = 'w-full flex items-center gap-3 min-h-10 px-3 py-2 rounded-xl font-label-lg text-label-lg transition text-left';
  if (st === 'cargando' || st === 'no') return null;
  return (
    <div className="mt-2 shrink-0">
      {st === 'activo'
        ? <button onClick={desactivar} disabled={busy} className={`${cls} text-white/80 hover:bg-white/5`}><Icon name="notifications_active" className="text-[20px] text-secondary-fixed" /><span className="flex-1">Avisos activos<span className="block text-[11px] text-white/50 font-normal">Toca para apagarlos en este teléfono</span></span></button>
        : st === 'apagado'
          ? <button onClick={activar} disabled={busy} className={`${cls} border border-secondary-fixed/60 text-secondary-fixed hover:bg-white/10 font-semibold`}><Icon name="notifications_active" className="text-[20px] text-secondary-fixed" />{busy ? 'Activando…' : 'Activar avisos con sonido'}</button>
          : <p className="px-3 py-2 text-white/60 font-label-sm flex gap-2"><Icon name="notifications_off" className="text-[18px]" />{st === 'ios' ? 'En iPhone, primero agrega la app a la pantalla de inicio para recibir avisos.' : 'Los avisos están bloqueados. Permítelos en los ajustes del navegador para este sitio.'}</p>}
      {msg && <p className="px-3 text-danger font-label-sm">{msg}</p>}
    </div>
  );
}

/** Antes de cerrar sesión: este teléfono deja de recibir avisos de esta cuenta. */
export async function dropPushOnThisDevice() {
  try {
    const sub = await (await navigator.serviceWorker?.getRegistration())?.pushManager.getSubscription();
    if (sub) { await removePushSubscription(sub.endpoint); await sub.unsubscribe(); }
  } catch {}
}
