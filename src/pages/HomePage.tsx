import type React from 'react';
import { useEffect, useState } from 'react';
import { ExternalLink, Pencil, Plus, Trash2, Sparkles, Lock } from 'lucide-react';
import { api, editUrl, forgetMyInvitation, getAdminPassword, getMyInvitations, setAdminPassword, setEditAuth, type MyInvitation } from '../lib/api';
import { hideSplash } from '../lib/splash';

interface AdminItem {
  slug: string;
  company: string;
  event: string;
  updatedAt: string;
}

export default function HomePage() {
  const [mine, setMine] = useState<MyInvitation[]>(getMyInvitations);
  const [adminRequired, setAdminRequired] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [all, setAll] = useState<AdminItem[]>([]);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    hideSplash();
    document.title = 'سازنده دعوتنامه نمایشگاه';
    api.meta().then(m => setAdminRequired(m.adminRequired)).catch(() => {});
    if (getAdminPassword()) loadAdmin();
  }, []);

  async function loadAdmin() {
    try {
      const r = await api.auth();
      setIsAdmin(r.admin);
      if (r.admin) setAll(await api.list());
      else setAdminPassword('');
    } catch {
      /* ignore */
    }
  }

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setAdminPassword(password);
    const r = await api.auth().catch(() => ({ admin: false }));
    if (!r.admin) {
      setAdminPassword('');
      setError('رمز نادرست است');
      return;
    }
    setError('');
    setPassword('');
    loadAdmin();
  }

  async function remove(item: MyInvitation) {
    if (!confirm(`دعوتنامه «${item.company} - ${item.event}» برای همیشه حذف شود؟`)) return;
    try {
      setEditAuth({ slug: item.slug, token: item.editToken });
      await api.remove(item.slug);
    } catch (e) {
      if (!String((e as Error).message).includes('پیدا نشد')) return alert((e as Error).message);
    }
    forgetMyInvitation(item.slug);
    setMine(getMyInvitations());
  }

  const mineSlugs = new Set(mine.map(m => m.slug));

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-white">
      <div className="absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-sky-900/40 to-transparent pointer-events-none" />
      <div className="relative max-w-3xl mx-auto px-5 py-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 text-sky-300 bg-sky-400/10 border border-sky-400/20 rounded-full px-4 py-1.5 text-sm font-bold mb-5">
            <Sparkles className="w-4 h-4" />
            سازنده دعوتنامه دیجیتال نمایشگاه
          </div>
          <h1 className="text-3xl sm:text-4xl font-black leading-tight mb-4">دعوتنامه اختصاصی شرکت خود را در چند دقیقه بسازید</h1>
          <p className="text-slate-400 leading-relaxed max-w-xl mx-auto">
            لوگو، رنگ‌ها، فونت، ویدئو، موزیک و متن‌ها را انتخاب کنید، پیش‌نمایش زنده را ببینید و یک لینک اختصاصی برای ارسال به مهمانان بگیرید.
          </p>
          <a href="/builder" className="mt-8 inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black px-7 py-4 rounded-2xl shadow-lg shadow-sky-500/20 transition">
            <Plus className="w-5 h-5" />
            ساخت دعوتنامه جدید
          </a>
        </div>

        {mine.length > 0 && (
          <section className="mb-10">
            <h2 className="font-black text-lg mb-3">دعوتنامه‌های ساخته‌شده در این مرورگر</h2>
            <ul className="space-y-2">
              {mine.map(item => (
                <li key={item.slug} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{item.company} — {item.event}</p>
                    <p dir="ltr" className="text-xs text-slate-400 text-right truncate">/i/{item.slug}</p>
                  </div>
                  <a href={`/i/${item.slug}`} target="_blank" rel="noreferrer" className="p-2 rounded-xl hover:bg-white/10" title="مشاهده">
                    <ExternalLink className="w-5 h-5" />
                  </a>
                  <a href={editUrl(item.slug, item.editToken)} className="p-2 rounded-xl hover:bg-white/10" title="ویرایش">
                    <Pencil className="w-5 h-5" />
                  </a>
                  <button onClick={() => remove(item)} className="p-2 rounded-xl hover:bg-red-500/20 text-red-300" title="حذف">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {isAdmin ? (
          <section>
            <h2 className="font-black text-lg mb-3">همه دعوتنامه‌ها (مدیر)</h2>
            {all.length === 0 && <p className="text-slate-400 text-sm">هنوز دعوتنامه‌ای ساخته نشده است.</p>}
            <ul className="space-y-2">
              {all.map(item => (
                <li key={item.slug} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{item.company} — {item.event}</p>
                    <p className="text-xs text-slate-400">
                      <span dir="ltr">/i/{item.slug}</span> · {new Date(item.updatedAt).toLocaleDateString('fa-IR')}
                    </p>
                  </div>
                  <a href={`/i/${item.slug}`} target="_blank" rel="noreferrer" className="p-2 rounded-xl hover:bg-white/10" title="مشاهده">
                    <ExternalLink className="w-5 h-5" />
                  </a>
                  {!mineSlugs.has(item.slug) && (
                    <a href={`/builder/${item.slug}`} className="p-2 rounded-xl hover:bg-white/10" title="ویرایش">
                      <Pencil className="w-5 h-5" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ) : (
          adminRequired && (
            <form onSubmit={login} className="flex flex-wrap items-center justify-center gap-2 text-sm">
              <Lock className="w-4 h-4 text-slate-500" />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="رمز مدیر" className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-sky-400" />
              <button className="bg-white/10 hover:bg-white/20 rounded-xl px-4 py-2 font-bold">ورود مدیر</button>
              {error && <span className="text-red-300 w-full text-center">{error}</span>}
            </form>
          )
        )}
      </div>
    </div>
  );
}
