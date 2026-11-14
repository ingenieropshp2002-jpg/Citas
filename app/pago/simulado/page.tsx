import { cop, METHOD_LABEL } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';
import { simulate } from '../actions';
export default async function Simulado({ searchParams }: { searchParams: Promise<{ ref: string; monto: string; metodo?: string }> }) {
  const sp = await searchParams;
  return (
    <main className="min-h-screen flex items-center justify-center px-margin bg-surface-container-low">
      <div className="card-raised p-6 w-full max-w-sm text-center">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm uppercase">Pasarela de prueba</span>
        <h1 className="font-headline-sm text-headline-sm mt-3">Pago con {METHOD_LABEL[sp.metodo || ''] || 'pasarela'}</h1>
        <p className="font-currency-display text-currency-display mt-2 tnum">{cop(Number(sp.monto), true)}</p>
        <p className="text-on-surface-variant font-body-sm mt-2">Modo simulado: configure Wompi o Mercado Pago en el archivo .env para cobrar de verdad.</p>
        <div className="grid gap-2 mt-6">
          <form action={async () => { 'use server'; await simulate(sp.ref, true); }}><button className="btn-primary w-full"><Icon name="check_circle" className="text-[18px]" />Aprobar pago</button></form>
          <form action={async () => { 'use server'; await simulate(sp.ref, false); }}><button className="btn-danger w-full">Rechazar pago</button></form>
        </div>
      </div>
    </main>
  );
}
