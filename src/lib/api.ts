import type { CopyMode, InvitationConfig, Issue, IssueField, Lang } from '../shared/invitation';
import { extOf, NEEDS_TRANSCODE, UPLOAD_RULES, VIDEO_WARN_MB, type UploadKind } from '../shared/uploads';
import { apiUrl } from './paths';
import type { PublicLinkInfo, PublicTracking, Tracking, TrackedLink } from '../shared/tracking';
import type { NotifyLogEntry, NotifySettings, SmsSettings } from '../shared/notify';
import type { CheckinGuest, CheckinSettings, ScanStatus, TicketInfo } from '../shared/checkin';

export { inviteUrl, editUrl } from './paths';
export type { UploadKind };

const ADMIN_KEY = 'expo-invite-admin';
const MINE_KEY = 'expo-invite-mine';

export const getAdminPassword = () => sessionStorage.getItem(ADMIN_KEY) || '';
export const setAdminPassword = (p: string) => (p ? sessionStorage.setItem(ADMIN_KEY, p) : sessionStorage.removeItem(ADMIN_KEY));

/** Credentials for the invitation currently being edited (sent with uploads/updates). */
let editAuth: { id: string; token: string } | null = null;
export const setEditAuth = (a: typeof editAuth) => (editAuth = a);

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = {};
  const admin = getAdminPassword();
  if (admin) h['x-admin-password'] = admin;
  if (editAuth) {
    h['x-edit-id'] = editAuth.id;
    h['x-edit-token'] = editAuth.token;
  }
  return h;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public field?: IssueField,
    public issues?: Issue[],
    /** On a 409 edit conflict: the record as it is now on the server */
    public conflictRecord?: RecordView,
  ) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(apiUrl(path), {
      method,
      headers: { ...authHeaders(), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('ارتباط با سرور برقرار نشد؛ اتصال اینترنت را بررسی کنید.', 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || `خطا (${res.status})`, res.status, data.field, data.issues, data.conflict ? data.record : undefined);
  return data as T;
}

export interface ServerMeta {
  adminRequired: boolean;
  videoProcessing: boolean;
  smsReady?: boolean;
}

export type RecordStatus = 'draft' | 'published' | 'changed';

export interface RecordSummary {
  id: string;
  slug: string;
  company: string;
  event: string;
  status: RecordStatus;
  updatedAt: string;
  endDate: string;
  ended: boolean;
  revision: number;
  views: number;
  rsvps: number;
  openFeedback: number;
  approved: boolean;
}

export interface Feedback {
  id: string;
  at: string;
  name: string;
  message: string;
  approved: boolean;
  revision: number;
  resolved: boolean;
}

export interface RecordView extends RecordSummary {
  draft: InvitationConfig;
  previewToken: string;
  publishedAt: string | null;
  publishedSlug: string;
  feedback: Feedback[];
}

export interface HistoryEntry {
  index: number;
  at: string;
  kind: 'auto' | 'publish' | 'before-restore';
  revision: number;
  company: string;
  event: string;
  draft: InvitationConfig;
}

export interface Rsvp {
  id: string;
  at: string;
  name: string;
  phone: string;
  org: string;
  day: string;
  count: number;
  guest: string;
  lang: Lang;
  link?: string;
  repId?: string;
  repName?: string;
  channel?: string;
  via?: string;
  referral?: boolean;
  utm?: string;
  ticket?: string;
  checkedInAt?: string;
  checkedInBy?: string;
  visits?: number;
  walkIn?: boolean;
}

export type DayCounters = Record<string, number>;
export interface Stats {
  totals: DayCounters;
  days: Record<string, DayCounters>;
  /** Per link key ("code", "_" = main link, "+ref" suffix = shared by guests) per day */
  links: Record<string, Record<string, DayCounters>>;
  /** Per "utm_source / utm_campaign" totals */
  utm: Record<string, DayCounters>;
}

export interface RepReport {
  company: string;
  event: string;
  slug: string;
  eventDates: { start: string; end: string };
  rep: { id: string; name: string; title: string };
  theme?: { primary: string; accent: string };
  links: TrackedLink[];
  stats: Stats;
  rsvps: Rsvp[];
}

export const api = {
  meta: () => request<ServerMeta>('GET', 'meta'),
  auth: () => request<{ ok: boolean; admin: boolean }>('POST', 'auth'),
  slugAvailable: (slug: string, ownId?: string) =>
    request<{ available: boolean; valid: boolean }>('GET', `slug/${encodeURIComponent(slug)}${ownId ? `?id=${encodeURIComponent(ownId)}` : ''}`),
  /** Published invitation (guests) */
  get: (slug: string, link = '') =>
    request<{ config: InvitationConfig; link: PublicLinkInfo | null; tracking: PublicTracking }>('GET', `invitations/${encodeURIComponent(slug)}${link ? `?link=${encodeURIComponent(link)}` : ''}`),
  /** Draft preview for the client (read-only token) */
  preview: (id: string, token: string) => request<{ config: InvitationConfig; published: boolean; updatedAt: string; revision: number }>('GET', `preview/${encodeURIComponent(id)}?k=${encodeURIComponent(token)}`),
  sendFeedback: (id: string, token: string, body: { name: string; message: string; approved: boolean; revision: number }) =>
    request<{ ok: boolean }>('POST', `preview/${encodeURIComponent(id)}/feedback?k=${encodeURIComponent(token)}`, body),
  rsvp: (slug: string, body: { name: string; phone: string; org: string; day: string; count: number; guest: string; lang: Lang; link?: string; via?: string; utm?: string }) =>
    request<{ ok: boolean; ticket: string }>('POST', `invitations/${encodeURIComponent(slug)}/rsvp`, body),
  ticket: (slug: string, code: string) => request<TicketInfo>('GET', `invitations/${encodeURIComponent(slug)}/ticket/${encodeURIComponent(code)}`),
  checkinList: (id: string, k: string) =>
    request<{ company: string; event: string; startDate: string; endDate: string; timezone: string; theme?: { primary: string; accent: string }; guests: CheckinGuest[] }>('GET', `checkin/${encodeURIComponent(id)}?k=${encodeURIComponent(k)}`),
  checkinScan: (id: string, k: string, body: { ticket?: string; rsvpId?: string; staff: string }) =>
    request<{ status: ScanStatus; guest: CheckinGuest | null }>('POST', `checkin/${encodeURIComponent(id)}/scan?k=${encodeURIComponent(k)}`, body),
  checkinUndo: (id: string, k: string, rsvpId: string) => request<{ guest: CheckinGuest | null }>('POST', `checkin/${encodeURIComponent(id)}/undo?k=${encodeURIComponent(k)}`, { rsvpId }),
  checkinWalkin: (id: string, k: string, body: { name: string; phone: string; org: string; count: number; staff: string }) =>
    request<{ guest: CheckinGuest }>('POST', `checkin/${encodeURIComponent(id)}/walkin?k=${encodeURIComponent(k)}`, body),
  checkinSettings: (id: string) => request<CheckinSettings>('GET', `records/${encodeURIComponent(id)}/checkin`),
  saveCheckinSettings: (id: string, checkin: CheckinSettings, renewToken = false) => request<CheckinSettings>('PUT', `records/${encodeURIComponent(id)}/checkin`, { checkin, renewToken }),
  list: () => request<RecordSummary[]>('GET', 'records'),
  getRecord: (id: string) => request<RecordView>('GET', `records/${encodeURIComponent(id)}`),
  createRecord: (config: InvitationConfig) => request<RecordView & { editToken: string; slugConflict: boolean }>('POST', 'records', { config }),
  saveRecord: (id: string, config: InvitationConfig, baseRevision?: number, force = false) =>
    request<RecordView & { slugConflict: boolean }>('PUT', `records/${encodeURIComponent(id)}`, { config, baseRevision, force }),
  publish: (id: string, config: InvitationConfig, baseRevision?: number) => request<RecordView>('POST', `records/${encodeURIComponent(id)}/publish`, { config, baseRevision }),
  history: (id: string) => request<HistoryEntry[]>('GET', `records/${encodeURIComponent(id)}/history`),
  restore: (id: string, source: { index: number } | { source: 'published' }) => request<RecordView>('POST', `records/${encodeURIComponent(id)}/restore`, source),
  duplicate: (id: string, mode: CopyMode) => request<RecordView & { editToken: string }>('POST', `records/${encodeURIComponent(id)}/duplicate`, { mode }),
  resolveFeedback: (id: string, fid: string, resolved: boolean) => request<{ ok: boolean }>('POST', `records/${encodeURIComponent(id)}/feedback/${fid}`, { resolved }),
  rsvps: (id: string) => request<Rsvp[]>('GET', `records/${encodeURIComponent(id)}/rsvps`),
  deleteRsvp: (id: string, rid: string) => request<{ ok: boolean }>('DELETE', `records/${encodeURIComponent(id)}/rsvps/${rid}`),
  stats: (id: string) => request<Stats>('GET', `records/${encodeURIComponent(id)}/stats`),
  tracking: (id: string) => request<Tracking>('GET', `records/${encodeURIComponent(id)}/tracking`),
  saveTracking: (id: string, tracking: Tracking) => request<Tracking>('PUT', `records/${encodeURIComponent(id)}/tracking`, { tracking }),
  settings: () => request<{ sms: SmsSettings; sentToday: number }>('GET', 'settings'),
  saveSettings: (sms: SmsSettings) => request<{ sms: SmsSettings; sentToday: number }>('PUT', 'settings', { sms }),
  testSms: (to: string, message: string) => request<{ ok: boolean; status: number; detail: string }>('POST', 'settings/test-sms', { to, message }),
  notify: (id: string) => request<{ notify: NotifySettings; smsReady: boolean; numberFormat: 'local' | 'intl'; log: NotifyLogEntry[] }>('GET', `records/${encodeURIComponent(id)}/notify`),
  saveNotify: (id: string, notify: NotifySettings) => request<{ notify: NotifySettings }>('PUT', `records/${encodeURIComponent(id)}/notify`, { notify }),
  testNotify: (id: string) => request<{ log: NotifyLogEntry[] }>('POST', `records/${encodeURIComponent(id)}/notify/test`),
  repReport: (id: string, repId: string, token: string) => request<RepReport>('GET', `rep-report/${encodeURIComponent(id)}?rep=${encodeURIComponent(repId)}&k=${encodeURIComponent(token)}`),
  unpublish: (id: string) => request<RecordView>('POST', `records/${encodeURIComponent(id)}/unpublish`),
  remove: (id: string) => request<{ ok: boolean }>('DELETE', `records/${encodeURIComponent(id)}`),
  /** Admin only: issue a new edit link (the old one stops working). */
  resetToken: (id: string) => request<{ editToken: string }>('POST', `records/${encodeURIComponent(id)}/token`),
};

// ------------------------------------------------------------------ uploads

let metaCache: Promise<ServerMeta> | null = null;
export const serverMeta = () => (metaCache ??= api.meta().catch(() => ({ adminRequired: false, videoProcessing: false })));

export interface UploadResult {
  url: string;
  /** Poster frame for videos (generated by the server or captured in the browser) */
  poster?: string;
  /** Non-blocking notice to show the user */
  note?: string;
}

const mb = (bytes: number) => bytes / 1024 / 1024;
const faNum = (n: number) => n.toLocaleString('fa-IR', { maximumFractionDigits: 1 });

function rawUpload(file: Blob, name: string, kind: UploadKind, onProgress?: (pct: number) => void): Promise<{ url: string; poster?: string; transcoded?: boolean }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', apiUrl(`uploads?kind=${kind}&name=${encodeURIComponent(name)}`));
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
      if (xhr.status >= 200 && xhr.status < 300 && data.url) resolve(data);
      else reject(new Error(data.error || (xhr.status === 413 ? 'حجم فایل بیش از حد مجاز است' : `خطا در بارگذاری (${xhr.status})`)));
    };
    xhr.onerror = () => reject(new Error('ارتباط با سرور برقرار نشد'));
    xhr.send(file);
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise(res => canvas.toBlob(res, type, quality));
}

/**
 * Bounding box of the real content: ignores transparent margins, or margins of the same
 * colour as all four corners (white/coloured padding around a logo). null = nothing to trim.
 */
function contentBox(ctx: CanvasRenderingContext2D, w: number, h: number): { x: number; y: number; w: number; h: number } | null {
  const { data } = ctx.getImageData(0, 0, w, h);
  const px = (x: number, y: number) => (y * w + x) * 4;
  const corners = [px(0, 0), px(w - 1, 0), px(0, h - 1), px(w - 1, h - 1)];
  const transparent = corners.every(i => data[i + 3] < 16);
  const ref = corners[0];
  const near = (i: number, j: number) => Math.abs(data[i] - data[j]) + Math.abs(data[i + 1] - data[j + 1]) + Math.abs(data[i + 2] - data[j + 2]) < 36;
  const uniform = !transparent && corners.every(i => near(i, ref) && data[i + 3] > 240);
  if (!transparent && !uniform) return null;
  const isBg = (i: number) => (transparent ? data[i + 3] < 16 : data[i + 3] > 240 && near(i, ref));
  let top = 0, bottom = h - 1, left = 0, right = w - 1;
  const rowBg = (y: number) => { for (let x = 0; x < w; x++) if (!isBg(px(x, y))) return false; return true; };
  const colBg = (x: number) => { for (let y = top; y <= bottom; y++) if (!isBg(px(x, y))) return false; return true; };
  while (top < bottom && rowBg(top)) top++;
  while (bottom > top && rowBg(bottom)) bottom--;
  while (left < right && colBg(left)) left++;
  while (right > left && colBg(right)) right--;
  const bw = right - left + 1, bh = bottom - top + 1;
  if (bw < 4 || bh < 4 || (bw > w * 0.97 && bh > h * 0.97)) return null; // empty image or nothing worth trimming
  const pad = Math.round(Math.max(bw, bh) * 0.03);
  const x = Math.max(0, left - pad), y = Math.max(0, top - pad);
  return { x, y, w: Math.min(w, right + pad + 1) - x, h: Math.min(h, bottom + pad + 1) - y };
}

/**
 * Resize/re-encode raster images in the browser: keeps uploads small for guests, converts
 * iPhone HEIC photos (where the browser can decode them) to WebP, and optionally trims empty
 * margins around logos so they don't look tiny on the invitation.
 */
async function prepareImage(file: File, maxDim: number, trim = false): Promise<{ blob: Blob; name: string; trimmed: boolean }> {
  const ext = extOf(file.name);
  const isHeic = ext === 'heic' || ext === 'heif' || /heic|heif/.test(file.type);
  if (ext === 'svg' || ext === 'gif') return { blob: file, name: file.name, trimmed: false };

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    if (isHeic) throw new Error('این مرورگر فایل HEIC آیفون را پشتیبانی نمی‌کند؛ لطفاً تصویر را با فرمت JPG یا PNG ذخیره کنید.');
    throw new Error('فایل تصویر قابل خواندن نیست.');
  }
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  if (!trim && !isHeic && scale === 1 && file.size < 400 * 1024) {
    bitmap.close();
    return { blob: file, name: file.name, trimmed: false };
  }
  let canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d', { willReadFrequently: trim })!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  let trimmed = false;
  if (trim) {
    const box = contentBox(ctx, canvas.width, canvas.height);
    if (box) {
      const cropped = document.createElement('canvas');
      cropped.width = box.w;
      cropped.height = box.h;
      cropped.getContext('2d')!.drawImage(canvas, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
      canvas = cropped;
      trimmed = true;
    }
  }
  const webp = await canvasToBlob(canvas, 'image/webp', 0.9);
  if (webp && webp.type === 'image/webp') return { blob: webp, name: 'image.webp', trimmed };
  const png = await canvasToBlob(canvas, 'image/png', 1);
  if (!png) throw new Error('پردازش تصویر ناموفق بود.');
  return { blob: png, name: 'image.png', trimmed };
}

/** Grab a frame of a video in the browser to use as its poster (null if the browser can't decode it). */
function captureVideoFrame(file: File): Promise<Blob | null> {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    const done = (b: Blob | null) => {
      URL.revokeObjectURL(url);
      resolve(b);
    };
    const timer = window.setTimeout(() => done(null), 8000);
    v.muted = true;
    v.playsInline = true;
    v.preload = 'auto';
    v.onloadeddata = () => (v.currentTime = Math.min(1, (v.duration || 2) / 2));
    v.onseeked = async () => {
      window.clearTimeout(timer);
      const scale = Math.min(1, 1280 / Math.max(v.videoWidth, v.videoHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(v.videoWidth * scale);
      c.height = Math.round(v.videoHeight * scale);
      c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height);
      done(await canvasToBlob(c, 'image/jpeg', 0.8));
    };
    v.onerror = () => {
      window.clearTimeout(timer);
      done(null);
    };
    v.src = url;
  });
}

export type UploadPhase = 'preparing' | 'uploading' | 'processing';

/** Validate, pre-process and upload a file. */
export async function uploadFile(
  file: File,
  kind: UploadKind,
  opts: { onProgress?: (pct: number) => void; onPhase?: (p: UploadPhase) => void; maxImageDim?: number; trim?: boolean } = {},
): Promise<UploadResult> {
  const rule = UPLOAD_RULES[kind];
  const ext = extOf(file.name);
  const meta = await serverMeta();

  if (kind === 'image') {
    if (![...rule.exts, 'heic', 'heif'].includes(ext)) throw new Error(`فرمت تصویر مجاز نیست (${rule.exts.join('، ')}).`);
    if (mb(file.size) > 25) throw new Error('حجم تصویر بیش از ۲۵ مگابایت است.');
    opts.onPhase?.('preparing');
    const { blob, name, trimmed } = await prepareImage(file, opts.maxImageDim ?? 1600, opts.trim);
    if (mb(blob.size) > rule.maxMb) throw new Error(`حجم تصویر بعد از فشرده‌سازی هم بیش از ${faNum(rule.maxMb)} مگابایت است.`);
    opts.onPhase?.('uploading');
    const r = await rawUpload(blob, name, kind, opts.onProgress);
    return { url: r.url, note: trimmed ? 'حاشیه‌های خالی اطراف تصویر به‌طور خودکار حذف شد.' : undefined };
  }

  if (!rule.exts.includes(ext)) throw new Error(`فرمت فایل مجاز نیست. فرمت‌های مجاز: ${rule.exts.join('، ')}`);
  if (mb(file.size) > rule.maxMb) throw new Error(`حجم فایل ${faNum(mb(file.size))} مگابایت است؛ حداکثر ${faNum(rule.maxMb)} مگابایت مجاز است.`);
  if (kind === 'video' && NEEDS_TRANSCODE.includes(ext) && !meta.videoProcessing) {
    throw new Error('فایل MOV روی همه گوشی‌ها پخش نمی‌شود و سرور امکان تبدیل آن را ندارد؛ لطفاً ویدئو را با فرمت MP4 (H.264) خروجی بگیرید.');
  }

  let posterBlob: Blob | null = null;
  if (kind === 'video') {
    opts.onPhase?.('preparing');
    posterBlob = await captureVideoFrame(file);
  }
  opts.onPhase?.('uploading');
  const res = await rawUpload(file, file.name, kind, pct => {
    opts.onProgress?.(pct);
    if (pct === 100 && kind === 'video' && meta.videoProcessing) opts.onPhase?.('processing');
  });

  const result: UploadResult = { url: res.url };
  if (kind === 'video') {
    result.poster = res.poster;
    if (!result.poster && posterBlob) result.poster = (await rawUpload(posterBlob, 'poster.jpg', 'image').catch(() => null))?.url;
    const notes: string[] = [];
    if (!res.transcoded && ext === 'webm') notes.push('فرمت WebM روی برخی آیفون‌ها پخش نمی‌شود؛ MP4 پیشنهاد می‌شود.');
    if (!res.transcoded && mb(file.size) > VIDEO_WARN_MB) notes.push(`حجم ویدئو (${faNum(mb(file.size))} مگابایت) برای مهمانانی که با اینترنت موبایل وارد می‌شوند زیاد است؛ ویدئوی کوتاه‌تر یا فشرده‌تر پیشنهاد می‌شود.`);
    if (res.transcoded) notes.push('ویدئو برای پخش روی همه گوشی‌ها بهینه شد.');
    if (notes.length) result.note = notes.join(' ');
  }
  return result;
}

// ---------- invitations created from this browser ----------

export interface MyInvitation {
  id: string;
  editToken: string;
  slug: string;
  company: string;
  event: string;
  createdAt: string;
}

export function getMyInvitations(): MyInvitation[] {
  try {
    // Entries from the earlier format (keyed by slug, no id) can't be used with the new API.
    return (JSON.parse(localStorage.getItem(MINE_KEY) || '[]') as MyInvitation[]).filter(i => i && i.id && i.editToken);
  } catch {
    return [];
  }
}

export function saveMyInvitation(item: MyInvitation) {
  const list = getMyInvitations().filter(i => i.id !== item.id);
  localStorage.setItem(MINE_KEY, JSON.stringify([item, ...list]));
}

export function updateMyInvitation(id: string, patch: Partial<MyInvitation>) {
  const list = getMyInvitations();
  const i = list.find(x => x.id === id);
  if (!i) return;
  Object.assign(i, patch);
  localStorage.setItem(MINE_KEY, JSON.stringify(list));
}

export function forgetMyInvitation(id: string) {
  localStorage.setItem(MINE_KEY, JSON.stringify(getMyInvitations().filter(i => i.id !== id)));
}

/** Fire-and-forget visit statistics (guests only; never blocks the page). */
export function trackEvent(slug: string, type: string, dims: { link?: string; utm?: string } = {}) {
  try {
    const url = apiUrl(`invitations/${encodeURIComponent(slug)}/event`);
    const body = JSON.stringify({ type, ...dims });
    if (navigator.sendBeacon?.(url, new Blob([body], { type: 'application/json' }))) return;
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
  } catch {
    /* ignore */
  }
}
