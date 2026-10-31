import { useEffect, useState } from 'react';
import { BarChart3, CircleCheck, Copy, Download, History, Loader2, MessageSquare, RotateCcw, Trash2, TriangleAlert, Users, X, Building2, CalendarRange } from 'lucide-react';
import { api, type Feedback, type HistoryEntry, type RecordView, type Rsvp, type Stats } from '../lib/api';
import type { CopyMode } from '../shared/invitation';
import { Section } from './ui';

const fa = (n: number) => n.toLocaleString('fa-IR');
const when = (iso: string) => new Date(iso).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' });

function downloadFile(filename: string, text: string, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob(['﻿' + text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
export const toCsv = (rows: (string | number)[][]) => rows.map(r => r.map(csvCell).join(',')).join('\r\n');

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-[400] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className={`w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[85dvh] overflow-y-auto bg-white rounded-3xl shadow-2xl p-5 space-y-4`}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-black text-lg">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100" aria-label="بستن">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ edit conflict

export function ConflictModal({ server, onLoadServer, onOverwrite }: { server: RecordView; onLoadServer: () => void; onOverwrite: () => void }) {
  return (
    <Modal title="این دعوتنامه در جای دیگری تغییر کرده است" onClose={() => {}}>
      <p className="text-sm text-slate-600 leading-relaxed">
        از وقتی این صفحه را باز کرده‌اید، شخص دیگری (یا همین دعوتنامه در زبانه یا دستگاه دیگر) در {when(server.updatedAt)} تغییراتی ذخیره کرده است. برای اینکه کار هیچ‌کس بی‌صدا پاک نشود، ذخیره خودکار متوقف شد.
      </p>
      <div className="grid gap-2">
        <button onClick={onLoadServer} className="rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-black py-3 px-4 text-sm text-right">
          بارگذاری نسخه جدید
          <span className="block text-xs font-medium opacity-90">تغییرات ذخیره‌نشده این صفحه کنار گذاشته می‌شود (در تاریخچه قابل بازیابی است).</span>
        </button>
        <button onClick={onOverwrite} className="rounded-2xl border border-slate-300 hover:bg-slate-50 font-black py-3 px-4 text-sm text-right">
          ذخیره تغییرات من روی آن
          <span className="block text-xs font-medium text-slate-500">نسخه دیگر در تاریخچه نگه داشته می‌شود و بعداً قابل بازگردانی است.</span>
        </button>
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------------ history

const KIND_LABEL: Record<HistoryEntry['kind'], string> = { auto: 'ذخیره خودکار', publish: 'نسخه منتشرشده', 'before-restore': 'پیش از بازگردانی' };

export function HistoryModal({ id, hasPublished, onClose, onRestored }: { id: string; hasPublished: boolean; onClose: () => void; onRestored: (r: RecordView) => void }) {
  const [items, setItems] = useState<HistoryEntry[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .history(id)
      .then(setItems)
      .catch(e => setError(e.message));
  }, [id]);

  async function restore(source: { index: number } | { source: 'published' }, label: string) {
    if (!confirm(`نسخه «${label}» جایگزین پیش‌نویس فعلی شود؟ پیش‌نویس فعلی در تاریخچه نگه داشته می‌شود.`)) return;
    setBusy(true);
    try {
      onRestored(await api.restore(id, source));
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="تاریخچه تغییرات" onClose={onClose}>
      <p className="text-xs text-slate-500 leading-relaxed">از پیش‌نویس هر ۱۰ دقیقه، و همچنین هنگام انتشار و پیش از هر بازگردانی، یک نسخه نگه داشته می‌شود (حداکثر ۴۰ نسخه).</p>
      {hasPublished && (
        <button disabled={busy} onClick={() => restore({ source: 'published' }, 'منتشرشده فعلی')} className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 text-sm font-bold py-2.5">
          <RotateCcw className="w-4 h-4" /> برگرداندن پیش‌نویس به نسخه منتشرشده
        </button>
      )}
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {!items && !error && <Loader2 className="w-6 h-6 animate-spin text-sky-500 mx-auto" />}
      {items?.length === 0 && <p className="text-sm text-slate-500">هنوز نسخه قبلی‌ای ثبت نشده است.</p>}
      <ul className="space-y-2">
        {items?.map(h => (
          <li key={h.index} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3">
            <History className="w-5 h-5 text-slate-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold">{when(h.at)}</p>
              <p className="text-xs text-slate-500 truncate">
                {KIND_LABEL[h.kind]} · {[h.company, h.event].filter(Boolean).join(' — ') || 'بدون نام'}
              </p>
            </div>
            <button disabled={busy} onClick={() => restore({ index: h.index }, when(h.at))} className="shrink-0 rounded-xl border border-slate-300 text-xs font-bold px-3 py-2 hover:bg-slate-50">
              بازگردانی
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

// ------------------------------------------------------------------ copy

export function DuplicateModal({ onClose, onCopy }: { onClose: () => void; onCopy: (mode: CopyMode) => Promise<void> }) {
  const [busy, setBusy] = useState<CopyMode | null>(null);
  const [error, setError] = useState('');
  const run = async (mode: CopyMode) => {
    setBusy(mode);
    setError('');
    try {
      await onCopy(mode);
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  };
  const Option = ({ mode, icon: Icon, title, keep, clear }: { mode: CopyMode; icon: typeof Building2; title: string; keep: string; clear: string }) => (
    <button disabled={!!busy} onClick={() => run(mode)} className="w-full text-right rounded-2xl border-2 border-slate-200 hover:border-sky-400 p-4 space-y-1.5 transition disabled:opacity-60">
      <span className="flex items-center gap-2 font-black text-slate-900">
        {busy === mode ? <Loader2 className="w-5 h-5 animate-spin" /> : <Icon className="w-5 h-5 text-sky-600" />}
        {title}
      </span>
      <span className="block text-xs text-emerald-700 leading-relaxed">حفظ می‌شود: {keep}</span>
      <span className="block text-xs text-rose-700 leading-relaxed">خالی می‌شود: {clear}</span>
    </button>
  );
  return (
    <Modal title="ساخت دعوتنامه جدید از روی این دعوتنامه" onClose={onClose}>
      <Option
        mode="newEvent"
        icon={CalendarRange}
        title="همین شرکت، نمایشگاه دیگر"
        keep="نام و لوگوهای شرکت، اطلاعات تماس، رنگ‌ها و فونت، ویدئو و موزیک، متن‌ها (نام‌ها به {company} و {event} تبدیل می‌شوند)، نسخه انگلیسی شرکت"
        clear="نام و لوگوی نمایشگاه، تاریخ و ساعت، محل و مسیریابی، غرفه و نقشه غرفه، آدرس لینک"
      />
      <Option
        mode="newOrganizer"
        icon={Building2}
        title="همین نمایشگاه، شرکت/غرفه دیگر"
        keep="نام و لوگوی نمایشگاه، تاریخ و ساعت، منطقه زمانی، محل و مسیریابی، متن دعوتنامه (با {company} به‌جای نام شرکت قبلی)"
        clear="نام، شعار و لوگوهای شرکت، اطلاعات تماس، رنگ‌ها، ویدئو و موزیک، شماره غرفه و نقشه غرفه، آدرس لینک"
      />
      <p className="text-xs text-slate-500 leading-relaxed">دعوتنامه جدید به‌صورت پیش‌نویس جداگانه ساخته می‌شود و این دعوتنامه هیچ تغییری نمی‌کند. نظرات کارفرما، آمار و فهرست مهمانان کپی نمی‌شوند.</p>
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </Modal>
  );
}

// ------------------------------------------------------------------ client feedback

export function FeedbackSection({ id, feedback, revision, onChange }: { id: string; feedback: Feedback[]; revision: number; onChange: (f: Feedback[]) => void }) {
  if (!feedback.length) {
    return (
      <Section title="نظرات کارفرما" description="وقتی کارفرما روی لینک پیش‌نمایش نظر بدهد یا نسخه‌ای را تأیید کند، اینجا نمایش داده می‌شود.">
        <p className="text-sm text-slate-400">هنوز نظری ثبت نشده است.</p>
      </Section>
    );
  }
  const toggle = async (f: Feedback) => {
    await api.resolveFeedback(id, f.id, !f.resolved).catch(() => {});
    onChange(feedback.map(x => (x.id === f.id ? { ...x, resolved: !f.resolved } : x)));
  };
  return (
    <Section title="نظرات کارفرما">
      <ul className="space-y-2">
        {feedback.map(f => (
          <li key={f.id} className={`rounded-2xl border p-3 space-y-1.5 ${f.resolved ? 'border-slate-200 opacity-60' : f.approved ? 'border-emerald-300 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {f.approved ? (
                <span className="inline-flex items-center gap-1 font-black text-emerald-700">
                  <CircleCheck className="w-4 h-4" /> تأیید نهایی
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-black text-amber-800">
                  <MessageSquare className="w-4 h-4" /> نظر
                </span>
              )}
              <span className="font-bold text-slate-700">{f.name || 'بدون نام'}</span>
              <span className="text-slate-500">{when(f.at)}</span>
              {f.revision !== revision && <span className="rounded-full bg-slate-200 text-slate-600 px-2 py-0.5 font-bold">برای نسخه قبلی</span>}
              <span className="flex-1" />
              <button onClick={() => toggle(f)} className="font-bold text-sky-700 hover:underline">
                {f.resolved ? 'بازکردن دوباره' : 'انجام شد'}
              </button>
            </div>
            {f.message && <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed">{f.message}</p>}
          </li>
        ))}
      </ul>
    </Section>
  );
}

// ------------------------------------------------------------------ stats

const STAT_LABELS: [string, string][] = [
  ['view', 'بازدید'],
  ['unique', 'بازدیدکننده یکتا'],
  ['enter', 'ورود به دعوتنامه'],
  ['details', 'مشاهده زمان و مکان'],
  ['gcal', 'ثبت در گوگل کلندر'],
  ['ics', 'ثبت در اپل/اوت‌لوک'],
  ['map', 'کلیک مسیریابی'],
  ['boothMap', 'نقشه غرفه'],
  ['share', 'اشتراک‌گذاری'],
  ['contact', 'تماس'],
  ['vcard', 'ذخیره در مخاطبین'],
  ['rsvp', 'اعلام حضور'],
  ['personal', 'بازدید از لینک شخصی'],
  ['en', 'نسخه انگلیسی'],
];

export function StatsSection({ id }: { id: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    api.stats(id).then(setStats).catch(() => setStats({ totals: {}, days: {} }));
  }, [id]);
  if (!stats) return null;
  const days = Object.keys(stats.days).sort().slice(-14);
  const max = Math.max(1, ...days.map(d => stats.days[d].view ?? 0));
  const shown = STAT_LABELS.filter(([k]) => stats.totals[k]);
  return (
    <Section title="آمار بازدید" description="فقط شمارش کلی ثبت می‌شود؛ هیچ اطلاعات شخصی یا IP مهمانان ذخیره نمی‌شود.">
      {shown.length === 0 ? (
        <p className="text-sm text-slate-400 flex items-center gap-2">
          <BarChart3 className="w-4 h-4" /> هنوز بازدیدی ثبت نشده است.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {shown.map(([k, label]) => (
              <div key={k} className="rounded-2xl bg-slate-50 p-3">
                <p className="text-xl font-black text-slate-900 tabular-nums">{fa(stats.totals[k])}</p>
                <p className="text-[11px] font-bold text-slate-500">{label}</p>
              </div>
            ))}
          </div>
          {days.length > 1 && (
            <div>
              <p className="text-xs font-bold text-slate-500 mb-2">بازدید روزانه (۱۴ روز اخیر)</p>
              <div className="flex items-end gap-1 h-24" dir="ltr">
                {days.map(d => (
                  <div key={d} className="flex-1 flex flex-col items-center gap-1" title={`${d}: ${stats.days[d].view ?? 0}`}>
                    <div className="w-full rounded-t bg-sky-400" style={{ height: `${((stats.days[d].view ?? 0) / max) * 80}px` }} />
                    <span className="text-[9px] text-slate-400">{new Date(`${d}T12:00:00Z`).toLocaleDateString('fa-IR', { day: 'numeric', month: 'numeric' })}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Section>
  );
}

// ------------------------------------------------------------------ RSVP list

export function RsvpList({ id, slug }: { id: string; slug: string }) {
  const [list, setList] = useState<Rsvp[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api
      .rsvps(id)
      .then(setList)
      .catch(e => setError(e.message));
  }, [id]);

  const remove = async (r: Rsvp) => {
    if (!confirm(`پاسخ «${r.name}» حذف شود؟`)) return;
    await api.deleteRsvp(id, r.id).catch(() => {});
    setList(l => l?.filter(x => x.id !== r.id) ?? null);
  };
  const dayFa = (d: string) => (d ? new Date(`${d}T12:00:00Z`).toLocaleDateString('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' }) : 'مشخص نشده');
  const total = list?.reduce((s, r) => s + r.count, 0) ?? 0;

  return (
    <Section title="پاسخ‌های اعلام حضور" description="این اطلاعات فقط برای شما (و مدیر) قابل مشاهده است و با حذف دعوتنامه پاک می‌شود.">
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {list && list.length === 0 && <p className="text-sm text-slate-400">هنوز پاسخی ثبت نشده است.</p>}
      {list && list.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-bold flex items-center gap-1.5">
              <Users className="w-4 h-4" /> {fa(list.length)} پاسخ · {fa(total)} نفر
            </p>
            <span className="flex-1" />
            <button
              onClick={() =>
                downloadFile(
                  `rsvp-${slug || id}.csv`,
                  toCsv([
                    ['نام', 'تلفن', 'شرکت/سازمان', 'روز حضور', 'تعداد', 'لینک شخصی', 'زبان', 'زمان ثبت'],
                    ...list.map(r => [r.name, r.phone, r.org, r.day ? dayFa(r.day) : '', r.count, r.guest, r.lang, when(r.at)]),
                  ]),
                )
              }
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold px-3 py-2"
            >
              <Download className="w-4 h-4" /> دانلود اکسل (CSV)
            </button>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="p-2 text-right">نام</th>
                  <th className="p-2 text-right">تماس</th>
                  <th className="p-2 text-right">روز</th>
                  <th className="p-2">نفر</th>
                  <th className="p-2" />
                </tr>
              </thead>
              <tbody>
                {list.map(r => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="p-2">
                      <p className="font-bold">{r.name}</p>
                      {r.org && <p className="text-xs text-slate-500">{r.org}</p>}
                    </td>
                    <td className="p-2 text-xs" dir="ltr">
                      {r.phone}
                    </td>
                    <td className="p-2 text-xs">{dayFa(r.day)}</td>
                    <td className="p-2 text-center tabular-nums">{fa(r.count)}</td>
                    <td className="p-2">
                      <button onClick={() => remove(r)} className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50" aria-label="حذف">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Section>
  );
}

// ------------------------------------------------------------------ personal links

export function PersonalLinks({ baseUrl, published }: { baseUrl: string; published: boolean }) {
  const [names, setNames] = useState('');
  const [copied, setCopied] = useState('');
  const list = names
    .split('\n')
    .map(n => n.trim())
    .filter(Boolean)
    .slice(0, 500);
  const links = list.map(n => ({ name: n, url: `${baseUrl}?to=${encodeURIComponent(n)}` }));
  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(key);
    window.setTimeout(() => setCopied(''), 1500);
  };
  return (
    <Section title="لینک‌های شخصی مهمانان" description="برای هر مهمان یک لینک جدا بسازید؛ نام او در صفحه اول و بالای متن دعوتنامه نمایش داده می‌شود (مثلاً «جناب آقای دکتر احمدی گرامی»).">
      {!baseUrl && <p className="text-sm text-amber-700 flex gap-1.5"><TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" />ابتدا آدرس لینک را در مرحله «اطلاعات پایه» تعیین کنید.</p>}
      {baseUrl && !published && <p className="text-xs text-amber-700">این لینک‌ها بعد از انتشار نهایی برای مهمانان کار می‌کنند.</p>}
      <textarea
        value={names}
        onChange={e => setNames(e.target.value)}
        rows={5}
        placeholder={'هر نام در یک خط:\nجناب آقای دکتر احمدی\nسرکار خانم مهندس رضایی'}
        className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-sky-500 leading-relaxed"
      />
      {baseUrl && links.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => copy(links.map(l => `${l.name}: ${l.url}`).join('\n'), 'all')} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold px-3 py-2">
              <Copy className="w-4 h-4" /> {copied === 'all' ? 'کپی شد' : `کپی همه (${fa(links.length)})`}
            </button>
            <button onClick={() => downloadFile('personal-links.csv', toCsv([['نام', 'لینک'], ...links.map(l => [l.name, l.url])]))} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 text-xs font-bold px-3 py-2">
              <Download className="w-4 h-4" /> دانلود CSV
            </button>
          </div>
          <ul className="max-h-64 overflow-y-auto divide-y divide-slate-100 rounded-2xl border border-slate-200">
            {links.map((l, i) => (
              <li key={i} className="flex items-center gap-2 p-2">
                <span className="text-sm font-bold flex-1 min-w-0 truncate">{l.name}</span>
                <button onClick={() => copy(l.url, String(i))} className="shrink-0 text-xs font-bold text-sky-700 hover:underline">
                  {copied === String(i) ? 'کپی شد' : 'کپی لینک'}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Section>
  );
}
