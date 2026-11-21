'use client';
import { useState, useTransition } from 'react';
import { Icon } from '@/components/ui/Icon';
import { simulate } from '../_actions/asistente';

type Line = { role: 'user' | 'assistant'; content: string };
/** Chat de prueba con el asistente, como si fuera un cliente por WhatsApp. No crea citas reales. */
export function Simulator({ ready }: { ready: boolean }) {
  const [lines, setLines] = useState<Line[]>([]); const [text, setText] = useState(''); const [err, setErr] = useState(''); const [pending, start] = useTransition();
  function send() {
    const t = text.trim(); if (!t || pending) return;
    setErr(''); setText(''); const prev = lines; setLines([...prev, { role: 'user', content: t }]);
    start(async () => {
      const r = await simulate(prev, t);
      if ('error' in r && r.error) { setErr(r.error); setLines(prev); setText(t); return; }
      setLines(r.history || [...prev, { role: 'user', content: t }, { role: 'assistant', content: r.reply || '' }]);
    });
  }
  return (
    <section className="card p-5">
      <div className="flex items-center gap-2 mb-1"><h2 className="h-section flex-1">Pruébalo como cliente</h2>{lines.length > 0 && <button type="button" onClick={() => { setLines([]); setErr(''); }} className="btn-ghost btn-sm">Empezar de nuevo</button>}</div>
      <p className="font-body-sm text-on-surface-variant mb-3">Escríbele como lo haría un cliente. Es una prueba: no crea ni cambia citas.</p>
      <div className="rounded-xl bg-[#ECE5DD] p-3 h-[360px] overflow-y-auto space-y-2" aria-live="polite">
        {lines.length === 0 && <p className="text-center font-body-sm text-on-surface-variant mt-24">Por ejemplo: «Hola, ¿tienen cupo para un corte el sábado en la tarde?»</p>}
        {lines.map((l, i) => (
          <div key={i} className={`max-w-[85%] w-fit px-3 py-2 rounded-xl font-body-sm whitespace-pre-wrap break-words shadow-sm ${l.role === 'user' ? 'ml-auto bg-[#DCF8C6]' : 'bg-white'}`}>{l.content.split(/(\*[^*\n]+\*)/g).map((p, k) => p.startsWith('*') && p.endsWith('*') && p.length > 2 ? <b key={k}>{p.slice(1, -1)}</b> : p)}</div>
        ))}
        {pending && <div className="w-fit px-3 py-2 rounded-xl bg-white font-body-sm text-on-surface-variant shadow-sm">escribiendo…</div>}
      </div>
      {err && <p role="alert" className="mt-2 text-danger font-label-md">{err}</p>}
      <form className="mt-2 flex gap-2" onSubmit={e => { e.preventDefault(); send(); }}>
        <input value={text} onChange={e => setText(e.target.value)} className="input flex-1" placeholder={ready ? 'Escribe un mensaje…' : 'Disponible cuando la plataforma active la IA'} disabled={!ready} maxLength={1000} aria-label="Mensaje" />
        <button type="submit" disabled={!ready || pending || !text.trim()} className="btn-primary" aria-label="Enviar"><Icon name="send" className="text-[20px]" /></button>
      </form>
    </section>
  );
}
