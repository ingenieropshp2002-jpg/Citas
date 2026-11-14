'use client';
import { useState } from 'react';
import { Icon } from './Icon';

/** Selector de foto: la comprime en el navegador (máx. 700 px, JPEG) y la envía en un campo oculto. */
export function ImageInput({ name, defaultValue, label = 'Foto' }: { name: string; defaultValue?: string | null; label?: string }) {
  const [val, setVal] = useState(defaultValue || '');
  const [err, setErr] = useState('');
  async function onFile(f?: File) {
    setErr('');
    if (!f) return;
    if (!f.type.startsWith('image/')) { setErr('Elige una imagen.'); return; }
    const img = new Image(); const url = URL.createObjectURL(f);
    img.onload = () => {
      const max = 700; const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      const ctx = c.getContext('2d')!; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
      let q = 0.82; let out = c.toDataURL('image/jpeg', q);
      while (out.length > 450_000 && q > 0.4) { q -= 0.1; out = c.toDataURL('image/jpeg', q); }
      URL.revokeObjectURL(url);
      if (out.length > 450_000) { setErr('La imagen es muy pesada.'); return; }
      setVal(out);
    };
    img.onerror = () => setErr('No se pudo leer la imagen.');
    img.src = url;
  }
  return (
    <div>
      <span className="label">{label}</span>
      <input type="hidden" name={name} value={val} />
      <div className="flex items-center gap-3">
        <div className="w-20 h-20 rounded-xl bg-surface-container overflow-hidden flex items-center justify-center shrink-0 border border-parchment">
          {val ? <img src={val} alt="" className="w-full h-full object-cover" /> : <Icon name="photo_camera" className="text-on-surface-variant" />}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="btn-outline btn-sm cursor-pointer"><Icon name="upload" className="text-[16px]" />{val ? 'Cambiar foto' : 'Subir foto'}<input type="file" accept="image/*" className="hidden" onChange={e => onFile(e.target.files?.[0])} /></label>
          {val && <button type="button" className="btn-ghost btn-sm text-danger" onClick={() => setVal('')}>Quitar</button>}
        </div>
      </div>
      {err && <p className="text-danger font-label-md mt-1">{err}</p>}
    </div>
  );
}
