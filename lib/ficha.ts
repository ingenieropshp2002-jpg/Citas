// Ficha técnica del cliente: fórmulas de color y fotos de antes y después.
export const PHOTO_MAX = 900 * 1024;      // por foto, ya comprimida en el navegador
export const PHOTOS_PER_RECORD = 8;
export type Formula = { marca?: string; tono?: string; oxidante?: string; proporcion?: string; tiempo?: string; zona?: string };
export const FORMULA_FIELDS: [keyof Formula, string, string][] = [
  ['marca', 'Marca / línea', 'Igora Royal'],
  ['tono', 'Tono(s) y cantidades', '7.1 30 g + 8.0 15 g'],
  ['oxidante', 'Oxidante', '20 vol'],
  ['proporcion', 'Proporción', '1:1'],
  ['tiempo', 'Tiempo de exposición', '35 min'],
  ['zona', 'Zona / técnica', 'Raíz, balayage…']
];
export function parseFormula(s: string | null | undefined): Formula | null {
  if (!s) return null;
  try { const f = JSON.parse(s); return f && typeof f === 'object' && Object.values(f).some(Boolean) ? f : null; } catch { return { tono: s }; }
}
