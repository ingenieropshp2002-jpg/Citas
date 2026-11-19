'use client';
import { useState } from 'react';
import { PERMS, ROLES } from '@/lib/roles';

/** Rol del miembro del equipo: elegir uno marca sus permisos; tocar una casilla lo deja como «Personalizado». */
export function RolePicker({ initial }: { initial: string[] }) {
  const [perms, setPerms] = useState(initial);
  const match = ROLES.find(r => [...r.perms].sort().join() === [...perms].sort().join());
  return (
    <fieldset>
      <legend className="label">Rol y permisos en el Admin</legend>
      <div className="grid grid-cols-3 gap-2 mb-2" role="radiogroup" aria-label="Rol">
        {ROLES.map(r => (
          <button key={r.key} type="button" role="radio" aria-checked={match?.key === r.key} onClick={() => setPerms(r.perms)} className={`rounded-xl border p-2 text-left ${match?.key === r.key ? 'border-gold bg-secondary-fixed/25' : 'border-parchment'}`}>
            <span className="font-label-lg block">{r.label}</span><span className="font-body-sm text-on-surface-variant">{r.desc}</span>
          </button>
        ))}
      </div>
      {!match && <p className="font-label-md text-secondary mb-1">Personalizado</p>}
      <div className="grid grid-cols-2 gap-1">{PERMS.map(([v, l]) => <label key={v} className="flex items-center gap-2"><input type="checkbox" name="permissions" value={v} checked={perms.includes(v)} onChange={e => setPerms(p => e.target.checked ? [...p, v] : p.filter(x => x !== v))} className="accent-primary-container" />{l}</label>)}</div>
    </fieldset>
  );
}
