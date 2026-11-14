'use client';
import { useEffect, useRef, useState } from 'react';

/** Pestañas fijas de la página del negocio: resaltan la sección que se está viendo. */
export function ShopTabs({ tabs }: { tabs: { id: string; label: string }[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const bar = useRef<HTMLDivElement>(null);
  const lock = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      if (Date.now() < lock.current) return;
      const line = 150; // altura del encabezado + pestañas
      let current = tabs[0]?.id;
      for (const t of tabs) {
        const el = document.getElementById(t.id);
        if (el && el.getBoundingClientRect().top <= line) current = t.id;
      }
      // Al llegar al final de la página, la última sección queda activa
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = tabs[tabs.length - 1]?.id;
      setActive(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, [tabs]);

  useEffect(() => {
    const el = bar.current?.querySelector<HTMLElement>(`[data-tab="${active}"]`);
    if (el && bar.current) bar.current.scrollTo({ left: el.offsetLeft - 16, behavior: 'smooth' });
  }, [active]);

  return (
    <nav aria-label="Secciones del negocio" className="mt-space-lg px-margin sticky top-16 z-30 bg-surface/95 backdrop-blur-md py-space-xs">
      <div ref={bar} className="flex items-center gap-space-xs overflow-x-auto no-scrollbar">
        {tabs.map(t => {
          const on = t.id === active;
          return (
            <a key={t.id} data-tab={t.id} href={`#${t.id}`} aria-current={on ? 'true' : undefined}
              onClick={() => { setActive(t.id); lock.current = Date.now() + 900; }}
              className={`px-space-md py-2 rounded-full font-label-md text-label-md whitespace-nowrap transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${on ? 'bg-primary-container text-on-primary dark:text-on-primary-container shadow-md' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}`}>
              {t.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
