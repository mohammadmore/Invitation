import type { InvitationConfig } from './invitation';

// Iran has had no daylight saving since 2022, so Tehran is a fixed UTC+03:30.
const TEHRAN_OFFSET_MIN = 210;

/** "2026-09-23" + "09:00" (Tehran) -> "20260923T053000Z" */
export function tehranToUtcStamp(date: string, time: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d, hh, mm) - TEHRAN_OFFSET_MIN * 60_000);
  return utc.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

const faDigits = (n: number | string) => String(n).replace(/\d/g, x => '۰۱۲۳۴۵۶۷۸۹'[+x]);

function jalaliParts(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  const parts = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).formatToParts(new Date(Date.UTC(y, m - 1, d, 12)));
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '';
  return { day: get('day'), month: get('month'), year: get('year').replace(/\s*ه\.ش\.?/, '') };
}

/** Persian label such as "۱ تا ۳ مهر ماه ۱۴۰۵". */
export function jalaliRangeLabel(start: string, end: string): string {
  if (!start) return '';
  const s = jalaliParts(start);
  if (!end || end === start) return `${s.day} ${s.month} ماه ${s.year}`;
  const e = jalaliParts(end);
  if (s.year !== e.year) return `${s.day} ${s.month} ${s.year} تا ${e.day} ${e.month} ${e.year}`;
  if (s.month !== e.month) return `${s.day} ${s.month} تا ${e.day} ${e.month} ${s.year}`;
  return `${s.day} تا ${e.day} ${s.month} ماه ${s.year}`;
}

/** Persian label such as "ساعت ۹ الی ۱۷". */
export function timeRangeLabel(start: string, end: string): string {
  const fmt = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return m ? `${faDigits(h)}:${faDigits(String(m).padStart(2, '0'))}` : faDigits(h);
  };
  return `ساعت ${fmt(start)} الی ${fmt(end)}`;
}

function eventDetailsText(c: InvitationConfig): string {
  return [`با افتخار منتظر حضور گرم شما در غرفه شرکت ${c.company.name} هستیم.`, '', `مکان: ${c.event.location}`, c.event.booth]
    .filter((l, i) => l || i === 1)
    .join('\n');
}

const summary = (c: InvitationConfig) => `بازدید از غرفه ${c.company.name} - ${c.event.title}`;

export function googleCalendarUrl(c: InvitationConfig): string {
  const dates = `${tehranToUtcStamp(c.event.startDate, c.event.startTime)}/${tehranToUtcStamp(c.event.endDate, c.event.endTime)}`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: summary(c),
    dates,
    details: eventDetailsText(c),
    location: c.event.location,
    ctz: 'Asia/Tehran',
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

const icsEscape = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** RFC 5545 line folding: max 75 octets per line, never splitting a UTF-8 character. */
function fold(line: string): string {
  const enc = new TextEncoder();
  const out: string[] = [];
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (bytes + b > (out.length ? 74 : 75)) {
      out.push(cur);
      cur = '';
      bytes = 0;
    }
    cur += ch;
    bytes += b;
  }
  out.push(cur);
  return out.join('\r\n ');
}

export function icsContent(c: InvitationConfig): string {
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ExpoInvite//Invite//FA',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${c.slug || 'invite'}-${c.event.startDate}@expo-invite`,
    `DTSTAMP:${now}`,
    `DTSTART:${tehranToUtcStamp(c.event.startDate, c.event.startTime)}`,
    `DTEND:${tehranToUtcStamp(c.event.endDate, c.event.endTime)}`,
    `SUMMARY:${icsEscape(summary(c))}`,
    `DESCRIPTION:${icsEscape(eventDetailsText(c))}`,
    `LOCATION:${icsEscape(c.event.location)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}
