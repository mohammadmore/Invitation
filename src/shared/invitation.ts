// Shared invitation model: used by the wizard, the invitation viewer and the server.
//
// Asset references (logos, media, fonts) are stored *relative to the app base path*,
// e.g. "uploads/abc.webp" or "bg.mp4", so invitations keep working if the app is
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
    /** Daily opening hours, HH:MM in `timezone` */
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
  };
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
}

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

export const PRESET_VIDEOS = [{ id: 'waves', label: 'غرفه نمایشگاهی', url: 'bg.mp4', poster: 'bg-poster.jpg' }];

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

export const DEFAULT_INVITATION: InvitationConfig = {
  slug: '',
  company: {
    name: 'بهان سار',
    tagline: 'همراه شما در مسیر سلامت و نوآوری',
    logo: 'Logo.png',
    icon: 'Logo2.png',
    shareImage: '',
  },
  event: {
    badge: 'دعوتنامه رسمی',
    title: 'نمایشگاه ایران فارما',
    logo: 'iranpharma.svg',
    welcomeText: 'مفتخریم میزبان شما در این رویداد بزرگ باشیم',
    startDate: '2026-09-23',
    endDate: '2026-09-25',
    startTime: '09:00',
    endTime: '17:00',
    timezone: 'Asia/Tehran',
    dateLabel: '۱ تا ۳ مهر ماه ۱۴۰۵',
    timeLabel: 'ساعت ۹ الی ۱۷',
    location: 'مصلی تهران',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=%D9%85%D8%B5%D9%84%DB%8C%20%D8%AA%D9%87%D8%B1%D8%A7%D9%86',
    booth: 'سالن E، غرفه‌های ۱۵۹ تا ۱۶۲',
    boothMapUrl: 'https://asvashop.com/behansar/map',
  },
  texts: {
    letter:
      'با سلام و احترام\nبا افتخار از شما دعوت می‌کنیم تا با حضور ارزشمند خود در نمایشگاه ایران فارما، میهمان غرفه بهان سار باشید.\n\nاین دیدار، فرصتی است برای گفت‌وگویی تازه، آشنایی با محصولات و دستاوردهای ما و گامی برای توسعه همکاری‌های ارزشمند آینده.',
    enterButton: 'تایید و ورود',
    detailsButton: 'مکان و زمان برگزاری',
    mapButton: 'مکان‌یابی دقیق غرفه',
    shareButton: 'اشتراک‌گذاری',
    shareText: '',
  },
  theme: {
    primary: '#0033A0',
    accent: '#00B4F1',
    background: '#0f172a',
    font: 'Vazirmatn',
    customFontUrl: '',
  },
  media: {
    video: 'bg.mp4',
    videoPoster: 'bg-poster.jpg',
    videoOpacity: 75,
    music: 'background-music.mp3',
    musicVolume: 50,
  },
  footer: { ...DEFAULT_FOOTER },
};

const DEFAULT_LETTER =
  'با سلام و احترام\nبا افتخار از شما دعوت می‌کنیم تا با حضور ارزشمند خود در {event}، میهمان غرفه {company} باشید.\n\nاین دیدار، فرصتی است برای گفت‌وگویی تازه، آشنایی با محصولات و دستاوردهای ما و گامی برای توسعه همکاری‌های ارزشمند آینده.';

/** Starting point for a brand-new invitation in the wizard. */
export function blankInvitation(): InvitationConfig {
  const c = structuredClone(DEFAULT_INVITATION);
  c.company = { name: '', tagline: '', logo: '', icon: '', shareImage: '' };
  c.event = { ...c.event, title: '', logo: '', location: '', mapUrl: '', booth: '', boothMapUrl: '', startDate: '', endDate: '', dateLabel: '' };
  c.texts.letter = DEFAULT_LETTER;
  return c;
}

/**
 * Example content for "fill with sample": real-looking texts, but none of the
 * sample company's brand assets or links, so they can't be published by mistake.
 */
export function sampleInvitation(keep: InvitationConfig): InvitationConfig {
  const c = structuredClone(DEFAULT_INVITATION);
  c.slug = keep.slug;
  c.company = { ...c.company, name: keep.company.name || 'نام شرکت شما', logo: keep.company.logo, icon: keep.company.icon, shareImage: keep.company.shareImage };
  c.event = { ...c.event, logo: keep.event.logo, boothMapUrl: keep.event.boothMapUrl };
  c.texts.letter = DEFAULT_LETTER;
  c.footer = keep.footer;
  return c;
}

/** Replace {company} / {event} placeholders in user-written text. */
export function fillPlaceholders(text: string, c: InvitationConfig): string {
  return text.replaceAll('{company}', c.company.name).replaceAll('{event}', c.event.title);
}

// ---------- validation / sanitising (shared by client and server) ----------

export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;
export const RESERVED_SLUGS = new Set(['api', 'uploads', 'assets', 'builder', 'admin', 'new', 'edit', 'static', 'i', 'in', 'login', 'src', 'node_modules']);
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

/** Normalise untrusted input into a valid InvitationConfig. */
export function sanitizeInvitation(input: any): InvitationConfig {
  const d = DEFAULT_INVITATION;
  const i = input ?? {};
  const fontOk = typeof i.theme?.font === 'string' && (i.theme.font === CUSTOM_FONT || FONTS.some(f => f.id === i.theme.font));
  const tz = typeof i.event?.timezone === 'string' && isValidTimezone(i.event.timezone) ? i.event.timezone : d.event.timezone;
  return {
    slug: typeof i.slug === 'string' ? i.slug.toLowerCase().trim() : '',
    company: {
      name: str(i.company?.name, '', LIMITS.short),
      tagline: str(i.company?.tagline, '', LIMITS.short),
      logo: safeAsset(i.company?.logo),
      icon: safeAsset(i.company?.icon),
      shareImage: safeAsset(i.company?.shareImage),
    },
    event: {
      badge: str(i.event?.badge, d.event.badge, LIMITS.short),
      title: str(i.event?.title, '', LIMITS.short),
      logo: safeAsset(i.event?.logo),
      welcomeText: str(i.event?.welcomeText, '', LIMITS.text),
      startDate: DATE_RE.test(i.event?.startDate) ? i.event.startDate : '',
      endDate: DATE_RE.test(i.event?.endDate) ? i.event.endDate : '',
      startTime: TIME_RE.test(i.event?.startTime) ? i.event.startTime : d.event.startTime,
      endTime: TIME_RE.test(i.event?.endTime) ? i.event.endTime : d.event.endTime,
      timezone: tz,
      dateLabel: str(i.event?.dateLabel, '', LIMITS.short),
      timeLabel: str(i.event?.timeLabel, '', LIMITS.short),
      location: str(i.event?.location, '', LIMITS.short),
      mapUrl: safeUrl(str(i.event?.mapUrl, '', LIMITS.url)),
      booth: str(i.event?.booth, '', LIMITS.short),
      boothMapUrl: safeUrl(str(i.event?.boothMapUrl, '', LIMITS.url)),
    },
    texts: {
      letter: str(i.texts?.letter, '', LIMITS.letter),
      enterButton: str(i.texts?.enterButton, d.texts.enterButton, LIMITS.button) || d.texts.enterButton,
      detailsButton: str(i.texts?.detailsButton, d.texts.detailsButton, LIMITS.button) || d.texts.detailsButton,
      mapButton: str(i.texts?.mapButton, d.texts.mapButton, LIMITS.button) || d.texts.mapButton,
      shareButton: str(i.texts?.shareButton, d.texts.shareButton, LIMITS.button) || d.texts.shareButton,
      shareText: str(i.texts?.shareText, '', LIMITS.shareText),
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
      url: safeUrl(str(i.footer?.url, '', LIMITS.url)),
    },
  };
}

export type IssueField = 'slug' | 'company.name' | 'event.title' | 'event.dates' | 'event.time' | 'event.location' | 'event.mapUrl' | 'event.boothMapUrl' | 'footer.url' | 'theme.font';

export interface Issue {
  field: IssueField;
  message: string;
}

/** Problems that block publishing (Persian messages, linked to the field they concern). */
export function validateForPublish(c: InvitationConfig): Issue[] {
  const issues: Issue[] = [];
  const add = (field: IssueField, message: string) => issues.push({ field, message });
  if (!SLUG_RE.test(c.slug)) add('slug', 'آدرس لینک باید ۳ تا ۴۰ حرف انگلیسی کوچک، عدد یا خط تیره باشد.');
  else if (RESERVED_SLUGS.has(c.slug)) add('slug', 'این آدرس رزرو شده است؛ آدرس دیگری انتخاب کنید.');
  if (!c.company.name.trim()) add('company.name', 'نام شرکت وارد نشده است.');
  if (!c.event.title.trim()) add('event.title', 'نام نمایشگاه وارد نشده است.');
  if (!c.event.startDate || !c.event.endDate) add('event.dates', 'تاریخ شروع و پایان نمایشگاه مشخص نشده است.');
  else if (c.event.endDate < c.event.startDate) add('event.dates', 'تاریخ پایان نباید قبل از تاریخ شروع باشد.');
  if (c.event.endTime <= c.event.startTime) add('event.time', 'ساعت پایان باید بعد از ساعت شروع باشد.');
  if (!c.event.location.trim()) add('event.location', 'محل برگزاری وارد نشده است.');
  if (c.event.mapUrl && !safeUrl(c.event.mapUrl)) add('event.mapUrl', 'لینک مسیریابی معتبر نیست.');
  if (c.event.boothMapUrl && !safeUrl(c.event.boothMapUrl)) add('event.boothMapUrl', 'لینک نقشه غرفه معتبر نیست.');
  if (c.footer.url && !safeUrl(c.footer.url)) add('footer.url', 'لینک امضای پایین صفحه معتبر نیست.');
  if (c.theme.font === CUSTOM_FONT && !c.theme.customFontUrl) add('theme.font', 'فایل فونت اختصاصی بارگذاری نشده است.');
  return issues;
}
