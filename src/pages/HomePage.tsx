import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Pencil, Plus, Trash2, Sparkles, Lock, KeyRound, LogOut, CopyPlus, Settings, Search, Eye, Users, MessageSquare, CircleCheck } from 'lucide-react';
import { DuplicateModal } from '../builder/panels';
import type { CopyMode } from '../shared/invitation';
import { api, editUrl, forgetMyInvitation, getAdminPassword, getMyInvitations, saveMyInvitation, setAdminPassword, setEditAuth, type MyInvitation, type RecordStatus, type RecordSummary } from '../lib/api';
import { route } from '../lib/paths';
import { hideSplash } from '../lib/splash';
import { ColorModeToggle, scopeClass, useAdminTheme } from '../lib/adminTheme';

type Filter = 'all' | 'draft' | 'published' | 'changed' | 'ended' | 'feedback';
const FILTERS: [Filter, string][] = [
  ['all', 'همه'],
  ['draft', 'پیش‌نویس'],
  ['published', 'منتشرشده'],
  ['changed', 'تغییرات منتشرنشده'],
  ['ended', 'تمام‌شده'],
  ['feedback', 'نظر جدید کارفرما'],
];

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
  // Markup is written dark; light mode inverts it
  const { style: palette, mode } = useAdminTheme(null, 'dark');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [copyFrom, setCopyFrom] = useState<{ id: string; token?: string } | null>(null);

  useEffect(() => {
    hideSplash();
    document.title = 'سازنده دعوتنامه نمایشگاه';
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

  async function duplicate(mode: CopyMode) {
    setEditAuth(copyFrom?.token ? { id: copyFrom.id, token: copyFrom.token } : null);
    const r = await api.duplicate(copyFrom!.id, mode);
    setEditAuth(null);
    saveMyInvitation({ id: r.id, editToken: r.editToken, slug: '', company: r.company, event: r.event, createdAt: new Date().toISOString() });
    window.location.href = editUrl(r.id, r.editToken);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter(i => {
      if (q && ![i.company, i.event, i.slug, i.id].some(v => v.toLowerCase().includes(q))) return false;
      switch (filter) {
        case 'draft':
          return i.status === 'draft';
        case 'published':
          return i.status !== 'draft' && !i.ended;
        case 'changed':
          return i.status === 'changed';
        case 'ended':
          return i.ended;
        case 'feedback':
          return i.openFeedback > 0;
        default:
          return true;
      }
    });
  }, [all, query, filter]);
  const countOf = (f: Filter) => all.filter(i => (f === 'all' ? true : f === 'draft' ? i.status === 'draft' : f === 'published' ? i.status !== 'draft' && !i.ended : f === 'changed' ? i.status === 'changed' : f === 'ended' ? i.ended : i.openFeedback > 0)).length;
  const label = (company: string, event: string) => [company || 'بدون نام', event].filter(Boolean).join(' — ');

  return (
    <div className="min-h-[100dvh] admin-bg text-slate-50" style={palette}>
      <div className="relative max-w-3xl mx-auto px-5 py-12">
        <ColorModeToggle className="absolute top-4 left-4 text-slate-300" />
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 text-(color:--ad-ink) bg-(color:--ad-ink)/10 border border-(color:--ad-ink)/20 rounded-full px-4 py-1.5 text-sm font-bold mb-5">
            <Sparkles className="w-4 h-4" />
            سازنده دعوتنامه دیجیتال نمایشگاه
          </div>
          <h1 className="text-3xl sm:text-4xl font-black leading-tight mb-4">
            دعوتنامه اختصاصی شرکت خود را <span className="text-gradient-ad">در چند دقیقه</span> بسازید
          </h1>
          <p className="text-slate-400 leading-relaxed max-w-xl mx-auto">
            اطلاعات را مرحله به مرحله وارد کنید؛ همه چیز خودکار ذخیره می‌شود. پیش‌نمایش را برای کارفرما بفرستید و وقتی همه چیز کامل شد، لینک نهایی را منتشر کنید.
          </p>
          <a href={route('builder')} className="mt-8 inline-flex items-center gap-2 btn-ad hover:brightness-110 text-white font-black px-7 py-4 rounded-2xl shadow-lg shadow-(color:--ad-ink)/20 transition">
            <Plus className="w-5 h-5" />
            ساخت دعوتنامه جدید
          </a>
        </div>

        {mine.length > 0 && (
          <section className="mb-10">
            <h2 className="font-black text-lg mb-3">دعوتنامه‌های ساخته‌شده در این مرورگر</h2>
            <ul className="space-y-2">
              {mine.map(item => (
                <li key={item.id} className="flex items-center gap-2 glass rounded-2xl p-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{label(item.company, item.event)}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                      <StatusBadge status={statuses[item.id]} />
                      {item.slug && <span dir="ltr">{route(item.slug)}</span>}
                    </p>
                  </div>
                  {statuses[item.id] && statuses[item.id] !== 'draft' && (
                    <a href={route(item.slug)} target="_blank" rel="noreferrer" className="p-2 rounded-xl hover:bg-slate-50/10" title="مشاهده">
                      <ExternalLink className="w-5 h-5" />
                    </a>
                  )}
                  <a href={editUrl(item.id, item.editToken)} className="p-2 rounded-xl hover:bg-slate-50/10" title="ادامه ویرایش">
                    <Pencil className="w-5 h-5" />
                  </a>
                  <button onClick={() => setCopyFrom({ id: item.id, token: item.editToken })} className="p-2 rounded-xl hover:bg-slate-50/10" title="ساخت دعوتنامه جدید از روی این دعوتنامه">
                    <CopyPlus className="w-5 h-5" />
                  </button>
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
              <span className="flex items-center gap-3">
                <a href={route('settings')} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-slate-50">
                  <Settings className="w-4 h-4" /> تنظیمات سامانه
                </a>
                <button
                  onClick={() => {
                    setAdminPassword('');
                    setIsAdmin(false);
                    setAll([]);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-50"
                >
                  <LogOut className="w-4 h-4" /> خروج مدیر
                </button>
              </span>
            </div>
            {issued && (
              <div className="mb-3 rounded-2xl bg-amber-400/10 border border-amber-400/30 p-4 text-sm space-y-2">
                <p className="font-bold text-amber-200">لینک ویرایش جدید «{issued.name}» (فقط یک بار نمایش داده می‌شود):</p>
                <input dir="ltr" readOnly value={issued.url} onFocus={e => e.target.select()} className="w-full rounded-xl bg-slate-950/30 border border-slate-50/10 px-3 py-2 text-xs font-mono" />
              </div>
            )}
            {all.length === 0 && <p className="text-slate-400 text-sm">هنوز دعوتنامه‌ای ساخته نشده است.</p>}
            {all.length > 0 && (
              <div className="mb-3 space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input value={query} onChange={e => setQuery(e.target.value)} placeholder="جست‌وجو در نام شرکت، نمایشگاه یا آدرس…" className="w-full glass rounded-xl pr-9 pl-3 py-2.5 text-sm outline-none focus:border-(color:--ad-ink)" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {FILTERS.map(([f, label]) => (
                    <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1 text-xs font-bold transition ${filter === f ? 'btn-ad text-white' : 'bg-slate-50/5 text-slate-300 hover:bg-slate-50/10'}`}>
                      {label} ({countOf(f).toLocaleString('fa-IR')})
                    </button>
                  ))}
                </div>
              </div>
            )}
            {all.length > 0 && filtered.length === 0 && <p className="text-slate-400 text-sm">موردی پیدا نشد.</p>}
            <ul className="space-y-2">
              {filtered.map(item => (
                <li key={item.id} className="flex items-center gap-2 glass rounded-2xl p-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{label(item.company, item.event)}</p>
                    <p className="text-xs text-slate-400 flex flex-wrap items-center gap-2 mt-0.5">
                      <StatusBadge status={item.status} />
                      {item.ended && <span className="text-[10px] font-bold rounded-full px-2 py-0.5 bg-slate-700 text-slate-300">تمام‌شده</span>}
                      {item.approved && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2 py-0.5 bg-emerald-500/20 text-emerald-300">
                          <CircleCheck className="w-3 h-3" /> تأیید کارفرما
                        </span>
                      )}
                      {item.openFeedback > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2 py-0.5 bg-amber-500/20 text-amber-300">
                          <MessageSquare className="w-3 h-3" /> {item.openFeedback.toLocaleString('fa-IR')} نظر
                        </span>
                      )}
                      {item.slug && <span dir="ltr">{route(item.slug)}</span>}
                      <span>{new Date(item.updatedAt).toLocaleDateString('fa-IR')}</span>
                      {item.views > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Eye className="w-3 h-3" /> {item.views.toLocaleString('fa-IR')}
                        </span>
                      )}
                      {item.rsvps > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Users className="w-3 h-3" /> {item.rsvps.toLocaleString('fa-IR')}
                        </span>
                      )}
                    </p>
                  </div>
                  {item.status !== 'draft' && (
                    <a href={route(item.slug)} target="_blank" rel="noreferrer" className="p-2 rounded-xl hover:bg-slate-50/10" title="مشاهده">
                      <ExternalLink className="w-5 h-5" />
                    </a>
                  )}
                  <a href={route(`builder/${item.id}`)} className="p-2 rounded-xl hover:bg-slate-50/10" title="ویرایش">
                    <Pencil className="w-5 h-5" />
                  </a>
                  <button onClick={() => setCopyFrom({ id: item.id })} className="p-2 rounded-xl hover:bg-slate-50/10" title="ساخت دعوتنامه جدید از روی این دعوتنامه">
                    <CopyPlus className="w-5 h-5" />
                  </button>
                  <button onClick={() => resetToken(item)} className="p-2 rounded-xl hover:bg-slate-50/10" title="صدور لینک ویرایش جدید">
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
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="رمز مدیر" className="bg-slate-50/5 border border-slate-50/10 rounded-xl px-3 py-2 outline-none focus:border-(color:--ad-ink)" />
              <button className="bg-slate-50/10 hover:bg-slate-50/20 rounded-xl px-4 py-2 font-bold">ورود مدیر</button>
              {error && <span className="text-red-300 w-full text-center">{error}</span>}
            </form>
          )
        )}
      </div>
      <div className={`text-slate-900 ${scopeClass(mode, 'light')}`}>{copyFrom && <DuplicateModal onClose={() => setCopyFrom(null)} onCopy={duplicate} />}</div>
    </div>
  );
}
