import { useEffect, useRef, useState } from 'react';
import { Download, KeyRound, ScanLine, TriangleAlert } from 'lucide-react';
import { api } from '../lib/api';
import { checkinUrl } from '../lib/paths';
import { DEFAULT_ARRIVAL_TEMPLATE, DEFAULT_TICKET_TEMPLATE, type CheckinSettings } from '../shared/checkin';
import { Field, Section, TextArea, Toggle } from './ui';

/** Booth check-in options (live): tickets, staff scanner link, arrival SMS. */
export default function CheckinSection({ recordId, rsvpEnabled }: { recordId: string; rsvpEnabled: boolean }) {
  const [c, setC] = useState<CheckinSettings | null>(null);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [copied, setCopied] = useState(false);
  const lastSaved = useRef('');

  useEffect(() => {
    api
      .checkinSettings(recordId)
      .then(s => {
        lastSaved.current = JSON.stringify(s);
        setC(s);
      })
      .catch(() => {});
  }, [recordId]);

  useEffect(() => {
    if (!c || JSON.stringify(c) === lastSaved.current) return;
    setState('saving');
    const t = window.setTimeout(() => {
      api
        .saveCheckinSettings(recordId, c)
        .then(s => {
          lastSaved.current = JSON.stringify(s);
          setState('saved');
        })
        .catch(() => setState('error'));
    }, 700);
    return () => window.clearTimeout(t);
  }, [c, recordId]);

  if (!c) return null;
  const set = (patch: Partial<CheckinSettings>) => setC(x => (x ? { ...x, ...patch } : x));
  const staffLink = checkinUrl(recordId, c.staffToken);

  return (
    <Section title="ثبت حضور واقعی در غرفه (QR)" description="هر مهمانی که اعلام حضور کند یک بلیت با QR می‌گیرد؛ متصدی غرفه با گوشی آن را اسکن می‌کند. این‌طوری معلوم می‌شود از هر لینک و کارشناس چند نفر واقعاً به غرفه آمده‌اند.">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Toggle checked={c.enabled} onChange={enabled => set({ enabled })} label="بلیت و ثبت حضور در غرفه فعال باشد" />
        <span className="text-[11px] font-bold">
          {state === 'saving' && <span className="text-slate-500">در حال ذخیره…</span>}
          {state === 'saved' && <span className="text-emerald-600">ذخیره شد — بلافاصله اعمال می‌شود</span>}
          {state === 'error' && <span className="text-rose-600">ذخیره نشد</span>}
        </span>
      </div>

      {c.enabled && (
        <>
          {!rsvpEnabled && (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
              <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" /> بلیت هنگام اعلام حضور صادر می‌شود؛ فرم اعلام حضور (بالای همین صفحه) را روشن کنید. بدون آن فقط ثبت «مهمان بدون اعلام قبلی» در غرفه ممکن است.
            </p>
          )}
          <div className="rounded-2xl bg-slate-50 p-3 space-y-2">
            <p className="text-sm font-black flex items-center gap-1.5">
              <ScanLine className="w-4 h-4" /> لینک صفحه ثبت حضور برای متصدیان غرفه
            </p>
            <p className="text-[11px] text-slate-500 leading-relaxed">این لینک را روی گوشی متصدیان غرفه باز کنید (دوربین گوشی برای اسکن استفاده می‌شود). با آن فقط می‌شود حضور ثبت کرد، نه دعوتنامه را تغییر داد. اگر لینک دست افراد دیگر افتاد، «لینک جدید» بسازید.</p>
            <div className="flex flex-wrap gap-2">
              <input dir="ltr" readOnly value={staffLink} onFocus={e => e.target.select()} className="flex-1 min-w-[200px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono" />
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(staffLink).catch(() => {});
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1500);
                }}
                className="rounded-xl btn-ink text-xs font-bold px-3 py-2"
              >
                {copied ? 'کپی شد' : 'کپی'}
              </button>
              <button
                type="button"
                onClick={async () => {
                  const QR = await import('qrcode');
                  const a = document.createElement('a');
                  a.href = await QR.toDataURL(staffLink, { width: 600, margin: 2 });
                  a.download = 'checkin-staff-qr.png';
                  a.click();
                }}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-300 text-xs font-bold px-3 py-2"
              >
                <Download className="w-3.5 h-3.5" /> QR برای باز کردن روی گوشی
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!confirm('لینک جدید ساخته شود؟ لینک قبلی روی گوشی متصدیان دیگر کار نمی‌کند.')) return;
                  const s = await api.saveCheckinSettings(recordId, c, true);
                  lastSaved.current = JSON.stringify(s);
                  setC(s);
                }}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-300 text-xs font-bold px-3 py-2"
              >
                <KeyRound className="w-3.5 h-3.5" /> لینک جدید
              </button>
            </div>
          </div>

          <Toggle checked={c.smsTicket} onChange={smsTicket => set({ smsTicket })} label="ارسال لینک بلیت با پیامک به مهمان (اگر شماره موبایل داده باشد)" />
          {c.smsTicket && (
            <Field label="متن پیامک بلیت" hint="{guest} نام مهمان، {company}، {event}، {link} لینک بلیت، {code} کد بلیت" action={c.smsTicketTemplate !== DEFAULT_TICKET_TEMPLATE && <button type="button" onClick={() => set({ smsTicketTemplate: DEFAULT_TICKET_TEMPLATE })} className="text-[11px] font-bold text-(color:--ad-ink)">متن پیش‌فرض</button>}>
              <TextArea rows={3} maxLength={400} value={c.smsTicketTemplate} onChange={e => set({ smsTicketTemplate: e.target.value })} />
            </Field>
          )}

          <div className="space-y-2">
            <p className="text-sm font-bold text-slate-700">پیامک «مهمان شما در غرفه است»</p>
            <div className="flex flex-wrap gap-4">
              <Toggle checked={c.notifyRep} onChange={notifyRep => set({ notifyRep })} label="به کارشناس همان مهمان" />
              <Toggle checked={c.notifyExtra} onChange={notifyExtra => set({ notifyExtra })} label="به شماره‌های ثابت اعلان" />
            </div>
            {(c.notifyRep || c.notifyExtra) && (
              <Field label="متن پیامک ورود" hint="{guest}، {org}، {count}، {time} ساعت ورود، {phone}، {rep}، {company}، {event}" action={c.arrivalTemplate !== DEFAULT_ARRIVAL_TEMPLATE && <button type="button" onClick={() => set({ arrivalTemplate: DEFAULT_ARRIVAL_TEMPLATE })} className="text-[11px] font-bold text-(color:--ad-ink)">متن پیش‌فرض</button>}>
                <TextArea rows={3} maxLength={400} value={c.arrivalTemplate} onChange={e => set({ arrivalTemplate: e.target.value })} />
              </Field>
            )}
            <p className="text-[11px] text-slate-500">پیامک‌ها از همان پنل «تنظیمات سامانه» ارسال و در «گزارش ارسال‌ها» (بخش اعلان پیامکی) ثبت می‌شوند.</p>
          </div>
        </>
      )}
    </Section>
  );
}
