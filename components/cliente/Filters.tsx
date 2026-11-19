'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';

const CATS = [['', 'Todos'], ['PELUQUERIA', 'Peluquería'], ['BARBERIA', 'Barbería'], ['SPA', 'Spa'], ['UNAS', 'Uñas']];
export function Filters({ cities }: { cities: string[] }) {
  const sp = useSearchParams(); const r = useRouter();
  const [open, setOpen] = useState(false);
  const set = (k: string, v: string) => { const p = new URLSearchParams(sp.toString()); p.delete('pagina'); if (v) p.set(k, v); else p.delete(k); r.push(`/buscar?${p.toString()}`); };
  const near = () => navigator.geolocation?.getCurrentPosition(pos => { const p = new URLSearchParams(sp.toString()); p.set('lat', pos.coords.latitude.toFixed(4)); p.set('lng', pos.coords.longitude.toFixed(4)); p.set('orden', 'distancia'); r.push(`/buscar?${p.toString()}`); });
  return (
    <div className="space-y-3">
      <form onSubmit={e => { e.preventDefault(); set('q', String(new FormData(e.currentTarget).get('q') || '')); }} className="relative">
        <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
        <input name="q" defaultValue={sp.get('q') || ''} className="input pl-12 pr-28 h-14 rounded-2xl shadow-card" placeholder="Negocio, servicio o ciudad" />
        <button className="btn-primary btn-sm absolute right-2 top-1/2 -translate-y-1/2">Buscar</button>
      </form>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {CATS.map(([v, l]) => <button key={v} onClick={() => set('cat', v)} className={`chip ${(sp.get('cat') || '') === v ? 'chip-on' : ''}`}>{l}</button>)}
        <button onClick={() => setOpen(!open)} className={`chip ${open ? 'chip-on' : ''}`}><Icon name="tune" className="text-[16px]" />Filtros</button>
        <button onClick={() => set('abierto', sp.get('abierto') ? '' : '1')} className={`chip ${sp.get('abierto') ? 'chip-on' : ''}`}><Icon name="schedule" className="text-[16px]" />Abierto ahora</button>
        <button onClick={near} className={`chip ${sp.get('orden') === 'distancia' ? 'chip-on' : ''}`}><Icon name="near_me" className="text-[16px]" />Cerca de mí</button>
      </div>
      {open && (
        <div className="card p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <label><span className="label">Ciudad</span><select className="input" defaultValue={sp.get('ciudad') || ''} onChange={e => set('ciudad', e.target.value)}><option value="">Todas</option>{cities.map(c => <option key={c}>{c}</option>)}</select></label>
          <label><span className="label">Precio hasta</span><select className="input" defaultValue={sp.get('max') || ''} onChange={e => set('max', e.target.value)}><option value="">Cualquiera</option><option value="50000">$50.000</option><option value="100000">$100.000</option><option value="200000">$200.000</option></select></label>
          <label><span className="label">Calificación</span><select className="input" defaultValue={sp.get('rating') || ''} onChange={e => set('rating', e.target.value)}><option value="">Todas</option><option value="4.5">4.5+</option><option value="4">4.0+</option></select></label>
          <label><span className="label">Ordenar por</span><select className="input" defaultValue={sp.get('orden') || ''} onChange={e => set('orden', e.target.value)}><option value="">Mejor calificados</option><option value="precio">Menor precio</option><option value="distancia">Distancia</option><option value="resenas">Más reseñas</option></select></label>
        </div>
      )}
    </div>
  );
}
