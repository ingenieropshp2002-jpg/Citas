'use client';
import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

export type MapPoint = { slug: string; name: string; lat: number; lng: number; from: string; rating: string; img: string | null; open: boolean };
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** Mapa de resultados del buscador (OpenStreetMap, sin llave). */
export function SearchMap({ points, here }: { points: MapPoint[]; here: { lat: number; lng: number } | null }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let map: import('leaflet').Map | null = null; let dead = false;
    import('leaflet').then(L => {
      if (dead || !el.current) return;
      map = L.map(el.current, { scrollWheelZoom: false });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);
      const pin = (on: boolean) => L.divIcon({ className: '', iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -28], html: `<div style="width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#0d2538;border:3px solid ${on ? '#C9A227' : '#fff'};box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>` });
      const bounds = L.latLngBounds([]);
      for (const p of points) {
        const m = L.marker([p.lat, p.lng], { icon: pin(p.open), title: p.name }).addTo(map);
        m.bindPopup(`<a href="/negocio/${encodeURIComponent(p.slug)}" style="display:block;width:190px;color:inherit;text-decoration:none">${p.img ? `<img src="${esc(p.img)}" alt="" style="width:100%;height:90px;object-fit:cover;border-radius:8px">` : ''}<b style="display:block;margin-top:6px">${esc(p.name)}</b><span style="font-size:12px;color:#555">${esc(p.rating)}${p.open ? ' · Abierto' : ''}</span></a><a href="/reservar/${encodeURIComponent(p.slug)}" style="display:block;margin-top:6px;text-align:center;background:#0d2538;color:#fff;border-radius:8px;padding:6px;text-decoration:none;font-weight:600">Reservar</a>`);
        bounds.extend([p.lat, p.lng]);
      }
      if (here) { L.circleMarker([here.lat, here.lng], { radius: 7, color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }).addTo(map).bindTooltip('Estás aquí'); bounds.extend([here.lat, here.lng]); }
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 }); else map.setView([4.65, -74.1], 6);
    });
    return () => { dead = true; map?.remove(); };
  }, [points, here]);
  return <div ref={el} className="w-full h-[60vh] min-h-[360px] rounded-2xl overflow-hidden shadow-md z-0 relative" />;
}
