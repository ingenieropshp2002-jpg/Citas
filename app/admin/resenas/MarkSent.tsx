'use client';
import { useTransition } from 'react';
import { Icon } from '@/components/ui/Icon';
import { markReviewRequested } from '../_actions/resenas';

/** Abre WhatsApp con el mensaje listo y saca la cita de la lista. */
export function MarkSent({ id, href }: { id: string; href: string }) {
  const [pending, start] = useTransition();
  return <a href={href} target="_blank" rel="noreferrer" aria-disabled={pending} onClick={() => start(() => markReviewRequested(id))} className="btn-outline btn-sm"><Icon name="chat" className="text-[16px] text-[#059669]" />Pedir reseña</a>;
}
