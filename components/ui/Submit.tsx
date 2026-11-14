'use client';
import { useFormStatus } from 'react-dom';
export function Submit({ children, className = 'btn-primary', pendingText = 'Guardando…' }: { children: React.ReactNode; className?: string; pendingText?: string }) {
  const { pending } = useFormStatus();
  return <button disabled={pending} className={className}>{pending ? pendingText : children}</button>;
}
