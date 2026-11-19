'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { FORMULA_FIELDS, PHOTOS_PER_RECORD } from '@/lib/ficha';

type Opt = { id: string; label: string; service: string; staff: string; date: string };

/** Comprime la foto en el navegador (máx. 1280 px, JPEG) para que suba rápido y ocupe poco. */
function shrink(f: File): Promise<Blob> {
  return new Promise((ok, fail) => {
    const img = new Image(); const url = URL.createObjectURL(f);
    img.onload = () => {
      const k = Math.min(1, 1280 / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      const ctx = c.getContext('2d')!; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      const go = (q: number) => c.toBlob(b => { if (!b) return fail(new Error('No se pudo leer la foto.')); if (b.size > 850_000 && q > 0.45) go(q - 0.1); else ok(b); }, 'image/jpeg', q);
      go(0.8);
    };
    img.onerror = () => { URL.revokeObjectURL(url); fail(new Error('No se pudo leer la foto.')); };
    img.src = url;
  });
}

function Pics({ label, files, set }: { label: string; files: { f: File; u: string }[]; set: (x: { f: File; u: string }[]) => void }) {
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex flex-wrap gap-2">
        {files.map((x, i) => (
          <div key={x.u} className="relative w-20 h-20 rounded-xl overflow-hidden border border-parchment">
            <img src={x.u} alt="" className="w-full h-full object-cover" />
            <button type="button" aria-label="Quitar foto" onClick={() => set(files.filter((_, j) => j !== i))} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"><Icon name="close" className="text-[14px]" /></button>
          </div>
        ))}
        <label className="w-20 h-20 rounded-xl border-2 border-dashed border-parchment flex flex-col items-center justify-center cursor-pointer text-on-surface-variant hover:border-secondary">
          <Icon name="add_a_photo" /><span className="font-label-sm">Agregar</span>
          <input type="file" accept="image/*" multiple className="hidden" onChange={e => { const n = [...(e.target.files || [])].filter(f => f.type.startsWith('image/')).map(f => ({ f, u: URL.createObjectURL(f) })); set([...files, ...n]); e.target.value = ''; }} />
        </label>
      </div>
    </div>
  );
}

export function RecordForm({ customerId, visits, staffName }: { customerId: string; visits: Opt[]; staffName?: string }) {
  const r = useRouter(); const form = useRef<HTMLFormElement>(null);
  const [antes, setAntes] = useState<{ f: File; u: string }[]>([]);
  const [despues, setDespues] = useState<{ f: File; u: string }[]>([]);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const today = new Date(Date.now() - 5 * 3600_000).toISOString().slice(0, 10);
  function pickVisit(id: string) {
    const v = visits.find(x => x.id === id); const f = form.current; if (!v || !f) return;
    (f.elements.namedItem('service') as HTMLInputElement).value = v.service;
    (f.elements.namedItem('staffName') as HTMLInputElement).value = v.staff;
    (f.elements.namedItem('date') as HTMLInputElement).value = v.date;
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr('');
    if (antes.length + despues.length > PHOTOS_PER_RECORD) { setErr(`Máximo ${PHOTOS_PER_RECORD} fotos por visita.`); return; }
    setBusy(true);
    try {
      const fd = new FormData(e.currentTarget);
      for (const [k, list] of [['ANTES', antes], ['DESPUES', despues]] as const) for (const x of list) fd.append(k, await shrink(x.f), 'foto.jpg');
      const res = await fetch(`/api/ficha/${customerId}`, { method: 'POST', body: fd });
      const j = await res.json().catch(() => ({ error: 'No se pudo guardar.' }));
      if (!res.ok || j.error) { setErr(j.error || 'No se pudo guardar.'); return; }
      form.current?.reset(); setAntes([]); setDespues([]);
      form.current?.closest('dialog')?.close();
      r.refresh();
    } catch (x) { setErr((x as Error).message); } finally { setBusy(false); }
  }
  return (
    <form ref={form} onSubmit={submit} className="space-y-4">
      {visits.length > 0 && <label className="block"><span className="label">Cita (opcional)</span><select name="appointmentId" className="input" defaultValue="" onChange={e => pickVisit(e.target.value)}><option value="">Sin cita asociada</option>{visits.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}</select></label>}
      <div className="grid grid-cols-2 gap-3">
        <label><span className="label">Fecha</span><input type="date" name="date" defaultValue={today} className="input" /></label>
        <label><span className="label">Profesional</span><input name="staffName" defaultValue={staffName} className="input" maxLength={80} /></label>
      </div>
      <label className="block"><span className="label">Servicio</span><input name="service" className="input" placeholder="Color completo, mechas…" maxLength={200} /></label>
      <fieldset className="rounded-2xl border border-parchment p-3">
        <legend className="px-1 font-label-lg text-secondary flex items-center gap-1"><Icon name="palette" className="text-[18px]" />Fórmula de color</legend>
        <div className="grid grid-cols-2 gap-3">{FORMULA_FIELDS.map(([k, l, ph]) => <label key={k} className={k === 'tono' || k === 'zona' ? 'col-span-2' : ''}><span className="label">{l}</span><input name={`f_${k}`} className="input" placeholder={ph} maxLength={200} /></label>)}</div>
      </fieldset>
      <label className="block"><span className="label">Notas de la visita</span><textarea name="notes" rows={3} className="input" maxLength={2000} placeholder="Resultado, reacción del cuero cabelludo, recomendaciones…" /></label>
      <Pics label="Fotos de antes" files={antes} set={setAntes} />
      <Pics label="Fotos de después" files={despues} set={setDespues} />
      {err && <p role="alert" className="p-2 rounded-lg bg-[#FFF1F2] text-danger font-label-md">{err}</p>}
      <button disabled={busy} className="btn-primary w-full">{busy ? 'Guardando…' : 'Guardar ficha'}</button>
    </form>
  );
}
