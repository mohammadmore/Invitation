import { useEffect, useState } from 'react';
import { CircleCheck, MapPin, Calendar, Building, Users } from 'lucide-react';
import { api } from '../lib/api';
import { asset } from '../lib/paths';
import { hideSplash } from '../lib/splash';
import { themeColors } from '../shared/color';
import type { TicketInfo } from '../shared/checkin';

/** The guest's booth ticket: QR + readable code, to show at the booth. */
export default function TicketPage({ slug, code }: { slug: string; code: string }) {
  const [t, setT] = useState<TicketInfo | null>(null);
  const [qr, setQr] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    document.title = 'بلیت ورود به غرفه';
    const key = `ticket-info:${slug}:${code}`;
    api
      .ticket(slug, code)
      .catch(e => {
        // Offline at the booth: show the copy saved the last time this ticket was opened.
        const saved = localStorage.getItem(key);
        if (saved) return JSON.parse(saved) as TicketInfo;
        throw e;
      })
      .then(info => {
        try {
          localStorage.setItem(key, JSON.stringify(info));
        } catch {
          /* ignore */
        }
        setT(info);
        document.title = `بلیت ${info.company} — ${info.event}`;
        document.body.style.backgroundColor = info.theme.background;
        return import('qrcode').then(QR => QR.toDataURL(window.location.href.split('#')[0].split('?')[0], { width: 560, margin: 1, errorCorrectionLevel: 'M' }));
      })
      .then(d => d && setQr(d))
      .catch(() => setError(true))
      .finally(hideSplash);
  }, [slug, code]);

  if (error) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-2 bg-slate-900 text-white p-6 text-center">
        <p className="text-2xl font-black">بلیت پیدا نشد</p>
        <p className="text-slate-400 text-sm">لینک را بررسی کنید.</p>
      </div>
    );
  }
  if (!t) return null;
  const colors = themeColors(t.theme);
  const day = t.day ? new Date(`${t.day}T12:00:00Z`).toLocaleDateString('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' }) : '';

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-5" style={{ background: `radial-gradient(circle at 30% 20%, ${t.theme.primary}55, transparent 60%), ${t.theme.background}` }}>
      <div className="w-full max-w-sm bg-white rounded-[2rem] shadow-2xl overflow-hidden text-slate-800">
        <div className="p-5 text-center text-white" style={{ background: `linear-gradient(135deg, ${colors.btnPrimary}, ${colors.btnAccent})` }}>
          {t.logo && <img src={asset(t.logo)} alt="" className="h-12 mx-auto mb-2 object-contain drop-shadow" />}
          <p className="text-xs font-bold opacity-90">بلیت ورود به غرفه</p>
          <p className="text-xl font-black">{t.company}</p>
          <p className="text-sm font-bold opacity-90">{t.event}</p>
        </div>
        <div className="relative">
          <div className="absolute -top-3 -left-3 w-6 h-6 rounded-full" style={{ background: t.theme.background }} />
          <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full" style={{ background: t.theme.background }} />
          <div className="border-t-2 border-dashed border-slate-200 mx-4" />
        </div>
        <div className="p-5 space-y-4 text-center">
          <div>
            <p className="text-lg font-black">{t.name}</p>
            {t.org && <p className="text-sm text-slate-500">{t.org}</p>}
          </div>
          {t.checkedInAt ? (
            <p className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 text-sm font-bold px-3 py-1.5">
              <CircleCheck className="w-4 h-4" /> حضور شما در غرفه ثبت شد — {new Date(t.checkedInAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          ) : (
            <div className="mx-auto w-56 h-56 rounded-2xl border border-slate-200 p-2">{qr && <img src={qr} alt="QR" className="w-full h-full" />}</div>
          )}
          <p dir="ltr" className="font-mono font-black text-2xl tracking-[0.3em]">
            {t.code.slice(0, 4)}-{t.code.slice(4)}
          </p>
          <div className="text-right text-sm space-y-2 bg-slate-50 rounded-2xl p-3">
            {(day || t.dateLabel) && (
              <p className="flex items-center gap-2">
                <Calendar className="w-4 h-4 shrink-0" style={{ color: colors.accentInk }} /> {day || t.dateLabel}
              </p>
            )}
            {t.location && (
              <p className="flex items-center gap-2">
                <MapPin className="w-4 h-4 shrink-0" style={{ color: colors.accentInk }} /> {t.location}
              </p>
            )}
            {t.booth && (
              <p className="flex items-center gap-2">
                <Building className="w-4 h-4 shrink-0" style={{ color: colors.accentInk }} /> {t.booth}
              </p>
            )}
            <p className="flex items-center gap-2">
              <Users className="w-4 h-4 shrink-0" style={{ color: colors.accentInk }} /> {t.count.toLocaleString('fa-IR')} نفر
            </p>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">این بلیت را هنگام ورود به غرفه نشان دهید. برای دسترسی بدون اینترنت از آن اسکرین‌شات بگیرید.</p>
        </div>
      </div>
    </div>
  );
}
