import { money, softwareSecurityCode } from './cufe';

const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export type UblParty = { docType: string; id: string; dv?: string; name: string; email?: string | null; phone?: string | null; address?: string | null; cityCode?: string | null; city?: string | null; deptCode?: string | null; dept?: string | null; regime?: string; responsibilities?: string; personType?: '1' | '2' };
export type UblLine = { code: string; description: string; unit: string; quantity: number; unitPrice: number; base: number; taxRate: number; taxAmount: number };
export type UblDoc = {
  kind: 'FE' | 'POS' | 'NC';
  typeCode: string; // 01 | 20 | 91 | 94
  prefix: string; number: number; fullNumber: string;
  date: string; time: string; cufe: string; qr: string; environment: '1' | '2';
  resolution?: { number: string; from: number; to: number; validFrom: string; validTo: string };
  software: { id: string; pin: string; providerNit: string };
  issuer: UblParty; buyer: UblParty;
  lines: UblLine[];
  taxes: { rate: number; base: number; tax: number }[];
  subtotal: number; taxTotal: number; total: number; tip: number;
  paymentMeans: string; // código DIAN: 10 efectivo, 48 tarjeta crédito, 49 débito, 42 consignación, 47 transferencia, ZZZ otro
  pos?: { terminal: string; cashier: string; softwareName: string; manufacturer: string };
  reference?: { number: string; cufe: string; date: string; reasonCode: string; reason: string };
};

function party(tag: 'AccountingSupplierParty' | 'AccountingCustomerParty', p: UblParty) {
  return `<cac:${tag}>
    <cbc:AdditionalAccountID>${p.personType || (p.docType === '31' ? '1' : '2')}</cbc:AdditionalAccountID>
    <cac:Party>
      <cac:PartyName><cbc:Name>${esc(p.name)}</cbc:Name></cac:PartyName>
      <cac:PhysicalLocation><cac:Address>
        <cbc:ID>${esc(p.cityCode || '11001')}</cbc:ID><cbc:CityName>${esc(p.city || 'Bogotá D.C.')}</cbc:CityName>
        <cbc:CountrySubentity>${esc(p.dept || 'Bogotá D.C.')}</cbc:CountrySubentity><cbc:CountrySubentityCode>${esc(p.deptCode || '11')}</cbc:CountrySubentityCode>
        <cac:AddressLine><cbc:Line>${esc(p.address || '')}</cbc:Line></cac:AddressLine>
        <cac:Country><cbc:IdentificationCode>CO</cbc:IdentificationCode><cbc:Name languageID="es">Colombia</cbc:Name></cac:Country>
      </cac:Address></cac:PhysicalLocation>
      <cac:PartyTaxScheme>
        <cbc:RegistrationName>${esc(p.name)}</cbc:RegistrationName>
        <cbc:CompanyID schemeAgencyID="195" schemeAgencyName="CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)"${p.dv ? ` schemeID="${esc(p.dv)}"` : ''} schemeName="${esc(p.docType)}">${esc(p.id)}</cbc:CompanyID>
        <cbc:TaxLevelCode listName="${esc(p.regime || '49')}">${esc(p.responsibilities || 'R-99-PN')}</cbc:TaxLevelCode>
        <cac:TaxScheme><cbc:ID>${p.regime === '48' ? '01' : 'ZZ'}</cbc:ID><cbc:Name>${p.regime === '48' ? 'IVA' : 'No aplica'}</cbc:Name></cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity><cbc:RegistrationName>${esc(p.name)}</cbc:RegistrationName><cbc:CompanyID schemeAgencyID="195" schemeName="${esc(p.docType)}"${p.dv ? ` schemeID="${esc(p.dv)}"` : ''}>${esc(p.id)}</cbc:CompanyID></cac:PartyLegalEntity>
      <cac:Contact>${p.phone ? `<cbc:Telephone>${esc(p.phone)}</cbc:Telephone>` : ''}${p.email ? `<cbc:ElectronicMail>${esc(p.email)}</cbc:ElectronicMail>` : ''}</cac:Contact>
    </cac:Party>
  </cac:${tag}>`;
}

/**
 * Genera el XML UBL 2.1 con las extensiones DIAN. La firma digital XAdES-EPES y el
 * empaquetado (AttachedDocument / ZIP) los realiza el proveedor tecnológico autorizado.
 */
export function buildUbl(d: UblDoc) {
  const root = d.kind === 'NC' ? 'CreditNote' : 'Invoice';
  const ns = d.kind === 'NC' ? 'urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2' : 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2';
  const ssc = softwareSecurityCode(d.software.id, d.software.pin, d.fullNumber);
  const lineTag = d.kind === 'NC' ? 'CreditNoteLine' : 'InvoiceLine';
  const qtyTag = d.kind === 'NC' ? 'CreditedQuantity' : 'InvoicedQuantity';
  const lines = d.lines.map((l, i) => `<cac:${lineTag}>
    <cbc:ID>${i + 1}</cbc:ID>
    <cbc:${qtyTag} unitCode="${esc(l.unit)}">${l.quantity}</cbc:${qtyTag}>
    <cbc:LineExtensionAmount currencyID="COP">${money(l.base)}</cbc:LineExtensionAmount>
    <cac:TaxTotal><cbc:TaxAmount currencyID="COP">${money(l.taxAmount)}</cbc:TaxAmount>
      <cac:TaxSubtotal><cbc:TaxableAmount currencyID="COP">${money(l.base)}</cbc:TaxableAmount><cbc:TaxAmount currencyID="COP">${money(l.taxAmount)}</cbc:TaxAmount>
        <cac:TaxCategory><cbc:Percent>${l.taxRate.toFixed(2)}</cbc:Percent><cac:TaxScheme><cbc:ID>01</cbc:ID><cbc:Name>IVA</cbc:Name></cac:TaxScheme></cac:TaxCategory>
      </cac:TaxSubtotal></cac:TaxTotal>
    <cac:Item><cbc:Description>${esc(l.description)}</cbc:Description>
      <cac:StandardItemIdentification><cbc:ID schemeID="999">${esc(l.code)}</cbc:ID></cac:StandardItemIdentification></cac:Item>
    <cac:Price><cbc:PriceAmount currencyID="COP">${money(l.quantity ? l.base / l.quantity : 0)}</cbc:PriceAmount><cbc:BaseQuantity unitCode="${esc(l.unit)}">1</cbc:BaseQuantity></cac:Price>
  </cac:${lineTag}>`).join('\n  ');

  const ext = `<ext:UBLExtensions>
    <ext:UBLExtension><ext:ExtensionContent><sts:DianExtensions>
      ${d.resolution ? `<sts:InvoiceControl>
        <sts:InvoiceAuthorization>${esc(d.resolution.number)}</sts:InvoiceAuthorization>
        <sts:AuthorizationPeriod><cbc:StartDate>${d.resolution.validFrom}</cbc:StartDate><cbc:EndDate>${d.resolution.validTo}</cbc:EndDate></sts:AuthorizationPeriod>
        <sts:AuthorizedInvoices><sts:Prefix>${esc(d.prefix)}</sts:Prefix><sts:From>${d.resolution.from}</sts:From><sts:To>${d.resolution.to}</sts:To></sts:AuthorizedInvoices>
      </sts:InvoiceControl>` : ''}
      <sts:InvoiceSource><cbc:IdentificationCode listAgencyID="6" listAgencyName="United Nations Economic Commission for Europe" listSchemeURI="urn:oasis:names:specification:ubl:codelist:gc:CountryIdentificationCode-2.1">CO</cbc:IdentificationCode></sts:InvoiceSource>
      <sts:SoftwareProvider><sts:ProviderID schemeAgencyID="195" schemeName="31">${esc(d.software.providerNit)}</sts:ProviderID><sts:SoftwareID schemeAgencyID="195">${esc(d.software.id)}</sts:SoftwareID></sts:SoftwareProvider>
      <sts:SoftwareSecurityCode schemeAgencyID="195">${ssc}</sts:SoftwareSecurityCode>
      <sts:AuthorizationProvider><sts:AuthorizationProviderID schemeAgencyID="195" schemeID="4" schemeName="31">800197268</sts:AuthorizationProviderID></sts:AuthorizationProvider>
      <sts:QRCode>${esc(d.qr)}</sts:QRCode>
    </sts:DianExtensions></ext:ExtensionContent></ext:UBLExtension>
    <ext:UBLExtension><ext:ExtensionContent><!-- Firma XAdES-EPES: la agrega el proveedor tecnológico --></ext:ExtensionContent></ext:UBLExtension>
  </ext:UBLExtensions>`;

  const posInfo = d.pos ? `
  <!-- Información obligatoria del documento equivalente POS (Res. 000165/2023) -->
  <cbc:Note>Caja: ${esc(d.pos.terminal)} | Cajero: ${esc(d.pos.cashier)} | Software: ${esc(d.pos.softwareName)} | Fabricante: ${esc(d.pos.manufacturer)}</cbc:Note>` : '';

  const ref = d.reference ? `
  <cac:DiscrepancyResponse><cbc:ReferenceID>${esc(d.reference.number)}</cbc:ReferenceID><cbc:ResponseCode>${esc(d.reference.reasonCode)}</cbc:ResponseCode><cbc:Description>${esc(d.reference.reason)}</cbc:Description></cac:DiscrepancyResponse>
  <cac:BillingReference><cac:InvoiceDocumentReference><cbc:ID>${esc(d.reference.number)}</cbc:ID><cbc:UUID schemeName="${d.reference.cufe.length ? 'CUFE-SHA384' : ''}">${esc(d.reference.cufe)}</cbc:UUID><cbc:IssueDate>${d.reference.date}</cbc:IssueDate></cac:InvoiceDocumentReference></cac:BillingReference>` : '';

  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<${root} xmlns="${ns}" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2" xmlns:sts="dian:gov:co:facturaelectronica:Structures-2-1" xmlns:xades="http://uri.etsi.org/01903/v1.3.2#">
  ${ext}
  <cbc:UBLVersionID>UBL 2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>${d.kind === 'NC' ? '20' : '10'}</cbc:CustomizationID>
  <cbc:ProfileID>${d.kind === 'POS' ? 'DIAN 2.1: documento equivalente electrónico' : d.kind === 'NC' ? 'DIAN 2.1: Nota Crédito de Factura Electrónica de Venta' : 'DIAN 2.1: Factura Electrónica de Venta'}</cbc:ProfileID>
  <cbc:ProfileExecutionID>${d.environment}</cbc:ProfileExecutionID>
  <cbc:ID>${esc(d.fullNumber)}</cbc:ID>
  <cbc:UUID schemeID="${d.environment}" schemeName="${d.kind === 'FE' ? 'CUFE-SHA384' : 'CUDE-SHA384'}">${d.cufe}</cbc:UUID>
  <cbc:IssueDate>${d.date}</cbc:IssueDate>
  <cbc:IssueTime>${d.time}</cbc:IssueTime>
  <cbc:${d.kind === 'NC' ? 'CreditNoteTypeCode' : 'InvoiceTypeCode'}>${d.typeCode}</cbc:${d.kind === 'NC' ? 'CreditNoteTypeCode' : 'InvoiceTypeCode'}>${posInfo}
  <cbc:DocumentCurrencyCode>COP</cbc:DocumentCurrencyCode>
  <cbc:LineCountNumeric>${d.lines.length}</cbc:LineCountNumeric>${ref}
  ${party('AccountingSupplierParty', d.issuer)}
  ${party('AccountingCustomerParty', d.buyer)}
  <cac:PaymentMeans><cbc:ID>1</cbc:ID><cbc:PaymentMeansCode>${esc(d.paymentMeans)}</cbc:PaymentMeansCode><cbc:PaymentDueDate>${d.date}</cbc:PaymentDueDate></cac:PaymentMeans>
  <cac:TaxTotal><cbc:TaxAmount currencyID="COP">${money(d.taxTotal)}</cbc:TaxAmount>
    ${d.taxes.map(t => `<cac:TaxSubtotal><cbc:TaxableAmount currencyID="COP">${money(t.base)}</cbc:TaxableAmount><cbc:TaxAmount currencyID="COP">${money(t.tax)}</cbc:TaxAmount><cac:TaxCategory><cbc:Percent>${t.rate.toFixed(2)}</cbc:Percent><cac:TaxScheme><cbc:ID>01</cbc:ID><cbc:Name>IVA</cbc:Name></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal>`).join('\n    ')}
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="COP">${money(d.subtotal)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="COP">${money(d.taxes.filter(t => t.rate > 0).reduce((a, t) => a + t.base, 0))}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="COP">${money(d.subtotal + d.taxTotal)}</cbc:TaxInclusiveAmount>
    ${d.tip ? `<cbc:ChargeTotalAmount currencyID="COP">${money(d.tip)}</cbc:ChargeTotalAmount>` : ''}
    <cbc:PayableAmount currencyID="COP">${money(d.total)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  ${lines}
</${root}>`;
}
