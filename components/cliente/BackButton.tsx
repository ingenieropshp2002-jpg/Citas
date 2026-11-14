'use client';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
export function BackButton({ fallback = '/' }: { fallback?: string }) {
  const r = useRouter();
  return <button aria-label="Volver" onClick={() => (history.length > 1 ? r.back() : r.push(fallback))} className="w-11 h-11 -ml-2 flex items-center justify-center rounded-full text-on-surface hover:text-primary transition-colors"><Icon name="arrow_back" className="text-[22px]" /></button>;
}
