import QRCode from 'qrcode';
import { requireBusiness } from '@/lib/auth';
import { waLink } from '@/lib/notify';
import { PrintButton } from './PrintButton';

export const metadata = { title: 'QR de reservas' };
// Afiche imprimible para recepción: el cliente escanea al salir y agenda su próxima cita.
export default async function QrPoster() {
  const { business: b } = await requireBusiness('configuracion');
  const url = `${process.env.APP_URL || 'http://localhost:3000'}/reservar/${b.slug}?ref=qr`;
  const qr = await QRCode.toDataURL(url, { margin: 1, width: 520, color: { dark: '#0d2538' } });
  const wa = b.whatsapp ? waLink(b.whatsapp, `Hola ${b.name}, quiero reservar una cita.`) : null;
  const waQr = wa ? await QRCode.toDataURL(wa, { margin: 1, width: 240, color: { dark: '#0d2538' } }) : null;
  return (
    <>
      <div className="flex justify-end gap-2 mb-4 print:hidden"><PrintButton /></div>
      <article className="mx-auto max-w-[600px] bg-white text-[#0d2538] rounded-3xl shadow-raised p-10 text-center print:shadow-none print:rounded-none">
        <p className="uppercase tracking-[0.2em] text-[13px] font-bold text-[#7a5c00]">{b.name}</p>
        <h1 className="font-display text-[44px] leading-tight mt-2">Agenda tu <i>próxima cita</i></h1>
        <p className="mt-2 text-[17px]">Escanea con la cámara de tu celular y reserva en segundos, sin llamadas.</p>
        <img src={qr} alt="QR para reservar" className="mx-auto mt-6 w-[300px] h-[300px]" />
        <p className="mt-3 font-mono text-[13px] break-all">{url.replace(/^https?:\/\//, '').replace('?ref=qr', '')}</p>
        {waQr && <div className="mt-8 flex items-center justify-center gap-4 border-t border-black/10 pt-6"><img src={waQr} alt="QR de WhatsApp" className="w-28 h-28" /><p className="text-left text-[15px]"><b>¿Prefieres WhatsApp?</b><br />Escanea y escríbenos para reservar.</p></div>}
      </article>
    </>
  );
}
