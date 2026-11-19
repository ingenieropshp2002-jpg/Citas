'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';

type Me = { name: string; avatar: string | null } | null;
// Sin memoria entre páginas: así refleja al instante un ingreso o una salida.
const loadMe = (): Promise<Me> => fetch('/api/yo', { credentials: 'same-origin', cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null);

/** Avatar del usuario o botón «Ingresar». Se resuelve en el navegador para que la página pública sea igual para todos. */
export function UserChip({ href, label, loginHref }: { href: string; label: string; loginHref: string }) {
  const [me, setMe] = useState<Me | undefined>(undefined);
  useEffect(() => { let on = true; loadMe().then(m => on && setMe(m)); return () => { on = false; }; }, []);
  if (me === undefined) return <span className="w-9 h-9" aria-hidden />;
  return me ? (
    <Link href={href} aria-label={label} className="w-9 h-9 rounded-full bg-secondary-fixed p-[1px] overflow-hidden flex items-center justify-center">
      {me.avatar ? <img src={me.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : <span className="font-label-lg text-on-secondary-fixed">{me.name.charAt(0)}</span>}
    </Link>
  ) : (
    <Link href={loginHref} aria-label="Ingresar" className="btn-primary btn-sm"><Icon name="login" className="text-[18px]" /><span className="hidden sm:inline">Ingresar</span></Link>
  );
}
