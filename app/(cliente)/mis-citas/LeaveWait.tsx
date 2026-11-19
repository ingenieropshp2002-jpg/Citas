'use client';
import { useTransition } from 'react';
import { leaveWaitlist } from '@/app/(cliente)/reservar/espera';
export function LeaveWait({ id }: { id: string }) {
  const [p, start] = useTransition();
  return <button type="button" disabled={p} onClick={() => start(() => leaveWaitlist(id))} className="btn-ghost btn-sm shrink-0">{p ? '…' : 'Salir'}</button>;
}
