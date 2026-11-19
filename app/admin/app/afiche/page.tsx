import QRCode from 'qrcode';
import { requireBusiness } from '@/lib/auth';
import { appColor, isLight } from '@/lib/appBrand';
import { PrintButton } from '../../qr/PrintButton';

export const metadata = { title: 'Afiche de la app' };
// Afiche imprimible: el cliente escanea y le aparece el botón para instalar la app del negocio.
export default async function AficheApp() {
  const { business: b } = await requireBusiness('configuracion');
  const url = `${(process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '')}/negocio/${b.slug}?instalar=1`;
  const color = appColor(b.appColor); const light = isLight(color);
  const qr = await QRCode.toDataURL(url, { margin: 1, width: 520, color: { dark: '#0d2538' } });
  return (
    <>
      <div className="flex justify-end gap-2 mb-4 print:hidden"><PrintButton /></div>
      <article className="mx-auto max-w-[600px] bg-white text-[#0d2538] rounded-3xl shadow-raised overflow-hidden text-center print:shadow-none print:rounded-none">
        <div className="p-8 flex flex-col items-center" style={{ background: color, color: light ? '#0d2538' : '#fff' }}>
          <img src={`/negocio/${b.slug}/icono/512`} alt="" className="w-24 h-24 rounded-[1.6rem] shadow-raised" />
          <p className="mt-3 uppercase tracking-[0.2em] text-[13px] font-bold opacity-80">{b.name}</p>
          <h1 className="font-display text-[40px] leading-tight mt-1">Descarga <i>nuestra app</i></h1>
        </div>
        <div className="p-8">
          <p className="text-[17px]">Escanea con la cámara, toca <b>Instalar</b> y reserva tus citas con un toque.</p>
          <img src={qr} alt="QR para instalar la app" className="mx-auto mt-5 w-[280px] h-[280px]" />
          <p className="mt-3 text-[14px] text-black/60">Gratis · Sin tiendas de apps · Android y iPhone</p>
        </div>
      </article>
    </>
  );
}
