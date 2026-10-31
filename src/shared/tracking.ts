// Multi-link tracking: sales reps, tracked links (rep × channel), and the options that
// control them. Everything is optional – with `enabled: false` an invitation is a single
// link exactly as before.
//
// Tracking data is "live" (stored on the invitation record, not in the draft): adding a link
// or changing a rep's phone number takes effect immediately, without re-publishing.

import { normalizePhone, safeAsset, type ContactInfo } from './invitation';

export interface Rep {
  id: string;
  name: string;
  title: string;
  photo: string;
  phone: string;
  whatsapp: string;
  email: string;
  /** Read-only token for the rep's own report page (only used when repDashboards is on) */
  reportToken: string;
}

export const CHANNELS = [
  { id: 'sms', label: 'پیامک' },
  { id: 'whatsapp', label: 'واتس‌اپ' },
  { id: 'telegram', label: 'تلگرام' },
  { id: 'instagram', label: 'اینستاگرام' },
  { id: 'linkedin', label: 'لینکدین' },
  { id: 'email', label: 'ایمیل' },
  { id: 'print', label: 'چاپی / QR' },
  { id: 'website', label: 'وب‌سایت' },
  { id: 'other', label: 'سایر' },
] as const;
export type ChannelId = (typeof CHANNELS)[number]['id'];
export const channelLabel = (id: string) => CHANNELS.find(c => c.id === id)?.label ?? id;

export interface TrackedLink {
  /** Path segment: <base>/<slug>/<code> */
  code: string;
  label: string;
  channel: ChannelId;
  /** '' = company link (no rep) */
  repId: string;
  active: boolean;
  createdAt: string;
}

export interface TrackingSettings {
  /** Master switch: several links + per-link analytics. Off = single invitation link. */
  enabled: boolean;
  /** Show a "your sales rep" card on rep links */
  repCard: boolean;
  /** Also show the company's own contact details under the rep card */
  showCompanyContact: boolean;
  /** Who gets credit for an RSVP when a guest came through several links */
  attribution: 'first' | 'last';
  /** Count visits from links shared by guests separately ("referral") */
  referral: boolean;
  /** Record utm_source / utm_campaign added by SMS panels or ad tools */
  utm: boolean;
  /** Each rep gets a read-only report of their own links and RSVPs */
  repDashboards: boolean;
}

export interface Tracking {
  settings: TrackingSettings;
  reps: Rep[];
  links: TrackedLink[];
}

export const DEFAULT_TRACKING_SETTINGS: TrackingSettings = {
  enabled: false,
  repCard: true,
  showCompanyContact: true,
  attribution: 'first',
  referral: true,
  utm: true,
  repDashboards: false,
};

export const emptyTracking = (): Tracking => ({ settings: { ...DEFAULT_TRACKING_SETTINGS }, reps: [], links: [] });

/** What a guest's browser receives about the link it was opened with. */
export interface PublicLinkInfo {
  code: string;
  channel: ChannelId;
  rep: Omit<Rep, 'reportToken'> | null;
}

/** Tracking options the guest page needs (never reps' tokens or the full link list). */
export interface PublicTracking {
  enabled: boolean;
  repCard: boolean;
  showCompanyContact: boolean;
  attribution: 'first' | 'last';
  referral: boolean;
  utm: boolean;
}

export const CODE_RE = /^[a-z0-9](?:[a-z0-9-]{0,22}[a-z0-9])?$/;
const CODE_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'; // no look-alikes (0/o, 1/l/i)

/** Short random code that isn't guessable (unlike /1, /2, …). */
export function randomCode(taken: Set<string>, length = 4): string {
  for (let tries = 0; tries < 1000; tries++) {
    const len = length + Math.floor(tries / 200);
    let c = '';
    const bytes = new Uint32Array(len);
    crypto.getRandomValues(bytes);
    for (const b of bytes) c += CODE_ALPHABET[b % CODE_ALPHABET.length];
    if (!taken.has(c)) return c;
  }
  throw new Error('could not generate a unique code');
}

export const randomToken = () => {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
};

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);

/** Normalise untrusted tracking data. Invalid links/reps are dropped, codes de-duplicated. */
export function sanitizeTracking(input: any): Tracking {
  const s = input?.settings ?? {};
  const d = DEFAULT_TRACKING_SETTINGS;
  const settings: TrackingSettings = {
    enabled: bool(s.enabled, d.enabled),
    repCard: bool(s.repCard, d.repCard),
    showCompanyContact: bool(s.showCompanyContact, d.showCompanyContact),
    attribution: s.attribution === 'last' ? 'last' : 'first',
    referral: bool(s.referral, d.referral),
    utm: bool(s.utm, d.utm),
    repDashboards: bool(s.repDashboards, d.repDashboards),
  };
  const reps: Rep[] = [];
  const repIds = new Set<string>();
  for (const r of Array.isArray(input?.reps) ? input.reps.slice(0, 200) : []) {
    const id = str(r?.id, 24);
    if (!/^[a-z0-9]{4,24}$/.test(id) || repIds.has(id)) continue;
    repIds.add(id);
    reps.push({
      id,
      name: str(r.name, 120),
      title: str(r.title, 120),
      photo: safeAsset(r.photo),
      phone: str(r.phone, 40),
      whatsapp: str(r.whatsapp, 40),
      email: str(r.email, 120),
      reportToken: /^[a-f0-9]{24,64}$/.test(r.reportToken) ? r.reportToken : randomToken(),
    });
  }
  const links: TrackedLink[] = [];
  const codes = new Set<string>();
  const channelIds = new Set<string>(CHANNELS.map(c => c.id));
  for (const l of Array.isArray(input?.links) ? input.links.slice(0, 2000) : []) {
    const code = str(l?.code, 24).toLowerCase();
    if (!CODE_RE.test(code) || codes.has(code)) continue;
    codes.add(code);
    links.push({
      code,
      label: str(l.label, 120),
      channel: (channelIds.has(l.channel) ? l.channel : 'other') as ChannelId,
      repId: repIds.has(l.repId) ? l.repId : '',
      active: l.active !== false,
      createdAt: typeof l.createdAt === 'string' ? l.createdAt.slice(0, 40) : new Date().toISOString(),
    });
  }
  return { settings, reps, links };
}

export const publicTracking = (t: Tracking): PublicTracking => ({
  enabled: t.settings.enabled,
  repCard: t.settings.repCard,
  showCompanyContact: t.settings.showCompanyContact,
  attribution: t.settings.attribution,
  referral: t.settings.referral,
  utm: t.settings.utm,
});

/** Resolve a link code for guests; inactive/unknown codes fall back to the main invitation (null). */
export function publicLink(t: Tracking, code: string): PublicLinkInfo | null {
  if (!t.settings.enabled || !code) return null;
  const link = t.links.find(l => l.code === code && l.active);
  if (!link) return null;
  const rep = link.repId ? t.reps.find(r => r.id === link.repId) : undefined;
  const { reportToken: _ignored, ...pub } = rep ?? ({} as Rep);
  return { code: link.code, channel: link.channel, rep: rep ? pub : null };
}

/** Rep details as contact info (missing fields fall back to the company's). */
export function repContact(rep: Pick<Rep, 'phone' | 'whatsapp' | 'email'>, company: ContactInfo): ContactInfo {
  return {
    ...company,
    phone: rep.phone || company.phone,
    whatsapp: rep.whatsapp || company.whatsapp,
    email: rep.email || company.email,
  };
}

export const hasRepPhone = (rep: Pick<Rep, 'phone' | 'whatsapp'>) => !!(normalizePhone(rep.phone) || normalizePhone(rep.whatsapp, true));

/**
 * Stats key for a visit: the link code, '_' for the plain invitation link, plus '+ref'
 * when the visit came from a link a guest shared.
 */
export const statKey = (code: string, referral: boolean) => `${code || '_'}${referral ? '+ref' : ''}`;
