import { hasTimes, isShown, localize, TIMEZONES, type InvitationConfig, type Lang } from './invitation';

/** Offset (minutes) of `tz` from UTC at the given instant. */
function tzOffsetMinutes(utcMs: number, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(utcMs));
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'));
  return Math.round((asUtc - utcMs) / 60_000);
}

/** Wall-clock date+time in `tz` -> UTC epoch ms (handles DST). */
export function zonedToUtc(date: string, time: string, tz: string): number {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let utc = guess - tzOffsetMinutes(guess, tz) * 60_000;
  utc = guess - tzOffsetMinutes(utc, tz) * 60_000;
  return utc;
}

const stamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

export function utcStamp(date: string, time: string, tz: string): string {
  return stamp(zonedToUtc(date, time, tz));
}

/** Number of exhibition days (inclusive). */
export function dayCount(start: string, end: string): number {
  if (!start || !end) return 1;
  const ms = Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`);
  return Math.max(1, Math.round(ms / 86_400_000) + 1);
}

const faDigits = (n: number | string) => String(n).replace(/\d/g, x => '۰۱۲۳۴۵۶۷۸۹'[+x]);

function jalaliParts(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  const parts = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }).formatToParts(
    new Date(Date.UTC(y, m - 1, d, 12)),
  );
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

/** Persian label such as "ساعت ۹ الی ۱۷" (+ zone name when not Tehran). */
export function timeRangeLabel(start: string, end: string, tz = 'Asia/Tehran'): string {
  if (!start || !end) return '';
  const fmt = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return m ? `${faDigits(h)}:${faDigits(String(m).padStart(2, '0'))}` : faDigits(h);
  };
  const zone = tz !== 'Asia/Tehran' ? ` (به وقت ${TIMEZONES.find(z => z.id === tz)?.label ?? tz})` : '';
  return `ساعت ${fmt(start)} الی ${fmt(end)}${zone}`;
}

/** True once the last exhibition day has closed in the venue's time zone. */
export function eventEnded(c: InvitationConfig, now = Date.now()): boolean {
  if (!c.event.endDate) return false;
  return now > zonedToUtc(c.event.endDate, (useTimes(c) && c.event.endTime) || '23:59', c.event.timezone);
}

/** English label such as "23–25 September 2026". */
export function englishDateLabel(start: string, end: string): string {
  if (!start) return '';
  const fmt = (d: string, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...opts }).format(new Date(`${d}T12:00:00Z`));
  if (!end || end === start) return fmt(start, { day: 'numeric', month: 'long', year: 'numeric' });
  const [sy, sm] = start.split('-');
  const [ey, em] = end.split('-');
  if (sy !== ey) return `${fmt(start, { day: 'numeric', month: 'long', year: 'numeric' })} – ${fmt(end, { day: 'numeric', month: 'long', year: 'numeric' })}`;
  if (sm !== em) return `${fmt(start, { day: 'numeric', month: 'long' })} – ${fmt(end, { day: 'numeric', month: 'long', year: 'numeric' })}`;
  return `${fmt(start, { day: 'numeric' })}–${fmt(end, { day: 'numeric', month: 'long', year: 'numeric' })}`;
}

/** English label such as "9:00 – 17:00 (Tehran time)". */
export function englishTimeLabel(start: string, end: string, tz = 'Asia/Tehran'): string {
  if (!start || !end) return '';
  const city = tz.split('/').pop()!.replace(/_/g, ' ');
  const t = (x: string) => x.replace(/^0(\d)/, '$1');
  return `${t(start)} – ${t(end)} (${city} time)`;
}

/** Labels for the given language (English ones are generated when not overridden). */
export function dateText(c: InvitationConfig, lang: Lang): string {
  if (lang === 'en' && c.en.enabled) return c.en.dateLabel || englishDateLabel(c.event.startDate, c.event.endDate);
  return c.event.dateLabel || jalaliRangeLabel(c.event.startDate, c.event.endDate);
}
export function timeText(c: InvitationConfig, lang: Lang): string {
  if (lang === 'en' && c.en.enabled) return c.en.timeLabel || englishTimeLabel(c.event.startTime, c.event.endTime, c.event.timezone);
  return c.event.timeLabel || timeRangeLabel(c.event.startTime, c.event.endTime, c.event.timezone);
}

function eventDetailsText(c: InvitationConfig, lang: Lang): string {
  const l = localize(c, lang);
  const en = lang === 'en' && c.en.enabled;
  const lines = [en ? `We look forward to welcoming you at the ${l.company.name} booth.` : `با افتخار منتظر حضور گرم شما در غرفه شرکت ${l.company.name} هستیم.`, ''];
  if (isShown(c, 'location')) lines.push(`${en ? 'Venue' : 'مکان'}: ${l.event.location}`);
  if (l.event.booth && isShown(c, 'booth')) lines.push(l.event.booth);
  const time = timeText(c, lang);
  if (time && isShown(c, 'time')) lines.push(time);
  return lines.join('\n');
}

const summary = (c: InvitationConfig, lang: Lang) => {
  const l = localize(c, lang);
  return lang === 'en' && c.en.enabled ? `Visit ${l.company.name} – ${l.event.title}` : `بازدید از غرفه ${l.company.name} - ${l.event.title}`;
};

/** Calendar entries use the daily opening hours when known; otherwise an all-day event. */
const useTimes = (c: InvitationConfig) => hasTimes(c) && isShown(c, 'time');

const compactDate = (d: string) => d.replace(/-/g, '');
function nextDay(d: string) {
  const t = new Date(`${d}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + 1);
  return t.toISOString().slice(0, 10);
}

/** First day's opening hours; multi-day exhibitions repeat daily (not one 56-hour block). */
function firstDay(c: InvitationConfig) {
  const e = c.event;
  return { start: utcStamp(e.startDate, e.startTime, e.timezone), end: utcStamp(e.startDate, e.endTime, e.timezone), days: dayCount(e.startDate, e.endDate) };
}

export function googleCalendarUrl(c: InvitationConfig, lang: Lang = 'fa'): string {
  const loc = isShown(c, 'location') ? localize(c, lang).event.location : '';
  const params = new URLSearchParams({ action: 'TEMPLATE', text: summary(c, lang), details: eventDetailsText(c, lang), location: loc, ctz: c.event.timezone });
  if (useTimes(c)) {
    const { start, end, days } = firstDay(c);
    params.set('dates', `${start}/${end}`);
    if (days > 1) params.set('recur', `RRULE:FREQ=DAILY;COUNT=${days}`);
  } else {
    params.set('dates', `${compactDate(c.event.startDate)}/${compactDate(nextDay(c.event.endDate))}`);
  }
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

export function icsContent(c: InvitationConfig, lang: Lang = 'fa'): string {
  let timing: string[];
  if (useTimes(c)) {
    const { start, end, days } = firstDay(c);
    timing = [`DTSTART:${start}`, `DTEND:${end}`, ...(days > 1 ? [`RRULE:FREQ=DAILY;COUNT=${days}`] : [])];
  } else {
    timing = [`DTSTART;VALUE=DATE:${compactDate(c.event.startDate)}`, `DTEND;VALUE=DATE:${compactDate(nextDay(c.event.endDate))}`];
  }
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AsvaStudio//ExpoInvite//FA',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${c.slug || 'invite'}-${c.event.startDate}@expo-invite`,
    `DTSTAMP:${stamp(Date.now())}`,
    ...timing,
    `SUMMARY:${icsEscape(summary(c, lang))}`,
    `DESCRIPTION:${icsEscape(eventDetailsText(c, lang))}`,
    `LOCATION:${icsEscape(isShown(c, 'location') ? localize(c, lang).event.location : '')}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${icsEscape(summary(c, lang))}`,
    'TRIGGER:-PT1H',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}
