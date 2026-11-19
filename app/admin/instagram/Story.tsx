'use client';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';

const VARIANTS = [
  { key: 'agenda', top: 'Agenda abierta', title: 'Reserva tu cita\nen línea', foot: 'Elige servicio, profesional y hora' },
  { key: 'cupos', top: 'Esta semana', title: '¡Quedan cupos\ndisponibles!', foot: 'Reserva antes de que se acaben' },
  { key: 'nuevo', top: 'Novedad', title: 'Ahora reservas\nsin escribirnos', foot: 'Abierto las 24 horas' }
];

/** Genera en el navegador (sin gastar servidor) una historia de Instagram 1080×1920 con el QR y el enlace de reservas. */
export function StoryMaker({ name, color, light, icon, qr, url }: { name: string; color: string; light: boolean; icon: string; qr: string; url: string }) {
  const ref = useRef<HTMLCanvasElement>(null); const [v, setV] = useState(0); const [ready, setReady] = useState(false);
  useEffect(() => {
    const c = ref.current; if (!c) return; const g = c.getContext('2d')!; let live = true;
    const load = (src: string) => new Promise<HTMLImageElement | null>(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
    (async () => {
      await document.fonts?.ready;
      const [logo, code] = await Promise.all([load(icon), load(qr)]);
      if (!live) return;
      const W = 1080, H = 1920, ink = light ? '#0d2538' : '#ffffff', soft = light ? 'rgba(13,37,56,.7)' : 'rgba(255,255,255,.78)';
      const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, color); bg.addColorStop(1, light ? '#ffffff' : '#0b1b29'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(212,175,55,.9)'; g.fillRect(90, 150, 120, 8);
      g.textAlign = 'center';
      if (logo) { g.save(); g.beginPath(); g.arc(W / 2, 330, 110, 0, Math.PI * 2); g.closePath(); g.clip(); g.drawImage(logo, W / 2 - 110, 220, 220, 220); g.restore(); }
      g.fillStyle = ink; g.font = '600 64px "Playfair Display", Georgia, serif'; g.fillText(name.length > 26 ? name.slice(0, 25) + '…' : name, W / 2, 540);
      const V = VARIANTS[v];
      g.fillStyle = '#d4af37'; g.font = '700 40px Manrope, system-ui, sans-serif'; g.fillText(V.top.toUpperCase(), W / 2, 680);
      g.fillStyle = ink; g.font = '700 104px "Playfair Display", Georgia, serif'; V.title.split('\n').forEach((l, i) => g.fillText(l, W / 2, 810 + i * 120));
      // Tarjeta blanca con el QR
      const cx = W / 2 - 260, cy = 1060; g.fillStyle = '#ffffff'; g.beginPath(); g.roundRect(cx, cy, 520, 520, 40); g.fill();
      if (code) g.drawImage(code, cx + 40, cy + 40, 440, 440);
      g.fillStyle = soft; g.font = '500 40px Manrope, system-ui, sans-serif'; g.fillText(V.foot, W / 2, 1680);
      g.fillStyle = ink; g.font = '700 36px Manrope, system-ui, sans-serif'; g.fillText(url.replace(/^https?:\/\//, '').replace(/\?.*$/, ''), W / 2, 1750);
      setReady(true);
    })();
    return () => { live = false; };
  }, [v, name, color, light, icon, qr, url]);
  function download() { ref.current?.toBlob(b => { if (!b) return; const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `historia-${VARIANTS[v].key}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }, 'image/png'); }
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <canvas ref={ref} width={1080} height={1920} className="w-[200px] h-auto rounded-xl shadow-raised border border-parchment shrink-0 self-center sm:self-start" aria-label="Vista previa de la historia" />
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">{VARIANTS.map((x, i) => <button key={x.key} type="button" onClick={() => setV(i)} className={`chip ${v === i ? 'chip-on' : ''}`}>{x.top}</button>)}</div>
        <button type="button" disabled={!ready} onClick={download} className="btn-primary"><Icon name="download" className="text-[18px]" />Descargar historia</button>
        <ol className="list-decimal pl-5 font-body-sm text-on-surface-variant space-y-1">
          <li>Sube la imagen como historia.</li>
          <li>Toca el ícono de stickers y elige <b>Enlace</b>.</li>
          <li>Pega tu enlace de reservas y ponle de texto «Reserva aquí».</li>
          <li>Guárdala en tus historias destacadas como «Reservas».</li>
        </ol>
      </div>
    </div>
  );
}
