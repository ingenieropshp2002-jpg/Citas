'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';

// Favoritos guardados en este dispositivo: no hace falta cuenta.
export type Fav = { slug: string; name: string; img: string | null; place: string; category: string };
const KEY = 'rc_favs';
const EVT = 'rc-favs';
function read(): Fav[] { try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } }
function write(list: Fav[]) { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* modo privado */ } window.dispatchEvent(new Event(EVT)); }
export function useFavorites() {
  const [list, setList] = useState<Fav[] | null>(null);
  useEffect(() => { const up = () => setList(read()); up(); window.addEventListener(EVT, up); window.addEventListener('storage', up); return () => { window.removeEventListener(EVT, up); window.removeEventListener('storage', up); }; }, []);
  return list;
}
export function toggleFavorite(f: Fav) { const l = read(); write(l.some(x => x.slug === f.slug) ? l.filter(x => x.slug !== f.slug) : [f, ...l]); }

const TILE = 'flex flex-col items-center justify-center p-space-sm bg-surface-container-low hover:bg-surface-container active:scale-95 rounded-xl transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold';

export function FavButton({ fav, variant = 'tile' }: { fav: Fav; variant?: 'tile' | 'icon' }) {
  const list = useFavorites(); const on = !!list?.some(x => x.slug === fav.slug);
  const click = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(fav); };
  if (variant === 'icon') return (
    <button type="button" onClick={click} aria-pressed={on} aria-label={on ? 'Quitar de favoritos' : 'Guardar en favoritos'}
      className="w-9 h-9 rounded-full bg-surface-container-lowest/90 backdrop-blur flex items-center justify-center shadow-sm active:scale-90 transition"><Icon name="favorite" fill={on} className={`text-[20px] ${on ? 'text-[#E11D48]' : 'text-on-surface-variant'}`} /></button>
  );
  return (
    <button type="button" onClick={click} aria-pressed={on} className={TILE}><Icon name="favorite" fill={on} className={`text-[22px] mb-1 ${on ? 'text-[#E11D48]' : 'text-secondary'}`} /><span className="font-label-md text-label-md text-primary font-bold">{on ? 'Guardado' : 'Guardar'}</span></button>
  );
}

export function ShareButton({ title, text }: { title: string; text: string }) {
  const [done, setDone] = useState(false);
  const click = async () => {
    const url = window.location.href.split('#')[0];
    if (navigator.share) { try { await navigator.share({ title, text, url }); return; } catch { return; } }
    try { await navigator.clipboard.writeText(url); setDone(true); setTimeout(() => setDone(false), 2000); } catch { window.prompt('Copia el enlace', url); }
  };
  return <button type="button" onClick={click} className={TILE}><Icon name={done ? 'check' : 'share'} className="text-[22px] text-secondary mb-1" /><span className="font-label-md text-label-md text-primary font-bold">{done ? 'Enlace copiado' : 'Compartir'}</span></button>;
}

export function FavoritesList() {
  const list = useFavorites();
  if (list === null) return <div className="grid sm:grid-cols-2 gap-3 mt-5">{[0, 1].map(i => <div key={i} className="skeleton h-24" />)}</div>;
  if (!list.length) return (
    <div className="card p-8 mt-5 text-center">
      <Icon name="favorite" className="text-[36px] text-secondary" />
      <p className="mt-2 font-title-md text-title-md">Aún no tienes favoritos</p>
      <p className="mt-1 text-on-surface-variant">Toca el corazón en cualquier negocio para guardarlo aquí y reservar más rápido.</p>
      <Link href="/buscar" className="btn-gold mt-4 inline-flex">Explorar negocios</Link>
    </div>
  );
  return (
    <div className="grid sm:grid-cols-2 gap-3 mt-5">
      {list.map(f => (
        <div key={f.slug} className="card p-3 flex items-center gap-3">
          <Link href={`/negocio/${f.slug}`} className="flex items-center gap-3 flex-1 min-w-0">
            <span className="w-16 h-16 rounded-xl overflow-hidden bg-surface-container shrink-0">{f.img && <img src={f.img} alt="" className="w-full h-full object-cover" />}</span>
            <span className="min-w-0"><span className="block font-title-md text-title-md truncate">{f.name}</span><span className="block font-body-sm text-body-sm text-on-surface-variant truncate">{f.place}</span></span>
          </Link>
          <Link href={`/reservar/${f.slug}`} className="btn-gold btn-sm shrink-0">Reservar</Link>
          <FavButton fav={f} variant="icon" />
        </div>
      ))}
    </div>
  );
}
