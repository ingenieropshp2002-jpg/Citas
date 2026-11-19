import Link from 'next/link';
import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
import { PageHeader, Stat } from '@/components/panel/PageHeader';
import { ActionForm } from '@/components/ui/ActionForm';
import { DocStatus } from '@/components/ui/Status';
import { Icon } from '@/components/ui/Icon';
import { getConfig } from '@/lib/dian/issue';
import { cop, fechaCorta, hm, parseJson, ymd } from '@/lib/format';
import { saveDianConfig, saveFiscal, saveResolution } from '../_actions/dian';
import { DocActions } from './DocActions';

export const metadata = { title: 'Facturación electrónica' };
const TYPE: Record<string, string> = { FE: 'Factura electrónica', POS: 'Doc. equivalente POS', NC: 'Nota crédito / ajuste' };

export default async function Facturacion({ searchParams }: { searchParams: Promise<{ tab?: string; tipo?: string; estado?: string }> }) {
  const { business: b } = await requireBusiness('facturacion');
  const sp = await searchParams; const tab = sp.tab || 'documentos';
  const cfg = await getConfig(b.id);
  const tabs = [['documentos', 'Documentos'], ['config', 'Datos fiscales y resoluciones'], ['proveedor', 'Proveedor tecnológico'], ['guia', 'Cómo habilitarse ante la DIAN']];
  return (
    <>
      <PageHeader eyebrow="DIAN" title="Facturación electrónica" subtitle="Factura electrónica de venta, documento equivalente electrónico POS y notas crédito." />
      {cfg.environment === '2' && <div className="mb-4 p-3 rounded-xl bg-[#FFFBEB] text-[#92400E] flex gap-2"><Icon name="science" />Ambiente de pruebas/habilitación{cfg.provider === 'SIMULADO' ? ' y proveedor SIMULADO: los documentos se generan con CUFE/CUDE y XML, pero no se transmiten a la DIAN ni tienen validez fiscal.' : '.'}</div>}
      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-5">{tabs.map(([k, l]) => <Link key={k} href={`/admin/facturacion?tab=${k}`} className={`chip ${tab === k ? 'chip-on' : ''}`}>{l}</Link>)}</div>
      {tab === 'documentos' && <Documents businessId={b.id} tipo={sp.tipo} estado={sp.estado} />}
      {tab === 'config' && <Config b={b} />}
      {tab === 'proveedor' && (
        <div className="card p-5 max-w-2xl">
          <ActionForm action={saveDianConfig}>
            <div className="grid sm:grid-cols-2 gap-3">
              <label><span className="label">Ambiente</span><select name="environment" defaultValue={cfg.environment} className="input"><option value="2">2 · Habilitación / pruebas</option><option value="1">1 · Producción</option></select></label>
              <label><span className="label">Conector</span><select name="provider" defaultValue={cfg.provider} className="input"><option value="SIMULADO">Simulado (no transmite)</option><option value="HTTP_GENERICO">API REST del proveedor</option></select></label>
              <label className="sm:col-span-2"><span className="label">URL del API del proveedor tecnológico</span><input name="apiUrl" defaultValue={cfg.apiUrl || ''} className="input" placeholder="https://api.proveedor.com/v1/documents" /></label>
              <label className="sm:col-span-2"><span className="label">Token / API key</span><input name="apiToken" type="password" className="input" placeholder={cfg.apiToken ? '•••••• (guardado)' : ''} /></label>
              <label><span className="label">ID del software (DIAN)</span><input name="softwareId" defaultValue={cfg.softwareId || ''} className="input" /></label>
              <label><span className="label">PIN del software</span><input name="softwarePin" defaultValue={cfg.softwarePin || ''} className="input" /></label>
              <label className="sm:col-span-2"><span className="label">TestSetId (set de pruebas de habilitación)</span><input name="testSetId" defaultValue={cfg.testSetId || ''} className="input" /></label>
              <label><span className="label">Valor UVT vigente</span><input name="uvtValue" type="number" defaultValue={cfg.uvtValue} className="input" /></label>
              <label><span className="label">Tope documento POS (UVT)</span><input name="posMaxUvt" type="number" defaultValue={cfg.posMaxUvt} className="input" /></label>
            </div>
            <p className="font-body-sm text-on-surface-variant">Tope actual POS: {cop(cfg.uvtValue * cfg.posMaxUvt)}. Por encima se emite factura electrónica automáticamente.</p>
            <label className="flex items-center gap-2"><input type="checkbox" name="autoSend" defaultChecked={cfg.autoSend} className="accent-primary-container" />Transmitir automáticamente al cobrar</label>
            <button className="btn-primary">Guardar</button>
          </ActionForm>
        </div>
      )}
      {tab === 'guia' && <Guide />}
    </>
  );
}

async function Documents({ businessId, tipo, estado }: { businessId: string; tipo?: string; estado?: string }) {
  const docs = await db.electronicDocument.findMany({ where: { businessId, ...(tipo ? { docType: tipo } : {}), ...(estado ? { status: estado } : {}) }, orderBy: { createdAt: 'desc' }, take: 300 });
  const month = ymd(new Date()).slice(0, 7);
  const m = docs.filter(d => ymd(d.issuedAt).startsWith(month));
  const annulled = new Set(docs.filter(d => d.referenceId).map(d => d.referenceId));
  return (
    <>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
        <Stat label="Facturas del mes" value={String(m.filter(d => d.docType === 'FE').length)} icon="description" />
        <Stat label="Docs. POS del mes" value={String(m.filter(d => d.docType === 'POS').length)} icon="receipt" />
        <Stat label="IVA generado (mes)" value={cop(m.filter(d => d.docType !== 'NC').reduce((a, d) => a + d.taxTotal, 0) - m.filter(d => d.docType === 'NC').reduce((a, d) => a + d.taxTotal, 0))} icon="account_balance" tone="gold" />
        <Stat label="Pendientes de envío" value={String(docs.filter(d => ['GENERADO', 'CONTINGENCIA', 'RECHAZADO'].includes(d.status)).length)} icon="cloud_off" tone="danger" />
      </div>
      <form className="flex flex-wrap gap-2 mb-3"><input type="hidden" name="tab" value="documentos" />
        <select name="tipo" defaultValue={tipo || ''} className="input !w-auto flex-1 min-w-[140px]"><option value="">Todos los tipos</option><option value="FE">Facturas</option><option value="POS">POS</option><option value="NC">Notas crédito</option></select>
        <select name="estado" defaultValue={estado || ''} className="input !w-auto flex-1 min-w-[140px]"><option value="">Todos los estados</option><option value="GENERADO">Generado</option><option value="ENVIADO">Enviado</option><option value="ACEPTADO">Aceptado</option><option value="RECHAZADO">Rechazado</option><option value="CONTINGENCIA">Contingencia</option></select>
        <button className="btn-ghost">Filtrar</button></form>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>Número</th><th>Tipo</th><th>Fecha</th><th>Adquiriente</th><th className="text-right">IVA</th><th className="text-right">Total</th><th>Estado</th><th /></tr></thead>
          <tbody>{docs.map(d => { const buyer = parseJson<{ name: string; docNumber: string }>(d.buyer, { name: '', docNumber: '' }); return (
            <tr key={d.id} className="hover:bg-surface-container-low">
              <td>{d.saleId ? <Link href={`/admin/caja/ventas/${d.saleId}`} className="font-label-lg text-secondary">{d.fullNumber}</Link> : d.fullNumber}<p className="font-body-sm text-on-surface-variant font-mono truncate max-w-[180px]" title={d.cufe}>{d.cufe.slice(0, 16)}…</p></td>
              <td>{TYPE[d.docType]}{annulled.has(d.id) && <span className="block text-danger font-label-sm">Anulado</span>}</td>
              <td>{fechaCorta(d.issuedAt)} {hm(d.issuedAt)}</td>
              <td>{buyer.name}<p className="font-body-sm text-on-surface-variant">{buyer.docNumber}</p></td>
              <td className="text-right tnum">{cop(d.taxTotal)}</td><td className={`text-right tnum font-bold ${d.docType === 'NC' ? 'text-danger' : ''}`}>{d.docType === 'NC' ? '-' : ''}{cop(d.total)}</td>
              <td><DocStatus status={d.status} /></td>
              <td><DocActions id={d.id} canResend={['GENERADO', 'CONTINGENCIA', 'RECHAZADO'].includes(d.status)} canAnnul={d.docType !== 'NC' && !annulled.has(d.id)} /></td>
            </tr>); })}</tbody>
        </table>
        {docs.length === 0 && <p className="p-6 text-center text-on-surface-variant">Aún no hay documentos. Se generan al cobrar en la caja.</p>}
      </div>
    </>
  );
}

async function Config({ b }: { b: Awaited<ReturnType<typeof requireBusiness>>['business'] }) {
  const res = await db.numberingResolution.findMany({ where: { businessId: b.id }, orderBy: [{ active: 'desc' }, { validFrom: 'desc' }] });
  return (
    <div className="grid xl:grid-cols-2 gap-4">
      <section className="card p-5">
        <h2 className="h-section mb-3">Datos del emisor (RUT)</h2>
        <ActionForm action={saveFiscal}>
          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2"><span className="label">Razón social / nombre</span><input name="legalName" defaultValue={b.legalName || ''} className="input" required /></label>
            <label><span className="label">Tipo de documento</span><select name="docType" defaultValue={b.docType} className="input"><option value="31">NIT</option><option value="13">Cédula</option></select></label>
            <div className="grid grid-cols-[1fr_64px] gap-2"><label><span className="label">Número</span><input name="nit" defaultValue={b.nit || ''} className="input" required /></label><label><span className="label">DV</span><input name="dv" defaultValue={b.dv || ''} className="input" maxLength={1} /></label></div>
            <label><span className="label">Régimen IVA</span><select name="taxRegime" defaultValue={b.taxRegime} className="input"><option value="48">Responsable de IVA</option><option value="49">No responsable de IVA</option></select></label>
            <label><span className="label">Responsabilidades (casilla 53 RUT)</span><input name="taxResponsibilities" defaultValue={b.taxResponsibilities} className="input" placeholder="O-13;O-15 o R-99-PN" /></label>
            <label><span className="label">Actividad CIIU</span><input name="ciiu" defaultValue={b.ciiu || ''} className="input" placeholder="9602" /></label>
            <label><span className="label">Correo de facturación</span><input name="fiscalEmail" type="email" defaultValue={b.fiscalEmail || ''} className="input" /></label>
            <label><span className="label">Departamento</span><input name="department" defaultValue={b.department || ''} className="input" /></label>
            <label><span className="label">Código DANE depto.</span><input name="departmentCode" defaultValue={b.departmentCode || ''} className="input" /></label>
            <label><span className="label">Municipio</span><input name="municipality" defaultValue={b.municipality || ''} className="input" /></label>
            <label><span className="label">Código DANE municipio</span><input name="municipalityCode" defaultValue={b.municipalityCode || ''} className="input" /></label>
          </div>
          <button className="btn-primary">Guardar datos fiscales</button>
        </ActionForm>
      </section>
      <section className="card p-5">
        <h2 className="h-section mb-3">Resoluciones de numeración</h2>
        <ul className="space-y-2 mb-5">{res.map(r => (
          <li key={r.id} className={`p-3 rounded-xl ${r.active ? 'bg-surface-container-low' : 'opacity-50'}`}>
            <div className="flex justify-between"><b>{r.docType === 'FE' ? 'Factura electrónica' : r.docType === 'POS' ? 'Documento POS' : 'Notas crédito'} · {r.prefix}</b><span className="font-label-md">{r.active ? 'Activa' : 'Inactiva'}</span></div>
            <p className="font-body-sm text-on-surface-variant">Res. {r.resolutionNumber} · {r.rangeFrom}–{r.rangeTo} · usados hasta {Math.max(r.current, r.rangeFrom - 1)} · vence {ymd(r.validTo)}</p>
            {r.active && r.rangeTo - r.current < 100 && <p className="text-danger font-label-md">Quedan {r.rangeTo - r.current} números: solicite una nueva resolución.</p>}
            {r.active && r.validTo.getTime() - Date.now() < 30 * 86400000 && <p className="text-danger font-label-md">La resolución vence pronto.</p>}
          </li>
        ))}</ul>
        <h3 className="font-title-md text-title-md mb-2">Registrar resolución (formato 1302 / habilitación de numeración)</h3>
        <ActionForm action={saveResolution} resetOnSuccess>
          <div className="grid grid-cols-2 gap-3">
            <label><span className="label">Tipo</span><select name="docType" className="input"><option value="FE">Factura electrónica</option><option value="POS">Documento equivalente POS</option><option value="NC">Notas crédito</option></select></label>
            <label><span className="label">N.º de resolución</span><input name="resolutionNumber" className="input" required /></label>
            <label><span className="label">Prefijo</span><input name="prefix" className="input uppercase" required maxLength={4} /></label>
            <div className="grid grid-cols-2 gap-2"><label><span className="label">Desde</span><input name="rangeFrom" type="number" className="input" required /></label><label><span className="label">Hasta</span><input name="rangeTo" type="number" className="input" required /></label></div>
            <label><span className="label">Vigente desde</span><input name="validFrom" type="date" className="input" required /></label>
            <label><span className="label">Vigente hasta</span><input name="validTo" type="date" className="input" required /></label>
            <label className="col-span-2"><span className="label">Clave técnica (solo factura electrónica)</span><input name="technicalKey" className="input font-mono" /></label>
          </div>
          <button className="btn-primary">Registrar resolución</button>
        </ActionForm>
      </section>
    </div>
  );
}

function Guide() {
  const steps = [
    ['Inscríbete en el RUT con la responsabilidad correcta', 'Verifica en tu RUT la responsabilidad 52 (facturador electrónico) y tu régimen de IVA. Las peluquerías, barberías y spas que prestan servicios gravados son, por regla general, responsables de IVA si superan los topes de la ley.'],
    ['Elige cómo vas a facturar', 'Contrata un proveedor tecnológico autorizado por la DIAN (lista en dian.gov.co) o usa la solución gratuita de la DIAN. Esta plataforma genera el XML UBL 2.1, el CUFE/CUDE y el QR; la firma digital y la transmisión las hace el proveedor por API.'],
    ['Habilítate como facturador en el portal de la DIAN', 'En el servicio “Factura electrónica > Habilitación”, registra el modo de operación (software de un proveedor tecnológico) y supera el set de pruebas con el TestSetId que te asignan. Haz lo mismo para el documento equivalente electrónico POS.'],
    ['Solicita la numeración', 'Tramita la autorización de numeración (formulario 1876) para factura electrónica y para documento equivalente POS. Registra aquí el número de resolución, el prefijo, el rango, la vigencia y la clave técnica.'],
    ['Configura el conector', 'En “Proveedor tecnológico” escribe la URL y el token de tu proveedor, el ID y el PIN del software, y cambia el ambiente a Producción solo cuando la DIAN lo haya habilitado.'],
    ['Opera y conserva', 'Entrega la representación gráfica (tiquete o PDF) al cliente; por encima de 5 UVT se emite factura electrónica. Anula solo con nota crédito o nota de ajuste, nunca borrando. Conserva los XML. Cuando no hay internet, el sistema deja los documentos en contingencia para retransmitirlos.']
  ];
  return (
    <div className="max-w-3xl">
      <div className="p-4 rounded-xl bg-[#EFF6FF] text-[#1E40AF] dark:bg-[#1e3a8a]/40 dark:text-[#bfdbfe] mb-4 flex gap-2"><Icon name="info" />Este software deja lista la generación de los documentos según la Resolución DIAN 000165 de 2023 y sus anexos técnicos, pero el cumplimiento ante la DIAN solo se obtiene al terminar la habilitación con un proveedor tecnológico autorizado. Verifica siempre los requisitos vigentes en dian.gov.co y con tu contador.</div>
      <ol className="space-y-3">{steps.map(([t, d], i) => <li key={t} className="card p-4 flex gap-4"><span className="w-9 h-9 shrink-0 rounded-full bg-primary-container text-secondary-fixed flex items-center justify-center font-title-md">{i + 1}</span><div><p className="font-title-md text-title-md">{t}</p><p className="text-on-surface-variant mt-1">{d}</p></div></li>)}</ol>
    </div>
  );
}
