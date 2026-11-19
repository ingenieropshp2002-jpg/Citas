'use server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireBusiness } from '@/lib/auth';
import { nitDv } from '@/lib/dian/cufe';
import { creditNote } from '@/lib/dian/issue';

export async function saveFiscal(_: unknown, fd: FormData) {
  const { business } = await requireBusiness('facturacion');
  const nit = String(fd.get('nit') || '').replace(/\D/g, '');
  const dv = String(fd.get('dv') || '');
  if (nit && dv && nitDv(nit) !== dv) return { error: `El dígito de verificación no coincide (debería ser ${nitDv(nit)}).` };
  await db.business.update({ where: { id: business.id }, data: {
    legalName: String(fd.get('legalName') || ''), docType: String(fd.get('docType') || '31'), nit, dv: dv || (nit ? nitDv(nit) : null), taxRegime: String(fd.get('taxRegime') || '49'),
    taxResponsibilities: String(fd.get('taxResponsibilities') || 'R-99-PN'), ciiu: String(fd.get('ciiu') || ''), department: String(fd.get('department') || ''), departmentCode: String(fd.get('departmentCode') || ''),
    municipality: String(fd.get('municipality') || ''), municipalityCode: String(fd.get('municipalityCode') || ''), fiscalEmail: String(fd.get('fiscalEmail') || '')
  } });
  revalidatePath('/admin/facturacion');
  return { ok: true };
}

export async function saveDianConfig(_: unknown, fd: FormData) {
  const { business } = await requireBusiness('facturacion');
  const data = { environment: String(fd.get('environment') || '2'), provider: String(fd.get('provider') || 'SIMULADO'), apiUrl: String(fd.get('apiUrl') || '') || null, softwareId: String(fd.get('softwareId') || '') || null, softwarePin: String(fd.get('softwarePin') || '') || null, testSetId: String(fd.get('testSetId') || '') || null, uvtValue: Number(fd.get('uvtValue') || 52374), posMaxUvt: Number(fd.get('posMaxUvt') || 5), autoSend: !!fd.get('autoSend') };
  const token = String(fd.get('apiToken') || '');
  await db.dianConfig.upsert({ where: { businessId: business.id }, create: { ...data, businessId: business.id, apiToken: token || null }, update: { ...data, ...(token ? { apiToken: token } : {}) } });
  revalidatePath('/admin/facturacion');
  return { ok: true };
}

export async function saveResolution(_: unknown, fd: FormData) {
  const { business } = await requireBusiness('facturacion');
  const from = Number(fd.get('rangeFrom')); const to = Number(fd.get('rangeTo'));
  if (!(to > from)) return { error: 'El rango final debe ser mayor al inicial.' };
  const docType = String(fd.get('docType'));
  await db.numberingResolution.updateMany({ where: { businessId: business.id, docType }, data: { active: false } });
  await db.numberingResolution.create({ data: { businessId: business.id, docType, resolutionNumber: String(fd.get('resolutionNumber')), resolutionDate: new Date(String(fd.get('validFrom'))), prefix: String(fd.get('prefix')).toUpperCase(), rangeFrom: from, rangeTo: to, current: from - 1, validFrom: new Date(String(fd.get('validFrom'))), validTo: new Date(String(fd.get('validTo')) + 'T23:59:59'), technicalKey: String(fd.get('technicalKey') || '') || null } });
  revalidatePath('/admin/facturacion');
  return { ok: true };
}

export async function annulDocument(docId: string, reason: string) {
  const { business } = await requireBusiness('facturacion');
  const d = await db.electronicDocument.findFirst({ where: { id: docId, businessId: business.id } });
  if (!d) return { error: 'Documento no encontrado' };
  try { await creditNote(d.id, reason || 'Anulación'); } catch (e) { return { error: (e as Error).message }; }
  revalidatePath('/admin/facturacion');
  return { ok: true };
}
