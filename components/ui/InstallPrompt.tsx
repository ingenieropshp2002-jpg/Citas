'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Icon } from './Icon';
import { InstallApp } from './InstallApp';

const KEY = 'rc_instalar_cerrado';
const DAYS = 14;
/** Aviso en el celular para instalar la app. No sale si ya está instalada; al cerrarlo vuelve en 14 días. */
export function InstallPrompt() {
  const path = usePathname();
  const [show, setShow] = useState(false);
  useEffect(() => {
    const installed = matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const phone = matchMedia('(max-width: 767px)').matches || /android|iphone|ipad|ipod/i.test(navigator.userAgent);
    let closed = 0; try { closed = Number(localStorage.getItem(KEY) || 0); } catch { /* sin almacenamiento */ }
    if (installed || !phone || Date.now() - closed < DAYS * 86400000) return;
    const t = setTimeout(() => setShow(true), 2500);
    return () => clearTimeout(t);
  }, []);
  // No estorba mientras reserva o paga
  if (!show || path.startsWith('/reservar') || path.startsWith('/pago')) return null;
  const close = () => { setShow(false); try { localStorage.setItem(KEY, String(Date.now())); } catch { /* nada */ } };
  return (
    <div className="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+4.25rem)] z-[45] md:hidden">
      <div className="card-raised p-3 pr-2 flex items-center gap-3 border border-gold/50">
        <span className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center shrink-0"><Icon name="install_mobile" className="text-[22px] text-secondary-fixed" /></span>
        <div className="flex-1 min-w-0"><p className="font-label-lg leading-tight">Instala la app</p><p className="font-body-sm text-on-surface-variant leading-tight">Reserva más rápido desde tu pantalla de inicio.</p></div>
        <span onClick={() => setTimeout(close, 400)}><InstallApp variant="header" /></span>
        <button type="button" aria-label="Cerrar" onClick={close} className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center shrink-0"><Icon name="close" className="text-[18px] text-on-surface-variant" /></button>
      </div>
    </div>
  );
}
