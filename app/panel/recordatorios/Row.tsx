'use client';
import { useOptimistic, useTransition } from 'react';
import { Icon } from '@/components/ui/Icon';
import { markClientConfirmed, markReminderSent } from '@/app/panel/_actions/agenda';

export function ReminderActions({ id, href, sent, confirmed }: { id: string; href: string | null; sent: boolean; confirmed: boolean }) {
  const [, start] = useTransition();
  const [st, set] = useOptimistic({ sent, confirmed }, (s, p: Partial<{ sent: boolean; confirmed: boolean }>) => ({ ...s, ...p }));
  return (
    <div className="flex flex-wrap items-center gap-2 justify-end">
      {href ? <a href={href} target="_blank" rel="noreferrer" onClick={() => start(async () => { set({ sent: true }); await markReminderSent(id); })}
        className={`btn-sm btn ${st.sent ? 'btn-ghost' : 'bg-[#25D366] text-white'}`}><Icon name="chat" className="text-[16px]" />{st.sent ? 'Reenviar' : 'Enviar recordatorio'}</a>
        : <span className="font-body-sm text-on-surface-variant">Sin celular</span>}
      <button onClick={() => start(async () => { set({ confirmed: !st.confirmed }); await markClientConfirmed(id, !st.confirmed); })}
        className={`btn-sm ${st.confirmed ? 'btn bg-[#ECFDF5] text-[#065F46]' : 'btn-outline'}`}><Icon name={st.confirmed ? 'check_circle' : 'radio_button_unchecked'} className="text-[16px]" />{st.confirmed ? 'Confirmó' : 'Marcar confirmó'}</button>
    </div>
  );
}
