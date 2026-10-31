// Booth check-in: each attendance confirmation gets a personal ticket (QR); booth staff scan it
// with the check-in page, which records the actual visit — the real measure of success.

export interface CheckinSettings {
  /** Issue tickets on RSVP and allow booth check-in */
  enabled: boolean;
  /** Secret for the staff check-in page (shareable with booth staff; can be renewed) */
  staffToken: string;
  /** SMS the guest a link to their ticket after RSVP (if they gave a mobile number) */
  smsTicket: boolean;
  smsTicketTemplate: string;
  /** SMS the guest's rep when the guest arrives at the booth */
  notifyRep: boolean;
  /** Also SMS the fixed numbers of the RSVP notifications on arrival */
  notifyExtra: boolean;
  arrivalTemplate: string;
}

export const DEFAULT_TICKET_TEMPLATE = '{guest} عزیز، حضور شما در غرفه {company} ({event}) ثبت شد. بلیت ورود شما:\n{link}';
export const DEFAULT_ARRIVAL_TEMPLATE = 'مهمان شما در غرفه است: {guest}{org}\n{count} نفر — {time}\nتلفن: {phone}';

export const DEFAULT_CHECKIN: Omit<CheckinSettings, 'staffToken'> = {
  enabled: false,
  smsTicket: false,
  smsTicketTemplate: DEFAULT_TICKET_TEMPLATE,
  notifyRep: true,
  notifyExtra: false,
  arrivalTemplate: DEFAULT_ARRIVAL_TEMPLATE,
};

export function sanitizeCheckin(i: any, newToken: () => string): CheckinSettings {
  const str = (v: unknown, max: number, fallback: string) => (typeof v === 'string' && v.trim() ? v.slice(0, max) : fallback);
  return {
    enabled: i?.enabled === true,
    staffToken: typeof i?.staffToken === 'string' && /^[A-Za-z0-9_-]{16,64}$/.test(i.staffToken) ? i.staffToken : newToken(),
    smsTicket: i?.smsTicket === true,
    smsTicketTemplate: str(i?.smsTicketTemplate, 400, DEFAULT_TICKET_TEMPLATE),
    notifyRep: i?.notifyRep !== false,
    notifyExtra: i?.notifyExtra === true,
    arrivalTemplate: str(i?.arrivalTemplate, 400, DEFAULT_ARRIVAL_TEMPLATE),
  };
}

const TICKET_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no look-alikes; easy to read out loud
export const TICKET_RE = /^[A-HJ-NP-Z2-9]{8}$/;

export function newTicketCode(taken: Set<string>): string {
  for (;;) {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    const code = Array.from(bytes, b => TICKET_ALPHABET[b % TICKET_ALPHABET.length]).join('');
    if (!taken.has(code)) return code;
  }
}

/** Pull a ticket code out of whatever the scanner read: a ticket URL (…/t/CODE) or the bare code. */
export function ticketFromScan(text: string): string {
  const t = text.trim();
  const m = t.match(/\/t\/([A-Za-z0-9]{8})(?:[/?#]|$)/);
  const code = (m ? m[1] : t).toUpperCase().replace(/[^A-Z0-9]/g, '');
  return TICKET_RE.test(code) ? code : '';
}

/** Public ticket details (shown on the guest's ticket page). */
export interface TicketInfo {
  code: string;
  name: string;
  org: string;
  day: string;
  count: number;
  checkedInAt: string;
  company: string;
  event: string;
  location: string;
  booth: string;
  dateLabel: string;
  theme: { primary: string; accent: string; background: string };
  logo: string;
}

/** Guest as the booth staff see it. */
export interface CheckinGuest {
  id: string;
  name: string;
  org: string;
  phone: string;
  day: string;
  count: number;
  ticket: string;
  repName: string;
  channel: string;
  walkIn: boolean;
  checkedInAt: string;
  checkedInBy: string;
  visits: number;
}

export type ScanStatus = 'ok' | 'already' | 'notfound';
