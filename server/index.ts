import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import compression from 'compression';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { createWriteStream, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { execFile, spawnSync } from 'node:child_process';
import {
  DEFAULT_FOOTER,
  RESERVED_SLUGS,
  SLUG_RE,
  copyInvitation,
  publicVersion,
  sanitizeInvitation,
  validateForPublish,
  type InvitationConfig,
  type Lang,
} from '../src/shared/invitation';
import { eventEnded, icsContent } from '../src/shared/calendar';
import { repVcardContent, vcardContent } from '../src/shared/vcard';
import { CODE_RE, channelLabel, emptyTracking, publicLink, publicTracking, sanitizeTracking, type Tracking } from '../src/shared/tracking';
import {
  DEFAULT_NOTIFY,
  DEFAULT_SMS_SETTINGS,
  formatMobile,
  maskSmsSettings,
  parseNumbers,
  renderTemplate,
  sanitizeNotify,
  sanitizeSmsSettings,
  type NotifyLogEntry,
  type NotifySettings,
  type SmsSettings,
} from '../src/shared/notify';
import { sendSms } from './sms';
import { newTicketCode, sanitizeCheckin, TICKET_RE, type CheckinGuest, type CheckinSettings, type TicketInfo } from '../src/shared/checkin';
import { extOf, NEEDS_TRANSCODE, UPLOAD_RULES, type UploadKind } from '../src/shared/uploads';

// Node 18 has no global WebCrypto by default; shared code (src/shared/tracking.ts) uses it.
if (!(globalThis as any).crypto) (globalThis as any).crypto = crypto.webcrypto;

// ---------------------------------------------------------------- configuration

const isProd = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;
/** URL prefix the app is served under, e.g. "/in" for https://studio.asvashop.com/in/ */
const BASE_PATH = ('/' + (process.env.BASE_PATH ?? '/in').replace(/^\/+|\/+$/g, '')).replace(/^\/$/, '');
/** Optional canonical public URL (e.g. https://studio.asvashop.com/in) used in link previews. */
const PUBLIC_URL = (process.env.PUBLIC_URL || '').replace(/\/+$/, '');
const APP_ROOT = path.resolve(
  process.env.APP_ROOT || (typeof __dirname !== 'undefined' && path.basename(__dirname) === 'dist-server' ? path.join(__dirname, '..') : process.cwd()),
);
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(APP_ROOT, 'data'));
const INVITES_DIR = path.join(DATA_DIR, 'invitations');
const RSVP_DIR = path.join(DATA_DIR, 'rsvp');
const STATS_DIR = path.join(DATA_DIR, 'stats');
const NOTIFY_DIR = path.join(DATA_DIR, 'notify');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const ALLOW_OPEN_ACCESS = process.env.ALLOW_OPEN_ACCESS === 'true';
const UPLOAD_QUOTA_MB = Number(process.env.UPLOAD_QUOTA_MB) || 3000;
const UPLOAD_GRACE_DAYS = Number(process.env.UPLOAD_GRACE_DAYS) || 7;
const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
const TRUST_PROXY = process.env.TRUST_PROXY ?? 'loopback';

if (isProd && !ADMIN_PASSWORD && !ALLOW_OPEN_ACCESS) {
  console.error('[fatal] ADMIN_PASSWORD is not set. Set it in .env (or ALLOW_OPEN_ACCESS=true to let anyone create invitations).');
  process.exit(1);
}

mkdirSync(INVITES_DIR, { recursive: true });
mkdirSync(RSVP_DIR, { recursive: true });
mkdirSync(STATS_DIR, { recursive: true });
mkdirSync(NOTIFY_DIR, { recursive: true });
mkdirSync(UPLOADS_DIR, { recursive: true });

const ffmpegAvailable = (() => {
  try {
    return spawnSync(FFMPEG, ['-version'], { timeout: 5000 }).status === 0;
  } catch {
    return false;
  }
})();

// ---------------------------------------------------------------- storage
//
// One JSON file per invitation, named by an internal id. Each record keeps the
// working copy ("draft", may be incomplete) and the version guests see
// ("published", only ever written after full validation).

interface InvitationRecord {
  id: string;
  draft: InvitationConfig;
  published: InvitationConfig | null;
  publishedAt: string | null;
  editTokenHash: string;
  /** Read-only token for the client preview link (shows missing items in red) */
  previewToken: string;
  createdAt: string;
  updatedAt: string;
  /** Increases on every change; used to detect two people editing at once */
  revision: number;
  /** Earlier versions of the draft (newest first) */
  history: Snapshot[];
  /** Comments / approvals left by the client on the preview link */
  feedback: Feedback[];
  /** Sales reps, tracked links and their options – live, not part of draft/publish */
  tracking: Tracking;
  /** SMS notification rules for attendance confirmations – live */
  notify: NotifySettings;
  /** Booth check-in (tickets + staff scanner) – live */
  checkin: CheckinSettings;
}

interface Snapshot {
  at: string;
  kind: 'auto' | 'publish' | 'before-restore';
  revision: number;
  draft: InvitationConfig;
}

interface Feedback {
  id: string;
  at: string;
  name: string;
  message: string;
  approved: boolean;
  /** Draft revision the client was looking at */
  revision: number;
  resolved: boolean;
}

const HISTORY_MAX = 40;
const HISTORY_EVERY_MS = 10 * 60_000;

const ID_RE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;
const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
const newToken = () => crypto.randomBytes(24).toString('base64url');
const newId = () => `d${crypto.randomBytes(6).toString('hex')}`;
const fileFor = (id: string) => path.join(INVITES_DIR, `${id}.json`);

/** slug -> id of the record that owns it (published slug, or the slug a draft has reserved) */
const slugIndex = new Map<string, string>();
const claimedSlug = (r: InvitationRecord) => r.published?.slug || (SLUG_RE.test(r.draft.slug) ? r.draft.slug : '');

async function readRecord(id: string): Promise<InvitationRecord | null> {
  if (!ID_RE.test(id)) return null;
  try {
    const raw = JSON.parse(await fs.readFile(fileFor(id), 'utf8'));
    if (!raw.draft && raw.config) {
      // Migrate the earlier format ({ config, editTokenHash }): it was published.
      const config = sanitizeInvitation(raw.config);
      return { id, draft: config, published: config, publishedAt: raw.updatedAt, editTokenHash: raw.editTokenHash, previewToken: newToken(), createdAt: raw.createdAt, updatedAt: raw.updatedAt, revision: 1, history: [], feedback: [], tracking: emptyTracking(), notify: { ...DEFAULT_NOTIFY }, checkin: sanitizeCheckin({}, newToken) };
    }
    raw.draft = sanitizeInvitation(raw.draft);
    raw.published = raw.published ? sanitizeInvitation(raw.published) : null;
    raw.revision = Number(raw.revision) || 1;
    raw.history = Array.isArray(raw.history) ? raw.history.map((h: Snapshot) => ({ ...h, draft: sanitizeInvitation(h.draft) })) : [];
    raw.feedback = Array.isArray(raw.feedback) ? raw.feedback : [];
    raw.tracking = raw.tracking ? sanitizeTracking(raw.tracking) : emptyTracking();
    raw.notify = sanitizeNotify(raw.notify);
    raw.checkin = sanitizeCheckin(raw.checkin, newToken);
    return raw;
  } catch {
    return null;
  }
}

/**
 * Write-then-rename, so a crash or restart mid-write (e.g. Passenger recycling the app)
 * never leaves a half-written file behind: readers see either the old or the new version.
 */
async function writeJsonAtomic(file: string, data: unknown, pretty = true) {
  const tmp = `${file}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(tmp, pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data));
  await fs.rename(tmp, file);
}

async function writeRecord(rec: InvitationRecord) {
  const target = fileFor(rec.id);
  const tmp = `${target}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(rec, null, 2));
  await fs.rename(tmp, target);
  for (const [slug, id] of slugIndex) if (id === rec.id) slugIndex.delete(slug);
  const slug = claimedSlug(rec);
  if (slug) slugIndex.set(slug, rec.id);
}

/** Keep the previous draft in the history (at most one automatic snapshot per 10 minutes). */
function withHistory(rec: InvitationRecord, kind: Snapshot['kind'], force = false): Snapshot[] {
  const last = rec.history[0];
  const same = last && JSON.stringify(last.draft) === JSON.stringify(rec.draft);
  if (same) return rec.history;
  if (!force && kind === 'auto' && last && Date.now() - Date.parse(last.at) < HISTORY_EVERY_MS) return rec.history;
  return [{ at: new Date().toISOString(), kind, revision: rec.revision, draft: rec.draft }, ...rec.history].slice(0, HISTORY_MAX);
}

async function allRecords(): Promise<InvitationRecord[]> {
  const files = (await fs.readdir(INVITES_DIR)).filter(f => f.endsWith('.json'));
  const recs = await Promise.all(files.map(f => readRecord(f.slice(0, -5))));
  return recs.filter((r): r is InvitationRecord => !!r);
}

async function buildSlugIndex() {
  slugIndex.clear();
  for (const r of await allRecords()) {
    const slug = claimedSlug(r);
    if (slug && !slugIndex.has(slug)) slugIndex.set(slug, r.id);
  }
}

async function publishedRecord(slug: string): Promise<InvitationRecord | null> {
  const id = slugIndex.get(slug);
  const rec = id ? await readRecord(id) : null;
  return rec?.published && rec.published.slug === slug ? rec : null;
}

async function publishedBySlug(slug: string): Promise<InvitationConfig | null> {
  const id = slugIndex.get(slug);
  const rec = id ? await readRecord(id) : null;
  return rec?.published && rec.published.slug === slug ? publicVersion(rec.published) : null;
}

/** Serialises slug claims so two saves can't grab the same address at once. */
let slugLock: Promise<unknown> = Promise.resolve();
function withSlugLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = slugLock.then(fn, fn);
  slugLock = run.catch(() => {});
  return run;
}

/** Uploaded files referenced by an invitation. */
function uploadsOf(c: InvitationConfig | null): string[] {
  if (!c) return [];
  return [c.company.logo, c.company.icon, c.company.shareImage, c.event.logo, c.theme.customFontUrl, c.media.video, c.media.videoPoster, c.media.music]
    .filter(p => p.startsWith('uploads/'))
    .map(p => p.slice('uploads/'.length));
}

let uploadsBytes = 0;
async function dirSize(dir: string) {
  let total = 0;
  for (const f of await fs.readdir(dir)) total += (await fs.stat(path.join(dir, f)).catch(() => ({ size: 0 }))).size;
  return total;
}

/**
 * Delete uploads no invitation (draft or published) references any more. Files younger than
 * the grace period are kept: they may belong to a wizard session that hasn't saved yet.
 */
async function collectGarbage(graceMs = UPLOAD_GRACE_DAYS * 86_400_000, only?: Set<string>) {
  const used = new Set(
    (await allRecords()).flatMap(r => [
      ...uploadsOf(r.draft),
      ...uploadsOf(r.published),
      ...r.history.flatMap(h => uploadsOf(h.draft)),
      ...r.tracking.reps.filter(x => x.photo.startsWith('uploads/')).map(x => x.photo.slice('uploads/'.length)),
    ]),
  );
  const now = Date.now();
  let removed = 0;
  for (const f of await fs.readdir(UPLOADS_DIR)) {
    if (used.has(f) || (only && !only.has(f))) continue;
    const full = path.join(UPLOADS_DIR, f);
    const st = await fs.stat(full).catch(() => null);
    if (!st || now - st.mtimeMs < graceMs) continue;
    await fs.rm(full, { force: true });
    removed++;
  }
  uploadsBytes = await dirSize(UPLOADS_DIR);
  if (removed) console.log(`[gc] removed ${removed} unused upload(s)`);
}

// ---------------------------------------------------------------- rate limiting (in-memory)

const buckets = new Map<string, number[]>();
function hit(key: string, windowMs: number): number {
  const now = Date.now();
  const list = (buckets.get(key) ?? []).filter(t => now - t < windowMs);
  list.push(now);
  buckets.set(key, list);
  return list.length;
}
function count(key: string, windowMs: number): number {
  const now = Date.now();
  return (buckets.get(key) ?? []).filter(t => now - t < windowMs).length;
}
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets) if (!v.some(t => now - t < 3_600_000)) buckets.delete(k);
}, 600_000).unref();

const limit = (name: string, max: number, windowMs: number) => (req: Request, res: Response, next: NextFunction) => {
  if (hit(`${name}:${req.ip}`, windowMs) > max) return res.status(429).json({ error: 'تعداد درخواست‌ها زیاد است؛ کمی بعد دوباره تلاش کنید.' });
  next();
};

// ---------------------------------------------------------------- auth

function safeEqual(a: string, b: string) {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

const AUTH_FAIL_WINDOW = 15 * 60_000;
const AUTH_FAIL_MAX = 10;

const adminCache = new WeakMap<Request, boolean>();
function isAdmin(req: Request): boolean {
  const cached = adminCache.get(req);
  if (cached !== undefined) return cached;
  const given = String(req.get('x-admin-password') || '');
  let ok = false;
  if (ADMIN_PASSWORD && given) {
    ok = safeEqual(given, ADMIN_PASSWORD);
    if (!ok) hit(`authfail:${req.ip}`, AUTH_FAIL_WINDOW); // counted once per request
  }
  adminCache.set(req, ok);
  return ok;
}
/** Creating invitations / uploading is open only when no ADMIN_PASSWORD is configured (dev or ALLOW_OPEN_ACCESS). */
const canCreate = (req: Request) => !ADMIN_PASSWORD || isAdmin(req);
const canEditFooter = canCreate;
function canEdit(req: Request, rec: InvitationRecord): boolean {
  if (isAdmin(req)) return true;
  const token = String(req.get('x-edit-token') || '');
  if (!token) return false;
  if (safeEqual(sha256(token), rec.editTokenHash)) return true;
  hit(`authfail:${req.ip}`, AUTH_FAIL_WINDOW);
  return false;
}

// ---------------------------------------------------------------- app

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', TRUST_PROXY === 'true' ? true : TRUST_PROXY === 'false' ? false : TRUST_PROXY);
app.use(compression());

const api = express.Router();

// Express 4 ignores rejected promises from async handlers: an error (disk full, damaged
// file, …) would become an unhandled rejection and take the whole process down. Every API
// route handler's promise is caught and passed on to the JSON error handler (api.use at the end).
for (const method of ['get', 'post', 'put', 'delete'] as const) {
  const original = api[method].bind(api) as (...args: unknown[]) => unknown;
  (api as any)[method] = (path: unknown, ...handlers: unknown[]) =>
    original(
      path,
      ...handlers.map(h =>
        typeof h === 'function' && h.length < 4
          ? (req: Request, res: Response, next: NextFunction) => {
              try {
                const r = (h as (...a: unknown[]) => unknown)(req, res, next);
                if (r && typeof (r as Promise<unknown>).catch === 'function') (r as Promise<unknown>).catch(next);
              } catch (e) {
                next(e);
              }
            }
          : h,
      ),
    );
}

// Brute-force protection: too many wrong admin passwords / edit tokens from one IP => temporary block.
api.use((req, res, next) => {
  if ((req.get('x-admin-password') || req.get('x-edit-token')) && count(`authfail:${req.ip}`, AUTH_FAIL_WINDOW) >= AUTH_FAIL_MAX) {
    return res.status(429).json({ error: 'تلاش‌های ناموفق زیاد بود؛ ۱۵ دقیقه دیگر دوباره امتحان کنید.' });
  }
  next();
});
api.use(limit('api', 600, 60_000));

api.get('/meta', (_req, res) => {
  res.json({ adminRequired: !!ADMIN_PASSWORD, videoProcessing: ffmpegAvailable, smsReady: smsSettings.provider !== 'none' });
});

api.post('/auth', (req, res) => {
  res.json({ ok: canCreate(req), admin: isAdmin(req) });
});

api.get('/slug/:slug', limit('slug', 120, 60_000), async (req, res) => {
  const slug = req.params.slug.toLowerCase();
  if (!SLUG_RE.test(slug) || RESERVED_SLUGS.has(slug)) return res.json({ available: false, valid: false });
  const owner = slugIndex.get(slug);
  res.json({ available: !owner || owner === String(req.query.id || ''), valid: true });
});

// ----- public (guests)

api.get('/invitations/:slug', async (req, res) => {
  const rec = await publishedRecord(req.params.slug.toLowerCase());
  if (!rec) return res.status(404).json({ error: 'دعوتنامه پیدا نشد' });
  res.set('Cache-Control', 'no-cache');
  res.json({
    config: publicVersion(rec.published!),
    // Unknown or deactivated link codes fall back to the main invitation (link: null), never a 404.
    link: publicLink(rec.tracking, String(req.query.link || '').toLowerCase()),
    tracking: publicTracking(rec.tracking),
  });
});

/** Real .ics download – far more reliable than data: URLs on iPhone and in-app browsers. */
api.get('/invitations/:slug/ics', async (req, res) => {
  const config = await publishedBySlug(req.params.slug.toLowerCase());
  if (!config || !config.event.startDate) return res.status(404).type('text').send('Not found');
  res.set({ 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': `attachment; filename="${config.slug}.ics"`, 'Cache-Control': 'no-cache' });
  res.send(icsContent(config, langOf(req)));
});

const langOf = (req: Request): Lang => (req.query.lang === 'en' ? 'en' : 'fa');

/** Organiser's contact card – opens "add contact" on phones. */
api.get('/invitations/:slug/vcard', async (req, res) => {
  const rec = await publishedRecord(req.params.slug.toLowerCase());
  if (!rec) return res.status(404).type('text').send('Not found');
  const config = publicVersion(rec.published!);
  const link = publicLink(rec.tracking, String(req.query.link || '').toLowerCase());
  res.set({ 'Content-Type': 'text/vcard; charset=utf-8', 'Content-Disposition': `attachment; filename="${config.slug}${link?.rep ? `-${link.code}` : ''}.vcf"`, 'Cache-Control': 'no-cache' });
  // On a rep's link the saved contact is the rep (with the company as organisation).
  res.send(link?.rep ? repVcardContent(config, link.rep, langOf(req)) : vcardContent(config, langOf(req)));
});

// ----- attendance confirmations (RSVP)

interface Rsvp {
  id: string;
  at: string;
  name: string;
  phone: string;
  org: string;
  /** YYYY-MM-DD or '' (not decided) */
  day: string;
  count: number;
  /** Name from a personal link (?to=...), if any */
  guest: string;
  lang: Lang;
  /** Attribution (multi-link tracking): link credited, its rep and channel, link actually used, UTM */
  link?: string;
  repId?: string;
  repName?: string;
  channel?: string;
  via?: string;
  referral?: boolean;
  utm?: string;
  /** Booth check-in */
  ticket?: string;
  checkedInAt?: string;
  checkedInBy?: string;
  visits?: number;
  walkIn?: boolean;
  /** Check-in operation that created this entry (walk-ins), for idempotent syncs */
  opId?: string;
}

const cleanUtm = (v: unknown) => clean(v, 80);
/** Validate a stats key from the browser: "_" or an existing link code, optionally "+ref". */
function linkKey(t: Tracking, raw: unknown): string {
  if (!t.settings.enabled || typeof raw !== 'string') return '';
  const ref = raw.endsWith('+ref');
  const code = ref ? raw.slice(0, -4) : raw;
  if (code !== '_' && !t.links.some(l => l.code === code)) return '';
  return ref && !t.settings.referral ? code : raw;
}

const rsvpFile = (id: string) => path.join(RSVP_DIR, `${id}.json`);
async function readRsvps(id: string): Promise<Rsvp[]> {
  let text: string;
  try {
    text = await fs.readFile(rsvpFile(id), 'utf8');
  } catch {
    return []; // no responses yet
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    // Never treat a damaged guest list as empty: the next write would erase every response.
    console.error(`RSVP file of ${id} is not valid JSON; refusing to overwrite it`, e);
    throw new Error('rsvp file damaged');
  }
}
let rsvpLock: Promise<unknown> = Promise.resolve();
function addRsvp(id: string, entry: Rsvp) {
  const run = rsvpLock.then(async () => {
    const list = await readRsvps(id);
    list.push(entry);
    await writeJsonAtomic(rsvpFile(id), list);
  });
  rsvpLock = run.catch(() => {});
  return run;
}

/** Read-modify-write the RSVP list under the same lock as additions. */
function updateRsvps<T>(id: string, fn: (list: Rsvp[]) => T | Promise<T>): Promise<T> {
  const run = rsvpLock.then(async () => {
    const list = await readRsvps(id);
    const out = await fn(list);
    await writeJsonAtomic(rsvpFile(id), list);
    return out;
  });
  rsvpLock = run.catch(() => {});
  return run;
}

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max) : '');

api.post('/invitations/:slug/rsvp', limit('rsvp', 30, 3_600_000), express.json({ limit: '8kb' }), async (req, res) => {
  const slug = req.params.slug.toLowerCase();
  const rec = await publishedRecord(slug);
  const config = rec?.published;
  if (!rec || !config || !config.rsvp.enabled) return res.status(404).json({ error: 'not found' });
  const t = rec.tracking;
  const attrKey = linkKey(t, req.body?.link);
  const attrCode = attrKey.replace(/\+ref$/, '');
  const link = t.links.find(l => l.code === attrCode);
  const repOf = link?.repId ? t.reps.find(r => r.id === link.repId) : undefined;
  const name = clean(req.body?.name, 120);
  if (!name) return res.status(400).json({ error: 'name required' });
  const day = typeof req.body?.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.body.day) ? req.body.day : '';
  const entry: Rsvp = {
    id: crypto.randomBytes(5).toString('hex'),
    at: new Date().toISOString(),
    name,
    phone: config.rsvp.askPhone ? clean(req.body?.phone, 40) : '',
    org: config.rsvp.askCompany ? clean(req.body?.org, 120) : '',
    day,
    count: Math.min(20, Math.max(1, Math.round(Number(req.body?.count) || 1))),
    guest: clean(req.body?.guest, 120),
    lang: req.body?.lang === 'en' ? 'en' : 'fa',
    ...(t.settings.enabled
      ? {
          link: attrKey,
          repId: repOf?.id ?? '',
          repName: repOf?.name ?? '',
          channel: link?.channel ?? '',
          via: linkKey(t, req.body?.via),
          referral: attrKey.endsWith('+ref'),
          utm: t.settings.utm ? cleanUtm(req.body?.utm) : '',
        }
      : {}),
  };
  if (rec.checkin.enabled) entry.ticket = newTicketCode(new Set((await readRsvps(rec.id)).map(r => r.ticket ?? '')));
  await addRsvp(rec.id, entry);
  bumpStat(rec.id, 'rsvp', attrKey, entry.utm);
  notifyRsvp(rec, config, entry, repOf, link).catch(console.error);
  if (entry.ticket) sendTicketSms(rec, config, entry, `${publicBase(req)}/${slug}/t/${entry.ticket}`).catch(console.error);
  res.status(201).json({ ok: true, ticket: entry.ticket ?? '' });
});

// ----- visit statistics (aggregated counters only – no IPs or personal data)

const STAT_TYPES = new Set(['checkin', 'walkin', 'view', 'unique', 'linkUnique', 'enter', 'details', 'gcal', 'ics', 'map', 'boothMap', 'share', 'contact', 'vcard', 'rsvp', 'personal', 'en']);
type DayStats = Record<string, number>;
/** days: totals per day · links: per link key per day · utm: per "source / campaign" totals */
interface StatsFile {
  days: Record<string, DayStats>;
  links: Record<string, Record<string, DayStats>>;
  utm: Record<string, DayStats>;
}
const statsCache = new Map<string, StatsFile>();
const dirtyStats = new Set<string>();
const statsFile = (id: string) => path.join(STATS_DIR, `${id}.json`);

async function loadStats(id: string): Promise<StatsFile> {
  let s = statsCache.get(id);
  if (!s) {
    let raw: any = {};
    try {
      raw = JSON.parse(await fs.readFile(statsFile(id), 'utf8'));
    } catch {
      /* none yet */
    }
    // Earlier format was just { day: counters }
    s = raw.days ? { days: raw.days, links: raw.links ?? {}, utm: raw.utm ?? {} } : { days: raw, links: {}, utm: {} };
    statsCache.set(id, s);
  }
  return s;
}
const tehranDay = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran' }).format(new Date());
const inc = (o: DayStats, k: string) => (o[k] = (o[k] ?? 0) + 1);
async function bumpStat(id: string, type: string, link = '', utm = '', at?: Date) {
  const s = await loadStats(id);
  // Offline check-ins are counted on the day they actually happened.
  const day = at ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran' }).format(at) : tehranDay();
  inc((s.days[day] ??= {}), type);
  if (link) inc(((s.links[link] ??= {})[day] ??= {}), type);
  if (utm) inc((s.utm[utm] ??= {}), type);
  dirtyStats.add(id);
}
async function flushStats() {
  for (const id of [...dirtyStats]) {
    dirtyStats.delete(id);
    const s = statsCache.get(id);
    if (s && (await fs.stat(fileFor(id)).catch(() => null))) await writeJsonAtomic(statsFile(id), s, false);
  }
}
setInterval(() => flushStats().catch(console.error), 15_000).unref();
for (const sig of ['SIGINT', 'SIGTERM'] as const) process.on(sig, () => flushStats().finally(() => process.exit(0)));

function statTotals(days: Record<string, DayStats>) {
  const totals: Record<string, number> = {};
  for (const day of Object.values(days)) for (const [k, v] of Object.entries(day)) totals[k] = (totals[k] ?? 0) + v;
  return totals;
}

api.post('/invitations/:slug/event', limit('event', 240, 60_000), express.json({ limit: '1kb' }), express.text({ limit: '1kb' }), async (req, res) => {
  const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body); } catch { return {}; } })() : req.body;
  const type = String(body?.type || '');
  const id = slugIndex.get(req.params.slug.toLowerCase());
  if (!id || !STAT_TYPES.has(type)) return res.status(204).end();
  const rec = await readRecord(id);
  if (rec?.published) {
    const t = rec.tracking;
    await bumpStat(id, type, linkKey(t, body?.link), t.settings.enabled && t.settings.utm ? cleanUtm(body?.utm) : '');
  }
  res.status(204).end();
});

/** Client preview of an unpublished draft (read-only link shared with the client). */
api.get('/preview/:id', limit('preview', 120, 60_000), async (req, res) => {
  const rec = await readRecord(req.params.id);
  if (!rec || !safeEqual(String(req.query.k || ''), rec.previewToken)) return res.status(404).json({ error: 'پیش‌نمایش پیدا نشد' });
  res.set('Cache-Control', 'no-store');
  res.json({ config: rec.draft, published: !!rec.published, updatedAt: rec.updatedAt, revision: rec.revision });
});

/** The client comments on / approves the version they are looking at. */
api.post('/preview/:id/feedback', limit('feedback', 20, 3_600_000), express.json({ limit: '16kb' }), async (req, res) => {
  const out = await withSlugLock(async () => {
    const rec = await readRecord(req.params.id);
    if (!rec || !safeEqual(String(req.query.k || ''), rec.previewToken)) return 404;
    const message = clean(req.body?.message, 2000);
    const approved = req.body?.approved === true;
    if (!message && !approved) return 400;
    const fb: Feedback = { id: crypto.randomBytes(5).toString('hex'), at: new Date().toISOString(), name: clean(req.body?.name, 120), message, approved, revision: Number(req.body?.revision) || rec.revision, resolved: false };
    await writeRecord({ ...rec, feedback: [fb, ...rec.feedback].slice(0, 200) });
    return 201;
  });
  res.status(out).json(out === 201 ? { ok: true } : { error: out === 404 ? 'پیش‌نمایش پیدا نشد' : 'متن نظر خالی است' });
});

// ----- records (admin / owner)

const json = express.json({ limit: '256kb' });

type RecordSummary = {
  id: string;
  slug: string;
  company: string;
  event: string;
  status: 'draft' | 'published' | 'changed';
  updatedAt: string;
  endDate: string;
  ended: boolean;
  revision: number;
  views: number;
  rsvps: number;
  openFeedback: number;
  approved: boolean;
};

async function summarize(r: InvitationRecord): Promise<RecordSummary> {
  const totals = statTotals((await loadStats(r.id)).days);
  const rsvps = await readRsvps(r.id);
  return {
    id: r.id,
    slug: claimedSlug(r),
    company: r.draft.company.name,
    event: r.draft.event.title,
    status: !r.published ? 'draft' : JSON.stringify(r.published) === JSON.stringify(r.draft) ? 'published' : 'changed',
    updatedAt: r.updatedAt,
    endDate: r.draft.event.endDate,
    ended: eventEnded(r.draft),
    revision: r.revision,
    views: totals.view ?? 0,
    rsvps: rsvps.length,
    openFeedback: r.feedback.filter(f => !f.resolved).length,
    approved: r.feedback.some(f => f.approved && f.revision === r.revision),
  };
}

const recordView = async (r: InvitationRecord) => ({
  ...(await summarize(r)),
  draft: r.draft,
  previewToken: r.previewToken,
  publishedAt: r.publishedAt,
  publishedSlug: r.published?.slug ?? '',
  feedback: r.feedback,
});

api.get('/records', async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'دسترسی مدیر لازم است' });
  const list = await Promise.all((await allRecords()).map(summarize));
  res.json(list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
});

/**
 * Apply a draft from the wizard. Never rejects incomplete data – the admin's work is always
 * kept. If the requested address belongs to another invitation, everything else is saved and
 * the address is left empty (reported back as slugConflict).
 */
function applyDraft(req: Request, rec: InvitationRecord | null, input: unknown): { draft: InvitationConfig; slugConflict: boolean } {
  const draft = sanitizeInvitation(input);
  if (!canEditFooter(req)) draft.footer = rec ? rec.draft.footer : { ...DEFAULT_FOOTER };
  if (rec?.published) draft.slug = rec.published.slug; // published address is permanent
  let slugConflict = false;
  if (SLUG_RE.test(draft.slug)) {
    const owner = slugIndex.get(draft.slug);
    if (RESERVED_SLUGS.has(draft.slug) || (owner && owner !== rec?.id)) {
      slugConflict = true;
      draft.slug = '';
    }
  }
  return { draft, slugConflict };
}

api.post('/records', limit('create', 60, 3_600_000), json, async (req, res) => {
  if (!canCreate(req)) return res.status(401).json({ error: 'رمز مدیر نادرست است' });
  const editToken = newToken();
  const now = new Date().toISOString();
  const result = await withSlugLock(async () => {
    const { draft, slugConflict } = applyDraft(req, null, req.body?.config);
    const rec: InvitationRecord = { id: newId(), draft, published: null, publishedAt: null, editTokenHash: sha256(editToken), previewToken: newToken(), createdAt: now, updatedAt: now, revision: 1, history: [], feedback: [], tracking: emptyTracking(), notify: { ...DEFAULT_NOTIFY }, checkin: sanitizeCheckin({}, newToken) };
    await writeRecord(rec);
    return { rec, slugConflict };
  });
  res.status(201).json({ ...(await recordView(result.rec)), editToken, slugConflict: result.slugConflict });
});

api.get('/records/:id', async (req, res) => {
  const rec = await readRecord(req.params.id);
  if (!rec) return res.status(404).json({ error: 'دعوتنامه پیدا نشد' });
  if (!canEdit(req, rec)) return res.status(401).json({ error: 'اجازه ویرایش این دعوتنامه را ندارید' });
  res.json(await recordView(rec));
});

/** Someone else saved since this client loaded the draft (unless it explicitly overwrites). */
const conflictOf = async (req: Request, rec: InvitationRecord) => {
  const base = req.body?.baseRevision;
  if (base === undefined || req.body?.force === true || Number(base) === rec.revision) return null;
  return { status: 409, body: { error: 'این دعوتنامه در جای دیگری تغییر کرده است.', conflict: true, record: await recordView(rec) } };
};

api.put('/records/:id', json, async (req, res) => {
  const out = await withSlugLock(async () => {
    const rec = await readRecord(req.params.id);
    if (!rec) return { status: 404, body: { error: 'دعوتنامه پیدا نشد' } };
    if (!canEdit(req, rec)) return { status: 401, body: { error: 'اجازه ویرایش این دعوتنامه را ندارید' } };
    const conflict = await conflictOf(req, rec);
    if (conflict) return conflict;
    const { draft, slugConflict } = applyDraft(req, rec, req.body?.config);
    if (JSON.stringify(draft) === JSON.stringify(rec.draft)) return { status: 200, body: { ...(await recordView(rec)), slugConflict } };
    const next = { ...rec, draft, history: withHistory(rec, 'auto'), revision: rec.revision + 1, updatedAt: new Date().toISOString() };
    await writeRecord(next);
    return { status: 200, body: { ...(await recordView(next)), slugConflict } };
  });
  res.status(out.status).json(out.body);
});

api.post('/records/:id/publish', json, async (req, res) => {
  const out = await withSlugLock(async () => {
    const rec = await readRecord(req.params.id);
    if (!rec) return { status: 404, body: { error: 'دعوتنامه پیدا نشد' } };
    if (!canEdit(req, rec)) return { status: 401, body: { error: 'اجازه انتشار این دعوتنامه را ندارید' } };
    const conflict = await conflictOf(req, rec);
    if (conflict) return conflict;
    // Save the latest wizard state first (if sent), then validate it.
    const { draft, slugConflict } = req.body?.config ? applyDraft(req, rec, req.body.config) : { draft: rec.draft, slugConflict: false };
    const changed = JSON.stringify(draft) !== JSON.stringify(rec.draft);
    const saved = changed ? { ...rec, draft, history: withHistory(rec, 'auto'), revision: rec.revision + 1, updatedAt: new Date().toISOString() } : rec;
    if (slugConflict) {
      await writeRecord(saved);
      return { status: 409, body: { error: 'این آدرس لینک متعلق به دعوتنامه دیگری است؛ آدرس دیگری انتخاب کنید.', field: 'slug' } };
    }
    const issues = validateForPublish(draft);
    if (issues.length) {
      if (changed) await writeRecord(saved);
      return { status: 400, body: { error: 'اطلاعات دعوتنامه کامل نیست.', issues } };
    }
    const now = new Date().toISOString();
    const next: InvitationRecord = { ...saved, published: draft, publishedAt: now, updatedAt: now, history: withHistory({ ...saved, draft }, 'publish', true) };
    await writeRecord(next);
    return { status: 200, body: await recordView(next) };
  });
  res.status(out.status).json(out.body);
});

/** Take an invitation offline again (it becomes a draft; the address stays reserved). */
api.post('/records/:id/unpublish', async (req, res) => {
  // Under the record lock, like every other read-modify-write (an autosave can't interleave).
  const out = await withSlugLock(async () => {
    const rec = await readRecord(req.params.id);
    if (!rec) return { status: 404, body: { error: 'دعوتنامه پیدا نشد' } };
    if (!canEdit(req, rec)) return { status: 401, body: { error: 'اجازه این کار را ندارید' } };
    const next = { ...rec, draft: { ...rec.draft, slug: rec.published?.slug || rec.draft.slug }, published: null, publishedAt: null, revision: rec.revision + 1, updatedAt: new Date().toISOString() };
    await writeRecord(next);
    return { status: 200, body: await recordView(next) };
  });
  res.status(out.status).json(out.body);
});

api.post('/records/:id/token', async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'دسترسی مدیر لازم است' });
  const editToken = newToken();
  const found = await withSlugLock(async () => {
    const rec = await readRecord(req.params.id);
    if (!rec) return false;
    await writeRecord({ ...rec, editTokenHash: sha256(editToken) });
    return true;
  });
  if (!found) return res.status(404).json({ error: 'دعوتنامه پیدا نشد' });
  res.json({ editToken });
});

api.delete('/records/:id', async (req, res) => {
  const rec = await readRecord(req.params.id);
  if (!rec) return res.status(404).json({ error: 'دعوتنامه پیدا نشد' });
  if (!canEdit(req, rec)) return res.status(401).json({ error: 'اجازه حذف این دعوتنامه را ندارید' });
  await fs.rm(fileFor(rec.id));
  await fs.rm(rsvpFile(rec.id), { force: true });
  await fs.rm(statsFile(rec.id), { force: true });
  await fs.rm(notifyFile(rec.id), { force: true });
  await fs.rm(opsFile(rec.id), { force: true });
  statsCache.delete(rec.id);
  dirtyStats.delete(rec.id);
  for (const [slug, id] of slugIndex) if (id === rec.id) slugIndex.delete(slug);
  // Remove this invitation's files right away (unless another invitation uses them too).
  await collectGarbage(0, new Set([...uploadsOf(rec.draft), ...uploadsOf(rec.published), ...rec.history.flatMap(h => uploadsOf(h.draft))]));
  res.json({ ok: true });
});

/** Load a record the caller may edit, or send the error response. */
async function editable(req: Request, res: Response): Promise<InvitationRecord | null> {
  const rec = await readRecord(req.params.id);
  if (!rec) {
    res.status(404).json({ error: 'دعوتنامه پیدا نشد' });
    return null;
  }
  if (!canEdit(req, rec)) {
    res.status(401).json({ error: 'اجازه دسترسی به این دعوتنامه را ندارید' });
    return null;
  }
  return rec;
}

// ----- history

api.get('/records/:id/history', async (req, res) => {
  const rec = await editable(req, res);
  if (!rec) return;
  res.json(
    rec.history.map((h, index) => ({
      index,
      at: h.at,
      kind: h.kind,
      revision: h.revision,
      company: h.draft.company.name,
      event: h.draft.event.title,
      draft: h.draft,
    })),
  );
});

/** Restore an earlier version (or the published one) as the current draft. The current draft is kept in the history. */
api.post('/records/:id/restore', json, async (req, res) => {
  const out = await withSlugLock(async () => {
    const rec = await readRecord(req.params.id);
    if (!rec) return { status: 404, body: { error: 'دعوتنامه پیدا نشد' } };
    if (!canEdit(req, rec)) return { status: 401, body: { error: 'اجازه ویرایش این دعوتنامه را ندارید' } };
    const source = req.body?.source === 'published' ? rec.published : rec.history[Number(req.body?.index)]?.draft;
    if (!source) return { status: 404, body: { error: 'این نسخه پیدا نشد' } };
    const { draft } = applyDraft(req, rec, source);
    const next = { ...rec, draft, history: withHistory(rec, 'before-restore', true), revision: rec.revision + 1, updatedAt: new Date().toISOString() };
    await writeRecord(next);
    return { status: 200, body: await recordView(next) };
  });
  res.status(out.status).json(out.body);
});

// ----- copy

api.post('/records/:id/duplicate', limit('create', 60, 3_600_000), json, async (req, res) => {
  if (!canCreate(req)) return res.status(401).json({ error: 'برای ساخت دعوتنامه جدید رمز مدیر لازم است' });
  const rec = await editable(req, res);
  if (!rec) return;
  const mode = req.body?.mode === 'newOrganizer' ? 'newOrganizer' : 'newEvent';
  const editToken = newToken();
  const now = new Date().toISOString();
  const draft = sanitizeInvitation(copyInvitation(rec.draft, mode));
  if (!canEditFooter(req)) draft.footer = { ...DEFAULT_FOOTER };
  // Same organiser → keep its sales reps, links and tracking options (new report tokens).
  const tracking = mode === 'newEvent' ? sanitizeTracking({ ...rec.tracking, reps: rec.tracking.reps.map(r => ({ ...r, reportToken: '' })) }) : emptyTracking();
  const notify = mode === 'newEvent' ? rec.notify : { ...DEFAULT_NOTIFY };
  // Check-in options carry over for the same organiser, but always with a new staff link.
  const checkin = sanitizeCheckin(mode === 'newEvent' ? { ...rec.checkin, staffToken: '' } : {}, newToken);
  const copy: InvitationRecord = { id: newId(), draft, published: null, publishedAt: null, editTokenHash: sha256(editToken), previewToken: newToken(), createdAt: now, updatedAt: now, revision: 1, history: [], feedback: [], tracking, notify, checkin };
  await writeRecord(copy);
  res.status(201).json({ ...(await recordView(copy)), editToken });
});

// ----- client feedback

api.post('/records/:id/feedback/:fid', json, async (req, res) => {
  const out = await withSlugLock(async () => {
    const rec = await readRecord(req.params.id);
    if (!rec) return 404;
    if (!canEdit(req, rec)) return 401;
    const feedback = rec.feedback.map(f => (f.id === req.params.fid ? { ...f, resolved: req.body?.resolved !== false } : f));
    await writeRecord({ ...rec, feedback });
    return 200;
  });
  res.status(out).json({ ok: out === 200 });
});

// ----- RSVP & stats for the owner

api.get('/records/:id/rsvps', async (req, res) => {
  const rec = await editable(req, res);
  if (!rec) return;
  res.set('Cache-Control', 'no-store').json(await readRsvps(rec.id));
});

api.delete('/records/:id/rsvps/:rid', async (req, res) => {
  const rec = await editable(req, res);
  if (!rec) return;
  const run = rsvpLock.then(async () => {
    const list = (await readRsvps(rec.id)).filter(r => r.id !== req.params.rid);
    await writeJsonAtomic(rsvpFile(rec.id), list);
  });
  rsvpLock = run.catch(() => {});
  await run;
  res.json({ ok: true });
});

api.get('/records/:id/stats', async (req, res) => {
  const rec = await editable(req, res);
  if (!rec) return;
  const stats = await loadStats(rec.id);
  res.set('Cache-Control', 'no-store').json({ totals: statTotals(stats.days), ...stats });
});

// ----- system settings (SMS panel) – admin only, stored on the server, never hard-coded

let smsSettings: SmsSettings = { ...DEFAULT_SMS_SETTINGS };
async function loadSettings() {
  try {
    const raw = JSON.parse(await fs.readFile(SETTINGS_FILE, 'utf8'));
    smsSettings = sanitizeSmsSettings(raw.sms, { ...DEFAULT_SMS_SETTINGS, ...(raw.sms ?? {}) });
  } catch {
    /* defaults */
  }
}
async function saveSettings() {
  const tmp = `${SETTINGS_FILE}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify({ sms: smsSettings }, null, 2), { mode: 0o600 });
  await fs.rename(tmp, SETTINGS_FILE);
}
/** Settings hold credentials: admin only (or local development without an admin password). */
const canManageSettings = (req: Request) => (ADMIN_PASSWORD ? isAdmin(req) : !isProd);

api.get('/settings', (req, res) => {
  if (!canManageSettings(req)) return res.status(403).json({ error: 'دسترسی مدیر لازم است' });
  res.set('Cache-Control', 'no-store').json({ sms: maskSmsSettings(smsSettings), sentToday: smsCountToday() });
});

api.put('/settings', express.json({ limit: '64kb' }), async (req, res) => {
  if (!canManageSettings(req)) return res.status(403).json({ error: 'دسترسی مدیر لازم است' });
  smsSettings = sanitizeSmsSettings(req.body?.sms, smsSettings);
  await saveSettings();
  res.json({ sms: maskSmsSettings(smsSettings), sentToday: smsCountToday() });
});

api.post('/settings/test-sms', limit('smstest', 20, 3_600_000), express.json({ limit: '8kb' }), async (req, res) => {
  if (!canManageSettings(req)) return res.status(403).json({ error: 'دسترسی مدیر لازم است' });
  const to = formatMobile(String(req.body?.to || ''), smsSettings.numberFormat);
  if (!to) return res.status(400).json({ error: 'شماره موبایل معتبر نیست.' });
  const result = await sendSms(smsSettings, [to], String(req.body?.message || 'پیام آزمایشی سامانه دعوتنامه').slice(0, 500));
  if (result.ok) countSms(1);
  res.json(result);
});

// ----- SMS notifications for attendance confirmations

const notifyFile = (id: string) => path.join(NOTIFY_DIR, `${id}.json`);
async function readNotifyLog(id: string): Promise<NotifyLogEntry[]> {
  try {
    return JSON.parse(await fs.readFile(notifyFile(id), 'utf8'));
  } catch {
    return [];
  }
}
let notifyLock: Promise<unknown> = Promise.resolve();
function upsertNotifyLog(id: string, entry: NotifyLogEntry) {
  const run = notifyLock.then(async () => {
    if (!(await fs.stat(fileFor(id)).catch(() => null))) return; // invitation deleted meanwhile
    const list = (await readNotifyLog(id)).filter(e => e.id !== entry.id);
    list.unshift(entry);
    await writeJsonAtomic(notifyFile(id), list.slice(0, 200));
  });
  notifyLock = run.catch(() => {});
  return run;
}

// Daily cap across all invitations (protects the panel's credit) + per-invitation hourly cap.
const smsDay = { day: '', count: 0 };
function smsCountToday() {
  const d = tehranDay();
  if (smsDay.day !== d) Object.assign(smsDay, { day: d, count: 0 });
  return smsDay.count;
}
const countSms = (n: number) => {
  smsCountToday();
  smsDay.count += n;
};
const PER_INVITATION_HOURLY = 60;
const RETRY_DELAYS = [10_000, 60_000, 300_000];

async function deliver(recordId: string, entry: NotifyLogEntry) {
  if (smsCountToday() + entry.to.length > smsSettings.dailyLimit) {
    return upsertNotifyLog(recordId, { ...entry, status: 'skipped', detail: 'سقف روزانه ارسال پیامک (تنظیمات سامانه) پر شده است.' });
  }
  const result = await sendSms(smsSettings, entry.to, entry.message);
  const attempts = entry.attempts + 1;
  if (result.ok) {
    countSms(entry.to.length);
    return upsertNotifyLog(recordId, { ...entry, attempts, status: 'sent', detail: result.detail || 'ارسال شد' });
  }
  if (attempts <= RETRY_DELAYS.length) {
    await upsertNotifyLog(recordId, { ...entry, attempts, status: 'pending', detail: `تلاش ${attempts} ناموفق: ${result.detail}` });
    setTimeout(() => deliver(recordId, { ...entry, attempts }).catch(console.error), RETRY_DELAYS[attempts - 1]).unref();
    return;
  }
  return upsertNotifyLog(recordId, { ...entry, attempts, status: 'failed', detail: result.detail || `HTTP ${result.status}` });
}

async function notifyRsvp(rec: InvitationRecord, config: InvitationConfig, entry: Rsvp, rep?: Tracking['reps'][number], link?: Tracking['links'][number]) {
  const n = rec.notify;
  if (!n.enabled) return;
  const fmt = smsSettings.numberFormat;
  const to = new Set<string>();
  if (n.toRep && rep) {
    const m = formatMobile(rep.phone, fmt) || formatMobile(rep.whatsapp, fmt);
    if (m) to.add(m);
  }
  for (const m of parseNumbers(n.extraNumbers, fmt)) to.add(m);
  const day = entry.day ? new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${entry.day}T12:00:00Z`)) : 'مشخص نشده';
  const message = renderTemplate(n.template, {
    guest: entry.name,
    org: entry.org ? ` — ${entry.org}` : '',
    phone: entry.phone || '—',
    day,
    count: entry.count.toLocaleString('fa-IR'),
    event: config.event.title,
    company: config.company.name,
    rep: rep?.name || 'شرکت',
    source: link ? `${link.label || link.code} (${channelLabel(link.channel)})${entry.referral ? '، ارجاع' : ''}` : 'لینک اصلی',
  });
  await queueSms(rec.id, entry.id, to, message, rep ? 'کارشناس شماره موبایل معتبر ندارد و شماره دیگری هم تعیین نشده است.' : 'گیرنده‌ای تعیین نشده است.');
}

/** Log + send one notification SMS (checks panel, recipients and the hourly cap). */
async function queueSms(recordId: string, logId: string, to: Set<string>, message: string, noRecipientReason = 'گیرنده‌ای تعیین نشده است.') {
  const log: NotifyLogEntry = { id: logId, at: new Date().toISOString(), to: [...to], message, status: 'pending', attempts: 0, detail: '' };
  if (smsSettings.provider === 'none') return upsertNotifyLog(recordId, { ...log, status: 'skipped', detail: 'پنل پیامک در تنظیمات سامانه تنظیم نشده است.' });
  if (!to.size) return upsertNotifyLog(recordId, { ...log, status: 'skipped', detail: noRecipientReason });
  if (hit(`sms:${recordId}`, 3_600_000) > PER_INVITATION_HOURLY) return upsertNotifyLog(recordId, { ...log, status: 'skipped', detail: 'سقف ساعتی اعلان این دعوتنامه پر شده است.' });
  await upsertNotifyLog(recordId, log);
  await deliver(recordId, log);
}

/** Guest's own ticket link by SMS (if enabled and they gave a mobile number). */
async function sendTicketSms(rec: InvitationRecord, config: InvitationConfig, entry: Rsvp, url: string) {
  if (!rec.checkin.smsTicket) return;
  const m = formatMobile(entry.phone, smsSettings.numberFormat);
  if (!m) return;
  const message = renderTemplate(rec.checkin.smsTicketTemplate, { guest: entry.name, company: config.company.name, event: config.event.title, link: url, code: entry.ticket ?? '' });
  await queueSms(rec.id, `ticket-${entry.id}`, new Set([m]), message);
}

/** "Your guest is at the booth" SMS to the rep (and optionally the fixed numbers). */
async function sendArrivalSms(rec: InvitationRecord, guest: Rsvp) {
  const c = rec.checkin;
  if (!c.notifyRep && !c.notifyExtra) return;
  const fmt = smsSettings.numberFormat;
  const to = new Set<string>();
  const rep = guest.repId ? rec.tracking.reps.find(r => r.id === guest.repId) : undefined;
  if (c.notifyRep && rep) {
    const m = formatMobile(rep.phone, fmt) || formatMobile(rep.whatsapp, fmt);
    if (m) to.add(m);
  }
  if (c.notifyExtra) for (const m of parseNumbers(rec.notify.extraNumbers, fmt)) to.add(m);
  if (!to.size) return; // nobody to tell (e.g. guest of the company link) – not worth a log line
  const config = rec.published ?? rec.draft;
  const time = new Intl.DateTimeFormat('fa-IR', { timeZone: config.event.timezone, hour: '2-digit', minute: '2-digit' }).format(new Date());
  const message = renderTemplate(c.arrivalTemplate, {
    guest: guest.name,
    org: guest.org ? ` — ${guest.org}` : '',
    phone: guest.phone || '—',
    count: guest.count.toLocaleString('fa-IR'),
    time,
    company: config.company.name,
    event: config.event.title,
    rep: rep?.name ?? '',
  });
  await queueSms(rec.id, `arrive-${guest.id}-${Date.now().toString(36)}`, to, message);
}

api.get('/records/:id/notify', async (req, res) => {
  const rec = await editable(req, res);
  if (!rec) return;
  res.set('Cache-Control', 'no-store').json({ notify: rec.notify, smsReady: smsSettings.provider !== 'none', numberFormat: smsSettings.numberFormat, log: await readNotifyLog(rec.id) });
});

api.put('/records/:id/notify', express.json({ limit: '16kb' }), async (req, res) => {
  const out = await withSlugLock(async () => {
    const rec = await readRecord(req.params.id);
    if (!rec) return { status: 404, body: { error: 'دعوتنامه پیدا نشد' } };
    if (!canEdit(req, rec)) return { status: 401, body: { error: 'اجازه ویرایش این دعوتنامه را ندارید' } };
    const notify = sanitizeNotify(req.body?.notify);
    await writeRecord({ ...rec, notify, updatedAt: new Date().toISOString() });
    return { status: 200, body: { notify } };
  });
  res.status(out.status).json(out.body);
});

/** Send a sample notification with the current template to the configured recipients. */
api.post('/records/:id/notify/test', limit('smstest', 20, 3_600_000), async (req, res) => {
  const rec = await editable(req, res);
  if (!rec) return;
  const config = rec.published ?? rec.draft;
  const rep = rec.tracking.reps[0];
  const sample: Rsvp = { id: `test-${crypto.randomBytes(3).toString('hex')}`, at: new Date().toISOString(), name: 'مهمان آزمایشی', phone: '09120000000', org: 'شرکت نمونه', day: config.event.startDate, count: 2, guest: '', lang: 'fa' };
  await notifyRsvp({ ...rec, notify: { ...rec.notify, enabled: true } }, config, sample, rec.notify.toRep ? rep : undefined, rec.tracking.links.find(l => l.repId === rep?.id));
  res.json({ log: await readNotifyLog(rec.id) });
});

// ----- booth check-in

/** Guest's ticket page data (anyone with the 8-character code). */
api.get('/invitations/:slug/ticket/:code', limit('ticket', 120, 60_000), async (req, res) => {
  const rec = await publishedRecord(req.params.slug.toLowerCase());
  const code = req.params.code.toUpperCase();
  if (!rec || !TICKET_RE.test(code)) return res.status(404).json({ error: 'بلیت پیدا نشد' });
  const r = (await readRsvps(rec.id)).find(x => x.ticket === code);
  if (!r) return res.status(404).json({ error: 'بلیت پیدا نشد' });
  const c = publicVersion(rec.published!);
  const info: TicketInfo = {
    code,
    name: r.name,
    org: r.org,
    day: r.day,
    count: r.count,
    checkedInAt: r.checkedInAt ?? '',
    company: c.company.name,
    event: c.event.title,
    location: c.hidden.location ? '' : c.event.location,
    booth: c.hidden.booth ? '' : c.event.booth,
    dateLabel: c.hidden.date ? '' : c.event.dateLabel,
    theme: { primary: c.theme.primary, accent: c.theme.accent, background: c.theme.background },
    logo: c.hidden.logo ? '' : c.company.logo,
  };
  res.set('Cache-Control', 'no-store').json(info);
});

/** Staff access: check-in enabled + the staff token from the check-in link. */
async function staffRecord(req: Request, res: Response): Promise<InvitationRecord | null> {
  const rec = await readRecord(req.params.id);
  if (!rec || !rec.checkin.enabled || !safeEqual(String(req.query.k || ''), rec.checkin.staffToken)) {
    res.status(404).json({ error: 'صفحه ثبت حضور در دسترس نیست' });
    return null;
  }
  return rec;
}

const toGuest = (r: Rsvp): CheckinGuest => ({
  id: r.id,
  name: r.name,
  org: r.org,
  phone: r.phone,
  day: r.day,
  count: r.count,
  ticket: r.ticket ?? '',
  repName: r.repName ?? '',
  channel: r.channel ?? '',
  walkIn: !!r.walkIn,
  checkedInAt: r.checkedInAt ?? '',
  checkedInBy: r.checkedInBy ?? '',
  visits: r.visits ?? 0,
});

api.get('/checkin/:id', limit('checkin', 600, 60_000), async (req, res) => {
  const rec = await staffRecord(req, res);
  if (!rec) return;
  const c = rec.published ?? rec.draft;
  res.set('Cache-Control', 'no-store').json({
    company: c.company.name,
    event: c.event.title,
    startDate: c.event.startDate,
    endDate: c.event.endDate,
    timezone: c.event.timezone,
    theme: { primary: c.theme.primary, accent: c.theme.accent },
    guests: (await readRsvps(rec.id)).map(toGuest),
  });
});

// Every staff action is an "operation" with a client-generated id. Operations made while the
// booth was offline are queued on the phone and synced later; the id makes retries safe
// (a lost response never double-counts), and the phone's timestamp is kept as the real time.

interface CheckinOp {
  opId: string;
  type: 'scan' | 'walkin' | 'undo';
  ticket?: string;
  rsvpId?: string;
  name?: string;
  phone?: string;
  org?: string;
  count?: number;
  staff?: string;
  /** When it happened on the phone (ISO) */
  at?: string;
}
interface OpResult {
  opId: string;
  status: 'ok' | 'already' | 'notfound' | 'undone' | 'duplicate' | 'invalid';
  guest: CheckinGuest | null;
}

const OPS_DIR = path.join(DATA_DIR, 'checkin-ops');
mkdirSync(OPS_DIR, { recursive: true });
const opsFile = (id: string) => path.join(OPS_DIR, `${id}.json`);
/** Arrival SMS only if the visit is recent – "your guest is at the booth" an hour later is misleading. */
const ARRIVAL_SMS_MAX_AGE_MS = 45 * 60_000;

/** Accept the phone's timestamp unless it is clearly wrong (future, or older than two weeks). */
function opTime(at: unknown): Date {
  const t = typeof at === 'string' ? Date.parse(at) : NaN;
  const now = Date.now();
  return Number.isFinite(t) && t <= now + 5 * 60_000 && t >= now - 14 * 86_400_000 ? new Date(Math.min(t, now)) : new Date(now);
}

async function processOps(rec: InvitationRecord, ops: CheckinOp[]): Promise<OpResult[]> {
  const config = rec.published ?? rec.draft;
  const sideEffects: (() => void)[] = [];
  const results = await updateRsvps(rec.id, async list => {
    let done: string[] = [];
    try {
      done = JSON.parse(await fs.readFile(opsFile(rec.id), 'utf8'));
    } catch {
      /* none yet */
    }
    const seen = new Set(done);
    const out: OpResult[] = [];
    for (const op of ops) {
      const opId = String(op.opId || '').slice(0, 64);
      if (!/^[\w-]{8,64}$/.test(opId)) {
        out.push({ opId, status: 'invalid', guest: null });
        continue;
      }
      if (seen.has(opId)) {
        // Already applied (response was lost): report the guest's current state.
        const g = list.find(r => r.opId === opId || (op.ticket && r.ticket === String(op.ticket).toUpperCase()) || (op.rsvpId && r.id === op.rsvpId));
        out.push({ opId, status: 'duplicate', guest: g ? toGuest(g) : null });
        continue;
      }
      seen.add(opId);
      done.push(opId);
      const when = opTime(op.at);
      const staff = clean(op.staff, 60);
      if (op.type === 'walkin') {
        const name = clean(op.name, 120);
        if (!name) {
          out.push({ opId, status: 'invalid', guest: null });
          continue;
        }
        const entry: Rsvp = {
          id: crypto.randomBytes(5).toString('hex'),
          at: when.toISOString(),
          name,
          phone: clean(op.phone, 40),
          org: clean(op.org, 120),
          day: new Intl.DateTimeFormat('en-CA', { timeZone: config.event.timezone }).format(when),
          count: Math.min(20, Math.max(1, Math.round(Number(op.count) || 1))),
          guest: '',
          lang: 'fa',
          walkIn: true,
          checkedInAt: when.toISOString(),
          checkedInBy: staff,
          visits: 1,
          opId,
        };
        list.push(entry);
        sideEffects.push(() => bumpStat(rec.id, 'walkin', '', '', when));
        out.push({ opId, status: 'ok', guest: toGuest(entry) });
        continue;
      }
      const ticket = String(op.ticket || '').toUpperCase();
      const g = list.find(r => (ticket && r.ticket === ticket) || (op.rsvpId && r.id === op.rsvpId));
      if (!g) {
        out.push({ opId, status: 'notfound', guest: null });
        continue;
      }
      if (op.type === 'undo') {
        if (g.checkedInAt) {
          delete g.checkedInAt;
          delete g.checkedInBy;
          g.visits = 0;
        }
        out.push({ opId, status: 'undone', guest: toGuest(g) });
        continue;
      }
      const first = !g.checkedInAt;
      if (first) {
        g.checkedInAt = when.toISOString();
        g.checkedInBy = staff;
        const guest = { ...g };
        sideEffects.push(() => {
          bumpStat(rec.id, 'checkin', guest.link ?? '', guest.utm ?? '', when);
          if (Date.now() - when.getTime() <= ARRIVAL_SMS_MAX_AGE_MS) sendArrivalSms(rec, guest).catch(console.error);
        });
      }
      g.visits = (g.visits ?? 0) + 1;
      out.push({ opId, status: first ? 'ok' : 'already', guest: toGuest(g) });
    }
    await writeJsonAtomic(opsFile(rec.id), done.slice(-5000), false);
    return out;
  });
  sideEffects.forEach(f => f());
  return results;
}

/** Batch endpoint used by the check-in page (online and when syncing an offline queue). */
api.post('/checkin/:id/sync', limit('checkin', 600, 60_000), express.json({ limit: '256kb' }), async (req, res) => {
  const rec = await staffRecord(req, res);
  if (!rec) return;
  const ops = Array.isArray(req.body?.ops) ? (req.body.ops as CheckinOp[]).slice(0, 500) : [];
  res.json({ results: await processOps(rec, ops) });
});

// Single-action endpoints (kept for simple integrations): same processing as /sync.
const singleOp = (type: CheckinOp['type']) => async (req: Request, res: Response) => {
  const rec = await staffRecord(req, res);
  if (!rec) return;
  const [r] = await processOps(rec, [{ ...req.body, type, opId: req.body?.opId || crypto.randomUUID() }]);
  res.status(r.status === 'invalid' ? 400 : 200).json({ status: r.status, guest: r.guest });
};
api.post('/checkin/:id/scan', limit('checkin', 600, 60_000), express.json({ limit: '4kb' }), singleOp('scan'));
api.post('/checkin/:id/undo', limit('checkin', 600, 60_000), express.json({ limit: '4kb' }), singleOp('undo'));
api.post('/checkin/:id/walkin', limit('checkin', 600, 60_000), express.json({ limit: '4kb' }), singleOp('walkin'));

api.get('/records/:id/checkin', async (req, res) => {
  const rec = await editable(req, res);
  if (!rec) return;
  res.set('Cache-Control', 'no-store').json(rec.checkin);
});

api.put('/records/:id/checkin', express.json({ limit: '16kb' }), async (req, res) => {
  const out = await withSlugLock(async () => {
    const rec = await readRecord(req.params.id);
    if (!rec) return { status: 404, body: { error: 'دعوتنامه پیدا نشد' } };
    if (!canEdit(req, rec)) return { status: 401, body: { error: 'اجازه ویرایش این دعوتنامه را ندارید' } };
    // The staff token only changes through the explicit "new link" action.
    const checkin = sanitizeCheckin({ ...req.body?.checkin, staffToken: req.body?.renewToken ? '' : rec.checkin.staffToken }, newToken);
    await writeRecord({ ...rec, checkin, updatedAt: new Date().toISOString() });
    return { status: 200, body: checkin };
  });
  res.status(out.status).json(out.body);
});

// ----- links & sales reps (live settings, effective immediately)

api.get('/records/:id/tracking', async (req, res) => {
  const rec = await editable(req, res);
  if (!rec) return;
  res.set('Cache-Control', 'no-store').json(rec.tracking);
});

api.put('/records/:id/tracking', express.json({ limit: '512kb' }), async (req, res) => {
  const out = await withSlugLock(async () => {
    const rec = await readRecord(req.params.id);
    if (!rec) return { status: 404, body: { error: 'دعوتنامه پیدا نشد' } };
    if (!canEdit(req, rec)) return { status: 401, body: { error: 'اجازه ویرایش این دعوتنامه را ندارید' } };
    const tracking = sanitizeTracking(req.body?.tracking);
    // Keep existing report tokens (the client never needs to send them back unchanged)
    for (const r of tracking.reps) {
      const old = rec.tracking.reps.find(o => o.id === r.id);
      if (old && !req.body?.tracking?.reps?.find((x: any) => x?.id === r.id)?.reportToken) r.reportToken = old.reportToken;
    }
    await writeRecord({ ...rec, tracking, updatedAt: new Date().toISOString() });
    return { status: 200, body: tracking };
  });
  res.status(out.status).json(out.body);
});

/** A sales rep's own read-only report: their links, visits and RSVPs only. */
api.get('/rep-report/:id', limit('report', 120, 60_000), async (req, res) => {
  const rec = await readRecord(req.params.id);
  const t = rec?.tracking;
  const rep = t?.reps.find(r => r.id === String(req.query.rep || ''));
  if (!rec || !t || !rep || !t.settings.enabled || !t.settings.repDashboards || !safeEqual(String(req.query.k || ''), rep.reportToken)) {
    return res.status(404).json({ error: 'گزارش پیدا نشد' });
  }
  const links = t.links.filter(l => l.repId === rep.id);
  const keys = new Set(links.flatMap(l => [l.code, `${l.code}+ref`]));
  const stats = await loadStats(rec.id);
  const linkStats = Object.fromEntries(Object.entries(stats.links).filter(([k]) => keys.has(k)));
  const days: Record<string, DayStats> = {};
  for (const perDay of Object.values(linkStats)) for (const [day, c] of Object.entries(perDay)) for (const [k, v] of Object.entries(c)) (days[day] ??= {})[k] = (days[day][k] ?? 0) + v;
  const rsvps = (await readRsvps(rec.id)).filter(r => r.repId === rep.id);
  const c = rec.published ?? rec.draft;
  res.set('Cache-Control', 'no-store').json({
    company: c.company.name,
    event: c.event.title,
    slug: rec.published?.slug ?? '',
    eventDates: { start: c.event.startDate, end: c.event.endDate },
    rep: { id: rep.id, name: rep.name, title: rep.title },
    theme: { primary: c.theme.primary, accent: c.theme.accent },
    links,
    stats: { totals: statTotals(days), days, links: linkStats, utm: {} },
    rsvps,
  });
});

// ---------------------------------------------------------------- uploads

/** Uploads are allowed for creators, or for the owner of an existing invitation (x-edit-id + x-edit-token). */
async function canUpload(req: Request) {
  if (canCreate(req)) return true;
  const rec = await readRecord(String(req.get('x-edit-id') || ''));
  return !!rec && canEdit(req, rec);
}

function run(cmd: string, args: string[], timeoutMs: number) {
  return new Promise<void>((resolve, reject) => execFile(cmd, args, { timeout: timeoutMs }, err => (err ? reject(err) : resolve())));
}

/** Convert any uploaded video to a small, universally playable H.264 MP4 and extract a poster frame. */
async function processVideo(input: string, base: string): Promise<{ video: string; poster?: string } | null> {
  if (!ffmpegAvailable) return null;
  const outName = `${base}.mp4`;
  const posterName = `${base}-poster.jpg`;
  const out = path.join(UPLOADS_DIR, outName);
  try {
    await run(
      FFMPEG,
      ['-y', '-i', input, '-an', '-t', '30', '-vf', "scale='min(1280,iw)':'min(1280,ih)':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2", '-c:v', 'libx264', '-profile:v', 'main', '-pix_fmt', 'yuv420p', '-crf', '28', '-preset', 'veryfast', '-movflags', '+faststart', out],
      240_000,
    );
  } catch (e) {
    console.error('[ffmpeg] transcode failed', e);
    await fs.rm(out, { force: true });
    return null;
  }
  try {
    await run(FFMPEG, ['-y', '-ss', '1', '-i', out, '-frames:v', '1', '-q:v', '5', path.join(UPLOADS_DIR, posterName)], 60_000);
    return { video: outName, poster: posterName };
  } catch {
    return { video: outName };
  }
}

api.post('/uploads', limit('upload', 60, 3_600_000), async (req, res) => {
  if (!(await canUpload(req))) return res.status(401).json({ error: 'اجازه بارگذاری فایل را ندارید' });
  const kind = String(req.query.kind || '') as UploadKind;
  const rule = UPLOAD_RULES[kind];
  const ext = extOf(String(req.query.name || ''));
  if (!rule || !rule.exts.includes(ext)) {
    return res.status(400).json({ error: `فرمت فایل مجاز نیست. فرمت‌های مجاز: ${rule?.exts.join('، ') ?? '-'}` });
  }
  if (kind === 'video' && NEEDS_TRANSCODE.includes(ext) && !ffmpegAvailable) {
    return res.status(400).json({ error: 'سرور امکان تبدیل فایل MOV را ندارد؛ لطفاً ویدئو را با فرمت MP4 بارگذاری کنید.' });
  }
  const maxBytes = rule.maxMb * 1024 * 1024;
  if (Number(req.get('content-length') || 0) > maxBytes) return res.status(413).json({ error: `حداکثر حجم مجاز ${rule.maxMb} مگابایت است` });
  if (uploadsBytes > UPLOAD_QUOTA_MB * 1024 * 1024) return res.status(507).json({ error: 'فضای ذخیره‌سازی سرور پر است؛ با مدیر سامانه تماس بگیرید.' });

  // Stream to disk (never buffer the whole file in memory), aborting once the limit is exceeded.
  const base = `${Date.now().toString(36)}-${crypto.randomBytes(6).toString('hex')}`;
  const name = `${base}.${ext}`;
  const target = path.join(UPLOADS_DIR, name);
  let size = 0;
  const counter = new Transform({
    transform(chunk, _enc, cb) {
      size += chunk.length;
      cb(size > maxBytes ? Object.assign(new Error('too large'), { code: 'TOO_LARGE' }) : null, chunk);
    },
  });
  try {
    await pipeline(req, counter, createWriteStream(target));
  } catch (e: any) {
    await fs.rm(target, { force: true });
    if (e?.code === 'TOO_LARGE') return res.status(413).json({ error: `حداکثر حجم مجاز ${rule.maxMb} مگابایت است` });
    return res.status(400).json({ error: 'بارگذاری فایل ناقص ماند' });
  }
  if (size === 0) {
    await fs.rm(target, { force: true });
    return res.status(400).json({ error: 'فایل خالی است' });
  }
  uploadsBytes += size;

  if (kind === 'video') {
    const processed = await processVideo(target, base);
    if (processed) {
      if (processed.video !== name) await fs.rm(target, { force: true });
      uploadsBytes = await dirSize(UPLOADS_DIR);
      return res.status(201).json({ url: `uploads/${processed.video}`, poster: processed.poster ? `uploads/${processed.poster}` : undefined, transcoded: true });
    }
    if (NEEDS_TRANSCODE.includes(ext)) {
      await fs.rm(target, { force: true });
      return res.status(422).json({ error: 'تبدیل ویدئو ناموفق بود؛ لطفاً فایل MP4 بارگذاری کنید.' });
    }
  }
  res.status(201).json({ url: `uploads/${name}`, transcoded: false });
});

api.use((_req, res) => res.status(404).json({ error: 'یافت نشد' }));
api.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'حجم درخواست بیش از حد مجاز است' });
  console.error(`[api] ${req.method} ${req.originalUrl}:`, err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'خطای سرور؛ چند لحظه بعد دوباره تلاش کنید.' });
});

// ---------------------------------------------------------------- HTML (link previews, themed splash, 404s)

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const publicBase = (req: Request) => PUBLIC_URL || `${req.protocol}://${req.get('host')}${BASE_PATH}`;

/** Path relative to the base: "", "builder", "builder/x", "<slug>" */
const relPath = (req: Request) => req.path.replace(/^\/+|\/+$/g, '');

async function renderPage(html: string, req: Request): Promise<{ status: number; html: string }> {
  const rel = relPath(req);
  if (!rel || rel === 'builder' || rel.startsWith('builder/')) return { status: 200, html };
  if (rel.startsWith('preview/')) return { status: 200, html: html.replace('<head>', '<head>\n    <meta name="robots" content="noindex">') };
  if (rel.startsWith('checkin/')) return { status: 200, html: html.replace('<head>', '<head>\n    <meta name="robots" content="noindex">') };
  if (rel === 'settings') return { status: 200, html: html.replace('<head>', '<head>\n    <meta name="robots" content="noindex">') };
  if (rel.startsWith('rep/')) return { status: 200, html: html.replace('<head>', '<head>\n    <meta name="robots" content="noindex">') };
  const parts = rel.split('/');
  // <slug>/<link code>: tracked link of a published invitation
  const isTicket = parts.length === 3 && parts[1] === 't' && TICKET_RE.test(parts[2].toUpperCase());
  if (isTicket) parts.length = 1;
  if (parts.length > 2 || (parts.length === 2 && !CODE_RE.test(parts[1].toLowerCase()))) return { status: 404, html };
  const slug = decodeURIComponent(parts[0]).toLowerCase();
  const c = await publishedBySlug(slug);
  if (!c) return { status: 404, html };

  const base = publicBase(req);
  const title = `${c.event.badge || 'دعوتنامه'} ${c.event.title} | ${c.company.name}`;
  const desc = [c.event.welcomeText, c.event.dateLabel, c.event.location].filter(Boolean).join(' - ') || title;
  // Messengers can't render SVG previews: prefer the dedicated share image, then raster logos, then the video poster.
  const image = [c.company.shareImage, c.company.logo, c.company.icon, c.media.videoPoster].find(p => p && !p.endsWith('.svg'));
  const tags = [
    `<meta name="description" content="${escapeHtml(desc)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${escapeHtml(c.company.name)}">`,
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    `<meta property="og:description" content="${escapeHtml(desc)}">`,
    `<meta property="og:url" content="${escapeHtml(`${base}/${rel}`)}">`,
    image ? `<meta property="og:image" content="${escapeHtml(`${base}/${image}`)}">` : '',
    `<meta name="twitter:card" content="${c.company.shareImage ? 'summary_large_image' : 'summary'}">`,
    `<meta name="theme-color" content="${c.theme.background}">`,
  ]
    .filter(Boolean)
    .join('\n    ');
  html = html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>\n    ${tags}`)
    // Splash in the invitation's own colours (no dark flash before a light theme, etc.)
    .replace('--splash-bg:#0f172a', `--splash-bg:${c.theme.background}`)
    .replace('--splash-accent:#38bdf8', `--splash-accent:${c.theme.accent}`);
  return { status: 200, html };
}

async function start() {
  await buildSlugIndex();
  await loadSettings();
  await collectGarbage();
  setInterval(() => collectGarbage().catch(console.error), 6 * 3_600_000).unref();

  let template: (req: Request) => Promise<string>;
  if (!isProd) {
    // Dev: Vite serves /in/src/*, /in/@vite/* and public files itself (it knows the base path).
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', base: `${BASE_PATH}/` });
    app.use(vite.middlewares);
    template = async req => vite.transformIndexHtml(req.originalUrl, await fs.readFile(path.join(APP_ROOT, 'index.html'), 'utf8'));
  }

  // Accept requests with or without the base prefix: works behind nginx (prefix kept) and
  // cPanel/Passenger apps mounted on a sub-URI (prefix may already be stripped).
  if (BASE_PATH) {
    app.use((req, _res, next) => {
      if (req.url === BASE_PATH || req.url.startsWith(`${BASE_PATH}/`) || req.url.startsWith(`${BASE_PATH}?`)) req.url = req.url.slice(BASE_PATH.length) || '/';
      next();
    });
  }

  app.use('/api', api);

  // User uploads: sandboxed so an uploaded SVG can never run script on our origin.
  app.use(
    '/uploads',
    express.static(UPLOADS_DIR, {
      immutable: true,
      maxAge: '365d',
      setHeaders(res) {
        res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
        res.setHeader('X-Content-Type-Options', 'nosniff');
      },
    }),
  );

  if (isProd) {
    const dist = path.join(APP_ROOT, 'dist');
    if (!existsSync(path.join(dist, 'index.html'))) throw new Error(`${dist}/index.html not found – run \`npm run build\` first`);
    app.use('/assets', express.static(path.join(dist, 'assets'), { immutable: true, maxAge: '365d', fallthrough: false }));
    // The check-in service worker must always be revalidated so updates reach the booth phones.
    app.get('/sw.js', (_req, res) => res.set({ 'Cache-Control': 'no-cache', 'Service-Worker-Allowed': `${BASE_PATH}/checkin/` }).sendFile(path.join(dist, 'sw.js')));
    app.use(express.static(dist, { index: false, maxAge: '7d' }));
    const html = await fs.readFile(path.join(dist, 'index.html'), 'utf8');
    template = async () => html;
  }

  app.get('*', async (req, res, next) => {
    try {
      if (path.extname(req.path)) return res.status(404).type('text').send('Not found'); // missing file, not a page
      const page = await renderPage(await template(req), req);
      res.status(page.status).set('Cache-Control', 'no-cache').type('html').send(page.html);
    } catch (e) {
      next(e);
    }
  });

  app.listen(PORT as any, () => {
    console.log(`Expo invitation builder on http://localhost:${PORT}${BASE_PATH}/  (data: ${DATA_DIR}, video processing: ${ffmpegAvailable ? 'on' : 'off'})`);
    if (!ADMIN_PASSWORD) console.warn('[warn] ADMIN_PASSWORD is not set – anyone can create invitations and upload files.');
  });
}

// Background work (SMS retries, stats flush, cleanup) must never crash the server either.
process.on('unhandledRejection', err => console.error('[unhandled]', err));

start().catch(err => {
  console.error(err);
  process.exit(1);
});
