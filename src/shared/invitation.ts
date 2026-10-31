// Shared invitation model: used by the wizard, the invitation viewer and the server.

export interface InvitationConfig {
  /** Public link id: /i/<slug> */
  slug: string;
  company: {
    name: string;
    tagline: string;
    /** Wide logo shown on the welcome screen */
    logo: string;
    /** Square/icon logo shown on the invitation card */
    icon: string;
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
    /** HH:MM, Tehran local time */
    startTime: string;
    endTime: string;
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
    /** URL of an uploaded font file, used when font === CUSTOM_FONT */
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
  { name: 'زرشکی و طلایی', primary: '#7A1F3D', accent: '#D4A24C', background: '#1a0f14' },
  { name: 'بنفش', primary: '#4C1D95', accent: '#A78BFA', background: '#120d1f' },
  { name: 'فیروزه‌ای', primary: '#0F766E', accent: '#2DD4BF', background: '#071a19' },
  { name: 'نارنجی', primary: '#9A3412', accent: '#FB923C', background: '#1a110b' },
  { name: 'ذغالی', primary: '#1E293B', accent: '#94A3B8', background: '#020617' },
];

export const PRESET_VIDEOS = [
  { id: 'waves', label: 'امواج آبی', url: '/bg.mp4', poster: '/bg-poster.jpg' },
];

export const PRESET_MUSIC = [
  { id: 'calm', label: 'آرام', url: '/background-music.mp3' },
  { id: 'corporate', label: 'رسمی', url: '/bg-music.mp3' },
];

export const DEFAULT_INVITATION: InvitationConfig = {
  slug: '',
  company: {
    name: 'بهان سار',
    tagline: 'همراه شما در مسیر سلامت و نوآوری',
    logo: '/Logo.png',
    icon: '/Logo2.png',
  },
  event: {
    badge: 'دعوتنامه رسمی',
    title: 'نمایشگاه ایران فارما',
    logo: '/iranpharma.svg',
    welcomeText: 'مفتخریم میزبان شما در این رویداد بزرگ باشیم',
    startDate: '2026-09-23',
    endDate: '2026-09-25',
    startTime: '09:00',
    endTime: '17:00',
    dateLabel: '۱ تا ۳ مهر ماه ۱۴۰۵',
    timeLabel: 'ساعت ۹ الی ۱۷',
    location: 'مصلی تهران',
    mapUrl: 'https://maps.google.com/?q=مصلی+تهران',
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
    video: '/bg.mp4',
    videoPoster: '/bg-poster.jpg',
    videoOpacity: 75,
    music: '/background-music.mp3',
    musicVolume: 50,
  },
  footer: {
    show: true,
    text: 'Powered by Asva Studio',
    subText: 'توسعه یافته توسط شرکت داده‌پردازان اسوا',
    url: 'https://instagram.com/asvastudio',
  },
};

/** Starting point for a brand-new invitation in the wizard. */
export function blankInvitation(): InvitationConfig {
  const c = structuredClone(DEFAULT_INVITATION);
  c.company = { name: '', tagline: '', logo: '', icon: '' };
  c.event = {
    ...c.event,
    title: '',
    logo: '',
    location: '',
    mapUrl: '',
    booth: '',
    boothMapUrl: '',
    startDate: '',
    endDate: '',
    dateLabel: '',
  };
  c.texts.letter =
    'با سلام و احترام\nبا افتخار از شما دعوت می‌کنیم تا با حضور ارزشمند خود در {event}، میهمان غرفه {company} باشید.\n\nاین دیدار، فرصتی است برای گفت‌وگویی تازه، آشنایی با محصولات و دستاوردهای ما و گامی برای توسعه همکاری‌های ارزشمند آینده.';
  return c;
}

/** Replace {company} / {event} placeholders in user-written text. */
export function fillPlaceholders(text: string, c: InvitationConfig): string {
  return text.replaceAll('{company}', c.company.name).replaceAll('{event}', c.event.title);
}

// ---------- validation / sanitising (shared by client and server) ----------

export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
/** Local asset paths we serve ourselves: /uploads/<file> or a top-level /public preset. */
const LOCAL_ASSET_RE = /^\/(?:uploads\/)?[A-Za-z0-9._-]+$/;

/** Accept only http(s) URLs or our own asset paths; everything else (javascript:, data:, …) becomes ''. */
export function safeUrl(url: unknown): string {
  if (typeof url !== 'string') return '';
  const u = url.trim();
  if (!u) return '';
  if (LOCAL_ASSET_RE.test(u)) return u;
  try {
    const parsed = new URL(u);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.href;
  } catch {
    /* invalid */
  }
  return '';
}

/** Only our own uploaded/preset files may be used as media (no hot-linking arbitrary hosts into CSS). */
export function safeAssetUrl(url: unknown): string {
  return typeof url === 'string' && LOCAL_ASSET_RE.test(url.trim()) ? url.trim() : '';
}

function str(v: unknown, fallback: string, max = 300): string {
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
  return {
    slug: typeof i.slug === 'string' ? i.slug.toLowerCase().trim() : '',
    company: {
      name: str(i.company?.name, ''),
      tagline: str(i.company?.tagline, ''),
      logo: safeAssetUrl(i.company?.logo),
      icon: safeAssetUrl(i.company?.icon),
    },
    event: {
      badge: str(i.event?.badge, d.event.badge),
      title: str(i.event?.title, ''),
      logo: safeAssetUrl(i.event?.logo),
      welcomeText: str(i.event?.welcomeText, ''),
      startDate: DATE_RE.test(i.event?.startDate) ? i.event.startDate : '',
      endDate: DATE_RE.test(i.event?.endDate) ? i.event.endDate : '',
      startTime: TIME_RE.test(i.event?.startTime) ? i.event.startTime : d.event.startTime,
      endTime: TIME_RE.test(i.event?.endTime) ? i.event.endTime : d.event.endTime,
      dateLabel: str(i.event?.dateLabel, ''),
      timeLabel: str(i.event?.timeLabel, ''),
      location: str(i.event?.location, ''),
      mapUrl: safeUrl(i.event?.mapUrl),
      booth: str(i.event?.booth, ''),
      boothMapUrl: safeUrl(i.event?.boothMapUrl),
    },
    texts: {
      letter: str(i.texts?.letter, '', 3000),
      enterButton: str(i.texts?.enterButton, d.texts.enterButton, 60),
      detailsButton: str(i.texts?.detailsButton, d.texts.detailsButton, 60),
      mapButton: str(i.texts?.mapButton, d.texts.mapButton, 60),
      shareButton: str(i.texts?.shareButton, d.texts.shareButton, 60),
      shareText: str(i.texts?.shareText, '', 500),
    },
    theme: {
      primary: color(i.theme?.primary, d.theme.primary),
      accent: color(i.theme?.accent, d.theme.accent),
      background: color(i.theme?.background, d.theme.background),
      font: fontOk ? i.theme.font : d.theme.font,
      customFontUrl: safeAssetUrl(i.theme?.customFontUrl),
    },
    media: {
      video: safeAssetUrl(i.media?.video),
      videoPoster: safeAssetUrl(i.media?.videoPoster),
      videoOpacity: num(i.media?.videoOpacity, d.media.videoOpacity, 0, 100),
      music: safeAssetUrl(i.media?.music),
      musicVolume: num(i.media?.musicVolume, d.media.musicVolume, 0, 100),
    },
    footer: {
      show: i.footer?.show !== false,
      text: str(i.footer?.text, ''),
      subText: str(i.footer?.subText, ''),
      url: safeUrl(i.footer?.url),
    },
  };
}

/** Human-readable problems that block publishing, in Persian. */
export function validateForPublish(c: InvitationConfig): string[] {
  const errors: string[] = [];
  if (!SLUG_RE.test(c.slug)) errors.push('آدرس لینک باید ۳ تا ۴۰ حرف انگلیسی کوچک، عدد یا خط تیره باشد.');
  if (!c.company.name.trim()) errors.push('نام شرکت وارد نشده است.');
  if (!c.event.title.trim()) errors.push('نام نمایشگاه وارد نشده است.');
  if (!c.event.startDate || !c.event.endDate) errors.push('تاریخ شروع و پایان نمایشگاه مشخص نشده است.');
  else if (c.event.endDate < c.event.startDate) errors.push('تاریخ پایان نباید قبل از تاریخ شروع باشد.');
  if (!c.event.location.trim()) errors.push('محل برگزاری وارد نشده است.');
  return errors;
}
