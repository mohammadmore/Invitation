// Sending SMS through the panel configured on the Settings page. No credentials or
// provider details are hard-coded: presets only describe each panel's public web API, and
// "custom" lets the admin describe any other panel's HTTP API.

import type { SmsSettings } from '../src/shared/notify';

export interface SmsResult {
  ok: boolean;
  status: number;
  detail: string;
}

const TIMEOUT_MS = 15_000;

async function http(url: string, init: RequestInit): Promise<{ status: number; text: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    return { status: res.status, text: (await res.text()).slice(0, 2000) };
  } finally {
    clearTimeout(timer);
  }
}

const form = (o: Record<string, string>) => new URLSearchParams(o).toString();
const json = (text: string) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};
const short = (t: string) => t.replace(/\s+/g, ' ').slice(0, 300);

function parseHeaders(text: string): Record<string, string> {
  const h: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const i = line.indexOf(':');
    if (i > 0) h[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return h;
}

/** Fill {to} {message} {sender} in a template, escaping for the target (url / json / raw). */
function fill(template: string, vars: Record<string, string>, escape: 'url' | 'json' | 'raw') {
  return template.replace(/\{(to|message|sender)\}/g, (_, k) => {
    const v = vars[k] ?? '';
    if (escape === 'url') return encodeURIComponent(v);
    if (escape === 'json') return JSON.stringify(v).slice(1, -1);
    return v;
  });
}

async function sendCustom(s: SmsSettings, to: string[], message: string): Promise<SmsResult> {
  const c = s.custom;
  if (!/^https?:\/\//i.test(c.url)) return { ok: false, status: 0, detail: 'آدرس وب‌سرویس پنل وارد نشده است.' };
  const batches = c.perRecipient ? to.map(t => [t]) : [to];
  let last: SmsResult = { ok: false, status: 0, detail: '' };
  for (const batch of batches) {
    const vars = { to: batch.join(','), message, sender: s.sender };
    const url = fill(c.url, vars, 'url');
    const headers = parseHeaders(c.headers);
    let body: string | undefined;
    if (c.method === 'POST') {
      if (c.bodyType === 'json') {
        body = fill(c.body, vars, 'json');
        headers['Content-Type'] ??= 'application/json';
      } else {
        // form body: "key=value" lines or a query string
        body = c.body.includes('\n') ? c.body.split('\n').filter(Boolean).map(l => fill(l, vars, 'url')).join('&') : fill(c.body, vars, 'url');
        headers['Content-Type'] ??= 'application/x-www-form-urlencoded';
      }
    }
    const r = await http(url, { method: c.method, headers, body });
    const ok = r.status >= 200 && r.status < 300 && (!c.successText || r.text.includes(c.successText));
    last = { ok, status: r.status, detail: short(r.text) };
    if (!ok) return last;
  }
  return last;
}

export async function sendSms(s: SmsSettings, to: string[], message: string): Promise<SmsResult> {
  if (!to.length) return { ok: false, status: 0, detail: 'گیرنده‌ای وجود ندارد.' };
  try {
    switch (s.provider) {
      case 'kavenegar': {
        const r = await http(`https://api.kavenegar.com/v1/${encodeURIComponent(s.apiKey)}/sms/send.json`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: form({ receptor: to.join(','), sender: s.sender, message }),
        });
        const data = json(r.text);
        return { ok: r.status === 200 && data?.return?.status === 200, status: r.status, detail: short(data?.return?.message ?? r.text) };
      }
      case 'smsir': {
        const r = await http('https://api.sms.ir/v1/send/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'text/plain', 'X-API-KEY': s.apiKey },
          body: JSON.stringify({ lineNumber: Number(s.sender) || s.sender, messageText: message, mobiles: to }),
        });
        const data = json(r.text);
        return { ok: r.status === 200 && data?.status === 1, status: r.status, detail: short(data?.message ?? r.text) };
      }
      case 'melipayamak': {
        const r = await http('https://rest.payamak-panel.com/api/SendSMS/SendSMS', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: form({ username: s.username, password: s.password, to: to.join(','), from: s.sender, text: message, isflash: 'false' }),
        });
        const data = json(r.text);
        return { ok: r.status === 200 && Number(data?.RetStatus) === 1, status: r.status, detail: short(data?.StrRetStatus ?? r.text) };
      }
      case 'ippanel': {
        const r = await http('https://rest.ippanel.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `AccessKey ${s.apiKey}` },
          body: JSON.stringify({ originator: s.sender, recipients: to, message }),
        });
        const data = json(r.text);
        return { ok: r.status >= 200 && r.status < 300 && (!data?.status || String(data.status).toUpperCase() === 'OK'), status: r.status, detail: short(r.text) };
      }
      case 'custom':
        return await sendCustom(s, to, message);
      default:
        return { ok: false, status: 0, detail: 'پنل پیامک تنظیم نشده است.' };
    }
  } catch (e: any) {
    return { ok: false, status: 0, detail: e?.name === 'AbortError' ? 'پنل پیامک پاسخ نداد (زمان انتظار تمام شد).' : `خطای ارتباط: ${short(String(e?.message ?? e))}` };
  }
}
