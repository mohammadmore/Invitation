import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { ArrowLeft, ArrowRight, Check, Copy, Download, ExternalLink, Eye, Home, Loader2, Lock, RotateCcw, Rocket, Sparkles, TriangleAlert, X } from 'lucide-react';
import InvitationView from '../invitation/InvitationView';
import { api, editUrl, getAdminPassword, getMyInvitations, inviteUrl, saveMyInvitation, setAdminPassword, setEditAuth } from '../lib/api';
import { hideSplash } from '../lib/splash';
import { blankInvitation, DEFAULT_INVITATION, sanitizeInvitation, SLUG_RE, validateForPublish, type InvitationConfig } from '../shared/invitation';
import { BasicsStep, BrandStep, EventStep, MediaStep, TextsStep, type SlugState, type Update } from '../builder/steps';
import { Section } from '../builder/ui';

const DRAFT_KEY = 'expo-invite-draft';
const tokenKey = (slug: string) => `expo-invite-token:${slug}`;

const STEPS = [
  { title: 'اطلاعات پایه', preview: 1 },
  { title: 'برند و ظاهر', preview: 1 },
  { title: 'ویدئو و موزیک', preview: 1 },
  { title: 'متن‌ها', preview: 2 },
  { title: 'زمان و مکان', preview: 3 },
  { title: 'انتشار', preview: 1 },
] as const;

function loadDraft(): InvitationConfig {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) return sanitizeInvitation(JSON.parse(raw));
  } catch {
    /* ignore */
  }
  return blankInvitation();
}

type LoadState = 'loading' | 'ready' | 'notfound' | 'locked';

export default function BuilderPage({ editSlug }: { editSlug?: string }) {
  const isEdit = !!editSlug;
  const [config, setConfig] = useState<InvitationConfig>(() => (isEdit ? blankInvitation() : loadDraft()));
  const [step, setStep] = useState(0);
  const [slugState, setSlugState] = useState<SlugState>('idle');
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [showPreview, setShowPreview] = useState(false);
  const [published, setPublished] = useState<{ slug: string; editToken?: string } | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [dirty, setDirty] = useState(false);

  // ---------- initial load / access control ----------
  useEffect(() => {
    hideSplash();
    document.title = isEdit ? 'ویرایش دعوتنامه' : 'ساخت دعوتنامه جدید';
    (async () => {
      if (isEdit) {
        // Edit token: from the URL fragment (never sent to the server logs), session, or this browser's list.
        const fromHash = decodeURIComponent(window.location.hash.slice(1));
        if (fromHash) {
          sessionStorage.setItem(tokenKey(editSlug), fromHash);
          history.replaceState(null, '', window.location.pathname);
        }
        const token = fromHash || sessionStorage.getItem(tokenKey(editSlug)) || getMyInvitations().find(i => i.slug === editSlug)?.editToken || '';
        if (token) setEditAuth({ slug: editSlug, token });
        try {
          const c = await api.get(editSlug);
          setConfig(sanitizeInvitation(c));
        } catch {
          return setLoadState('notfound');
        }
        if (!token) {
          const auth = getAdminPassword() ? await api.auth().catch(() => ({ admin: false })) : { admin: false };
          if (!auth.admin) return setLoadState('locked');
        }
        return setLoadState('ready');
      }
      const meta = await api.meta().catch(() => ({ adminRequired: false }));
      if (meta.adminRequired) {
        const auth = getAdminPassword() ? await api.auth().catch(() => ({ ok: false })) : { ok: false };
        if (!auth.ok) return setLoadState('locked');
      }
      setLoadState('ready');
    })();
  }, [isEdit, editSlug]);

  // ---------- draft autosave (new invitations only) ----------
  useEffect(() => {
    if (isEdit || loadState !== 'ready') return;
    const t = window.setTimeout(() => localStorage.setItem(DRAFT_KEY, JSON.stringify(config)), 300);
    return () => window.clearTimeout(t);
  }, [config, isEdit, loadState]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isEdit) e.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty, isEdit]);

  const update: Update = useCallback((section, patch) => {
    setDirty(true);
    setPublished(null);
    setConfig(c => {
      const current = c[section];
      const value = typeof current === 'object' && current !== null ? { ...current, ...(patch as object) } : patch;
      return { ...c, [section]: value } as InvitationConfig;
    });
  }, []);

  // ---------- validation per step ----------
  const stepErrors = useMemo(() => {
    const errs: string[] = [];
    if (step === 0) {
      if (!config.company.name.trim()) errs.push('نام شرکت را وارد کنید.');
      if (!config.event.title.trim()) errs.push('نام نمایشگاه را وارد کنید.');
      if (!SLUG_RE.test(config.slug)) errs.push('یک آدرس لینک معتبر وارد کنید.');
      else if (!isEdit && slugState === 'taken') errs.push('این آدرس لینک قبلاً گرفته شده است.');
    }
    if (step === 4) {
      if (!config.event.startDate || !config.event.endDate) errs.push('تاریخ شروع و پایان را مشخص کنید.');
      if (!config.event.location.trim()) errs.push('محل برگزاری را وارد کنید.');
    }
    return errs;
  }, [step, config, slugState, isEdit]);

  const [showErrors, setShowErrors] = useState(false);
  const goStep = (i: number) => {
    setShowErrors(false);
    setStep(i);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const next = () => {
    if (stepErrors.length) return setShowErrors(true);
    goStep(Math.min(step + 1, STEPS.length - 1));
  };

  // ---------- publish ----------
  async function publish() {
    setPublishError('');
    const errs = validateForPublish(config);
    if (errs.length) return setPublishError(errs.join('\n'));
    setPublishing(true);
    try {
      if (isEdit) {
        await api.update(editSlug!, config);
        setPublished({ slug: editSlug! });
      } else {
        const r = await api.create(config);
        saveMyInvitation({ slug: r.slug, editToken: r.editToken, company: config.company.name, event: config.event.title, createdAt: new Date().toISOString() });
        localStorage.removeItem(DRAFT_KEY);
        setPublished(r);
      }
      setDirty(false);
    } catch (e) {
      setPublishError((e as Error).message);
    } finally {
      setPublishing(false);
    }
  }

  if (loadState === 'loading') {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
      </div>
    );
  }
  if (loadState === 'notfound') return <CenteredMessage title="دعوتنامه پیدا نشد" text="ممکن است حذف شده باشد یا آدرس اشتباه باشد." />;
  if (loadState === 'locked') return <AdminGate isEdit={isEdit} onUnlock={() => window.location.reload()} />;

  const isLast = step === STEPS.length - 1;

  return (
    <div className="min-h-[100dvh] bg-slate-100 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
          <a href="/" className="p-2 -mr-2 rounded-xl hover:bg-slate-100 text-slate-600" title="صفحه اصلی">
            <Home className="w-5 h-5" />
          </a>
          <h1 className="font-black text-sm sm:text-base truncate">
            {isEdit ? `ویرایش دعوتنامه «${config.company.name}»` : 'ساخت دعوتنامه جدید'}
          </h1>
          <div className="flex-1" />
          {!isEdit && (
            <div className="hidden sm:flex items-center gap-1">
              <button
                onClick={() => {
                  setConfig({ ...structuredClone(DEFAULT_INVITATION), slug: config.slug });
                  setDirty(true);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl px-3 py-2"
              >
                <Sparkles className="w-4 h-4" /> پر کردن با نمونه
              </button>
              <button
                onClick={() => {
                  if (!confirm('همه اطلاعات واردشده پاک شود؟')) return;
                  setConfig(blankInvitation());
                  goStep(0);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl px-3 py-2"
              >
                <RotateCcw className="w-4 h-4" /> شروع دوباره
              </button>
            </div>
          )}
        </div>
        {/* Stepper */}
        <nav className="max-w-7xl mx-auto px-4 pb-3 overflow-x-auto">
          <ol className="flex items-center gap-1 min-w-max">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex items-center gap-1">
                <button
                  onClick={() => (i <= step || !stepErrors.length ? goStep(i) : setShowErrors(true))}
                  className={`flex items-center gap-2 rounded-full pl-3 pr-1 py-1 text-xs font-bold transition ${i === step ? 'bg-sky-500 text-white' : i < step ? 'text-sky-700 hover:bg-sky-50' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center ${i === step ? 'bg-white/25' : i < step ? 'bg-sky-100' : 'bg-slate-200'}`}>
                    {i < step ? <Check className="w-3.5 h-3.5" /> : (i + 1).toLocaleString('fa-IR')}
                  </span>
                  {s.title}
                </button>
                {i < STEPS.length - 1 && <span className="w-4 h-px bg-slate-300" />}
              </li>
            ))}
          </ol>
        </nav>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-8">
        {/* Form */}
        <main className="space-y-4 pb-28 lg:pb-8 min-w-0">
          {step === 0 && <BasicsStep config={config} update={update} isEdit={isEdit} slugState={slugState} setSlugState={setSlugState} />}
          {step === 1 && <BrandStep config={config} update={update} isEdit={isEdit} />}
          {step === 2 && <MediaStep config={config} update={update} isEdit={isEdit} />}
          {step === 3 && <TextsStep config={config} update={update} isEdit={isEdit} />}
          {step === 4 && <EventStep config={config} update={update} isEdit={isEdit} />}
          {step === 5 && (
            <PublishStep config={config} isEdit={isEdit} published={published} publishing={publishing} error={publishError} onPublish={publish} goStep={goStep} />
          )}

          {showErrors && stepErrors.length > 0 && (
            <div className="rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm p-4 space-y-1">
              {stepErrors.map(e => (
                <p key={e} className="flex items-center gap-2">
                  <TriangleAlert className="w-4 h-4 shrink-0" />
                  {e}
                </p>
              ))}
            </div>
          )}

          {/* Navigation */}
          <div className="fixed lg:static bottom-0 inset-x-0 z-20 bg-white/95 lg:bg-transparent backdrop-blur border-t lg:border-0 border-slate-200 p-3 lg:p-0 flex items-center gap-2">
            <button
              onClick={() => goStep(Math.max(0, step - 1))}
              disabled={step === 0}
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-3 font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-40"
            >
              <ArrowRight className="w-4 h-4" /> قبلی
            </button>
            <button onClick={() => setShowPreview(true)} className="lg:hidden inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-3 font-bold text-slate-700 bg-white border border-slate-300">
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

        {/* Live preview (desktop) */}
        <aside className="hidden lg:block">
          <div className="sticky top-32">
            <PhoneFrame>
              <InvitationView config={config} embedded focusStep={STEPS[step].preview} shareUrl={config.slug ? inviteUrl(config.slug) : undefined} />
            </PhoneFrame>
            <p className="text-center text-xs text-slate-500 mt-3">پیش‌نمایش زنده — روی دکمه‌ها کلیک کنید</p>
          </div>
        </aside>
      </div>

      {/* Live preview (mobile overlay) */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-slate-950 lg:hidden">
          <InvitationView config={config} embedded focusStep={STEPS[step].preview} />
          <button onClick={() => setShowPreview(false)} className="absolute top-4 right-4 z-[200] bg-white text-slate-900 rounded-full p-2.5 shadow-xl" aria-label="بستن پیش‌نمایش">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-[360px] h-[min(740px,calc(100dvh-11rem))] rounded-[2.75rem] border-[10px] border-slate-900 bg-slate-900 shadow-2xl overflow-hidden relative">
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-5 bg-slate-900 rounded-full z-[300]" />
      <div className="w-full h-full rounded-[2rem] overflow-hidden relative">{children}</div>
    </div>
  );
}

function CenteredMessage({ title, text }: { title: string; text: string }) {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-3 bg-slate-100 p-6 text-center">
      <p className="text-2xl font-black text-slate-900">{title}</p>
      <p className="text-slate-500">{text}</p>
      <a href="/" className="mt-3 text-sky-600 font-bold hover:underline">
        بازگشت به صفحه اصلی
      </a>
    </div>
  );
}

function AdminGate({ isEdit, onUnlock }: { isEdit: boolean; onUnlock: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setAdminPassword(password);
    const r = await api.auth().catch(() => ({ ok: false, admin: false }));
    if ((isEdit && r.admin) || (!isEdit && r.ok)) onUnlock();
    else {
      setAdminPassword('');
      setError('رمز نادرست است');
    }
  }
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-slate-100 p-6">
      <form onSubmit={submit} className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8 w-full max-w-sm text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center">
          <Lock className="w-6 h-6" />
        </div>
        <h1 className="font-black text-lg">{isEdit ? 'برای ویرایش، لینک ویرایش یا رمز مدیر لازم است' : 'ورود به سازنده دعوتنامه'}</h1>
        <input type="password" autoFocus value={password} onChange={e => setPassword(e.target.value)} placeholder="رمز مدیر" className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 outline-none focus:border-sky-500" />
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button className="w-full rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-black py-3">ورود</button>
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

function PublishStep({
  config,
  isEdit,
  published,
  publishing,
  error,
  onPublish,
  goStep,
}: {
  config: InvitationConfig;
  isEdit: boolean;
  published: { slug: string; editToken?: string } | null;
  publishing: boolean;
  error: string;
  onPublish: () => void;
  goStep: (i: number) => void;
}) {
  const problems = validateForPublish(config);
  const [qr, setQr] = useState('');
  const url = published ? inviteUrl(published.slug) : '';

  useEffect(() => {
    if (!url) return setQr('');
    QRCode.toDataURL(url, { width: 640, margin: 2, color: { dark: config.theme.primary, light: '#ffffff' }, errorCorrectionLevel: 'M' })
      .then(setQr)
      .catch(() => setQr(''));
  }, [url, config.theme.primary]);

  const checklist = [
    { ok: !!config.company.logo, text: 'لوگوی شرکت', step: 1 },
    { ok: !!config.media.video, text: 'ویدئوی پس‌زمینه', step: 2 },
    { ok: !!config.event.booth, text: 'شماره غرفه', step: 4 },
    { ok: !!config.event.mapUrl, text: 'لینک مسیریابی', step: 4 },
  ];

  if (published) {
    return (
      <Section title={isEdit ? 'تغییرات ذخیره شد' : 'دعوتنامه منتشر شد 🎉'} description="این لینک را برای مهمانان ارسال کنید یا کد QR را روی کارت‌های چاپی قرار دهید.">
        <div className="flex gap-2">
          <input dir="ltr" readOnly value={url} className="flex-1 min-w-0 rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm font-mono" onFocus={e => e.target.select()} />
          <CopyButton text={url} label="کپی لینک" />
          <a href={url} target="_blank" rel="noreferrer" className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-slate-300 text-xs font-bold px-3 hover:bg-slate-50">
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

        {published.editToken && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 space-y-2">
            <p className="font-bold text-amber-800 text-sm flex items-center gap-2">
              <TriangleAlert className="w-4 h-4" /> لینک ویرایش را نگه دارید
            </p>
            <p className="text-xs text-amber-700 leading-relaxed">هر کس این لینک را داشته باشد می‌تواند دعوتنامه را ویرایش یا حذف کند. آن را با مهمانان به اشتراک نگذارید.</p>
            <div className="flex gap-2">
              <input dir="ltr" readOnly value={editUrl(published.slug, published.editToken)} className="flex-1 min-w-0 rounded-xl border border-amber-200 bg-white px-3 text-xs font-mono" onFocus={e => e.target.select()} />
              <CopyButton text={editUrl(published.slug, published.editToken)} />
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          {!isEdit && (
            <a href={`/builder/${published.slug}`} className="rounded-xl border border-slate-300 text-sm font-bold px-4 py-2.5 hover:bg-slate-50">
              ادامه ویرایش
            </a>
          )}
          <a href="/builder" className="rounded-xl border border-slate-300 text-sm font-bold px-4 py-2.5 hover:bg-slate-50">
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
        <dd className="font-bold">{config.company.name || '—'}</dd>
        <dt className="text-slate-500">نمایشگاه</dt>
        <dd className="font-bold">{config.event.title || '—'}</dd>
        <dt className="text-slate-500">زمان</dt>
        <dd className="font-bold">{config.event.dateLabel || '—'}</dd>
        <dt className="text-slate-500">لینک</dt>
        <dd dir="ltr" className="font-mono text-xs text-right self-center">{config.slug ? inviteUrl(config.slug) : '—'}</dd>
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

      {(problems.length > 0 || error) && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm p-4 space-y-1 whitespace-pre-line">
          {problems.length ? problems.map(p => <p key={p}>• {p}</p>) : error}
        </div>
      )}

      <button
        onClick={onPublish}
        disabled={publishing || problems.length > 0}
        className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-500 hover:bg-sky-600 disabled:bg-slate-300 text-white font-black py-4 shadow-lg shadow-sky-500/20"
      >
        {publishing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Rocket className="w-5 h-5" />}
        {isEdit ? 'ذخیره تغییرات' : 'انتشار و دریافت لینک'}
      </button>
    </Section>
  );
}
