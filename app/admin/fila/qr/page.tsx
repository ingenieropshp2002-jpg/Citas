import QRCode from 'qrcode';
import { requireBusiness } from '@/lib/auth';
import { PrintButton } from '../../qr/PrintButton';

export const metadata = { title: 'QR de la fila' };
// Afiche para la entrada: quien llega sin cita escanea, toma su turno y puede esperar afuera.
export default async function FilaQr() {
  const { business: b } = await requireBusiness('agenda');
  const url = `${process.env.APP_URL || 'http://localhost:3000'}/negocio/${b.slug}/fila`;
  const qr = await QRCode.toDataURL(url, { margin: 1, width: 520, color: { dark: '#0d2538' } });
  return (
    <>
      <div className="flex justify-end gap-2 mb-4 print:hidden"><PrintButton /></div>
      <article className="mx-auto max-w-[600px] bg-white text-[#0d2538] rounded-3xl shadow-raised p-10 text-center print:shadow-none print:rounded-none">
        <p className="uppercase tracking-[0.2em] text-[13px] font-bold text-[#7a5c00]">{b.name}</p>
        <h1 className="font-display text-[44px] leading-tight mt-2">¿Llegaste <i>sin cita?</i></h1>
        <p className="mt-2 text-[17px]">Escanea, toma tu turno y espera donde quieras. Te avisamos por WhatsApp cuando te falte poco.</p>
        <img src={qr} alt="QR de la fila virtual" className="mx-auto mt-6 w-[300px] h-[300px]" />
        <p className="mt-3 font-mono text-[13px] break-all">{url.replace(/^https?:\/\//, '')}</p>
        <p className="mt-6 border-t border-black/10 pt-4 text-[14px]">Las personas con cita se atienden a su hora. Los turnos entran en los espacios libres.</p>
      </article>
    </>
  );
}
