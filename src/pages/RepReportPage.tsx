import { useEffect, useState } from 'react';
import { BarChart3, Copy, Loader2 } from 'lucide-react';
import { api, type RepReport } from '../lib/api';
import { linkUrl } from '../lib/paths';
import { hideSplash } from '../lib/splash';
import { channelLabel } from '../shared/tracking';
import Dashboard from '../builder/dashboard';
import { RsvpTable } from '../builder/panels';
import { Section } from '../builder/ui';

/** A sales rep's own read-only report: their links, visits and attendance confirmations. */
export default function RepReportPage({ id }: { id: string }) {
  const [report, setReport] = useState<RepReport | null>(null);
  const [error, setError] = useState(false);
  const repId = new URLSearchParams(window.location.search).get('rep') || '';
  const token = decodeURIComponent(window.location.hash.slice(1));

  useEffect(() => {
    document.title = 'گزارش کارشناس';
    document.body.style.backgroundColor = '#f1f5f9';
    api
      .repReport(id, repId, token)
      .then(setReport)
      .catch(() => setError(true))
      .finally(hideSplash);
  }, [id, repId, token]);

  if (error) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-2 bg-slate-100 p-6 text-center">
        <p className="text-xl font-black text-slate-900">گزارش در دسترس نیست</p>
        <p className="text-slate-500 text-sm">لینک را بررسی کنید یا از مدیر لینک جدید بگیرید.</p>
      </div>
    );
  }
  if (!report) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-slate-100 text-slate-900">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-sky-500" />
          <div>
            <h1 className="font-black">گزارش {report.rep.name}</h1>
            <p className="text-xs text-slate-500">
              {report.company} — {report.event}
            </p>
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <Section title="لینک‌های شما">
          {report.links.length === 0 && <p className="text-sm text-slate-400">هنوز لینکی به نام شما ساخته نشده است.</p>}
          <ul className="space-y-2">
            {report.links.map(l => (
              <li key={l.code} className={`flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 p-3 ${l.active ? '' : 'opacity-60'}`}>
                <span className="font-bold text-sm">{l.label}</span>
                <span className="text-xs text-slate-500">{channelLabel(l.channel)}</span>
                {!l.active && <span className="text-[10px] font-bold rounded-full bg-slate-200 px-2 py-0.5">غیرفعال</span>}
                <span className="flex-1" />
                {report.slug && (
                  <>
                    <span dir="ltr" className="text-xs font-mono text-slate-600">
                      {linkUrl(report.slug, l.code)}
                    </span>
                    <button onClick={() => navigator.clipboard.writeText(linkUrl(report.slug, l.code)).catch(() => {})} className="p-1.5 rounded-lg border border-slate-300" aria-label="کپی">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </Section>
        <Section title="آمار لینک‌های شما" description="فقط شمارش کلی ثبت می‌شود؛ هیچ اطلاعات شخصی یا IP مهمانان ذخیره نمی‌شود.">
          <Dashboard stats={report.stats} links={report.links} scope="rep" trackingEnabled eventDates={report.eventDates} />
        </Section>
        <Section title="اعلام حضورهای مرتبط با شما" description="مهمانانی که از لینک‌های شما اعلام حضور کرده‌اند — برای پیگیری.">
          <RsvpTable list={report.rsvps} slug={`${report.slug}-${report.rep.name}`} />
        </Section>
      </main>
    </div>
  );
}
