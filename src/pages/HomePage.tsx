import type React from 'react';
import { useEffect, useState } from 'react';
import { ExternalLink, Pencil, Plus, Trash2, Sparkles, Lock, KeyRound, LogOut } from 'lucide-react';
import { api, editUrl, forgetMyInvitation, getAdminPassword, getMyInvitations, saveMyInvitation, setAdminPassword, setEditAuth, type MyInvitation, type RecordStatus, type RecordSummary } from '../lib/api';
import { route } from '../lib/paths';
import { hideSplash } from '../lib/splash';

const STATUS: Record<RecordStatus, { label: string; cls: string }> = {
  draft: { label: 'پیش‌نویس', cls: 'bg-slate-500/20 text-slate-300' },
  published: { label: 'منتشر شده', cls: 'bg-emerald-500/20 text-emerald-300' },
  changed: { label: 'تغییرات منتشرنشده', cls: 'bg-amber-500/20 text-amber-300' },
};

function StatusBadge({ status }: { status?: RecordStatus }) {
  if (!status) return null;
  return <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${STATUS[status].cls}`}>{STATUS[status].label}</span>;
}

export default function HomePage() {
  const [mine, setMine] = useState<MyInvitation[]>(getMyInvitations);
  const [statuses, setStatuses] = useState<Record<string, RecordStatus>>({});
  const [adminRequired, setAdminRequired] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [all, setAll] = useState<RecordSummary[]>([]);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [issued, setIssued] = useState<{ name: string; url: string } | null>(null);

  useEffect(() => {
    hideSplash();
    document.title = 'سازنده دعوتنامه نمایشگاه';
    document.body.style.backgroundColor = '#020617';
    api.meta().then(m => setAdminRequired(m.adminRequired)).catch(() => {});
    if (getAdminPassword()) loadAdmin();
    // Current status of this browser's invitations
    for (const item of getMyInvitations()) {
      setEditAuth({ id: item.id, token: item.editToken });
      api
        .getRecord(item.id)
        .then(r => setStatuses(s => ({ ...s, [item.id]: r.status })))
        .catch(e => e.status === 404 && (forgetMyInvitation(item.id), setMine(getMyInvitations())));
    }
    setEditAuth(null);
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
    try {
      const r = await api.auth();
      if (!r.admin) throw new Error('رمز نادرست است');
      setError('');
      setPassword('');
      loadAdmin();
    } catch (err) {
      setAdminPassword('');
      setError((err as Error).message);
    }
  }

  async function remove(id: string, label: string, token?: string) {
    if (!confirm(`دعوتنامه «${label}» و فایل‌های آن برای همیشه حذف شود؟`)) return;
    try {
      setEditAuth(token ? { id, token } : null);
      await api.remove(id);
    } catch (e) {
      if ((e as { status?: number }).status !== 404) return alert((e as Error).message);
    } finally {
      setEditAuth(null);
    }
    forgetMyInvitation(id);
    setMine(getMyInvitations());
    setAll(a => a.filter(i => i.id !== id));
  }

  async function resetToken(item: RecordSummary) {
    if (!confirm(`برای «${item.company || item.id}» لینک ویرایش جدید صادر شود؟ لینک قبلی دیگر کار نمی‌کند.`)) return;
    try {
      const { editToken } = await api.resetToken(item.id);
      setIssued({ name: item.company || item.id, url: editUrl(item.id, editToken) });
      if (mine.some(m => m.id === item.id)) {
        saveMyInvitation({ id: item.id, editToken, slug: item.slug, company: item.company, event: item.event, createdAt: new Date().toISOString() });
        setMine(getMyInvitations());
      }
    } catch (e) {
      alert((e as Error).message);
    }
  }

  const mineIds = new Set(mine.map(m => m.id));
  const label = (company: string, event: string) => [company || 'بدون نام', event].filter(Boolean).join(' — ');

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
            اطلاعات را مرحله به مرحله وارد کنید؛ همه چیز خودکار ذخیره می‌شود. پیش‌نمایش را برای کارفرما بفرستید و وقتی همه چیز کامل شد، لینک نهایی را منتشر کنید.
          </p>
          <a href={route('builder')} className="mt-8 inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black px-7 py-4 rounded-2xl shadow-lg shadow-sky-500/20 transition">
            <Plus className="w-5 h-5" />
            ساخت دعوتنامه جدید
          </a>
        </div>

        {mine.length > 0 && (
          <section className="mb-10">
            <h2 className="font-black text-lg mb-3">دعوتنامه‌های ساخته‌شده در این مرورگر</h2>
            <ul className="space-y-2">
              {mine.map(item => (
                <li key={item.id} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl p-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{label(item.company, item.event)}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                      <StatusBadge status={statuses[item.id]} />
                      {item.slug && <span dir="ltr">{route(item.slug)}</span>}
                    </p>
                  </div>
                  {statuses[item.id] && statuses[item.id] !== 'draft' && (
                    <a href={route(item.slug)} target="_blank" rel="noreferrer" className="p-2 rounded-xl hover:bg-white/10" title="مشاهده">
                      <ExternalLink className="w-5 h-5" />
                    </a>
                  )}
                  <a href={editUrl(item.id, item.editToken)} className="p-2 rounded-xl hover:bg-white/10" title="ادامه ویرایش">
                    <Pencil className="w-5 h-5" />
                  </a>
                  <button onClick={() => remove(item.id, label(item.company, item.event), item.editToken)} className="p-2 rounded-xl hover:bg-red-500/20 text-red-300" title="حذف">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {isAdmin ? (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-black text-lg">همه دعوتنامه‌ها (مدیر)</h2>
              <button
                onClick={() => {
                  setAdminPassword('');
                  setIsAdmin(false);
                  setAll([]);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white"
              >
                <LogOut className="w-4 h-4" /> خروج مدیر
              </button>
            </div>
            {issued && (
              <div className="mb-3 rounded-2xl bg-amber-400/10 border border-amber-400/30 p-4 text-sm space-y-2">
                <p className="font-bold text-amber-200">لینک ویرایش جدید «{issued.name}» (فقط یک بار نمایش داده می‌شود):</p>
                <input dir="ltr" readOnly value={issued.url} onFocus={e => e.target.select()} className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-xs font-mono" />
              </div>
            )}
            {all.length === 0 && <p className="text-slate-400 text-sm">هنوز دعوتنامه‌ای ساخته نشده است.</p>}
            <ul className="space-y-2">
              {all.map(item => (
                <li key={item.id} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl p-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{label(item.company, item.event)}</p>
                    <p className="text-xs text-slate-400 flex flex-wrap items-center gap-2 mt-0.5">
                      <StatusBadge status={item.status} />
                      {item.slug && <span dir="ltr">{route(item.slug)}</span>}
                      <span>{new Date(item.updatedAt).toLocaleDateString('fa-IR')}</span>
                    </p>
                  </div>
                  {item.status !== 'draft' && (
                    <a href={route(item.slug)} target="_blank" rel="noreferrer" className="p-2 rounded-xl hover:bg-white/10" title="مشاهده">
                      <ExternalLink className="w-5 h-5" />
                    </a>
                  )}
                  <a href={route(`builder/${item.id}`)} className="p-2 rounded-xl hover:bg-white/10" title="ویرایش">
                    <Pencil className="w-5 h-5" />
                  </a>
                  <button onClick={() => resetToken(item)} className="p-2 rounded-xl hover:bg-white/10" title="صدور لینک ویرایش جدید">
                    <KeyRound className="w-5 h-5" />
                  </button>
                  {!mineIds.has(item.id) && (
                    <button onClick={() => remove(item.id, label(item.company, item.event))} className="p-2 rounded-xl hover:bg-red-500/20 text-red-300" title="حذف">
                      <Trash2 className="w-5 h-5" />
                    </button>
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
