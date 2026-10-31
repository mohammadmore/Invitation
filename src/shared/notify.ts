// SMS notifications: system-wide panel settings (admin "Settings" page, stored on the server)
// and per-invitation rules (who gets an SMS when a guest confirms attendance).

export type SmsProviderId = 'none' | 'kavenegar' | 'smsir' | 'melipayamak' | 'ippanel' | 'custom';

export const SMS_PROVIDERS: { id: SmsProviderId; label: string; fields: ('apiKey' | 'username' | 'password' | 'sender')[]; help: string }[] = [
  { id: 'none', label: 'غیرفعال', fields: [], help: '' },
  { id: 'kavenegar', label: 'کاوه‌نگار', fields: ['apiKey', 'sender'], help: 'API Key از پنل کاوه‌نگار، بخش تنظیمات حساب. شماره فرستنده: خط اختصاصی یا عمومی شما.' },
  { id: 'smsir', label: 'SMS.ir', fields: ['apiKey', 'sender'], help: 'کلید API از پنل sms.ir (بخش برنامه‌نویسان). شماره فرستنده: شماره خط.' },
  { id: 'melipayamak', label: 'ملی‌پیامک (پیامک‌پنل)', fields: ['username', 'password', 'sender'], help: 'نام کاربری و رمز وب‌سرویس (یا API Key به‌عنوان رمز) و شماره خط.' },
  { id: 'ippanel', label: 'IPPanel / فراز اس‌ام‌اس', fields: ['apiKey', 'sender'], help: 'کلید دسترسی (Access Key) از پنل و شماره خط فرستنده.' },
  { id: 'custom', label: 'پنل دلخواه (HTTP)', fields: [], help: 'برای هر پنل دیگری: آدرس و قالب درخواست وب‌سرویس آن را وارد کنید.' },
];

/** System-wide SMS panel settings (secrets never leave the server unmasked). */
export interface SmsSettings {
  provider: SmsProviderId;
  apiKey: string;
  username: string;
  password: string;
  sender: string;
  /** How recipients are written for the panel: 09121234567 or 989121234567 */
  numberFormat: 'local' | 'intl';
  /** Safety cap: max SMS per day across all invitations (protects the panel's credit) */
  dailyLimit: number;
  custom: {
    method: 'GET' | 'POST';
    /** URL; may contain {to}, {message}, {sender} (URL-encoded automatically) */
    url: string;
    /** One "Name: value" per line */
    headers: string;
    bodyType: 'json' | 'form';
    /** Body template with {to}, {message}, {sender} (JSON-escaped for json bodies) */
    body: string;
    /** Optional: the response must contain this text to count as sent */
    successText: string;
    /** Send one request per recipient (if the panel accepts only one number) */
    perRecipient: boolean;
  };
}

export const DEFAULT_SMS_SETTINGS: SmsSettings = {
  provider: 'none',
  apiKey: '',
  username: '',
  password: '',
  sender: '',
  numberFormat: 'local',
  dailyLimit: 300,
  custom: {
    method: 'POST',
    url: '',
    headers: 'Content-Type: application/json',
    bodyType: 'json',
    body: '{"to": "{to}", "from": "{sender}", "text": "{message}"}',
    successText: '',
    perRecipient: true,
  },
};

export const SECRET_MASK = '••••••';

/** Per-invitation notification rules (live, like links & reps). */
export interface NotifySettings {
  enabled: boolean;
  /** Text the rep the guest is credited to (multi-link mode, rep has a mobile number) */
  toRep: boolean;
  /** Also text these numbers on every confirmation (e.g. sales manager), one per line / comma */
  extraNumbers: string;
  template: string;
}

export const DEFAULT_NOTIFY_TEMPLATE = 'اعلام حضور جدید — {event}\n{guest}{org}\nتلفن: {phone}\nروز: {day} · {count} نفر\nلینک: {source}';

export const DEFAULT_NOTIFY: NotifySettings = { enabled: false, toRep: true, extraNumbers: '', template: DEFAULT_NOTIFY_TEMPLATE };

export const NOTIFY_PLACEHOLDERS: [string, string][] = [
  ['{guest}', 'نام مهمان'],
  ['{org}', 'شرکت مهمان'],
  ['{phone}', 'تلفن مهمان'],
  ['{day}', 'روز حضور'],
  ['{count}', 'تعداد نفرات'],
  ['{event}', 'نام نمایشگاه'],
  ['{company}', 'نام شرکت'],
  ['{rep}', 'کارشناس'],
  ['{source}', 'کانال / لینک'],
];

export interface NotifyLogEntry {
  id: string;
  at: string;
  to: string[];
  message: string;
  status: 'pending' | 'sent' | 'failed' | 'skipped';
  attempts: number;
  detail: string;
}

const str = (v: unknown, max: number, fallback = '') => (typeof v === 'string' ? v.slice(0, max) : fallback);

export function sanitizeNotify(i: any): NotifySettings {
  return {
    enabled: i?.enabled === true,
    toRep: i?.toRep !== false,
    extraNumbers: str(i?.extraNumbers, 500),
    template: str(i?.template, 600, DEFAULT_NOTIFY_TEMPLATE) || DEFAULT_NOTIFY_TEMPLATE,
  };
}

export function sanitizeSmsSettings(i: any, previous: SmsSettings = DEFAULT_SMS_SETTINGS): SmsSettings {
  const d = DEFAULT_SMS_SETTINGS;
  const provider = SMS_PROVIDERS.some(p => p.id === i?.provider) ? (i.provider as SmsProviderId) : d.provider;
  // Masked/empty secrets mean "keep the stored value".
  const secret = (v: unknown, prev: string) => (typeof v !== 'string' || v === '' || v.includes(SECRET_MASK) ? prev : v.slice(0, 500));
  const c = i?.custom ?? {};
  return {
    provider,
    apiKey: secret(i?.apiKey, previous.apiKey),
    username: str(i?.username, 200),
    password: secret(i?.password, previous.password),
    sender: str(i?.sender, 40),
    numberFormat: i?.numberFormat === 'intl' ? 'intl' : 'local',
    dailyLimit: Math.min(100_000, Math.max(1, Math.round(Number(i?.dailyLimit) || d.dailyLimit))),
    custom: {
      method: c.method === 'GET' ? 'GET' : 'POST',
      url: str(c.url, 1000),
      headers: secret(c.headers, previous.custom.headers),
      bodyType: c.bodyType === 'form' ? 'form' : 'json',
      body: str(c.body, 4000),
      successText: str(c.successText, 200),
      perRecipient: c.perRecipient !== false,
    },
  };
}

/** Settings as shown in the admin UI: secrets masked. */
export function maskSmsSettings(s: SmsSettings): SmsSettings {
  const mask = (v: string) => (v ? `${SECRET_MASK}${v.slice(-4)}` : '');
  return { ...s, apiKey: mask(s.apiKey), password: mask(s.password), custom: { ...s.custom, headers: s.custom.headers ? `${SECRET_MASK} (ذخیره‌شده)` : '' } };
}

const toLatin = (s: string) => s.replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

/** Iranian mobile in the panel's format, or '' if the number isn't a mobile number. */
export function formatMobile(raw: string, format: 'local' | 'intl'): string {
  let d = toLatin(raw).replace(/[^\d]/g, '');
  if (d.startsWith('0098')) d = d.slice(4);
  else if (d.startsWith('98')) d = d.slice(2);
  else if (d.startsWith('0')) d = d.slice(1);
  if (!/^9\d{9}$/.test(d)) return '';
  return format === 'intl' ? `98${d}` : `0${d}`;
}

export function parseNumbers(text: string, format: 'local' | 'intl'): string[] {
  return [...new Set(text.split(/[\s,،;]+/).map(n => formatMobile(n, format)).filter(Boolean))];
}

export const renderTemplate = (template: string, vars: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m)).replace(/\n{3,}/g, '\n\n').trim();
