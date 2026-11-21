'use client';
import { useState } from 'react';
import { LoginForms } from './LoginForms';
import { RegisterForm } from '@/app/registro/RegisterForm';

/** Mi cuenta: Entrar o Crear cuenta en la misma página. */
export function AccountTabs({ next, google, apple, phone, initial = 'entrar' }: { next: string; google: boolean; apple: boolean; phone: boolean; initial?: 'entrar' | 'crear' }) {
  const [tab, setTab] = useState(initial);
  return (
    <div>
      <div role="tablist" className="grid grid-cols-2 gap-1 p-1 rounded-xl border border-parchment bg-surface-container-lowest mb-4">
        {([['entrar', 'Entrar'], ['crear', 'Crear cuenta']] as const).map(([t, l]) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={`h-11 rounded-lg font-label-lg text-label-lg transition-colors ${tab === t ? 'bg-primary-container text-white shadow-sm' : 'text-on-surface-variant hover:text-primary'}`}>{l}</button>
        ))}
      </div>
      {tab === 'entrar' ? <LoginForms next={next} google={google} apple={apple} phone={phone} /> : <RegisterForm next={next} embedded />}
    </div>
  );
}
