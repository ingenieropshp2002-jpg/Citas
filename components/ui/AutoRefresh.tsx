'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
/** Recarga los datos del servidor cada cierto tiempo (fila y huecos en tiempo real). */
export function AutoRefresh({ seconds = 20 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === 'visible') router.refresh(); }, seconds * 1000);
    const v = () => { if (document.visibilityState === 'visible') router.refresh(); };
    document.addEventListener('visibilitychange', v);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', v); };
  }, [router, seconds]);
  return null;
}
