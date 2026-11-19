import { parseJson, ymd } from '@/lib/format';
type C = { id?: string; name?: string; phone?: string | null; email?: string | null; docType?: string; docNumber?: string | null; birthday?: Date | null; notes?: string | null; allergies?: string | null; preferences?: string | null; tags?: string };
export function CustomerFields({ c = {} }: { c?: C }) {
  return (
    <>
      {c.id && <input type="hidden" name="id" value={c.id} />}
      <label className="block"><span className="label">Nombre completo *</span><input name="name" defaultValue={c.name} className="input" required /></label>
      <div className="grid grid-cols-2 gap-3">
        <label><span className="label">Celular</span><input name="phone" defaultValue={c.phone || ''} className="input" inputMode="numeric" /></label>
        <label><span className="label">Correo</span><input name="email" type="email" defaultValue={c.email || ''} className="input" /></label>
        <label><span className="label">Tipo de documento</span><select name="docType" defaultValue={c.docType || '13'} className="input"><option value="13">Cédula de ciudadanía</option><option value="31">NIT</option><option value="22">Cédula de extranjería</option><option value="41">Pasaporte</option><option value="47">PEP</option></select></label>
        <label><span className="label">Número</span><input name="docNumber" defaultValue={c.docNumber || ''} className="input" /></label>
        <label><span className="label">Cumpleaños</span><input type="date" name="birthday" defaultValue={c.birthday ? ymd(c.birthday) : ''} className="input" /></label>
        <label><span className="label">Etiquetas (coma)</span><input name="tags" defaultValue={parseJson<string[]>(c.tags, []).join(', ')} className="input" placeholder="VIP, Color" /></label>
      </div>
      <label className="block"><span className="label">Alergias y contraindicaciones</span><input name="allergies" defaultValue={c.allergies || ''} className="input" placeholder="Ej.: PPD (tinte), látex, cuero cabelludo sensible" maxLength={300} /></label>
      <label className="block"><span className="label">Preferencias</span><input name="preferences" defaultValue={c.preferences || ''} className="input" placeholder="Profesional preferido, bebida…" /></label>
      <label className="block"><span className="label">Notas internas</span><textarea name="notes" defaultValue={c.notes || ''} className="input" rows={3} placeholder="Observaciones generales…" /></label>
    </>
  );
}
