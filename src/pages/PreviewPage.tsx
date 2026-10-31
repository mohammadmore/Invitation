import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { CircleCheck, Eye, MessageSquare, TriangleAlert, X } from 'lucide-react';
import InvitationView from '../invitation/InvitationView';
import { api } from '../lib/api';
import { hideSplash } from '../lib/splash';
import { ColorModeToggle, scopeClass, useColorMode } from '../lib/adminTheme';
import { adminPalette } from '../shared/color';
import { validateForPublish, type InvitationConfig } from '../shared/invitation';

/** Read-only preview of a draft for the client: missing items in red, plus comments / approval. */
export default function PreviewPage({ id }: { id: string }) {
  const [config, setConfig] = useState<InvitationConfig | null>(null);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState(false);
  const [panel, setPanel] = useState(false);
  const token = decodeURIComponent(window.location.hash.slice(1));
  const params = new URLSearchParams(window.location.search);

  useEffect(() => {
    document.title = 'پیش‌نمایش دعوتنامه';
    api
      .preview(id, token)
      .then(r => {
        setConfig(r.config);
        setRevision(r.revision);
      })
      .catch(() => setError(true))
      .finally(hideSplash);
  }, [id, token]);

  const missing = useMemo(() => (config ? validateForPublish(config).length : 0), [config]);
  // The client's panel follows the light/dark choice, in the invitation's own palette.
  // Only the panel: the invitation itself is always shown as designed.
  const { mode } = useColorMode();
  const p = config?.theme.primary;
  const a = config?.theme.accent;
  const palette = useMemo(() => adminPalette(p && a ? { primary: p, accent: a } : null, mode) as React.CSSProperties, [p, a, mode]);
  const scope = scopeClass(mode, 'light');

  if (error) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-3 bg-slate-900 text-white p-6 text-center">
        <p className="text-2xl font-black">پیش‌نمایش در دسترس نیست</p>
        <p className="text-slate-400">لینک را بررسی کنید یا از طراح دعوتنامه لینک جدید بگیرید.</p>
      </div>
    );
  }
  if (!config) return null;
  return (
    <>
      <InvitationView config={config} showMissing guestName={params.get('to') || ''} initialLang={params.get('lang') === 'en' ? 'en' : 'fa'} />
      <div className="fixed bottom-0 inset-x-0 z-[150] flex flex-col items-center gap-2 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pointer-events-none" dir="rtl">
        <button onClick={() => setPanel(true)} style={palette} className={`${scope} pointer-events-auto inline-flex items-center gap-2 rounded-full bg-white text-slate-900 px-4 py-2 text-xs font-black shadow-xl`}>
          <MessageSquare className="w-4 h-4" /> ثبت نظر یا تأیید نهایی
        </button>
        <div className={`no-invert pointer-events-auto flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold shadow-xl ${missing ? 'bg-red-600 text-white' : 'bg-slate-900/90 text-white'}`}>
          {missing ? <TriangleAlert className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {missing ? `پیش‌نمایش — منتشر نشده — ${missing.toLocaleString('fa-IR')} مورد هنوز تکمیل نشده (کادر قرمز)` : 'پیش‌نمایش — هنوز منتشر نشده'}
        </div>
      </div>
      {panel && <FeedbackPanel scope={scope} palette={palette} id={id} token={token} revision={revision} missing={missing} onClose={() => setPanel(false)} />}
    </>
  );
}

function FeedbackPanel({ scope, palette, id, token, revision, missing, onClose }: { scope: string; palette: React.CSSProperties; id: string; token: string; revision: number; missing: number; onClose: () => void }) {
  const [name, setName] = useState(() => localStorage.getItem('feedback-name') || '');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<'' | 'comment' | 'approved'>('');
  const [error, setError] = useState('');

  async function send(approved: boolean) {
    if (!approved && !message.trim()) return setError('متن نظر را بنویسید.');
    if (approved && !confirm('این نسخه از دعوتنامه را تأیید می‌کنید؟')) return;
    setBusy(true);
    setError('');
    try {
      localStorage.setItem('feedback-name', name);
      await api.sendFeedback(id, token, { name: name.trim(), message: message.trim(), approved, revision });
      setDone(approved ? 'approved' : 'comment');
      setMessage('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`${scope} fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-3`} style={palette} dir="rtl" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-5 space-y-3 text-slate-800">
        <div className="flex items-center justify-between">
          <h2 className="font-black text-lg flex-1">نظر شما درباره دعوتنامه</h2>
          <ColorModeToggle className="text-slate-500" />
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100" aria-label="بستن">
            <X className="w-5 h-5" />
          </button>
        </div>
        {done ? (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800 flex gap-2">
            <CircleCheck className="w-5 h-5 shrink-0" />
            {done === 'approved' ? 'تأیید شما ثبت شد. طراح دعوتنامه مطلع می‌شود.' : 'نظر شما ثبت شد. می‌توانید نظر دیگری هم بنویسید.'}
          </div>
        ) : null}
        <input value={name} onChange={e => setName(e.target.value)} maxLength={120} placeholder="نام شما" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-(color:--ad-ink)" />
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          maxLength={2000}
          rows={4}
          placeholder="مثلاً: شماره غرفه را ۱۲ بنویسید، لوگوی جدید را ارسال می‌کنیم، …"
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-(color:--ad-ink) leading-relaxed"
        />
        {error && <p className="text-xs font-bold text-rose-600">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <button disabled={busy} onClick={() => send(false)} className="flex-1 rounded-xl btn-ink text-sm font-bold py-3 disabled:opacity-60">
            ارسال نظر
          </button>
          <button disabled={busy} onClick={() => send(true)} className="no-invert flex-1 rounded-xl bg-emerald-600 text-white text-sm font-bold py-3 disabled:opacity-60">
            تأیید نهایی این نسخه
          </button>
        </div>
        {missing > 0 && <p className="text-[11px] text-amber-700 leading-relaxed">توجه: {missing.toLocaleString('fa-IR')} مورد هنوز تکمیل نشده و با کادر قرمز مشخص شده است. با تأیید، طراح می‌داند که بقیه موارد مورد قبول شماست.</p>}
      </div>
    </div>
  );
}
