import Link from 'next/link';
import QRCode from 'qrcode';
import { requireBusiness } from '@/lib/auth';
import { PageHeader } from '@/components/panel/PageHeader';
import { ActionForm } from '@/components/ui/ActionForm';
import { ImageInput } from '@/components/ui/ImageInput';
import { Icon } from '@/components/ui/Icon';
import { waLink } from '@/lib/notify';
import { APP_COLORS, appColor, isLight, shortName } from '@/lib/appBrand';
import { saveAppBrand } from '../_actions/app';
import { CopyLink } from '../configuracion/CopyLink';

export const metadata = { title: 'Tu app' };
export default async function TuApp() {
  const { business: b } = await requireBusiness('configuracion');
  const url = `${(process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '')}/negocio/${b.slug}?instalar=1`;
  const qr = await QRCode.toDataURL(url, { margin: 1, width: 240, color: { dark: '#0d2538' } });
  const color = appColor(b.appColor); const v = Date.now().toString(36);
  const icon = `/negocio/${b.slug}/icono/192?v=${v}`;
  return (
    <>
      <PageHeader eyebrow="Configuración" title="Tu app" subtitle="Tus clientes instalan la app de tu negocio, con tu logo, en su pantalla de inicio. Sin tiendas de apps." />
      <div className="grid xl:grid-cols-3 gap-4">
        <section className="card p-5 xl:col-span-2">
          <h2 className="h-section mb-3">Ícono y colores</h2>
          <ActionForm action={saveAppBrand}>
            <ImageInput name="logo" defaultValue={b.logo} label="Logo (cuadrado, mínimo 512 × 512)" />
            <label className="block"><span className="label">Nombre bajo el ícono (máx. 14 letras)</span><input name="appShortName" maxLength={14} defaultValue={b.appShortName || ''} placeholder={shortName({ name: b.name })} className="input" /></label>
            <fieldset><legend className="label">Color de la app</legend>
              <div className="flex flex-wrap gap-2">{APP_COLORS.map(c => (
                <label key={c} className="cursor-pointer"><input type="radio" name="appColor" value={c} defaultChecked={c === color} className="peer sr-only" /><span className="block w-10 h-10 rounded-xl border-2 border-parchment peer-checked:ring-2 peer-checked:ring-secondary peer-checked:ring-offset-2 peer-focus-visible:ring-2 peer-focus-visible:ring-secondary" style={{ background: c }} title={c} /></label>
              ))}
              <label className="flex items-center gap-2 font-body-sm"><input type="radio" name="appColor" value="custom" defaultChecked={!APP_COLORS.includes(color)} className="accent-primary-container" /><input type="color" name="appColorCustom" defaultValue={APP_COLORS.includes(color) ? '#0d2538' : color} className="w-10 h-10 rounded-xl border border-parchment" />Otro</label></div>
            </fieldset>
            <button className="btn-primary w-full">Guardar</button>
          </ActionForm>
        </section>
        <section className="card p-5 h-fit">
          <h2 className="h-section mb-3">Así se ve</h2>
          <div className="mx-auto w-56 rounded-[2rem] p-5 pt-8 bg-gradient-to-b from-[#1e3a5f] to-[#0b1724] shadow-sheet">
            <div className="grid grid-cols-3 gap-4 justify-items-center">
              {[0, 1].map(i => <div key={i} className="w-12 h-12 rounded-2xl bg-white/15" />)}
              <div className="flex flex-col items-center gap-1"><img src={icon} alt={`Ícono de ${b.name}`} className="w-12 h-12 rounded-2xl" /><span className="text-white text-[10px] leading-tight text-center w-16 truncate">{shortName(b)}</span></div>
              {[0, 1, 2].map(i => <div key={i} className="w-12 h-12 rounded-2xl bg-white/15" />)}
            </div>
          </div>
          <p className="font-body-sm text-on-surface-variant mt-3 text-center">Color de la barra: <span className="inline-block w-3 h-3 rounded-full align-middle border border-parchment" style={{ background: color }} /> {isLight(color) ? 'claro' : 'oscuro'}</p>
        </section>
        <section className="card p-5 xl:col-span-3">
          <h2 className="h-section mb-1">Comparte tu app</h2>
          <p className="text-on-surface-variant mb-3">Con este enlace tus clientes ven el botón «Instalar». En Android se instala con un toque; en iPhone se les muestran los 3 pasos.</p>
          <div className="flex flex-wrap items-center gap-4">
            <img src={qr} alt="QR para instalar la app" className="w-36 h-36 rounded-xl border border-parchment" />
            <div className="flex-1 min-w-[240px]">
              <code className="block px-3 py-2 rounded-lg bg-surface-container-low font-mono text-[13px] break-all">{url}</code>
              <div className="flex flex-wrap gap-2 mt-3">
                <CopyLink url={url} />
                <a className="btn-sm btn bg-[#25D366] text-white" href={waLink('', `📲 Instala la app de ${b.name} y reserva tus citas con un toque: ${url}`)} target="_blank" rel="noreferrer"><Icon name="share" className="text-[16px]" />Compartir por WhatsApp</a>
                <Link href="/admin/app/afiche" className="btn-outline btn-sm"><Icon name="qr_code_2" className="text-[16px]" />Afiche para el local</Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
