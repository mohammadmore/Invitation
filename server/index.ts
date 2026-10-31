import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_INVITATION,
  SLUG_RE,
  sanitizeInvitation,
  validateForPublish,
  type InvitationConfig,
} from '../src/shared/invitation';

const isProd = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;
const ROOT = process.cwd();
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, 'data'));
const INVITES_DIR = path.join(DATA_DIR, 'invitations');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const RESERVED_SLUGS = new Set(['api', 'uploads', 'assets', 'builder', 'admin', 'new', 'edit', 'static', 'i']);

mkdirSync(INVITES_DIR, { recursive: true });
mkdirSync(UPLOADS_DIR, { recursive: true });

// ---------------------------------------------------------------- storage

interface StoredInvitation {
  config: InvitationConfig;
  editTokenHash: string;
  createdAt: string;
  updatedAt: string;
}

const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
const fileFor = (slug: string) => path.join(INVITES_DIR, `${slug}.json`);

async function readInvitation(slug: string): Promise<StoredInvitation | null> {
  if (!SLUG_RE.test(slug)) return null;
  try {
    return JSON.parse(await fs.readFile(fileFor(slug), 'utf8'));
  } catch {
    return null;
  }
}

async function writeInvitation(rec: StoredInvitation) {
  const target = fileFor(rec.config.slug);
  const tmp = `${target}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(rec, null, 2));
  await fs.rename(tmp, target);
}

function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

const isAdmin = (req: Request) => !!ADMIN_PASSWORD && safeEqual(String(req.get('x-admin-password') || ''), ADMIN_PASSWORD);
/** Creating invitations / uploading is open when no ADMIN_PASSWORD is configured. */
const canCreate = (req: Request) => !ADMIN_PASSWORD || isAdmin(req);
const canEdit = (req: Request, rec: StoredInvitation) =>
  isAdmin(req) || safeEqual(sha256(String(req.get('x-edit-token') || '')), rec.editTokenHash);

async function seedDefault() {
  const files = await fs.readdir(INVITES_DIR);
  if (files.some(f => f.endsWith('.json'))) return;
  const token = crypto.randomBytes(24).toString('base64url');
  const now = new Date().toISOString();
  await writeInvitation({
    config: { ...DEFAULT_INVITATION, slug: 'behansar' },
    editTokenHash: sha256(token),
    createdAt: now,
    updatedAt: now,
  });
  console.log(`[seed] Created sample invitation /i/behansar  (edit: /builder/behansar#${token})`);
}

// ---------------------------------------------------------------- app

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);

const api = express.Router();
api.use(express.json({ limit: '256kb' }));

api.get('/meta', (_req, res) => {
  res.json({ adminRequired: !!ADMIN_PASSWORD });
});

api.post('/auth', (req, res) => {
  res.json({ ok: canCreate(req), admin: isAdmin(req) });
});

api.get('/slug/:slug', async (req, res) => {
  const slug = req.params.slug.toLowerCase();
  if (!SLUG_RE.test(slug) || RESERVED_SLUGS.has(slug)) return res.json({ available: false, valid: false });
  res.json({ available: !(await readInvitation(slug)), valid: true });
});

api.get('/invitations', async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'دسترسی مدیر لازم است' });
  const files = (await fs.readdir(INVITES_DIR)).filter(f => f.endsWith('.json'));
  const items = await Promise.all(files.map(f => readInvitation(f.replace(/\.json$/, ''))));
  res.json(
    items
      .filter((r): r is StoredInvitation => !!r)
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

api.post('/invitations', async (req, res) => {
  if (!canCreate(req)) return res.status(401).json({ error: 'رمز مدیر نادرست است' });
  const config = sanitizeInvitation(req.body?.config);
  const errors = validateForPublish(config);
  if (RESERVED_SLUGS.has(config.slug)) errors.push('این آدرس رزرو شده است؛ آدرس دیگری انتخاب کنید.');
  if (errors.length) return res.status(400).json({ error: errors.join('\n') });
  if (await readInvitation(config.slug)) return res.status(409).json({ error: 'این آدرس قبلاً استفاده شده است.' });

  const editToken = crypto.randomBytes(24).toString('base64url');
  const now = new Date().toISOString();
  await writeInvitation({ config, editTokenHash: sha256(editToken), createdAt: now, updatedAt: now });
  res.status(201).json({ slug: config.slug, editToken });
});

api.put('/invitations/:slug', async (req, res) => {
  const slug = req.params.slug.toLowerCase();
  const rec = await readInvitation(slug);
  if (!rec) return res.status(404).json({ error: 'دعوتنامه پیدا نشد' });
  if (!canEdit(req, rec)) return res.status(401).json({ error: 'اجازه ویرایش این دعوتنامه را ندارید' });
  const config = sanitizeInvitation({ ...req.body?.config, slug });
  const errors = validateForPublish(config);
  if (errors.length) return res.status(400).json({ error: errors.join('\n') });
  await writeInvitation({ ...rec, config, updatedAt: new Date().toISOString() });
  res.json({ slug });
});

api.delete('/invitations/:slug', async (req, res) => {
  const slug = req.params.slug.toLowerCase();
  const rec = await readInvitation(slug);
  if (!rec) return res.status(404).json({ error: 'دعوتنامه پیدا نشد' });
  if (!canEdit(req, rec)) return res.status(401).json({ error: 'اجازه حذف این دعوتنامه را ندارید' });
  await fs.rm(fileFor(slug));
  res.json({ ok: true });
});

const UPLOAD_RULES: Record<string, { exts: string[]; maxMb: number }> = {
  image: { exts: ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'], maxMb: 5 },
  video: { exts: ['mp4', 'webm'], maxMb: 40 },
  audio: { exts: ['mp3', 'm4a', 'ogg', 'aac', 'wav'], maxMb: 15 },
  font: { exts: ['woff2', 'woff', 'ttf', 'otf'], maxMb: 5 },
};

/** Uploads are allowed for creators, or for the owner of an existing invitation (x-edit-slug + x-edit-token). */
async function canUpload(req: Request) {
  if (canCreate(req)) return true;
  const rec = await readInvitation(String(req.get('x-edit-slug') || '').toLowerCase());
  return !!rec && canEdit(req, rec);
}

api.post('/uploads', express.raw({ type: () => true, limit: '41mb' }), async (req, res) => {
  if (!(await canUpload(req))) return res.status(401).json({ error: 'اجازه بارگذاری فایل را ندارید' });
  const kind = String(req.query.kind || '');
  const rule = UPLOAD_RULES[kind];
  const ext = String(req.query.name || '').split('.').pop()?.toLowerCase() || '';
  if (!rule || !rule.exts.includes(ext)) {
    return res.status(400).json({ error: `فرمت فایل مجاز نیست. فرمت‌های مجاز: ${rule?.exts.join('، ') ?? '-'}` });
  }
  const body = req.body as Buffer;
  if (!Buffer.isBuffer(body) || body.length === 0) return res.status(400).json({ error: 'فایل خالی است' });
  if (body.length > rule.maxMb * 1024 * 1024) return res.status(413).json({ error: `حداکثر حجم مجاز ${rule.maxMb} مگابایت است` });

  const name = `${Date.now().toString(36)}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
  await fs.writeFile(path.join(UPLOADS_DIR, name), body);
  res.status(201).json({ url: `/uploads/${name}` });
});

api.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'حجم فایل بیش از حد مجاز است' });
  console.error(err);
  res.status(500).json({ error: 'خطای سرور' });
});

app.use('/api', api);

// User uploads: sandboxed so an uploaded SVG/HTML can never run script on our origin.
app.use(
  '/uploads',
  express.static(UPLOADS_DIR, {
    immutable: true,
    maxAge: '365d',
    setHeaders(res) {
      res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Access-Control-Allow-Origin', '*');
    },
  }),
);

// ---------------------------------------------------------------- HTML (with link-preview meta for /i/:slug)

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

async function injectMeta(html: string, req: Request): Promise<string> {
  const m = req.path.match(/^\/i\/([^/]+)\/?$/);
  if (!m) return html;
  const rec = await readInvitation(decodeURIComponent(m[1]).toLowerCase());
  if (!rec) return html;
  const c = rec.config;
  const origin = `${req.protocol}://${req.get('host')}`;
  const title = `${c.event.badge || 'دعوتنامه'} ${c.event.title} | ${c.company.name}`;
  const desc = [c.event.welcomeText, c.event.dateLabel, c.event.location].filter(Boolean).join(' - ');
  const image = c.company.logo || c.company.icon;
  const tags = [
    `<meta name="description" content="${escapeHtml(desc)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    `<meta property="og:description" content="${escapeHtml(desc)}">`,
    `<meta property="og:url" content="${escapeHtml(origin + req.path)}">`,
    image ? `<meta property="og:image" content="${escapeHtml(origin + image)}">` : '',
    `<meta name="theme-color" content="${c.theme.background}">`,
  ].join('\n    ');
  return html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>\n    ${tags}`);
}

async function start() {
  await seedDefault();

  let renderHtml: (req: Request) => Promise<string>;
  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
    app.use(vite.middlewares);
    renderHtml = async req => vite.transformIndexHtml(req.originalUrl, await fs.readFile(path.join(ROOT, 'index.html'), 'utf8'));
  } else {
    const dist = path.join(ROOT, 'dist');
    if (!existsSync(path.join(dist, 'index.html'))) throw new Error('dist/ not found – run `npm run build` first');
    app.use(express.static(dist, { index: false, maxAge: '7d' }));
    const template = await fs.readFile(path.join(dist, 'index.html'), 'utf8');
    renderHtml = async () => template;
  }

  app.get('*', async (req, res, next) => {
    try {
      if (path.extname(req.path)) return res.status(404).end(); // missing static file, not a page
      res.set('Cache-Control', 'no-cache').type('html').send(await injectMeta(await renderHtml(req), req));
    } catch (e) {
      next(e);
    }
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Expo invitation builder running on http://localhost:${PORT}  (data: ${DATA_DIR})`);
    if (!ADMIN_PASSWORD) console.warn('[warn] ADMIN_PASSWORD is not set – anyone can create invitations and upload files.');
  });
}

start().catch(err => {
  console.error(err);
  process.exit(1);
});
