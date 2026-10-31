// Shared invitation model: used by the wizard, the invitation viewer and the server.
//
// Asset references (logos, media, fonts) are stored *relative to the app base path*,
// e.g. "uploads/abc.webp" or "background-music.mp3", so invitations keep working if the app is
// moved (e.g. served from https://studio.asvashop.com/in/).

export interface InvitationConfig {
  /** Public link id: <base>/<slug> */
  slug: string;
  company: {
    name: string;
    tagline: string;
    /** Wide logo shown on the welcome screen */
    logo: string;
    /** Square/icon logo shown on the invitation card */
    icon: string;
    /** Image used for link previews in messengers (optional) */
    shareImage: string;
  };
  event: {
    badge: string;
    title: string;
    /** Exhibition logo shown on the welcome screen (optional) */
    logo: string;
    welcomeText: string;
    /** Gregorian dates, YYYY-MM-DD */
    startDate: string;
    endDate: string;
    /** Daily opening hours, HH:MM in `timezone` ('' = not entered yet) */
    startTime: string;
    endTime: string;
    /** IANA time zone of the venue */
    timezone: string;
    /** Display labels (Persian), auto-generated in the wizard but editable */
    dateLabel: string;
    timeLabel: string;
    location: string;
    mapUrl: string;
    booth: string;
    /** Interactive booth map, opened full-screen in an iframe (optional) */
    boothMapUrl: string;
  };
  texts: {
    /** Invitation letter; paragraphs are separated by a blank line */
    letter: string;
    enterButton: string;
    detailsButton: string;
    mapButton: string;
    shareButton: string;
    shareText: string;
    /** Line shown above the letter on personal links (?to=Name); {guest} is replaced by the name */
    guestGreeting: string;
  };
  /** Company contact details shown to guests (+ "save contact" vCard) */
  contact: ContactInfo;
  /** Optional English version of all texts (guests can switch language) */
  en: EnglishTexts;
  /** Attendance confirmation form */
  rsvp: { enabled: boolean; askPhone: boolean; askCompany: boolean; note: string };
  theme: {
    primary: string;
    accent: string;
    background: string;
    font: string;
    /** Uploaded font file, used when font === CUSTOM_FONT */
    customFontUrl: string;
  };
  media: {
    video: string;
    videoPoster: string;
    /** 0..100 */
    videoOpacity: number;
    music: string;
    musicVolume: number;
  };
  footer: {
    show: boolean;
    text: string;
    subText: string;
    url: string;
  };
  /** Items the admin chose not to show at all (e.g. booth not decided yet). */
  hidden: Partial<Record<ItemKey, boolean>>;
}

export interface ContactInfo {
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  instagram: string;
  telegram: string;
}

export interface EnglishTexts {
  enabled: boolean;
  companyName: string;
  tagline: string;
  badge: string;
  title: string;
  welcomeText: string;
  letter: string;
  location: string;
  booth: string;
  /** Optional overrides; generated from the dates/hours when empty */
  dateLabel: string;
  timeLabel: string;
  enterButton: string;
  detailsButton: string;
  mapButton: string;
  shareButton: string;
  shareText: string;
  guestGreeting: string;
}

export type Lang = 'fa' | 'en';

export const CUSTOM_FONT = '__custom__';

/** Max lengths – enforced by the server and shown in the wizard. */
export const LIMITS = {
  short: 120,
  text: 300,
  button: 40,
  shareText: 500,
  letter: 3000,
  url: 1000,
} as const;

export const FONTS: { id: string; label: string; sample: string }[] = [
  { id: 'Vazirmatn', label: 'وزیرمتن', sample: 'خوانا و مدرن' },
  { id: 'Noto Sans Arabic', label: 'نوتو سنس', sample: 'ساده و رسمی' },
  { id: 'Mada', label: 'مدا', sample: 'سبک و مینیمال' },
  { id: 'Changa', label: 'چانگا', sample: 'فشرده و پرانرژی' },
  { id: 'Reem Kufi', label: 'ریم کوفی', sample: 'هندسی و کوفی' },
  { id: 'Lalezar', label: 'لاله‌زار', sample: 'تیتر نمایشی' },
  { id: 'Noto Naskh Arabic', label: 'نوتو نسخ', sample: 'کلاسیک و ادبی' },
  { id: 'Markazi Text', label: 'مرکزی', sample: 'کتابی و گرم' },
  { id: 'Amiri', label: 'امیری', sample: 'سنتی و فاخر' },
];

export const PALETTES: { name: string; primary: string; accent: string; background: string }[] = [
  { name: 'آبی دارویی', primary: '#0033A0', accent: '#00B4F1', background: '#0f172a' },
  { name: 'سبز طبیعی', primary: '#1A4B62', accent: '#7B9C54', background: '#0f1a17' },
  { name: 'زرشکی و طلایی', primary: '#7A1F3D', accent: '#B7862F', background: '#1a0f14' },
  { name: 'بنفش', primary: '#4C1D95', accent: '#8B5CF6', background: '#120d1f' },
  { name: 'فیروزه‌ای', primary: '#0F766E', accent: '#14B8A6', background: '#071a19' },
  { name: 'نارنجی', primary: '#9A3412', accent: '#EA580C', background: '#1a110b' },
  { name: 'ذغالی', primary: '#1E293B', accent: '#64748B', background: '#020617' },
  { name: 'روشن', primary: '#0F3D6E', accent: '#0284C7', background: '#E8EEF5' },
];

export const TIMEZONES: { id: string; label: string }[] = [
  { id: 'Asia/Tehran', label: 'تهران' },
  { id: 'Asia/Dubai', label: 'دبی' },
  { id: 'Asia/Baghdad', label: 'بغداد' },
  { id: 'Asia/Riyadh', label: 'ریاض' },
  { id: 'Europe/Istanbul', label: 'استانبول' },
  { id: 'Asia/Baku', label: 'باکو' },
  { id: 'Asia/Kabul', label: 'کابل' },
  { id: 'Europe/Moscow', label: 'مسکو' },
  { id: 'Europe/Berlin', label: 'برلین / اروپای مرکزی' },
  { id: 'Europe/London', label: 'لندن' },
  { id: 'Asia/Shanghai', label: 'پکن / شانگهای' },
];

/** Ready-made background music (generic, not tied to any company). */
export const PRESET_MUSIC = [
  { id: 'calm', label: 'آرام', url: 'background-music.mp3' },
  { id: 'corporate', label: 'رسمی', url: 'bg-music.mp3' },
];

export const DEFAULT_FOOTER: InvitationConfig['footer'] = {
  show: true,
  text: 'Powered by Asva Studio',
  subText: 'توسعه یافته توسط شرکت داده‌پردازان اسوا',
  url: 'https://instagram.com/asvastudio',
};

/**
 * A brand-new, completely empty invitation. Nothing company- or event-specific is
 * pre-filled, so no other client's data can end up in an invitation by mistake.
 * Only neutral UI labels (button texts) and a neutral colour scheme have values.
 */
export function blankInvitation(): InvitationConfig {
  return {
    slug: '',
    company: { name: '', tagline: '', logo: '', icon: '', shareImage: '' },
    event: {
      badge: '',
      title: '',
      logo: '',
      welcomeText: '',
      startDate: '',
      endDate: '',
      startTime: '',
      endTime: '',
      timezone: 'Asia/Tehran',
      dateLabel: '',
      timeLabel: '',
      location: '',
      mapUrl: '',
      booth: '',
      boothMapUrl: '',
    },
    texts: {
      letter: '',
      enterButton: 'تایید و ورود',
      detailsButton: 'مکان و زمان برگزاری',
      mapButton: 'مکان‌یابی دقیق غرفه',
      shareButton: 'اشتراک‌گذاری',
      shareText: '',
      guestGreeting: '{guest} گرامی',
    },
    contact: { phone: '', whatsapp: '', email: '', website: '', instagram: '', telegram: '' },
    en: {
      enabled: false,
      companyName: '',
      tagline: '',
      badge: '',
      title: '',
      welcomeText: '',
      letter: '',
      location: '',
      booth: '',
      dateLabel: '',
      timeLabel: '',
      ...EN_DEFAULT_BUTTONS,
      shareText: '',
      guestGreeting: 'Dear {guest},',
    },
    rsvp: { enabled: false, askPhone: true, askCompany: true, note: 'اطلاعات شما فقط برای هماهنگی دیدار در غرفه استفاده می‌شود.' },
    theme: { primary: '#1E3A8A', accent: '#0EA5E9', background: '#0f172a', font: 'Vazirmatn', customFontUrl: '' },
    media: { video: '', videoPoster: '', videoOpacity: 75, music: '', musicVolume: 50 },
    footer: { ...DEFAULT_FOOTER },
    hidden: {},
  };
}

export const EN_DEFAULT_BUTTONS = {
  enterButton: 'Open invitation',
  detailsButton: 'Date & venue',
  mapButton: 'Find our booth',
  shareButton: 'Share',
};

/** Optional ready-made wording the admin can insert with one click (generic, no names). */
export const SUGGESTIONS_EN = {
  badge: 'Official Invitation',
  welcomeText: 'We would be honoured to host you at this major event',
  letter:
    'Dear guest,\nWe are delighted to invite you to visit the {company} booth at {event}.\n\nThis meeting is an opportunity for a fresh conversation, to get to know our products and achievements, and a step towards valuable future cooperation.',
};

export const SUGGESTIONS = {
  badge: 'دعوتنامه رسمی',
  welcomeText: 'مفتخریم میزبان شما در این رویداد بزرگ باشیم',
  letter:
    'با سلام و احترام\nبا افتخار از شما دعوت می‌کنیم تا با حضور ارزشمند خود در {event}، میهمان غرفه {company} باشید.\n\nاین دیدار، فرصتی است برای گفت‌وگویی تازه، آشنایی با محصولات و دستاوردهای ما و گامی برای توسعه همکاری‌های ارزشمند آینده.',
};

/** Replace {company} / {event} / {guest} placeholders in user-written text. */
export function fillPlaceholders(text: string, c: InvitationConfig, guest = '', rep = ''): string {
  return text
    .replaceAll('{company}', c.company.name)
    .replaceAll('{event}', c.event.title)
    .replaceAll('{guest}', guest)
    .replaceAll('{rep}', rep || c.company.name); // no rep link -> the company itself invites
}

/** Turn literal names back into placeholders (used when copying an invitation). */
function toPlaceholders(text: string, company: string, event: string): string {
  let t = text;
  if (event.trim().length > 2) t = t.replaceAll(event.trim(), '{event}');
  if (company.trim().length > 1) t = t.replaceAll(company.trim(), '{company}');
  return t;
}

// ---------- contact ----------

const faToLatinDigits = (s: string) => s.replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** International-ish phone for tel:/wa.me links: Iranian 09xx… becomes 989xx… */
export function normalizePhone(raw: string, forWhatsapp = false): string {
  let d = faToLatinDigits(raw).replace(/[^\d+]/g, '');
  if (d.startsWith('+')) d = d.slice(1);
  if (d.startsWith('00')) d = d.slice(2);
  if (forWhatsapp && d.startsWith('0')) d = `98${d.slice(1)}`;
  return d.length >= 5 ? d : '';
}

export interface ContactLink {
  kind: keyof ContactInfo;
  href: string;
  label: string;
}

/** Usable contact links (invalid entries are skipped). */
export function contactLinks(c: ContactInfo): ContactLink[] {
  const out: ContactLink[] = [];
  const phone = normalizePhone(c.phone);
  if (phone) out.push({ kind: 'phone', href: `tel:${c.phone.trim().startsWith('+') ? '+' : ''}${phone}`, label: faToLatinDigits(c.phone.trim()) });
  const wa = normalizePhone(c.whatsapp, true);
  if (wa) out.push({ kind: 'whatsapp', href: `https://wa.me/${wa}`, label: 'WhatsApp' });
  if (EMAIL_RE.test(c.email.trim())) out.push({ kind: 'email', href: `mailto:${c.email.trim()}`, label: c.email.trim() });
  const web = safeUrl(c.website);
  if (web) out.push({ kind: 'website', href: web, label: new URL(web).hostname.replace(/^www\./, '') });
  const ig = c.instagram.trim().replace(/^@/, '');
  if (ig) {
    const url = /instagram\.com/i.test(ig) ? safeUrl(ig) : /^[\w.]{1,30}$/.test(ig) ? `https://instagram.com/${ig}` : '';
    if (url) out.push({ kind: 'instagram', href: url, label: 'Instagram' });
  }
  const tg = c.telegram.trim().replace(/^@/, '');
  if (tg) {
    const url = /t\.me|telegram\.me/i.test(tg) ? safeUrl(tg) : /^\w{4,32}$/.test(tg) ? `https://t.me/${tg}` : '';
    if (url) out.push({ kind: 'telegram', href: url, label: 'Telegram' });
  }
  return out;
}

// ---------- English version ----------

/**
 * The invitation as guests see it in the given language: the English texts replace
 * the Persian ones (empty when not entered, so they show up as "missing" in previews).
 */
export function localize(c: InvitationConfig, lang: Lang): InvitationConfig {
  if (lang === 'fa' || !c.en.enabled) return c;
  const e = c.en;
  return {
    ...c,
    company: { ...c.company, name: e.companyName, tagline: e.tagline },
    event: { ...c.event, badge: e.badge, title: e.title, welcomeText: e.welcomeText, location: e.location, booth: e.booth, dateLabel: e.dateLabel, timeLabel: e.timeLabel },
    texts: {
      ...c.texts,
      letter: e.letter,
      enterButton: e.enterButton || EN_DEFAULT_BUTTONS.enterButton,
      detailsButton: e.detailsButton || EN_DEFAULT_BUTTONS.detailsButton,
      mapButton: e.mapButton || EN_DEFAULT_BUTTONS.mapButton,
      shareButton: e.shareButton || EN_DEFAULT_BUTTONS.shareButton,
      shareText: e.shareText,
      guestGreeting: e.guestGreeting || 'Dear {guest},',
    },
  };
}

// ---------- copying ----------

export type CopyMode = 'newEvent' | 'newOrganizer';

/** Items that describe the exhibition (vs. the organiser's identity). */
const EVENT_ITEMS: ItemKey[] = ['eventLogo', 'date', 'time', 'location', 'mapUrl', 'booth', 'boothMap', 'calendar'];

/**
 * newEvent:     same organiser, another exhibition → keep identity/design/texts, clear the exhibition.
 * newOrganizer: same exhibition, another booth/company → keep the exhibition, clear identity, design and booth.
 * Literal names in the texts are turned into {company}/{event} placeholders so nothing of the
 * old invitation leaks into the new one.
 */
export function copyInvitation(src: InvitationConfig, mode: CopyMode): InvitationConfig {
  const blank = blankInvitation();
  const c = structuredClone(src);
  const ph = (t: string, company: string, event: string) => toPlaceholders(t, company, event);
  c.slug = '';
  c.texts = { ...c.texts, letter: ph(c.texts.letter, src.company.name, src.event.title), shareText: ph(c.texts.shareText, src.company.name, src.event.title) };
  c.event.welcomeText = ph(c.event.welcomeText, src.company.name, src.event.title);
  c.en = { ...c.en, letter: ph(c.en.letter, src.en.companyName, src.en.title), shareText: ph(c.en.shareText, src.en.companyName, src.en.title), welcomeText: ph(c.en.welcomeText, src.en.companyName, src.en.title) };
  const hidden: Partial<Record<ItemKey, boolean>> = {};

  if (mode === 'newEvent') {
    c.event = { ...blank.event, badge: src.event.badge, welcomeText: c.event.welcomeText, timezone: src.event.timezone };
    c.en = { ...c.en, title: '', location: '', booth: '', dateLabel: '', timeLabel: '' };
    for (const [k, v] of Object.entries(src.hidden) as [ItemKey, boolean][]) if (v && !EVENT_ITEMS.includes(k)) hidden[k] = true;
  } else {
    c.company = { ...blank.company };
    c.contact = { ...blank.contact };
    c.theme = { ...blank.theme };
    c.media = { ...blank.media };
    c.event = { ...c.event, booth: '', boothMapUrl: '' };
    c.en = { ...c.en, companyName: '', tagline: '', booth: '' };
    for (const [k, v] of Object.entries(src.hidden) as [ItemKey, boolean][]) if (v && EVENT_ITEMS.includes(k) && k !== 'booth' && k !== 'boothMap') hidden[k] = true;
  }
  c.hidden = hidden;
  return c;
}

// ---------- displayable items: hide flags & completeness ----------

export type ItemKey =
  | 'logo'
  | 'icon'
  | 'badge'
  | 'eventLogo'
  | 'welcomeText'
  | 'letter'
  | 'tagline'
  | 'date'
  | 'time'
  | 'location'
  | 'mapUrl'
  | 'booth'
  | 'boothMap'
  | 'calendar'
  | 'share'
  | 'video'
  | 'music'
  | 'contact';

/** Every item that appears on the invitation, the wizard step that edits it, and its "missing" message. */
export const ITEMS: Record<ItemKey, { label: string; step: number; missing: string }> = {
  logo: { label: 'لوگوی شرکت', step: 1, missing: 'لوگوی شرکت هنوز بارگذاری نشده' },
  icon: { label: 'نشان مربعی شرکت', step: 1, missing: 'نشان شرکت هنوز بارگذاری نشده' },
  badge: { label: 'عنوان بالای نام نمایشگاه', step: 0, missing: 'عنوان بالای نام نمایشگاه وارد نشده' },
  eventLogo: { label: 'لوگوی نمایشگاه', step: 1, missing: 'لوگوی نمایشگاه هنوز بارگذاری نشده' },
  welcomeText: { label: 'جمله خوش‌آمد', step: 3, missing: 'جمله خوش‌آمد هنوز وارد نشده' },
  letter: { label: 'متن دعوتنامه', step: 3, missing: 'متن دعوتنامه هنوز وارد نشده' },
  tagline: { label: 'شعار شرکت', step: 3, missing: 'شعار شرکت هنوز وارد نشده' },
  date: { label: 'تاریخ برگزاری', step: 4, missing: 'تاریخ هنوز وارد نشده' },
  time: { label: 'ساعت برگزاری', step: 4, missing: 'ساعت برگزاری هنوز وارد نشده' },
  location: { label: 'محل برگزاری', step: 4, missing: 'محل برگزاری هنوز وارد نشده' },
  mapUrl: { label: 'لینک مسیریابی', step: 4, missing: 'لینک مسیریابی هنوز وارد نشده' },
  booth: { label: 'شماره سالن و غرفه', step: 4, missing: 'شماره غرفه هنوز مشخص نشده' },
  boothMap: { label: 'نقشه تعاملی غرفه', step: 4, missing: 'لینک نقشه غرفه هنوز وارد نشده' },
  calendar: { label: 'دکمه‌های ثبت در تقویم', step: 4, missing: 'برای دکمه‌های تقویم، تاریخ لازم است' },
  share: { label: 'دکمه اشتراک‌گذاری', step: 3, missing: '' },
  video: { label: 'ویدئوی پس‌زمینه', step: 2, missing: 'ویدئوی پس‌زمینه انتخاب نشده' },
  music: { label: 'موزیک پس‌زمینه', step: 2, missing: 'موزیک انتخاب نشده' },
  contact: { label: 'اطلاعات تماس شرکت', step: 0, missing: 'اطلاعات تماس شرکت هنوز وارد نشده' },
};
export const ITEM_KEYS = Object.keys(ITEMS) as ItemKey[];

const hasDates = (c: InvitationConfig) => !!(c.event.startDate && c.event.endDate);
export const hasTimes = (c: InvitationConfig) => !!(c.event.startTime && c.event.endTime && c.event.endTime > c.event.startTime);

/** Whether the item has content (independent of the hide flag). */
export function isFilled(c: InvitationConfig, key: ItemKey): boolean {
  switch (key) {
    case 'logo':
      return !!c.company.logo;
    case 'icon':
      return !!c.company.icon;
    case 'badge':
      return !!c.event.badge.trim();
    case 'eventLogo':
      return !!c.event.logo;
    case 'welcomeText':
      return !!c.event.welcomeText.trim();
    case 'letter':
      return !!c.texts.letter.trim();
    case 'tagline':
      return !!c.company.tagline.trim();
    case 'date':
      return hasDates(c) && c.event.endDate >= c.event.startDate;
    case 'time':
      return hasTimes(c);
    case 'location':
      return !!c.event.location.trim();
    case 'mapUrl':
      return !!safeUrl(c.event.mapUrl);
    case 'booth':
      return !!c.event.booth.trim();
    case 'boothMap':
      return !!safeUrl(c.event.boothMapUrl);
    case 'calendar':
      return hasDates(c) && c.event.endDate >= c.event.startDate;
    case 'share':
      return true;
    case 'video':
      return !!c.media.video;
    case 'music':
      return !!c.media.music;
    case 'contact':
      return contactLinks(c.contact).length > 0;
  }
}

export const isShown = (c: InvitationConfig, key: ItemKey): boolean =>
  !c.hidden?.[key] && !(key === 'mapUrl' && c.hidden?.location); // no location row -> no map link either
/** Shown on the invitation but has no content yet. */
export const isMissing = (c: InvitationConfig, key: ItemKey) => isShown(c, key) && !isFilled(c, key);

// ---------- validation / sanitising (shared by client and server) ----------

export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;
export const RESERVED_SLUGS = new Set(['api', 'uploads', 'assets', 'builder', 'preview', 'rep', 'settings', 'en', 'fa', 'admin', 'new', 'edit', 'static', 'i', 'in', 'login', 'src', 'node_modules']);
const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
/** Base-relative asset paths we serve ourselves: uploads/<file> or a top-level preset file. */
const ASSET_RE = /^(?:uploads\/)?[A-Za-z0-9][A-Za-z0-9._-]*$/;

/** Add https:// to scheme-less input like "neshan.org/x" (what people usually paste/type). */
export function coerceUrl(input: string): string {
  const u = input.trim();
  if (!u) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return u;
  if (u.startsWith('//')) return `https:${u}`;
  return `https://${u}`;
}

/** Accept only http(s) URLs; everything else (javascript:, data:, garbage) becomes ''. */
export function safeUrl(url: unknown): string {
  if (typeof url !== 'string') return '';
  const u = coerceUrl(url);
  if (!u) return '';
  try {
    const parsed = new URL(u);
    if ((parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.hostname.includes('.')) return parsed.href;
  } catch {
    /* invalid */
  }
  return '';
}

/** Only our own uploaded/preset files may be used as media. Accepts legacy "/uploads/x" form. */
export function safeAsset(url: unknown): string {
  if (typeof url !== 'string') return '';
  const u = url.trim().replace(/^\/+/, '');
  return ASSET_RE.test(u) ? u : '';
}

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function str(v: unknown, fallback: string, max: number = LIMITS.text): string {
  return typeof v === 'string' ? v.slice(0, max) : fallback;
}
function color(v: unknown, fallback: string): string {
  return typeof v === 'string' && HEX_RE.test(v) ? v : fallback;
}
function num(v: unknown, fallback: number, min: number, max: number): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
}

/** Normalise untrusted input into a valid InvitationConfig (missing values stay empty). */
export function sanitizeInvitation(input: any): InvitationConfig {
  const d = blankInvitation();
  const i = input ?? {};
  const fontOk = typeof i.theme?.font === 'string' && (i.theme.font === CUSTOM_FONT || FONTS.some(f => f.id === i.theme.font));
  const tz = typeof i.event?.timezone === 'string' && isValidTimezone(i.event.timezone) ? i.event.timezone : d.event.timezone;
  const hidden: Partial<Record<ItemKey, boolean>> = {};
  for (const k of ITEM_KEYS) if (i.hidden?.[k] === true) hidden[k] = true;
  return {
    slug: typeof i.slug === 'string' ? i.slug.toLowerCase().trim().slice(0, 40) : '',
    company: {
      name: str(i.company?.name, '', LIMITS.short),
      tagline: str(i.company?.tagline, '', LIMITS.short),
      logo: safeAsset(i.company?.logo),
      icon: safeAsset(i.company?.icon),
      shareImage: safeAsset(i.company?.shareImage),
    },
    event: {
      badge: str(i.event?.badge, '', LIMITS.short),
      title: str(i.event?.title, '', LIMITS.short),
      logo: safeAsset(i.event?.logo),
      welcomeText: str(i.event?.welcomeText, '', LIMITS.text),
      startDate: DATE_RE.test(i.event?.startDate) ? i.event.startDate : '',
      endDate: DATE_RE.test(i.event?.endDate) ? i.event.endDate : '',
      startTime: TIME_RE.test(i.event?.startTime) ? i.event.startTime : '',
      endTime: TIME_RE.test(i.event?.endTime) ? i.event.endTime : '',
      timezone: tz,
      dateLabel: str(i.event?.dateLabel, '', LIMITS.short),
      timeLabel: str(i.event?.timeLabel, '', LIMITS.short),
      location: str(i.event?.location, '', LIMITS.short),
      // Keep what the admin typed in drafts; it is checked (and must be valid) before publishing.
      mapUrl: str(i.event?.mapUrl, '', LIMITS.url).trim(),
      booth: str(i.event?.booth, '', LIMITS.short),
      boothMapUrl: str(i.event?.boothMapUrl, '', LIMITS.url).trim(),
    },
    texts: {
      letter: str(i.texts?.letter, '', LIMITS.letter),
      enterButton: str(i.texts?.enterButton, '', LIMITS.button) || d.texts.enterButton,
      detailsButton: str(i.texts?.detailsButton, '', LIMITS.button) || d.texts.detailsButton,
      mapButton: str(i.texts?.mapButton, '', LIMITS.button) || d.texts.mapButton,
      shareButton: str(i.texts?.shareButton, '', LIMITS.button) || d.texts.shareButton,
      shareText: str(i.texts?.shareText, '', LIMITS.shareText),
      guestGreeting: str(i.texts?.guestGreeting, d.texts.guestGreeting, LIMITS.short),
    },
    contact: {
      phone: str(i.contact?.phone, '', 40),
      whatsapp: str(i.contact?.whatsapp, '', 40),
      email: str(i.contact?.email, '', LIMITS.short),
      website: str(i.contact?.website, '', LIMITS.url),
      instagram: str(i.contact?.instagram, '', LIMITS.short),
      telegram: str(i.contact?.telegram, '', LIMITS.short),
    },
    en: {
      enabled: i.en?.enabled === true,
      companyName: str(i.en?.companyName, '', LIMITS.short),
      tagline: str(i.en?.tagline, '', LIMITS.short),
      badge: str(i.en?.badge, '', LIMITS.short),
      title: str(i.en?.title, '', LIMITS.short),
      welcomeText: str(i.en?.welcomeText, '', LIMITS.text),
      letter: str(i.en?.letter, '', LIMITS.letter),
      location: str(i.en?.location, '', LIMITS.short),
      booth: str(i.en?.booth, '', LIMITS.short),
      dateLabel: str(i.en?.dateLabel, '', LIMITS.short),
      timeLabel: str(i.en?.timeLabel, '', LIMITS.short),
      enterButton: str(i.en?.enterButton, '', LIMITS.button) || EN_DEFAULT_BUTTONS.enterButton,
      detailsButton: str(i.en?.detailsButton, '', LIMITS.button) || EN_DEFAULT_BUTTONS.detailsButton,
      mapButton: str(i.en?.mapButton, '', LIMITS.button) || EN_DEFAULT_BUTTONS.mapButton,
      shareButton: str(i.en?.shareButton, '', LIMITS.button) || EN_DEFAULT_BUTTONS.shareButton,
      shareText: str(i.en?.shareText, '', LIMITS.shareText),
      guestGreeting: str(i.en?.guestGreeting, d.en.guestGreeting, LIMITS.short),
    },
    rsvp: {
      enabled: i.rsvp?.enabled === true,
      askPhone: i.rsvp?.askPhone !== false,
      askCompany: i.rsvp?.askCompany !== false,
      note: str(i.rsvp?.note, d.rsvp.note, LIMITS.text),
    },
    theme: {
      primary: color(i.theme?.primary, d.theme.primary),
      accent: color(i.theme?.accent, d.theme.accent),
      background: color(i.theme?.background, d.theme.background),
      font: fontOk ? i.theme.font : d.theme.font,
      customFontUrl: safeAsset(i.theme?.customFontUrl),
    },
    media: {
      video: safeAsset(i.media?.video),
      videoPoster: safeAsset(i.media?.videoPoster),
      videoOpacity: num(i.media?.videoOpacity, d.media.videoOpacity, 0, 100),
      music: safeAsset(i.media?.music),
      musicVolume: num(i.media?.musicVolume, d.media.musicVolume, 0, 100),
    },
    footer: {
      show: i.footer?.show !== false,
      text: str(i.footer?.text, '', LIMITS.short),
      subText: str(i.footer?.subText, '', LIMITS.short),
      url: str(i.footer?.url, '', LIMITS.url).trim(),
    },
    hidden,
  };
}

/** The version guests see: invalid links dropped (only ever called on validated data). */
export function publicVersion(c: InvitationConfig): InvitationConfig {
  return {
    ...c,
    event: { ...c.event, mapUrl: safeUrl(c.event.mapUrl), boothMapUrl: safeUrl(c.event.boothMapUrl) },
    footer: { ...c.footer, url: safeUrl(c.footer.url) },
  };
}

export type IssueField =
  | 'slug'
  | 'company.name'
  | 'event.title'
  | 'event.dates'
  | 'event.time'
  | 'event.mapUrl'
  | 'event.boothMapUrl'
  | 'footer.url'
  | 'theme.font'
  | 'contact.email'
  | `item.${ItemKey}`
  | `en.${string}`;

/** Wizard step numbers (shared so validation can point at the right step). */
export const STEP = { basics: 0, brand: 1, media: 2, texts: 3, event: 4, english: 5, guests: 6, links: 7, publish: 8 } as const;

/** English fields that must be filled (when the item is shown) if the English version is on. */
const EN_REQUIRED: { key: ItemKey | 'companyName' | 'title'; field: keyof EnglishTexts; label: string }[] = [
  { key: 'companyName', field: 'companyName', label: 'نام شرکت' },
  { key: 'title', field: 'title', label: 'نام نمایشگاه' },
  { key: 'badge', field: 'badge', label: 'عنوان بالای نام نمایشگاه' },
  { key: 'welcomeText', field: 'welcomeText', label: 'جمله خوش‌آمد' },
  { key: 'letter', field: 'letter', label: 'متن دعوتنامه' },
  { key: 'tagline', field: 'tagline', label: 'شعار شرکت' },
  { key: 'location', field: 'location', label: 'محل برگزاری' },
  { key: 'booth', field: 'booth', label: 'شماره غرفه' },
];

export interface Issue {
  field: IssueField;
  message: string;
  /** Wizard step that fixes it */
  step: number;
  /** Item that can be hidden instead of filled */
  item?: ItemKey;
}

/**
 * Everything that blocks publishing. Drafts can be saved with any of these open;
 * every shown item must have content (or be hidden) before guests can see it.
 */
export function validateForPublish(c: InvitationConfig): Issue[] {
  const issues: Issue[] = [];
  const add = (field: IssueField, step: number, message: string, item?: ItemKey) => issues.push({ field, step, message, item });

  if (!SLUG_RE.test(c.slug)) add('slug', 0, 'آدرس لینک انتخاب نشده یا معتبر نیست (۳ تا ۴۰ حرف انگلیسی کوچک، عدد یا خط تیره).');
  else if (RESERVED_SLUGS.has(c.slug)) add('slug', 0, 'این آدرس رزرو شده است؛ آدرس دیگری انتخاب کنید.');
  if (!c.company.name.trim()) add('company.name', 0, 'نام شرکت وارد نشده است.');
  if (!c.event.title.trim()) add('event.title', 0, 'نام نمایشگاه وارد نشده است.');

  for (const key of ITEM_KEYS) {
    if (!isMissing(c, key)) continue;
    if (key === 'calendar' && isShown(c, 'date')) continue; // already reported as missing date
    add(`item.${key}`, ITEMS[key].step, `${ITEMS[key].missing}.`, key);
  }

  // Values that are present but wrong
  if (c.event.startDate && c.event.endDate && c.event.endDate < c.event.startDate) add('event.dates', 4, 'تاریخ پایان نباید قبل از تاریخ شروع باشد.');
  if (isShown(c, 'time') && c.event.startTime && c.event.endTime && c.event.endTime <= c.event.startTime) add('event.time', 4, 'ساعت پایان باید بعد از ساعت شروع باشد.');
  if (isShown(c, 'mapUrl') && c.event.mapUrl && !safeUrl(c.event.mapUrl)) add('event.mapUrl', 4, 'لینک مسیریابی معتبر نیست.');
  if (isShown(c, 'boothMap') && c.event.boothMapUrl && !safeUrl(c.event.boothMapUrl)) add('event.boothMapUrl', 4, 'لینک نقشه غرفه معتبر نیست.');
  if (c.footer.show && c.footer.url && !safeUrl(c.footer.url)) add('footer.url', 3, 'لینک امضای پایین صفحه معتبر نیست.');
  if (c.theme.font === CUSTOM_FONT && !c.theme.customFontUrl) add('theme.font', 1, 'فایل فونت اختصاصی بارگذاری نشده است.');
  if (isShown(c, 'contact') && c.contact.email.trim() && !EMAIL_RE.test(c.contact.email.trim())) add('contact.email', 0, 'ایمیل شرکت معتبر نیست.');

  if (c.en.enabled) {
    for (const r of EN_REQUIRED) {
      const itemShown = r.key === 'companyName' || r.key === 'title' ? true : isShown(c, r.key as ItemKey);
      if (itemShown && !String(c.en[r.field]).trim()) add(`en.${r.field}`, STEP.english, `نسخه انگلیسی: ${r.label} وارد نشده.`);
    }
  }
  return issues;
}
