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
  DEFAULT_INVITATION,
  sanitizeInvitation,
  validateForPublish,
  type InvitationConfig,
} from '../src/shared/invitation';
import { icsContent } from '../src/shared/calendar';
import { extOf, NEEDS_TRANSCODE, UPLOAD_RULES, type UploadKind } from '../src/shared/uploads';

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
mkdirSync(UPLOADS_DIR, { recursive: true });

const ffmpegAvailable = (() => {
  try {
    return spawnSync(FFMPEG, ['-version'], { timeout: 5000 }).status === 0;
  } catch {
    return false;
  }
})();

// ---------------------------------------------------------------- storage

interface StoredInvitation {
  config: InvitationConfig;
  editTokenHash: string;
  createdAt: string;
  updatedAt: string;
}

const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
const newToken = () => crypto.randomBytes(24).toString('base64url');
const fileFor = (slug: string) => path.join(INVITES_DIR, `${slug}.json`);

async function readInvitation(slug: string): Promise<StoredInvitation | null> {
  if (!SLUG_RE.test(slug)) return null;
  try {
    const rec = JSON.parse(await fs.readFile(fileFor(slug), 'utf8'));
    rec.config = sanitizeInvitation(rec.config); // also migrates older records
    return rec;
  } catch {
    return null;
  }
}

async function writeInvitation(rec: StoredInvitation, { create = false } = {}) {
  const target = fileFor(rec.config.slug);
  const data = JSON.stringify(rec, null, 2);
  if (create) {
    // 'wx' fails if the file exists: two simultaneous creates can't overwrite each other.
    await fs.writeFile(target, data, { flag: 'wx' });
    return;
  }
  const tmp = `${target}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(tmp, data);
  await fs.rename(tmp, target);
}

async function allInvitations(): Promise<StoredInvitation[]> {
  const files = (await fs.readdir(INVITES_DIR)).filter(f => f.endsWith('.json'));
  const recs = await Promise.all(files.map(f => readInvitation(f.slice(0, -5))));
  return recs.filter((r): r is StoredInvitation => !!r);
}

/** Uploaded files referenced by an invitation. */
function uploadsOf(c: InvitationConfig): string[] {
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
 * Delete uploads no invitation references any more. Files younger than the grace period
 * are kept because they may belong to a wizard draft that hasn't been published yet.
 */
async function collectGarbage(graceMs = UPLOAD_GRACE_DAYS * 86_400_000, only?: Set<string>) {
  const used = new Set((await allInvitations()).flatMap(r => uploadsOf(r.config)));
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

async function seedDefault() {
  const files = await fs.readdir(INVITES_DIR);
  if (files.some(f => f.endsWith('.json'))) return;
  const token = newToken();
  const now = new Date().toISOString();
  await writeInvitation({ config: { ...DEFAULT_INVITATION, slug: 'behansar' }, editTokenHash: sha256(token), createdAt: now, updatedAt: now });
  console.log(`[seed] Created sample invitation ${BASE_PATH}/behansar  (edit: ${BASE_PATH}/builder/behansar#${token})`);
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
function canEdit(req: Request, rec: StoredInvitation): boolean {
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

// Brute-force protection: too many wrong admin passwords / edit tokens from one IP => temporary block.
api.use((req, res, next) => {
  if ((req.get('x-admin-password') || req.get('x-edit-token')) && count(`authfail:${req.ip}`, AUTH_FAIL_WINDOW) >= AUTH_FAIL_MAX) {
    return res.status(429).json({ error: 'تلاش‌های ناموفق زیاد بود؛ ۱۵ دقیقه دیگر دوباره امتحان کنید.' });
  }
  next();
});
api.use(limit('api', 600, 60_000));

api.get('/meta', (_req, res) => {
  res.json({ adminRequired: !!ADMIN_PASSWORD, videoProcessing: ffmpegAvailable });
});

api.post('/auth', (req, res) => {
  res.json({ ok: canCreate(req), admin: isAdmin(req) });
});

api.get('/slug/:slug', limit('slug', 120, 60_000), async (req, res) => {
  const slug = req.params.slug.toLowerCase();
  if (!SLUG_RE.test(slug) || RESERVED_SLUGS.has(slug)) return res.json({ available: false, valid: false });
  res.json({ available: !(await readInvitation(slug)), valid: true });
});

api.get('/invitations', async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'دسترسی مدیر لازم است' });
  res.json(
    (await allInvitations())
      .map(r => ({ slug: r.config.slug, company: r.config.company.name, event: r.config.event.title, updatedAt: r.updatedAt }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  );
});

api.get('/invitations/:slug', async (req, res) => {
  const rec = await readInvitation(req.params.slug.toLowerCase());
  if (!rec) return res.status(404).json({ error: 'دعوتنامه پیدا نشد' });
  res.set('Cache-Control', 'no-cache');
  res.json(rec.config);
});

/** Real .ics download – far more reliable than data: URLs on iPhone and in-app browsers. */
api.get('/invitations/:slug/ics', async (req, res) => {
  const rec = await readInvitation(req.params.slug.toLowerCase());
  if (!rec || !rec.config.event.startDate) return res.status(404).type('text').send('Not found');
  res.set({
    'Content-Type': 'text/calendar; charset=utf-8',
    'Content-Disposition': `attachment; filename="${rec.config.slug}.ics"`,
    'Cache-Control': 'no-cache',
  });
  res.send(icsContent(rec.config));
});

const json = express.json({ limit: '256kb' });

function firstIssue(config: InvitationConfig) {
  const issues = validateForPublish(config);
  return issues.length ? { error: issues.map(i => i.message).join('\n'), field: issues[0].field } : null;
}

api.post('/invitations', limit('create', 30, 3_600_000), json, async (req, res) => {
  if (!canCreate(req)) return res.status(401).json({ error: 'رمز مدیر نادرست است' });
  const config = sanitizeInvitation(req.body?.config);
  if (!canEditFooter(req)) config.footer = { ...DEFAULT_FOOTER };
  const problem = firstIssue(config);
  if (problem) return res.status(400).json(problem);

  const editToken = newToken();
  const now = new Date().toISOString();
  try {
    await writeInvitation({ config, editTokenHash: sha256(editToken), createdAt: now, updatedAt: now }, { create: true });
  } catch (e: any) {
    if (e?.code === 'EEXIST') return res.status(409).json({ error: 'این آدرس قبلاً استفاده شده است؛ آدرس دیگری انتخاب کنید.', field: 'slug' });
    throw e;
  }
  res.status(201).json({ slug: config.slug, editToken });
});

api.put('/invitations/:slug', json, async (req, res) => {
  const slug = req.params.slug.toLowerCase();
  const rec = await readInvitation(slug);
  if (!rec) return res.status(404).json({ error: 'دعوتنامه پیدا نشد' });
  if (!canEdit(req, rec)) return res.status(401).json({ error: 'اجازه ویرایش این دعوتنامه را ندارید' });
  const config = sanitizeInvitation({ ...req.body?.config, slug });
  if (!canEditFooter(req)) config.footer = rec.config.footer;
  const problem = firstIssue(config);
  if (problem) return res.status(400).json(problem);
  await writeInvitation({ ...rec, config, updatedAt: new Date().toISOString() });
  res.json({ slug });
});

api.post('/invitations/:slug/token', async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'دسترسی مدیر لازم است' });
  const rec = await readInvitation(req.params.slug.toLowerCase());
  if (!rec) return res.status(404).json({ error: 'دعوتنامه پیدا نشد' });
  const editToken = newToken();
  await writeInvitation({ ...rec, editTokenHash: sha256(editToken) });
  res.json({ editToken });
});

api.delete('/invitations/:slug', async (req, res) => {
  const slug = req.params.slug.toLowerCase();
  const rec = await readInvitation(slug);
  if (!rec) return res.status(404).json({ error: 'دعوتنامه پیدا نشد' });
  if (!canEdit(req, rec)) return res.status(401).json({ error: 'اجازه حذف این دعوتنامه را ندارید' });
  await fs.rm(fileFor(slug));
  // Remove this invitation's files right away (unless another invitation uses them too).
  await collectGarbage(0, new Set(uploadsOf(rec.config)));
  res.json({ ok: true });
});

// ---------------------------------------------------------------- uploads

/** Uploads are allowed for creators, or for the owner of an existing invitation (x-edit-slug + x-edit-token). */
async function canUpload(req: Request) {
  if (canCreate(req)) return true;
  const rec = await readInvitation(String(req.get('x-edit-slug') || '').toLowerCase());
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
api.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'حجم درخواست بیش از حد مجاز است' });
  console.error(err);
  res.status(500).json({ error: 'خطای سرور' });
});

// ---------------------------------------------------------------- HTML (link previews, themed splash, 404s)

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const publicBase = (req: Request) => PUBLIC_URL || `${req.protocol}://${req.get('host')}${BASE_PATH}`;

/** Path relative to the base: "", "builder", "builder/x", "<slug>" */
const relPath = (req: Request) => req.path.replace(/^\/+|\/+$/g, '');

async function renderPage(html: string, req: Request): Promise<{ status: number; html: string }> {
  const rel = relPath(req);
  if (!rel || rel === 'builder' || rel.startsWith('builder/')) return { status: 200, html };
  if (rel.includes('/')) return { status: 404, html };
  const slug = decodeURIComponent(rel).toLowerCase();
  const rec = await readInvitation(slug);
  if (!rec) return { status: 404, html };

  const c = rec.config;
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
    `<meta property="og:url" content="${escapeHtml(`${base}/${c.slug}`)}">`,
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
  await seedDefault();
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

start().catch(err => {
  console.error(err);
  process.exit(1);
});
