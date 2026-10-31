// Colour helpers: WCAG contrast and automatic darkening so user-picked brand
// colours stay readable wherever the template puts them.

type RGB = [number, number, number];

export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)) as RGB;
}

function rgbToHex([r, g, b]: RGB): string {
  return '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
}

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

export const isLight = (hex: string) => luminance(hex) > 0.35;

/** Mix `hex` towards black (or white) until it reaches `ratio` contrast against `against`. */
export function ensureContrast(hex: string, against: string, ratio: number): string {
  if (contrast(hex, against) >= ratio) return hex;
  const target: RGB = isLight(against) ? [0, 0, 0] : [255, 255, 255];
  const src = hexToRgb(hex);
  for (let t = 0.05; t <= 1; t += 0.05) {
    const mixed = rgbToHex(src.map((v, i) => v + (target[i] - v) * t) as RGB);
    if (contrast(mixed, against) >= ratio) return mixed;
  }
  return rgbToHex(target);
}

/** All colour variables the invitation template uses, derived from the three brand colours. */
export function themeColors(theme: { primary: string; accent: string; background: string }) {
  const lightBg = isLight(theme.background);
  return {
    primary: theme.primary,
    accent: theme.accent,
    background: theme.background,
    /** Text drawn directly on the page background (footer, back link, …) */
    fg: lightBg ? '#0f172a' : '#ffffff',
    lightBg,
    /** Brand colours as text on the white cards */
    primaryInk: ensureContrast(theme.primary, '#ffffff', 4.5),
    accentInk: ensureContrast(theme.accent, '#ffffff', 3.2),
    /** Gradient-button colours, dark enough for white button text */
    btnPrimary: ensureContrast(theme.primary, '#ffffff', 4.5),
    btnAccent: ensureContrast(theme.accent, '#ffffff', 3),
  };
}

/** Human-readable warnings for the wizard (Persian). */
export function colorWarnings(theme: { primary: string; accent: string; background: string }): string[] {
  const w: string[] = [];
  if (contrast(theme.primary, '#ffffff') < 4.5) w.push('رنگ اصلی روی کارت سفید کم‌رنگ است؛ در متن‌ها کمی تیره‌تر نمایش داده می‌شود.');
  if (contrast(theme.accent, '#ffffff') < 3) w.push('رنگ تأکیدی روی زمینه سفید خوانا نیست؛ در متن‌ها و دکمه‌ها کمی تیره‌تر نمایش داده می‌شود.');
  if (isLight(theme.background)) w.push('پس‌زمینه روشن است؛ متن‌های روی پس‌زمینه تیره نمایش داده می‌شوند. ویدئو را کم‌رنگ‌تر کنید تا خوانایی حفظ شود.');
  return w;
}

/** Linear RGB mix: t = 0 → a, t = 1 → b. */
export function mix(a: string, b: string, t: number): string {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return rgbToHex(x.map((v, i) => v + (y[i] - v) * t) as RGB);
}

function toHsl(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex).map(v => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function fromHsl(h: number, s: number, l: number): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return rgbToHex([f(0) * 255, f(8) * 255, f(4) * 255]);
}

/** Hue-wise mix (shortest way round the colour wheel): stays vivid where an RGB mix turns muddy. */
export function mixHue(a: string, b: string, t = 0.5): string {
  const [h1, s1, l1] = toHsl(a);
  const [h2, s2, l2] = toHsl(b);
  if (s1 < 0.08 || s2 < 0.08) return mix(a, b, t); // greys have no meaningful hue
  let dh = h2 - h1;
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;
  return fromHsl((h1 + dh * t + 360) % 360, Math.max(s1, s2), l1 + (l2 - l1) * t);
}

/** The studio's own palette (main admin): violet, blue, pink. */
export const STUDIO_PALETTE = { primary: '#7c3aed', accent: '#db2777', middle: '#2563eb' };

/**
 * CSS variables for the glass admin surfaces. Without a theme → the studio's
 * violet/blue/pink; with an invitation theme → that invitation's own colours,
 * so its settings, dashboard and reports look like the invitation itself.
 */
export function adminPalette(theme?: { primary: string; accent: string } | null, mode: 'light' | 'dark' = 'light'): Record<string, string> {
  const p = theme?.primary || STUDIO_PALETTE.primary;
  const a = theme?.accent || STUDIO_PALETTE.accent;
  const m = theme ? mixHue(p, a) : STUDIO_PALETTE.middle;
  const dark = mode === 'dark';
  const base = dark ? mix('#0b0a1a', p, 0.1) : mix('#ffffff', p, 0.07);
  return {
    '--ad-1': p,
    '--ad-2': m,
    '--ad-3': a,
    '--ad-base': base,
    // Text/icon accent readable on the glass cards
    '--ad-ink': dark ? ensureContrast(mix(p, '#ffffff', 0.35), base, 7) : ensureContrast(p, '#ffffff', 4.8),
    // Gradient buttons, dark enough for white text
    '--ad-btn-1': ensureContrast(p, '#ffffff', 4.5),
    '--ad-btn-2': ensureContrast(m, '#ffffff', 4.5),
    '--ad-btn-3': ensureContrast(a, '#ffffff', 4.5),
  };
}
