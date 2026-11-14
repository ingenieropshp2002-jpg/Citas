'use client';
import { useRef } from 'react';
import { Icon } from './Icon';
/** Panel lateral (modal) que se abre con un botón. */
export function Drawer({ trigger, title, children, triggerClass = 'btn-primary btn-sm' }: { trigger: React.ReactNode; title: string; children: React.ReactNode; triggerClass?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" className={triggerClass} onClick={() => ref.current?.showModal()}>{trigger}</button>
      <dialog ref={ref} className="backdrop:bg-primary-container/40 backdrop:backdrop-blur-sm m-0 ml-auto h-full max-h-none w-full max-w-lg bg-surface-container-lowest text-on-surface p-0 shadow-sheet">
        <div className="p-5 border-b border-parchment flex items-center justify-between sticky top-0 bg-surface-container-lowest z-10"><h3 className="font-headline-sm text-headline-sm">{title}</h3><button type="button" onClick={() => ref.current?.close()} aria-label="Cerrar" className="w-9 h-9 rounded-full hover:bg-surface-container flex items-center justify-center"><Icon name="close" /></button></div>
        <div className="p-5">{children}</div>
      </dialog>
    </>
  );
}
