// The app is served under a base path (default "/in/", e.g. https://studio.asvashop.com/in/).
// Vite exposes it as import.meta.env.BASE_URL (always with a trailing slash).

export const BASE: string = import.meta.env.BASE_URL || '/';

/** Resolve a stored, base-relative asset path ("uploads/x.webp", "background-music.mp3") to a URL. */
export const asset = (p: string) => (p ? BASE + p.replace(/^\/+/, '') : '');

/** App-internal link, e.g. route('builder') -> "/in/builder". */
export const route = (p = '') => BASE + p.replace(/^\/+/, '');

export const apiUrl = (p: string) => route(`api/${p.replace(/^\/+/, '')}`);

/** Current path relative to the base, without leading/trailing slashes. */
export function appPath(): string {
  let p = window.location.pathname;
  const base = BASE.replace(/\/$/, '');
  if (base && p.startsWith(base)) p = p.slice(base.length);
  return p.replace(/^\/+|\/+$/g, '');
}

export const inviteUrl = (slug: string) => `${window.location.origin}${route(slug)}`;
export const editUrl = (id: string, token: string) => `${window.location.origin}${route(`builder/${id}`)}#${token}`;
export const previewUrl = (id: string, token: string) => `${window.location.origin}${route(`preview/${id}`)}#${token}`;
export const linkUrl = (slug: string, code: string) => `${inviteUrl(slug)}/${code}`;
export const repReportUrl = (id: string, repId: string, token: string) => `${window.location.origin}${route(`rep/${id}`)}?rep=${repId}#${token}`;
export const ticketUrl = (slug: string, code: string) => `${inviteUrl(slug)}/t/${code}`;
export const checkinUrl = (id: string, token: string) => `${window.location.origin}${route(`checkin/${id}`)}#${token}`;
