// Utilidades de tema (color primario y modo oscuro)
export type PresetColor = { id: string; name: string; hex: string };

export const PRESET_COLORS: PresetColor[] = [
  { id: 'brand', name: 'Verde SATI', hex: '#25703a' },
  { id: 'emerald', name: 'Esmeralda', hex: '#10b981' },
  { id: 'blue', name: 'Azul', hex: '#2563eb' },
  { id: 'violet', name: 'Violeta', hex: '#7c3aed' },
  { id: 'rose', name: 'Rosa', hex: '#e11d48' },
  { id: 'orange', name: 'Naranja', hex: '#f97316' },
  { id: 'teal', name: 'Turquesa', hex: '#14b8a6' },
];

function hexToHslCss(hex: string): { hsl: string; l: number } {
  let c = hex.replace('#', '').trim();
  if (c.length === 3) {
    c = c.split('').map((x) => x + x).join('');
  }
  const num = parseInt(c, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const rf = r / 255, gf = g / 255, bf = b / 255;
  const max = Math.max(rf, gf, bf), min = Math.min(rf, gf, bf);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rf: h = (gf - bf) / d + (gf < bf ? 6 : 0); break;
      case gf: h = (bf - rf) / d + 2; break;
      case bf: h = (rf - gf) / d + 4; break;
    }
    h /= 6;
  }
  const H = Math.round(h * 360);
  const S = Math.round(s * 100);
  const L = Math.round(l * 100);
  return { hsl: `${H} ${S}% ${L}%`, l: L };
}

export function applyPrimaryFromHex(hex: string) {
  const { hsl, l } = hexToHslCss(hex);
  const root = document.documentElement;
  root.style.setProperty('--primary', hsl);
  // foreground: blanco para primarios oscuros, casi negro para primarios claros
  const foreground = l < 55 ? '0 0% 100%' : '223 84% 5%';
  root.style.setProperty('--primary-foreground', foreground);
}

export function setDarkMode(enabled: boolean) {
  const root = document.documentElement;
  root.classList.toggle('dark', enabled);
  localStorage.setItem('theme.appearance', enabled ? 'dark' : 'light');
}

export function getDarkMode(): boolean {
  const saved = localStorage.getItem('theme.appearance');
  if (saved) return saved === 'dark';
  return false;
}

export function savePrimaryHex(hex: string) {
  localStorage.setItem('theme.primaryHex', hex);
}

export function getPrimaryHex(): string | null {
  return localStorage.getItem('theme.primaryHex');
}

export function applySavedTheme() {
  const hex = getPrimaryHex();
  if (hex) applyPrimaryFromHex(hex);
  const dark = getDarkMode();
  setDarkMode(dark);
}

