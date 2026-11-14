// Tokens tomados de DESIGN.md (Google Stitch). Modo claro = valores originales.
// Modo oscuro = derivado manteniendo azul petróleo + dorado.
const light = {
  "surface": "#f9f9ff", "surface-dim": "#cfdaf2", "surface-bright": "#f9f9ff",
  "surface-container-lowest": "#ffffff", "surface-container-low": "#f0f3ff",
  "surface-container": "#e7eeff", "surface-container-high": "#dee8ff",
  "surface-container-highest": "#d8e3fb", "on-surface": "#111c2d",
  "on-surface-variant": "#43474c", "inverse-surface": "#263143",
  "inverse-on-surface": "#ecf1ff", "outline": "#73777d", "outline-variant": "#c3c7cd",
  "surface-tint": "#4b6176", "primary": "#000f1d", "on-primary": "#ffffff",
  "primary-container": "#0d2538", "on-primary-container": "#778da4",
  "inverse-primary": "#b2c9e2", "secondary": "#735c00", "on-secondary": "#ffffff",
  "secondary-container": "#fed65b", "on-secondary-container": "#745c00",
  "tertiary": "#000f1d", "on-tertiary": "#ffffff", "tertiary-container": "#00263e",
  "on-tertiary-container": "#6c8ead", "error": "#ba1a1a", "on-error": "#ffffff",
  "error-container": "#ffdad6", "on-error-container": "#93000a",
  "primary-fixed": "#cee5ff", "primary-fixed-dim": "#b2c9e2", "on-primary-fixed": "#041d30",
  "on-primary-fixed-variant": "#33495d", "secondary-fixed": "#ffe088",
  "secondary-fixed-dim": "#e9c349", "on-secondary-fixed": "#241a00",
  "on-secondary-fixed-variant": "#574500", "tertiary-fixed": "#cce5ff",
  "tertiary-fixed-dim": "#a8caeb", "on-tertiary-fixed": "#001d31",
  "on-tertiary-fixed-variant": "#274a66", "background": "#f9f9ff",
  "on-background": "#111c2d", "surface-variant": "#d8e3fb",
  "gold": "#d4af37", "parchment": "#eae6e1", "success": "#1b5e3b", "warning": "#b45309", "danger": "#9f1239",
  "nequi": "#3b1358", "pse": "#0033a0"
};
const dark = {
  ...light,
  "surface": "#0b141f", "surface-dim": "#0b141f", "surface-bright": "#2a3646",
  "surface-container-lowest": "#111c2a", "surface-container-low": "#152233",
  "surface-container": "#1a283a", "surface-container-high": "#213145",
  "surface-container-highest": "#283a50", "on-surface": "#e3e9f5",
  "on-surface-variant": "#b4bcc8", "inverse-surface": "#e3e9f5", "inverse-on-surface": "#1a283a",
  "outline": "#8b939e", "outline-variant": "#3a4656",
  "primary": "#cee5ff", "on-primary": "#041d30", "primary-container": "#b2c9e2",
  "on-primary-container": "#0d2538", "secondary": "#e9c349", "on-secondary": "#241a00",
  "secondary-container": "#574500", "on-secondary-container": "#ffe088",
  "tertiary": "#cee5ff", "tertiary-container": "#274a66",
  "error": "#ffb4ab", "on-error": "#690005", "error-container": "#93000a", "on-error-container": "#ffdad6",
  "background": "#0b141f", "on-background": "#e3e9f5", "surface-variant": "#283a50",
  "parchment": "#2a3646", "secondary-fixed": "#ffe088", "on-secondary-fixed": "#241a00"
};
function toRgb(hex) { const h = hex.replace('#',''); return [0,2,4].map(i => parseInt(h.slice(i,i+2),16)).join(' '); }
module.exports = { light, dark, toRgb };
