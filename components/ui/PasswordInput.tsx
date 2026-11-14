'use client';
import { useState } from 'react';
import { Icon } from './Icon';
export function PasswordInput(props: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={show ? 'text' : 'password'} required={props.required ?? true} className={`input pr-12 ${props.className || ''}`} />
      <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={show}
        className="absolute inset-y-0 right-0 w-12 flex items-center justify-center text-on-surface-variant hover:text-on-surface">
        <Icon name={show ? 'visibility_off' : 'visibility'} className="text-[20px]" />
      </button>
    </div>
  );
}
