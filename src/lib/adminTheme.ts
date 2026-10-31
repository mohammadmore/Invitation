import type React from 'react';
import { useEffect, useMemo } from 'react';
import { adminPalette } from '../shared/color';

/**
 * Glass admin palette as inline CSS variables. No theme → studio violet/blue/pink;
 * an invitation theme → that invitation's own colours (updates live as they change).
 * Also paints <body> so overscroll / safe areas match the page.
 */
export function useAdminTheme(theme?: { primary: string; accent: string } | null, mode: 'light' | 'dark' = 'light'): React.CSSProperties {
  const p = theme?.primary;
  const a = theme?.accent;
  const vars = useMemo(() => adminPalette(p && a ? { primary: p, accent: a } : null, mode), [p, a, mode]);
  useEffect(() => {
    document.body.style.backgroundColor = vars['--ad-base'];
  }, [vars]);
  return vars as React.CSSProperties;
}
