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
