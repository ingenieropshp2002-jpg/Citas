'use client';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

/** Respuesta inmediata al tocar: barra de carga arriba al abrir un enlace y botón "ocupado" al enviar un formulario. */
export function Feedback() {
  const path = usePathname(); const sp = useSearchParams();
  const [on, setOn] = useState(false);
  const pending = useRef<Set<HTMLElement>>(new Set());
  const clear = () => { setOn(false); pending.current.forEach(b => b.removeAttribute('data-pending')); pending.current.clear(); };

  useEffect(() => { clear(); }, [path, sp]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const start = (ms = 15000) => { setOn(true); clearTimeout(timer); timer = setTimeout(clear, ms); };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const u = new URL(a.href, location.href);
      if (u.origin !== location.origin || u.pathname.startsWith('/api/')) return;
      if (u.pathname === location.pathname && u.search === location.search) return;
      start();
    };
    const onSubmit = (e: SubmitEvent) => {
      const f = e.target as HTMLFormElement;
      if (f.method === 'dialog') return;
      const btn = (e.submitter as HTMLElement | null) || f.querySelector<HTMLElement>('button:not([type=button]),input[type=submit]');
      // Se marca en el siguiente ciclo para no cambiar el envío en curso.
      setTimeout(() => {
        // Solo formularios que van al servidor: acciones de React (action="javascript:…") o envíos normales.
        const reactAction = (f.getAttribute('action') || '').startsWith('javascript:');
        if (e.defaultPrevented && !reactAction) return;
        if (btn) { btn.setAttribute('data-pending', ''); pending.current.add(btn); }
        start();
        // Cuando la página responde (aparece un mensaje o cambia el formulario), se quita el "ocupado".
        const mo = new MutationObserver(() => { mo.disconnect(); setTimeout(clear, 50); });
        setTimeout(() => mo.observe(f, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-busy'] }), 120);
        setTimeout(() => mo.disconnect(), 15000);
      }, 0);
    };
    document.addEventListener('click', onClick, true);
    document.addEventListener('submit', onSubmit);
    return () => { document.removeEventListener('click', onClick, true); document.removeEventListener('submit', onSubmit); clearTimeout(timer); };
  }, []);

  return <div aria-hidden className={`route-bar ${on ? 'route-bar-on' : ''}`} />;
}
