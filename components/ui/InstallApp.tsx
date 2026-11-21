'use client';
import { useEffect, useState } from 'react';
import { Icon } from './Icon';

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };
let deferred: BIPEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e as BIPEvent; listeners.forEach(f => f()); });
  window.addEventListener('appinstalled', () => { deferred = null; listeners.forEach(f => f()); });
}

/** Botón "Instalar app": usa el aviso nativo (Android/Chrome/Edge) o muestra los pasos en iPhone. */
export function InstallApp({ name = 'Registro Citas', variant = 'button', icon }: { name?: string; variant?: 'button' | 'tile' | 'banner' | 'header'; icon?: string }) {
  const [, force] = useState(0);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [help, setHelp] = useState(false);
  useEffect(() => {
    const f = () => force(n => n + 1);
    listeners.add(f);
    setInstalled(matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
    return () => { listeners.delete(f); };
  }, []);
  if (installed) return null;

  const click = async () => {
    if (deferred) { await deferred.prompt(); const r = await deferred.userChoice; if (r.outcome === 'accepted') { deferred = null; setInstalled(true); } return; }
    setHelp(true);
  };
  const label = 'Instalar app';
  return (
    <>
      {variant === 'header'
        ? <button type="button" onClick={click} aria-label="Instalar app" className="h-9 px-2.5 min-[380px]:px-3 rounded-full bg-gold text-primary-container font-label-md text-label-md font-bold flex items-center gap-1 shadow-sm hover:brightness-105 active:scale-95 transition"><Icon name="download" className="text-[18px]" /><span className="hidden min-[380px]:inline">Instalar</span></button>
        : variant === 'banner'
        ? <div className="card-raised p-4 flex items-center gap-3 border border-secondary/40">{icon && <img src={icon} alt="" className="w-14 h-14 rounded-2xl shrink-0" />}<div className="flex-1 min-w-0"><p className="font-title-md text-title-md">Instala la app de {name}</p><p className="font-body-sm text-on-surface-variant">Reserva y mira tus citas con un toque, desde tu pantalla de inicio.</p></div><button type="button" onClick={click} className="btn-primary btn-sm shrink-0"><Icon name="install_mobile" className="text-[18px]" />Instalar</button></div>
        : variant === 'tile'
        ? <button type="button" onClick={click} className="flex flex-col items-center justify-center p-space-sm bg-surface-container-low hover:bg-surface-container active:scale-95 rounded-xl transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"><Icon name="install_mobile" className="text-[22px] text-secondary mb-1" /><span className="font-label-md text-label-md text-primary font-bold">{label}</span></button>
        : <button type="button" onClick={click} className="btn-ghost btn-sm"><Icon name="install_mobile" className="text-[18px]" />{label}</button>}
      {help && (
        <div role="dialog" aria-modal="true" aria-labelledby="install-title" className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setHelp(false)}>
          <div className="w-full max-w-sm card-raised p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <h2 id="install-title" className="font-title-lg text-title-lg text-primary-container dark:text-primary">Instala {name}</h2>
              <button type="button" aria-label="Cerrar" onClick={() => setHelp(false)} className="w-9 h-9 -mt-1 -mr-2 rounded-full hover:bg-surface-container flex items-center justify-center"><Icon name="close" className="text-[20px]" /></button>
            </div>
            <p className="mt-1 text-on-surface-variant font-body-sm text-body-sm">Tenla en tu pantalla de inicio y abre tus reservas con un toque.</p>
            <ol className="mt-4 space-y-3 font-body-md text-body-md">
              {ios ? <>
                <li className="flex gap-3"><span className="step">1</span><span>Toca <Icon name="ios_share" className="text-[18px] align-[-3px]" /> <b>Compartir</b> en la barra de Safari.</span></li>
                <li className="flex gap-3"><span className="step">2</span><span>Elige <b>Agregar a inicio</b>.</span></li>
                <li className="flex gap-3"><span className="step">3</span><span>Toca <b>Agregar</b>.</span></li>
              </> : <>
                <li className="flex gap-3"><span className="step">1</span><span>Abre el menú <Icon name="more_vert" className="text-[18px] align-[-3px]" /> del navegador.</span></li>
                <li className="flex gap-3"><span className="step">2</span><span>Elige <b>Instalar app</b> o <b>Agregar a la pantalla de inicio</b>.</span></li>
              </>}
            </ol>
            <button type="button" onClick={() => setHelp(false)} className="btn-primary w-full mt-6">Entendido</button>
          </div>
        </div>
      )}
    </>
  );
}
