// Marca de la app instalable de cada negocio (ícono, color y nombre corto).
export const DEFAULT_APP_COLOR = '#0d2538';
export const APP_COLORS = ['#0d2538', '#1f3a2e', '#4a1d3f', '#7a2e2e', '#3b2a6b', '#0f4c5c', '#111827', '#b08968', '#f5ece1', '#ffffff'];
export const appColor = (c?: string | null) => (c && /^#[0-9a-fA-F]{6}$/.test(c) ? c.toLowerCase() : DEFAULT_APP_COLOR);
/** true si el color es claro (se usa letra oscura encima). */
export function isLight(hex: string) {
  const n = parseInt(hex.slice(1), 16); const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62;
}
export function shortName(b: { name: string; appShortName?: string | null }) {
  if (b.appShortName?.trim()) return b.appShortName.trim().slice(0, 14);
  return b.name.length > 14 ? b.name.split(' ').slice(0, 2).join(' ').slice(0, 14) : b.name;
}

/** Metadatos para que, desde las páginas del negocio, se instale la app de ese negocio (no la de la plataforma). */
export function shopAppMeta(b: { slug: string; name: string; appColor?: string | null }) {
  const base = `/negocio/${b.slug}`;
  return {
    manifest: `${base}/app.webmanifest`,
    applicationName: b.name,
    icons: { icon: `${base}/icono/192`, apple: `${base}/icono/180` },
    appleWebApp: { capable: true, title: shortName(b), statusBarStyle: 'default' as const }
  };
}
export const shopViewport = (b: { appColor?: string | null }) => ({ themeColor: appColor(b.appColor) });
