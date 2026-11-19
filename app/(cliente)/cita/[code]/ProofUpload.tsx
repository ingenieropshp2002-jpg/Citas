'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';

const OK = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
export function ProofUpload({ code, has }: { code: string; has: boolean }) {
  const ref = useRef<HTMLInputElement>(null); const router = useRouter();
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  async function send(f: File) {
    setErr('');
    if (!OK.includes(f.type)) return setErr('Solo fotos JPG, PNG o WEBP, o un PDF.');
    if (f.size > 5 * 1024 * 1024) return setErr('El archivo pesa más de 5 MB.');
    setBusy(true);
    const fd = new FormData(); fd.append('file', f);
    try {
      const r = await fetch(`/api/abono/${code}`, { method: 'POST', body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setErr(j.error || 'No se pudo subir. Intenta de nuevo.'); else router.refresh();
    } catch { setErr('Sin conexión. Intenta de nuevo.'); } finally { setBusy(false); if (ref.current) ref.current.value = ''; }
  }
  return (
    <div>
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={e => e.target.files?.[0] && send(e.target.files[0])} />
      <button type="button" disabled={busy} onClick={() => ref.current?.click()} className={has ? 'btn-outline w-full' : 'btn-primary w-full'}>
        <Icon name={busy ? 'progress_activity' : 'upload_file'} className={`text-[18px] ${busy ? 'animate-spin' : ''}`} />{busy ? 'Subiendo…' : has ? 'Cambiar comprobante' : 'Subir comprobante'}
      </button>
      <p className="font-body-sm text-on-surface-variant mt-1 text-center">Foto o captura (JPG, PNG, WEBP) o PDF, hasta 5 MB.</p>
      {err && <p className="text-danger font-label-md mt-1 text-center">{err}</p>}
    </div>
  );
}
