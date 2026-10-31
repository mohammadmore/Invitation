import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Copy, Download, ExternalLink, Eye, Home, Loader2, Lock, MoreVertical, RotateCcw, Rocket, Sparkles, TriangleAlert, X, History } from 'lucide-react';
import InvitationView from '../invitation/InvitationView';
import { api, ApiError, editUrl, getAdminPassword, getMyInvitations, inviteUrl, saveMyInvitation, serverMeta, setAdminPassword, setEditAuth } from '../lib/api';
import { route } from '../lib/paths';
import { hideSplash } from '../lib/splash';
import { blankInvitation, sampleInvitation, sanitizeInvitation, validateForPublish, type InvitationConfig, type Issue, type IssueField } from '../shared/invitation';
import { ensureContrast } from '../shared/color';
import { jalaliRangeLabel, timeRangeLabel } from '../shared/calendar';
import { BasicsStep, BrandStep, EventStep, MediaStep, TextsStep, type SlugState, type Update } from '../builder/steps';
import { Section } from '../builder/ui';

const DRAFT_KEY = 'expo-invite-draft';
const editDraftKey = (slug: string) => `expo-invite-edit-draft:${slug}`;
const tokenKey = (slug: string) => `expo-invite-token:${slug}`;

const STEPS = [
  { title: 'اطلاعات پایه', preview: 1 },
  { title: 'برند و ظاهر', preview: 1 },
  { title: 'ویدئو و موزیک', preview: 1 },
  { title: 'متن‌ها', preview: 2 },
  { title: 'زمان و مکان', preview: 3 },
  { title: 'انتشار', preview: 1 },
] as const;

/** Which wizard step owns each validated field. */
const FIELD_STEP: Record<IssueField, number> = {
  slug: 0,
  'company.name': 0,
  'event.title': 0,
  'theme.font': 1,
  'footer.url': 3,
  'event.dates': 4,
  'event.time': 4,
  'event.location': 4,
  'event.mapUrl': 4,
  'event.boothMapUrl': 4,
};

function loadDraft(): InvitationConfig {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) return sanitizeInvitation(JSON.parse(raw));
  } catch {
    /* ignore */
  }
  return blankInvitation();
}

type LoadState = 'loading' | 'ready' | 'notfound' | 'locked' | 'error';

export default function BuilderPage({ editSlug: initialEditSlug }: { editSlug?: string }) {
  /** Slug being edited; becomes set after the first publish so later saves update instead of re-creating. */
  const [editSlug, setEditSlug] = useState(initialEditSlug);
  const isEdit = !!editSlug;
  const [config, setConfig] = useState<InvitationConfig>(() => (initialEditSlug ? blankInvitation() : loadDraft()));
  const [step, setStep] = useState(0);
  const [slugState, setSlugState] = useState<SlugState>('idle');
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [showPreview, setShowPreview] = useState(false);
  const [published, setPublished] = useState<{ slug: string; editToken?: string } | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [focus, setFocus] = useState({ step: 1, key: 0 });
  const [canEditFooter, setCanEditFooter] = useState(false);
  const [restorable, setRestorable] = useState<{ config: InvitationConfig; savedAt: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const stepperRef = useRef<HTMLOListElement>(null);

  const previewAt = useCallback((s: number) => setFocus(f => (f.step === s ? f : { step: s, key: f.key + 1 })), []);

  // ---------- initial load / access control ----------
  useEffect(() => {
    hideSplash();
    document.title = initialEditSlug ? 'ویرایش دعوتنامه' : 'ساخت دعوتنامه جدید';
    (async () => {
      const meta = await serverMeta();
      const auth = getAdminPassword() || !meta.adminRequired ? await api.auth().catch(() => ({ ok: false, admin: false })) : { ok: false, admin: false };
      setCanEditFooter(!meta.adminRequired || auth.admin);

      if (initialEditSlug) {
        // Edit token: from the URL fragment (never sent to server logs), this session, or this browser's list.
        const fromHash = decodeURIComponent(window.location.hash.slice(1));
        if (fromHash) {
          sessionStorage.setItem(tokenKey(initialEditSlug), fromHash);
          history.replaceState(null, '', window.location.pathname);
        }
        const token = fromHash || sessionStorage.getItem(tokenKey(initialEditSlug)) || getMyInvitations().find(i => i.slug === initialEditSlug)?.editToken || '';
        if (token) setEditAuth({ slug: initialEditSlug, token });
        let server: InvitationConfig;
        try {
          server = sanitizeInvitation(await api.get(initialEditSlug));
        } catch (e) {
          return setLoadState(e instanceof ApiError && e.status === 404 ? 'notfound' : 'error');
        }
        setConfig(server);
        if (!token && !auth.admin) return setLoadState('locked');
        // Unsaved edits from a previous visit?
        try {
          const saved = JSON.parse(localStorage.getItem(editDraftKey(initialEditSlug)) || 'null');
          if (saved?.config && JSON.stringify(sanitizeInvitation(saved.config)) !== JSON.stringify(server)) setRestorable({ config: sanitizeInvitation(saved.config), savedAt: saved.savedAt });
          else localStorage.removeItem(editDraftKey(initialEditSlug));
        } catch {
          /* ignore */
        }
        return setLoadState('ready');
      }
      if (meta.adminRequired && !auth.ok) return setLoadState('locked');
      setLoadState('ready');
    })();
  }, [initialEditSlug]);

  // ---------- autosave (draft for new invitations, unsaved edits for existing ones) ----------
  useEffect(() => {
    if (loadState !== 'ready' || !dirty) return;
    const t = window.setTimeout(() => {
      try {
        if (editSlug) localStorage.setItem(editDraftKey(editSlug), JSON.stringify({ config, savedAt: new Date().toISOString() }));
        else localStorage.setItem(DRAFT_KEY, JSON.stringify(config));
      } catch {
        /* storage full / private mode */
      }
    }, 400);
    return () => window.clearTimeout(t);
  }, [config, editSlug, loadState, dirty]);

  useEffect(() => {
    if (!dirty || !isEdit) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty, isEdit]);

  // Only one audio source at a time (music samples vs. preview music).
  useEffect(() => {
    const onPlay = (e: Event) => document.querySelectorAll('audio').forEach(a => a !== e.target && a.pause());
    document.addEventListener('play', onPlay, true);
    return () => document.removeEventListener('play', onPlay, true);
  }, []);

  // Keep the active step visible in the (horizontally scrolling) stepper on phones.
  useEffect(() => {
    stepperRef.current?.children[step]?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [step]);

  const update: Update = useCallback((section, patch) => {
    setDirty(true);
    setPublished(null);
    setConfig(c => {
      const current = c[section];
      const value = typeof current === 'object' && current !== null ? { ...current, ...(patch as object) } : patch;
      return { ...c, [section]: value } as InvitationConfig;
    });
  }, []);

  // ---------- validation ----------
  const allIssues = useMemo<Issue[]>(() => {
    const list = validateForPublish(config);
    if (!isEdit && slugState === 'taken') list.unshift({ field: 'slug', message: 'این آدرس لینک قبلاً گرفته شده است.' });
    return list;
  }, [config, isEdit, slugState]);
  const issuesOf = (s: number) => allIssues.filter(i => FIELD_STEP[i.field] === s);
  const firstBlockedStep = useMemo(() => {
    const steps = allIssues.map(i => FIELD_STEP[i.field]);
    return steps.length ? Math.min(...steps) : Infinity;
  }, [allIssues]);

  const goStep = (i: number) => {
    setStep(i);
    previewAt(STEPS[i].preview);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /** Move to step `i`, but not past a step that still has blocking problems. */
  const tryGoStep = (i: number) => {
    if (i > firstBlockedStep && i !== step) {
      setRevealed(r => new Set(r).add(firstBlockedStep));
      return goStep(firstBlockedStep);
    }
    goStep(i);
  };

  const next = () => {
    if (issuesOf(step).length) return setRevealed(r => new Set(r).add(step));
    tryGoStep(Math.min(step + 1, STEPS.length - 1));
  };

  const shownIssues = revealed.has(step) ? issuesOf(step) : [];

  // ---------- publish ----------
  async function publish() {
    setPublishError('');
    if (allIssues.length) {
      setRevealed(new Set(allIssues.map(i => FIELD_STEP[i.field])));
      return;
    }
    setPublishing(true);
    try {
      if (editSlug) {
        await api.update(editSlug, config);
        localStorage.removeItem(editDraftKey(editSlug));
        setPublished({ slug: editSlug });
      } else {
        const r = await api.create(config);
        saveMyInvitation({ slug: r.slug, editToken: r.editToken, company: config.company.name, event: config.event.title, createdAt: new Date().toISOString() });
        localStorage.removeItem(DRAFT_KEY);
        // From now on this page edits the published invitation (re-publishing must update, not re-create).
        sessionStorage.setItem(tokenKey(r.slug), r.editToken);
        setEditAuth({ slug: r.slug, token: r.editToken });
        setEditSlug(r.slug);
        history.replaceState(null, '', route(`builder/${r.slug}`));
        document.title = 'ویرایش دعوتنامه';
        setPublished(r);
      }
      setDirty(false);
    } catch (e) {
      const err = e as ApiError;
      setPublishError(err.message);
      if (err.field) {
        setRevealed(r => new Set(r).add(FIELD_STEP[err.field!]));
        if (err.field === 'slug') setSlugState('taken');
      }
    } finally {
      setPublishing(false);
    }
  }

  const fillSample = () => {
    if (!confirm('متن‌ها و تنظیمات با نمونه جایگزین شوند؟ لوگوها و آدرس لینک شما حفظ می‌شود.')) return;
    setConfig(c => {
      const sample = sampleInvitation(c);
      // Sample dates: a month from now (the original sample event may already be over).
      const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
      const e = sample.event;
      Object.assign(e, { startDate: day(30), endDate: day(32) });
      e.dateLabel = jalaliRangeLabel(e.startDate, e.endDate);
      e.timeLabel = timeRangeLabel(e.startTime, e.endTime, e.timezone);
      return sample;
    });
    setDirty(true);
    setMenuOpen(false);
  };
  const resetAll = () => {
    if (!confirm('همه اطلاعات واردشده پاک شود؟')) return;
    setConfig(blankInvitation());
    setRevealed(new Set());
    setSlugState('idle');
    setDirty(false);
    localStorage.removeItem(DRAFT_KEY);
    goStep(0);
  };

  if (loadState === 'loading') {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
      </div>
    );
  }
  if (loadState === 'notfound') return <CenteredMessage title="دعوتنامه پیدا نشد" text="ممکن است حذف شده باشد یا آدرس اشتباه باشد." />;
  if (loadState === 'error') return <CenteredMessage title="ارتباط با سرور برقرار نشد" text="اتصال اینترنت را بررسی کنید و صفحه را دوباره باز کنید." retry />;
  if (loadState === 'locked') return <AdminGate isEdit={isEdit} onUnlock={() => window.location.reload()} />;

  const isLast = step === STEPS.length - 1;
  const stepProps = { config, update, isEdit, issues: shownIssues, previewAt, canEditFooter };
  const shareUrl = config.slug ? inviteUrl(config.slug) : undefined;

  return (
    <div className="min-h-[100dvh] bg-slate-100 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
          <a href={route()} className="p-2 -mr-2 rounded-xl hover:bg-slate-100 text-slate-600" title="صفحه اصلی">
            <Home className="w-5 h-5" />
          </a>
          <h1 className="font-black text-sm sm:text-base truncate">{isEdit ? `ویرایش دعوتنامه «${config.company.name}»` : 'ساخت دعوتنامه جدید'}</h1>
          <div className="flex-1" />
          {!isEdit && (
            <>
              <div className="hidden sm:flex items-center gap-1">
                <button onClick={fillSample} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl px-3 py-2">
                  <Sparkles className="w-4 h-4" /> پر کردن با نمونه
                </button>
                <button onClick={resetAll} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl px-3 py-2">
                  <RotateCcw className="w-4 h-4" /> شروع دوباره
                </button>
              </div>
              <div className="relative sm:hidden">
                <button onClick={() => setMenuOpen(o => !o)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-600" aria-label="گزینه‌ها">
                  <MoreVertical className="w-5 h-5" />
                </button>
                {menuOpen && (
                  <div className="absolute left-0 top-11 z-40 w-48 bg-white rounded-2xl border border-slate-200 shadow-xl p-1.5">
                    <button onClick={fillSample} className="w-full flex items-center gap-2 text-sm font-bold text-slate-700 hover:bg-slate-100 rounded-xl px-3 py-2.5">
                      <Sparkles className="w-4 h-4" /> پر کردن با نمونه
                    </button>
                    <button onClick={resetAll} className="w-full flex items-center gap-2 text-sm font-bold text-slate-700 hover:bg-slate-100 rounded-xl px-3 py-2.5">
                      <RotateCcw className="w-4 h-4" /> شروع دوباره
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        {/* Stepper */}
        <nav className="max-w-7xl mx-auto px-4 pb-3 overflow-x-auto [scrollbar-width:none]">
          <ol ref={stepperRef} className="flex items-center gap-1 min-w-max">
            {STEPS.map((s, i) => {
              const hasIssue = revealed.has(i) && issuesOf(i).length > 0;
              return (
                <li key={s.title} className="flex items-center gap-1">
                  <button
                    onClick={() => tryGoStep(i)}
                    className={`flex items-center gap-2 rounded-full pl-3 pr-1 py-1 text-xs font-bold transition ${i === step ? 'bg-sky-500 text-white' : hasIssue ? 'text-rose-600 hover:bg-rose-50' : i < step ? 'text-sky-700 hover:bg-sky-50' : 'text-slate-500 hover:bg-slate-100'}`}
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center ${i === step ? 'bg-white/25' : hasIssue ? 'bg-rose-100' : i < step ? 'bg-sky-100' : 'bg-slate-200'}`}>
                      {hasIssue && i !== step ? '!' : i < step ? <Check className="w-3.5 h-3.5" /> : (i + 1).toLocaleString('fa-IR')}
                    </span>
                    {s.title}
                  </button>
                  {i < STEPS.length - 1 && <span className="w-4 h-px bg-slate-300" />}
                </li>
              );
            })}
          </ol>
        </nav>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 md:grid md:grid-cols-[minmax(0,1fr)_320px] lg:grid-cols-[minmax(0,1fr)_400px] md:gap-6 lg:gap-8">
        {/* Form */}
        <main className="space-y-4 pb-28 md:pb-8 min-w-0">
          {restorable && (
            <div className="rounded-2xl bg-sky-50 border border-sky-200 p-4 flex flex-wrap items-center gap-3">
              <History className="w-5 h-5 text-sky-600" />
              <p className="text-sm text-sky-900 flex-1 min-w-[200px]">
                تغییرات ذخیره‌نشده‌ای از {new Date(restorable.savedAt).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' })} پیدا شد.
              </p>
              <button
                onClick={() => {
                  setConfig(restorable.config);
                  setDirty(true);
                  setRestorable(null);
                }}
                className="rounded-xl bg-sky-500 text-white text-xs font-bold px-3 py-2"
              >
                بازیابی
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem(editDraftKey(editSlug!));
                  setRestorable(null);
                }}
                className="rounded-xl border border-sky-300 text-sky-800 text-xs font-bold px-3 py-2"
              >
                نادیده گرفتن
              </button>
            </div>
          )}

          {step === 0 && <BasicsStep {...stepProps} slugState={slugState} setSlugState={setSlugState} />}
          {step === 1 && <BrandStep {...stepProps} />}
          {step === 2 && <MediaStep {...stepProps} />}
          {step === 3 && <TextsStep {...stepProps} />}
          {step === 4 && <EventStep {...stepProps} />}
          {step === 5 && (
            <PublishStep
              config={config}
              isEdit={isEdit}
              wasNew={!initialEditSlug}
              issues={allIssues}
              published={published}
              publishing={publishing}
              error={publishError}
              onPublish={publish}
              onFix={field => {
                setRevealed(r => new Set(r).add(FIELD_STEP[field]));
                goStep(FIELD_STEP[field]);
              }}
              goStep={goStep}
            />
          )}

          {shownIssues.length > 0 && (
            <div className="rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm p-4 space-y-1">
              {shownIssues.map(e => (
                <p key={e.message} className="flex items-center gap-2">
                  <TriangleAlert className="w-4 h-4 shrink-0" />
                  {e.message}
                </p>
              ))}
            </div>
          )}

          {/* Navigation */}
          <div className="fixed md:static bottom-0 inset-x-0 z-20 bg-white/95 md:bg-transparent backdrop-blur border-t md:border-0 border-slate-200 p-3 md:p-0 flex items-center gap-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              onClick={() => goStep(Math.max(0, step - 1))}
              disabled={step === 0}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-3 font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-40"
            >
              <ArrowRight className="w-4 h-4" /> قبلی
            </button>
            <button onClick={() => setShowPreview(true)} className="md:hidden inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-3 font-bold text-slate-700 bg-white border border-slate-300">
              <Eye className="w-4 h-4" /> پیش‌نمایش
            </button>
            <div className="flex-1" />
            {!isLast && (
              <button onClick={next} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-6 py-3 font-black text-white bg-sky-500 hover:bg-sky-600 shadow-lg shadow-sky-500/20">
                مرحله بعد <ArrowLeft className="w-4 h-4" />
              </button>
            )}
          </div>
        </main>

        {/* Live preview (tablet & desktop) */}
        <aside className="hidden md:block">
          <div className="sticky top-32">
            <PhoneFrame>
              <InvitationView config={config} embedded focus={focus} shareUrl={shareUrl} />
            </PhoneFrame>
            <p className="text-center text-xs text-slate-500 mt-3">پیش‌نمایش زنده — روی دکمه‌ها کلیک کنید</p>
          </div>
        </aside>
      </div>

      {/* Live preview (phone overlay) */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-slate-950 md:hidden">
          <InvitationView config={config} embedded focus={focus} shareUrl={shareUrl} />
          <button onClick={() => setShowPreview(false)} className="absolute top-4 right-4 z-[200] inline-flex items-center gap-1.5 bg-white text-slate-900 rounded-full pl-4 pr-3 py-2 shadow-xl text-sm font-bold" aria-label="بستن پیش‌نمایش">
            <X className="w-5 h-5" /> بازگشت به ویرایش
          </button>
        </div>
      )}
    </div>
  );
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[360px] h-[min(740px,calc(100dvh-11rem))] rounded-[2.75rem] border-[10px] border-slate-900 bg-slate-900 shadow-2xl overflow-hidden relative">
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-5 bg-slate-900 rounded-full z-[300]" />
      <div className="w-full h-full rounded-[2rem] overflow-hidden relative">{children}</div>
    </div>
  );
}

function CenteredMessage({ title, text, retry }: { title: string; text: string; retry?: boolean }) {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-3 bg-slate-100 p-6 text-center">
      <p className="text-2xl font-black text-slate-900">{title}</p>
      <p className="text-slate-500">{text}</p>
      <div className="flex gap-3 mt-3">
        {retry && (
          <button onClick={() => window.location.reload()} className="rounded-xl bg-sky-500 text-white font-bold px-4 py-2">
            تلاش دوباره
          </button>
        )}
        <a href={route()} className="rounded-xl border border-slate-300 font-bold px-4 py-2 text-slate-700">
          صفحه اصلی
        </a>
      </div>
    </div>
  );
}

function AdminGate({ isEdit, onUnlock }: { isEdit: boolean; onUnlock: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setAdminPassword(password);
    try {
      const r = await api.auth();
      if ((isEdit && r.admin) || (!isEdit && r.ok)) return onUnlock();
      setError('رمز نادرست است');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
    setAdminPassword('');
  }
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-slate-100 p-6">
      <form onSubmit={submit} className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8 w-full max-w-sm text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center">
          <Lock className="w-6 h-6" />
        </div>
        <h1 className="font-black text-lg">{isEdit ? 'برای ویرایش، لینک ویرایش یا رمز مدیر لازم است' : 'ورود به سازنده دعوتنامه'}</h1>
        {isEdit && <p className="text-xs text-slate-500 leading-relaxed">اگر لینک ویرایش را گم کرده‌اید، مدیر سامانه می‌تواند لینک جدید برایتان صادر کند.</p>}
        <input type="password" autoFocus value={password} onChange={e => setPassword(e.target.value)} placeholder="رمز مدیر" className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 outline-none focus:border-sky-500" />
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button disabled={busy} className="w-full rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-60 text-white font-black py-3">
          ورود
        </button>
      </form>
    </div>
  );
}

function CopyButton({ text, label = 'کپی' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text).catch(() => {});
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      }}
      className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold px-3 py-2.5 hover:bg-slate-700"
    >
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      {copied ? 'کپی شد' : label}
    </button>
  );
}

function downloadText(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function PublishStep({
  config,
  isEdit,
  wasNew,
  issues,
  published,
  publishing,
  error,
  onPublish,
  onFix,
  goStep,
}: {
  config: InvitationConfig;
  isEdit: boolean;
  wasNew: boolean;
  issues: Issue[];
  published: { slug: string; editToken?: string } | null;
  publishing: boolean;
  error: string;
  onPublish: () => void;
  onFix: (field: IssueField) => void;
  goStep: (i: number) => void;
}) {
  const [qr, setQr] = useState('');
  const url = published ? inviteUrl(published.slug) : '';
  // QR codes need strong contrast to scan reliably, whatever the brand colour is.
  const qrColor = ensureContrast(config.theme.primary, '#ffffff', 7);

  useEffect(() => {
    if (!url) return setQr('');
    let cancelled = false;
    import('qrcode')
      .then(QR => QR.toDataURL(url, { width: 640, margin: 2, color: { dark: qrColor, light: '#ffffff' }, errorCorrectionLevel: 'M' }))
      .then(d => !cancelled && setQr(d))
      .catch(() => setQr(''));
    return () => {
      cancelled = true;
    };
  }, [url, qrColor]);

  const checklist = [
    { ok: !!config.company.logo, text: 'لوگوی شرکت', step: 1 },
    { ok: !!config.media.video, text: 'ویدئوی پس‌زمینه', step: 2 },
    { ok: !!config.event.booth, text: 'شماره غرفه', step: 4 },
    { ok: !!config.event.mapUrl, text: 'لینک مسیریابی', step: 4 },
  ];

  if (published) {
    const edit = published.editToken ? editUrl(published.slug, published.editToken) : '';
    return (
      <Section title={wasNew && published.editToken ? 'دعوتنامه منتشر شد 🎉' : 'تغییرات ذخیره شد'} description="این لینک را برای مهمانان ارسال کنید یا کد QR را روی کارت‌های چاپی قرار دهید.">
        <div className="flex flex-wrap gap-2">
          <input dir="ltr" readOnly value={url} className="flex-1 min-w-[200px] rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-mono" onFocus={e => e.target.select()} />
          <CopyButton text={url} label="کپی لینک" />
          <a href={url} target="_blank" rel="noreferrer" className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-slate-300 text-xs font-bold px-3 py-2.5 hover:bg-slate-50">
            <ExternalLink className="w-4 h-4" /> مشاهده
          </a>
        </div>

        {qr && (
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 rounded-2xl p-4">
            <img src={qr} alt="QR" className="w-40 h-40 rounded-xl bg-white" />
            <div className="space-y-2 text-center sm:text-right">
              <p className="font-bold text-sm">کد QR دعوتنامه</p>
              <p className="text-xs text-slate-500 leading-relaxed">برای چاپ روی کارت ویزیت، بنر یا دعوتنامه کاغذی.</p>
              <a href={qr} download={`invite-${published.slug}-qr.png`} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold px-3 py-2.5">
                <Download className="w-4 h-4" /> دانلود QR
              </a>
            </div>
          </div>
        )}

        {edit && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 space-y-2">
            <p className="font-bold text-amber-800 text-sm flex items-center gap-2">
              <TriangleAlert className="w-4 h-4" /> لینک ویرایش را نگه دارید
            </p>
            <p className="text-xs text-amber-700 leading-relaxed">
              هر کس این لینک را داشته باشد می‌تواند دعوتنامه را ویرایش یا حذف کند؛ آن را با مهمانان به اشتراک نگذارید. اگر گمش کنید، مدیر سامانه می‌تواند لینک جدید صادر کند.
            </p>
            <div className="flex flex-wrap gap-2">
              <input dir="ltr" readOnly value={edit} className="flex-1 min-w-[200px] rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-xs font-mono" onFocus={e => e.target.select()} />
              <CopyButton text={edit} />
              <button
                type="button"
                onClick={() =>
                  downloadText(
                    `invite-${published.slug}.txt`,
                    `دعوتنامه ${config.company.name} - ${config.event.title}\n\nلینک مهمانان:\n${url}\n\nلینک ویرایش (محرمانه):\n${edit}\n`,
                  )
                }
                className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-amber-300 text-amber-900 text-xs font-bold px-3 py-2.5 hover:bg-amber-100"
              >
                <Download className="w-4 h-4" /> ذخیره در فایل
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          <button type="button" onClick={() => goStep(0)} className="rounded-xl border border-slate-300 text-sm font-bold px-4 py-2.5 hover:bg-slate-50">
            ادامه ویرایش
          </button>
          <a href={route('builder')} className="rounded-xl border border-slate-300 text-sm font-bold px-4 py-2.5 hover:bg-slate-50">
            ساخت دعوتنامه دیگر
          </a>
        </div>
      </Section>
    );
  }

  return (
    <Section title={isEdit ? 'ذخیره تغییرات' : 'آماده انتشار'} description="پیش‌نمایش را بررسی کنید؛ پس از انتشار، دعوتنامه از طریق لینک اختصاصی در دسترس خواهد بود.">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm bg-slate-50 rounded-2xl p-4">
        <dt className="text-slate-500">شرکت</dt>
        <dd className="font-bold break-words">{config.company.name || '—'}</dd>
        <dt className="text-slate-500">نمایشگاه</dt>
        <dd className="font-bold break-words">{config.event.title || '—'}</dd>
        <dt className="text-slate-500">زمان</dt>
        <dd className="font-bold">{config.event.dateLabel || '—'}</dd>
        <dt className="text-slate-500">لینک</dt>
        <dd dir="ltr" className="font-mono text-xs text-right self-center break-all">
          {config.slug ? inviteUrl(config.slug) : '—'}
        </dd>
      </dl>

      {checklist.some(c => !c.ok) && (
        <div className="text-sm space-y-1.5">
          <p className="font-bold text-slate-700">موارد اختیاری که هنوز تکمیل نشده‌اند:</p>
          {checklist
            .filter(c => !c.ok)
            .map(c => (
              <button key={c.text} type="button" onClick={() => goStep(c.step)} className="flex items-center gap-2 text-slate-600 hover:text-sky-600">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> {c.text}
              </button>
            ))}
        </div>
      )}

      {issues.length > 0 && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 space-y-1.5">
          <p className="text-sm font-bold text-rose-800">قبل از انتشار این موارد را اصلاح کنید:</p>
          {issues.map(p => (
            <button key={p.message} type="button" onClick={() => onFix(p.field)} className="flex items-center gap-2 text-sm text-rose-700 hover:underline text-right">
              <TriangleAlert className="w-4 h-4 shrink-0" /> {p.message}
              <span className="text-xs font-bold text-rose-500 whitespace-nowrap">← {STEPS[FIELD_STEP[p.field]].title}</span>
            </button>
          ))}
        </div>
      )}
      {error && issues.length === 0 && <div className="rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm p-4 whitespace-pre-line">{error}</div>}

      <button
        onClick={onPublish}
        disabled={publishing || issues.length > 0}
        className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-500 hover:bg-sky-600 disabled:bg-slate-300 text-white font-black py-4 shadow-lg shadow-sky-500/20"
      >
        {publishing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Rocket className="w-5 h-5" />}
        {isEdit ? 'ذخیره تغییرات' : 'انتشار و دریافت لینک'}
      </button>
    </Section>
  );
}
