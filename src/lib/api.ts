import type { InvitationConfig } from '../shared/invitation';

const ADMIN_KEY = 'expo-invite-admin';
const MINE_KEY = 'expo-invite-mine';

export const getAdminPassword = () => sessionStorage.getItem(ADMIN_KEY) || '';
export const setAdminPassword = (p: string) => (p ? sessionStorage.setItem(ADMIN_KEY, p) : sessionStorage.removeItem(ADMIN_KEY));

/** Credentials for the invitation currently being edited (sent with uploads/updates). */
let editAuth: { slug: string; token: string } | null = null;
export const setEditAuth = (a: typeof editAuth) => (editAuth = a);

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = {};
  const admin = getAdminPassword();
  if (admin) h['x-admin-password'] = admin;
  if (editAuth) {
    h['x-edit-slug'] = editAuth.slug;
    h['x-edit-token'] = editAuth.token;
  }
  return h;
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { ...authHeaders(), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `خطا (${res.status})`);
  return data as T;
}

export const api = {
  meta: () => request<{ adminRequired: boolean }>('GET', '/api/meta'),
  auth: () => request<{ ok: boolean; admin: boolean }>('POST', '/api/auth'),
  slugAvailable: (slug: string) => request<{ available: boolean; valid: boolean }>('GET', `/api/slug/${encodeURIComponent(slug)}`),
  get: (slug: string) => request<InvitationConfig>('GET', `/api/invitations/${encodeURIComponent(slug)}`),
  list: () => request<{ slug: string; company: string; event: string; updatedAt: string }[]>('GET', '/api/invitations'),
  create: (config: InvitationConfig) => request<{ slug: string; editToken: string }>('POST', '/api/invitations', { config }),
  update: (slug: string, config: InvitationConfig) => request<{ slug: string }>('PUT', `/api/invitations/${encodeURIComponent(slug)}`, { config }),
  remove: (slug: string) => request<{ ok: boolean }>('DELETE', `/api/invitations/${encodeURIComponent(slug)}`),
};

export type UploadKind = 'image' | 'video' | 'audio' | 'font';

/** Upload a file with progress reporting (XHR, since fetch has no upload progress). */
export function uploadFile(file: File, kind: UploadKind, onProgress?: (pct: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/uploads?kind=${kind}&name=${encodeURIComponent(file.name)}`);
    Object.entries(authHeaders()).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    xhr.upload.onprogress = e => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      let data: any = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* ignore */
      }
      if (xhr.status >= 200 && xhr.status < 300 && data.url) resolve(data.url);
      else reject(new Error(data.error || (xhr.status === 413 ? 'حجم فایل بیش از حد مجاز است' : `خطا در بارگذاری (${xhr.status})`)));
    };
    xhr.onerror = () => reject(new Error('ارتباط با سرور برقرار نشد'));
    xhr.send(file);
  });
}

// ---------- invitations created from this browser ----------

export interface MyInvitation {
  slug: string;
  editToken: string;
  company: string;
  event: string;
  createdAt: string;
}

export function getMyInvitations(): MyInvitation[] {
  try {
    return JSON.parse(localStorage.getItem(MINE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveMyInvitation(item: MyInvitation) {
  const list = getMyInvitations().filter(i => i.slug !== item.slug);
  localStorage.setItem(MINE_KEY, JSON.stringify([item, ...list]));
}

export function forgetMyInvitation(slug: string) {
  localStorage.setItem(MINE_KEY, JSON.stringify(getMyInvitations().filter(i => i.slug !== slug)));
}

export const inviteUrl = (slug: string) => `${window.location.origin}/i/${slug}`;
export const editUrl = (slug: string, token: string) => `${window.location.origin}/builder/${slug}#${token}`;
