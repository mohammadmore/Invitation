import { useEffect, useRef, useState } from 'react';
import { BellRing, CircleCheck, Clock, Loader2, RefreshCw, Send, TriangleAlert, XCircle, MinusCircle } from 'lucide-react';
import { api } from '../lib/api';
import { route } from '../lib/paths';
import { DEFAULT_NOTIFY_TEMPLATE, NOTIFY_PLACEHOLDERS, parseNumbers, renderTemplate, type NotifyLogEntry, type NotifySettings } from '../shared/notify';
import { Field, Section, TextArea, Toggle } from './ui';

const fa = (n: number) => n.toLocaleString('fa-IR');
const when = (iso: string) => new Date(iso).toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' });

const STATUS: Record<NotifyLogEntry['status'], { label: string; cls: string; icon: typeof CircleCheck }> = {
  sent: { label: 'ارسال شد', cls: 'text-emerald-700 bg-emerald-50', icon: CircleCheck },
  pending: { label: 'در صف / تلاش مجدد', cls: 'text-amber-700 bg-amber-50', icon: Clock },
  failed: { label: 'ناموفق', cls: 'text-rose-700 bg-rose-50', icon: XCircle },
  skipped: { label: 'ارسال نشد', cls: 'text-slate-600 bg-slate-100', icon: MinusCircle },
};

/**
 * SMS alerts when a guest confirms attendance: to the credited sales rep and/or fixed numbers.
 * Live settings (saved immediately); the SMS panel itself is configured on the Settings page.
 */
export default function NotifySection({ recordId, rsvpEnabled, trackingHint }: { recordId: string; rsvpEnabled: boolean; trackingHint: string }) {
  const [notify, setNotify] = useState<NotifySettings | null>(null);
  const [smsReady, setSmsReady] = useState(false);
  const [format, setFormat] = useState<'local' | 'intl'>('local');
  const [log, setLog] = useState<NotifyLogEntry[]>([]);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [testing, setTesting] = useState(false);
  const lastSaved = useRef('');

  const load = () =>
    api.notify(recordId).then(r => {
      lastSaved.current = JSON.stringify(r.notify);
      setNotify(r.notify);
      setSmsReady(r.smsReady);
      setFormat(r.numberFormat);
      setLog(r.log);
    });
  useEffect(() => {
    load().catch(() => {});
  }, [recordId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!notify || JSON.stringify(notify) === lastSaved.current) return;
    setState('saving');
    const t = window.setTimeout(() => {
      const json = JSON.stringify(notify);
      api
        .saveNotify(recordId, notify)
        .then(() => {
          lastSaved.current = json;
          setState('saved');
        })
        .catch(() => setState('error'));
    }, 700);
    return () => window.clearTimeout(t);
  }, [notify, recordId]);

  if (!notify) return null;
  const set = (patch: Partial<NotifySettings>) => setNotify(n => (n ? { ...n, ...patch } : n));
  const extra = parseNumbers(notify.extraNumbers, format);
  const preview = renderTemplate(notify.template, {
    guest: 'دکتر احمدی',
    org: ' — داروخانه سینا',
    phone: '09121234567',
    day: 'دوشنبه ۱۰ آذر',
    count: '۲',
    event: 'نام نمایشگاه',
    company: 'نام شرکت',
    rep: 'علی رضایی',
    source: 'علی — پیامک (پیامک)',
  });
  const smsParts = Math.max(1, Math.ceil(preview.length / 67));

  return (
    <Section title="اعلان پیامکی اعلام حضور" description="به محض اینکه مهمانی اعلام حضور کند، پیامک برای کارشناس او و/یا شماره‌های تعیین‌شده ارسال می‌شود تا همان روز پیگیری شود.">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Toggle checked={notify.enabled} onChange={enabled => set({ enabled })} label="ارسال اعلان پیامکی فعال باشد" />
        <span className="text-[11px] font-bold">
          {state === 'saving' && <span className="text-slate-500">در حال ذخیره…</span>}
          {state === 'saved' && <span className="text-emerald-600">ذخیره شد — بلافاصله اعمال می‌شود</span>}
          {state === 'error' && <span className="text-rose-600">ذخیره نشد</span>}
        </span>
      </div>

      {notify.enabled && (
        <>
          {!smsReady && (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
              <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                پنل پیامک هنوز تنظیم نشده است. مدیر سامانه باید آن را در{' '}
                <a href={route('settings')} target="_blank" rel="noreferrer" className="font-bold underline">
                  تنظیمات سامانه
                </a>{' '}
                وارد کند؛ تا آن زمان اعلان‌ها ارسال نمی‌شوند.
              </span>
            </p>
          )}
          {!rsvpEnabled && (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
              <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" /> فرم اعلام حضور (بالای همین صفحه) خاموش است؛ بدون آن اعلانی ایجاد نمی‌شود.
            </p>
          )}

          <div className="space-y-1.5">
            <Toggle checked={notify.toRep} onChange={toRep => set({ toRep })} label="ارسال به کارشناس مربوط" />
            <p className="text-[11px] text-slate-500 leading-relaxed pr-14">{trackingHint}</p>
          </div>

          <Field label="شماره‌های ثابت (اختیاری)" hint={extra.length ? `${fa(extra.length)} شماره معتبر — هر اعلام حضوری برای این شماره‌ها هم ارسال می‌شود (مثلاً مدیر فروش).` : 'هر شماره در یک خط یا با ویرگول. فقط شماره موبایل.'}>
            <TextArea dir="ltr" className="text-left" rows={2} value={notify.extraNumbers} onChange={e => set({ extraNumbers: e.target.value })} placeholder="0912…, 0935…" />
          </Field>

          <Field
            label="متن پیامک"
            action={
              notify.template !== DEFAULT_NOTIFY_TEMPLATE && (
                <button type="button" onClick={() => set({ template: DEFAULT_NOTIFY_TEMPLATE })} className="text-[11px] font-bold text-(color:--ad-ink)">
                  متن پیش‌فرض
                </button>
              )
            }
          >
            <TextArea rows={5} maxLength={600} value={notify.template} onChange={e => set({ template: e.target.value })} />
            <div className="flex flex-wrap gap-1 mt-1.5">
              {NOTIFY_PLACEHOLDERS.map(([ph, label]) => (
                <button key={ph} type="button" onClick={() => set({ template: `${notify.template}${ph}` })} className="rounded-full bg-slate-100 hover:bg-slate-200 px-2 py-0.5 text-[11px]" title={label}>
                  <span dir="ltr">{ph}</span> {label}
                </button>
              ))}
            </div>
          </Field>
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-[11px] font-bold text-slate-500 mb-1">نمونه پیامک ({fa(preview.length)} کاراکتر، حدود {fa(smsParts)} پیامک):</p>
            <p className="text-sm whitespace-pre-line leading-relaxed">{preview}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={testing}
              onClick={async () => {
                setTesting(true);
                try {
                  await api.saveNotify(recordId, notify);
                  lastSaved.current = JSON.stringify(notify);
                  setLog((await api.testNotify(recordId)).log);
                } finally {
                  setTesting(false);
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-xl btn-ink text-xs font-bold px-3 py-2 disabled:opacity-60"
            >
              {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} ارسال اعلان آزمایشی
            </button>
            <span className="text-[11px] text-slate-500">با یک مهمان نمونه، به همان گیرندگان واقعی (کارشناس اول و شماره‌های ثابت).</span>
          </div>
        </>
      )}

      {(notify.enabled || log.length > 0) && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-xs font-black text-slate-600 flex items-center gap-1.5">
              <BellRing className="w-4 h-4" /> گزارش ارسال‌ها
            </p>
            <button type="button" onClick={() => load()} className="p-1 rounded-lg hover:bg-slate-100" aria-label="به‌روزرسانی">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          {log.length === 0 && <p className="text-xs text-slate-400">هنوز اعلانی ارسال نشده است.</p>}
          <ul className="space-y-1.5 max-h-72 overflow-y-auto">
            {log.slice(0, 30).map(e => {
              const st = STATUS[e.status];
              const Icon = st.icon;
              return (
                <li key={e.id} className="rounded-xl border border-slate-200 p-2.5 text-xs space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold ${st.cls}`}>
                      <Icon className="w-3.5 h-3.5" /> {st.label}
                    </span>
                    <span className="text-slate-500">{when(e.at)}</span>
                    <span dir="ltr" className="text-slate-600">
                      {e.to.join(', ') || '—'}
                    </span>
                  </div>
                  {e.detail && (
                    <p className="text-slate-500 break-all" dir="auto">
                      {e.detail}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Section>
  );
}
