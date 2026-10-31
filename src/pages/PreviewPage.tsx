import { useEffect, useMemo, useState } from 'react';
import { Eye, TriangleAlert } from 'lucide-react';
import InvitationView from '../invitation/InvitationView';
import { api } from '../lib/api';
import { hideSplash } from '../lib/splash';
import { validateForPublish, type InvitationConfig } from '../shared/invitation';

/** Read-only preview of a draft for the client. Missing items are shown in red. */
export default function PreviewPage({ id }: { id: string }) {
  const [config, setConfig] = useState<InvitationConfig | null>(null);
  const [error, setError] = useState(false);
  const token = decodeURIComponent(window.location.hash.slice(1));

  useEffect(() => {
    document.title = 'پیش‌نمایش دعوتنامه';
    api
      .preview(id, token)
      .then(r => setConfig(r.config))
      .catch(() => setError(true))
      .finally(hideSplash);
  }, [id, token]);

  const missing = useMemo(() => (config ? validateForPublish(config).length : 0), [config]);

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
      <InvitationView config={config} showMissing />
      <div className="fixed bottom-0 inset-x-0 z-[150] flex justify-center p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pointer-events-none">
        <div className={`pointer-events-auto flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold shadow-xl ${missing ? 'bg-red-600 text-white' : 'bg-slate-900/90 text-white'}`}>
          {missing ? <TriangleAlert className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {missing ? `پیش‌نمایش — منتشر نشده — ${missing.toLocaleString('fa-IR')} مورد هنوز تکمیل نشده (کادر قرمز)` : 'پیش‌نمایش — هنوز منتشر نشده'}
        </div>
      </div>
    </>
  );
}
