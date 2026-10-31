import type React from 'react';
import { useLayoutEffect, useMemo, useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';
import { Monitor, Moon, Sun } from 'lucide-react';
import { adminPalette } from '../shared/color';

// ---------------------------------------------------------------- light / dark preference

export type ModePref = 'system' | 'light' | 'dark';
export type Mode = 'light' | 'dark';

const KEY = 'admin-color-mode';
const listeners = new Set<() => void>();
const media = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

function readPref(): ModePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

export function setModePref(p: ModePref) {
  try {
    if (p === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, p);
  } catch {
    /* private mode: still applies for this page */
  }
  fade(() => {
    current = p;
    notify();
  });
}

const notify = () => listeners.forEach(l => l());

/**
 * Runs a light/dark switch as a soft crossfade instead of a hard cut.
 * View Transitions (Chrome/Edge/Safari 18+) fade a snapshot of the whole page, gradients
 * included; elsewhere colours transition briefly. Skipped for "reduce motion" users.
 */
function fade(update: () => void) {
  const html = document.documentElement;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return update();
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };
  if (doc.startViewTransition) {
    try {
      doc.startViewTransition(() => flushSync(update));
      return;
    } catch {
      /* fall through */
    }
  }
  html.classList.add('mode-fade');
  update();
  window.setTimeout(() => html.classList.remove('mode-fade'), 600);
}

let current: ModePref = typeof window !== 'undefined' ? readPref() : 'system';

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      current = readPref();
      l();
    }
  };
  window.addEventListener('storage', onStorage); // other tabs
  return () => {
    listeners.delete(l);
    window.removeEventListener('storage', onStorage);
  };
}

// OS switches light/dark (only matters in automatic mode): same soft fade
media?.addEventListener?.('change', () => (current === 'system' ? fade(notify) : notify()));

const snapshot = () => `${current}:${media?.matches ? 'dark' : 'light'}`;

/** The admin's light/dark choice (system by default), shared by every admin page and tab. */
export function useColorMode(): { pref: ModePref; mode: Mode } {
  const s = useSyncExternalStore(subscribe, snapshot, () => 'system:light');
  const [pref, sys] = s.split(':') as [ModePref, Mode];
  return { pref, mode: pref === 'system' ? sys : pref };
}

// ---------------------------------------------------------------- page palette

/**
 * Applies the glass admin palette and light/dark mode to the page.
 *
 * theme: none → the studio's violet/blue/pink; an invitation theme → its own colours.
 * native: the mode the page's markup is written for. When the chosen mode differs, the
 * Tailwind colour scales are inverted (see theme-invert.css) instead of duplicating markup.
 *
 * Classes and variables go on <html> before paint, so loading screens, modals and the
 * body background all follow without a flash.
 */
export function useAdminTheme(theme?: { primary: string; accent: string } | null, native: Mode = 'light') {
  const { mode } = useColorMode();
  const p = theme?.primary;
  const a = theme?.accent;
  const vars = useMemo(() => adminPalette(p && a ? { primary: p, accent: a } : null, mode), [p, a, mode]);

  useLayoutEffect(() => {
    const html = document.documentElement;
    const cls = scopeClass(mode, native).split(' ');
    html.classList.add(...cls);
    for (const [k, v] of Object.entries(vars)) html.style.setProperty(k, v);
    document.body.style.backgroundColor = vars['--ad-base'];
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', vars['--ad-base']);
    return () => {
      html.classList.remove(...cls);
      for (const k of Object.keys(vars)) html.style.removeProperty(k);
    };
  }, [vars, mode, native]);

  return { style: vars as React.CSSProperties, mode };
}

/** Scope classes for markup written for `native` mode, shown in `mode`. */
export const scopeClass = (mode: Mode, native: Mode) => `ui-${mode} ${mode === native ? 'no-invert' : 'invert-scales'}`;

// ---------------------------------------------------------------- toggle

const NEXT: Record<ModePref, ModePref> = { system: 'light', light: 'dark', dark: 'system' };
const LABEL: Record<ModePref, string> = { system: 'حالت نمایش: خودکار (مطابق دستگاه)', light: 'حالت نمایش: روشن', dark: 'حالت نمایش: تاریک' };

/** Cycles automatic → light → dark. */
export function ColorModeToggle({ className = '' }: { className?: string }) {
  const { pref } = useColorMode();
  const Icon = pref === 'light' ? Sun : pref === 'dark' ? Moon : Monitor;
  return (
    <button type="button" onClick={() => setModePref(NEXT[pref])} className={`p-2 rounded-xl hover:bg-slate-500/15 ${className}`} title={LABEL[pref]} aria-label={LABEL[pref]}>
      <Icon className="w-5 h-5" />
    </button>
  );
}

