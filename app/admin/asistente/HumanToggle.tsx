'use client';
import { useTransition } from 'react';
import { setHuman } from '../_actions/asistente';
export function HumanToggle({ id, human }: { id: string; human: boolean }) {
  const [pending, start] = useTransition();
  return <button type="button" disabled={pending} onClick={() => start(() => setHuman(id, !human))} className="btn-outline btn-sm">{human ? 'Devolver al asistente' : 'Lo atiendo yo (pausar 12 h)'}</button>;
}
