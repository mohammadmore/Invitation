import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CloudOff,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Home,
  Loader2,
  Lock,
  MoreVertical,
  RotateCcw,
  Rocket,
  Save,
  TriangleAlert,
  X,
  History,
  CircleCheck,
} from 'lucide-react';
import InvitationView from '../invitation/InvitationView';
import { api, ApiError, editUrl, getAdminPassword, getMyInvitations, inviteUrl, saveMyInvitation, serverMeta, setAdminPassword, setEditAuth, updateMyInvitation, type RecordStatus } from '../lib/api';
import { previewUrl, route } from '../lib/paths';
import { hideSplash } from '../lib/splash';
import { blankInvitation, ITEMS, sanitizeInvitation, validateForPublish, type InvitationConfig, type Issue } from '../shared/invitation';
import { ensureContrast } from '../shared/color';
import { BasicsStep, BrandStep, EventStep, MediaStep, TextsStep, type SlugState, type Update } from '../builder/steps';
import { Section } from '../builder/ui';

const LOCAL_DRAFT_KEY = 'expo-invite-draft';
const localEditKey = (id: string) => `expo-invite-edit-draft:${id}`;
const tokenKey = (id: string) => `expo-invite-token:${id}`;

const STEPS = [
  { title: 'اطلاعات پایه', preview: 1 },
  { title: 'برند و ظاهر', preview: 1 },
  { title: 'ویدئو و موزیک', preview: 1 },
  { title: 'متن‌ها', preview: 2 },
  { title: 'زمان و مکان', preview: 3 },
  { title: 'انتشار', preview: 1 },
] as const;

function loadLocalDraft(): InvitationConfig {
  try {
    const raw = localStorage.getItem(LOCAL_DRAFT_KEY);
    if (raw) return sanitizeInvitation(JSON.parse(raw));
  } catch {
    /* ignore */
  }
  return blankInvitation();
}

type LoadState = 'loading' | 'ready' | 'notfound' | 'locked' | 'error';
type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

interface RecordInfo {
  id: string;
  status: RecordStatus;
  previewToken: string;
  publishedSlug: string;
  /** Known only in the browser that created it (or after an admin re-issues it) */
  editToken?: string;
}

const STATUS_LABEL: Record<RecordStatus, string> = { draft: 'پیش‌نویس', published: 'منتشر شده', changed: 'منتشر شده — تغییرات منتشرنشده دارد' };

export default function BuilderPage({ recordId: initialId }: { recordId?: string }) {
  const [record, setRecord] = useState<RecordInfo | null>(null);
  const [config, setConfig] = useState<InvitationConfig>(() => (initialId ? blankInvitation() : loadLocalDraft()));
  const [step, setStep] = useState(0);
  const [slugState, setSlugState] = useState<SlugState>('idle');
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [justPublished, setJustPublished] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');
  /** Inline red errors appear only after the admin tried to publish. */
  const [revealErrors, setRevealErrors] = useState(false);
  const [focus, setFocus] = useState({ step: 1, key: 0 });
  const [canEditFooter, setCanEditFooter] = useState(false);
  const [restorable, setRestorable] = useState<{ config: InvitationConfig; savedAt: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const stepperRef = useRef<HTMLOListElement>(null);
  const savedJson = useRef('');
  const saving = useRef<Promise<unknown> | null>(null);

  const previewAt = useCallback((s: number) => setFocus(f => (f.step === s ? f : { step: s, key: f.key + 1 })), []);

  // ---------- initial load / access control ----------
  useEffect(() => {
    hideSplash();
    document.title = initialId ? 'ویرایش دعوتنامه' : 'ساخت دعوتنامه جدید';
    (async () => {
      const meta = await serverMeta();
      const auth = getAdminPassword() || !meta.adminRequired ? await api.auth().catch(() => ({ ok: false, admin: false })) : { ok: false, admin: false };
      setCanEditFooter(!meta.adminRequired || auth.admin);

      if (!initialId) {
        if (meta.adminRequired && !auth.ok) return setLoadState('locked');
        savedJson.current = JSON.stringify(blankInvitation());
        return setLoadState('ready');
      }

      // Edit token: URL fragment (never reaches server logs) → this session → this browser's list.
      const fromHash = decodeURIComponent(window.location.hash.slice(1));
      if (fromHash) {
        sessionStorage.setItem(tokenKey(initialId), fromHash);
        history.replaceState(null, '', window.location.pathname);
      }
      const token = fromHash || sessionStorage.getItem(tokenKey(initialId)) || getMyInvitations().find(i => i.id === initialId)?.editToken || '';
      setEditAuth(token ? { id: initialId, token } : null);
      try {
        const r = await api.getRecord(initialId);
        setConfig(r.draft);
        savedJson.current = JSON.stringify(r.draft);
        setRecord({ id: r.id, status: r.status, previewToken: r.previewToken, publishedSlug: r.publishedSlug, editToken: token || undefined });
        setLastSaved(new Date(r.updatedAt));
        setSaveState('saved');
        try {
          const local = JSON.parse(localStorage.getItem(localEditKey(initialId)) || 'null');
          if (local?.config && JSON.stringify(sanitizeInvitation(local.config)) !== savedJson.current) setRestorable({ config: sanitizeInvitation(local.config), savedAt: local.savedAt });
          else localStorage.removeItem(localEditKey(initialId));
        } catch {
          /* ignore */
        }
        setLoadState('ready');
      } catch (e) {
        const status = (e as ApiError).status;
        setLoadState(status === 404 ? 'notfound' : status === 401 || status === 403 ? 'locked' : 'error');
      }
    })();
  }, [initialId]);

  // ---------- saving ----------
  const dirty = loadState === 'ready' && JSON.stringify(config) !== savedJson.current;

  const save = useCallback(
    async (cfg: InvitationConfig): Promise<RecordInfo | null> => {
      // Never run two saves at once (the first one may be creating the record).
      while (saving.current) await saving.current.catch(() => {});
      const job = (async () => {
        setSaveState('saving');
        setSaveError('');
        try {
          let info: RecordInfo;
          let slugConflict = false;
          if (!record) {
            const r = await api.createRecord(cfg);
            info = { id: r.id, status: r.status, previewToken: r.previewToken, publishedSlug: r.publishedSlug, editToken: r.editToken };
            slugConflict = r.slugConflict;
            setEditAuth({ id: r.id, token: r.editToken });
            sessionStorage.setItem(tokenKey(r.id), r.editToken);
            saveMyInvitation({ id: r.id, editToken: r.editToken, slug: r.slug, company: cfg.company.name, event: cfg.event.title, createdAt: new Date().toISOString() });
            localStorage.removeItem(LOCAL_DRAFT_KEY);
            history.replaceState(null, '', route(`builder/${r.id}`));
            document.title = 'ویرایش دعوتنامه';
          } else {
            const r = await api.saveRecord(record.id, cfg);
            info = { ...record, status: r.status, publishedSlug: r.publishedSlug };
            slugConflict = r.slugConflict;
            updateMyInvitation(record.id, { slug: r.slug, company: cfg.company.name, event: cfg.event.title });
            localStorage.removeItem(localEditKey(record.id));
          }
          setRecord(info);
          // On an address conflict the server kept everything except the address; we show the
          // conflict next to the field and only retry once the admin changes something.
          savedJson.current = JSON.stringify(cfg);
          if (slugConflict) setSlugState('taken');
          setLastSaved(new Date());
          setSaveState('saved');
          return info;
        } catch (e) {
          setSaveState('error');
          setSaveError((e as Error).message);
          return null;
        }
      })();
      saving.current = job;
      try {
        return await job;
      } finally {
        saving.current = null;
      }
    },
    [record],
  );

  // Autosave: locally right away, to the server shortly after typing stops (once there is something worth keeping).
  useEffect(() => {
    if (!dirty) return;
    setSaveState(s => (s === 'saving' ? s : 'dirty'));
    try {
      if (record) localStorage.setItem(localEditKey(record.id), JSON.stringify({ config, savedAt: new Date().toISOString() }));
      else localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(config));
    } catch {
      /* storage full / private mode */
    }
    const worthSaving = record || config.company.name.trim() || config.event.title.trim();
    if (!worthSaving) return;
    const t = window.setTimeout(() => save(config), 1500);
    return () => window.clearTimeout(t);
  }, [config, dirty, record, save]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  // Only one audio source at a time (music samples vs. preview music).
  useEffect(() => {
    const onPlay = (e: Event) => document.querySelectorAll('audio').forEach(a => a !== e.target && a.pause());
    document.addEventListener('play', onPlay, true);
    return () => document.removeEventListener('play', onPlay, true);
  }, []);

  useEffect(() => {
    stepperRef.current?.children[step]?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [step]);

  const update: Update = useCallback((section, patch) => {
    setJustPublished(false);
    setConfig(c => {
      const current = c[section];
      const value = typeof current === 'object' && current !== null ? { ...current, ...(patch as object) } : patch;
      return { ...c, [section]: value } as InvitationConfig;
    });
  }, []);

  // ---------- completeness (informative while editing, blocking only at publish) ----------
  const allIssues = useMemo<Issue[]>(() => {
    const list = validateForPublish(config);
    if (slugState === 'taken' && !record?.publishedSlug) list.unshift({ field: 'slug', step: 0, message: 'این آدرس لینک متعلق به دعوتنامه دیگری است.' });
    return list;
  }, [config, slugState, record?.publishedSlug]);
  const issuesOf = (s: number) => allIssues.filter(i => i.step === s);

  const goStep = (i: number) => {
    setStep(i);
    previewAt(STEPS[i].preview);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ---------- publish ----------
  async function publish() {
    setPublishError('');
    if (allIssues.length) {
      setRevealErrors(true);
      setPublishError('اطلاعات دعوتنامه کامل نیست. موارد زیر را تکمیل کنید یا برای هر کدام «نمایش داده نشود» را بزنید.');
      return;
    }
    setPublishing(true);
    try {
      const info = record ?? (await save(config));
      if (!info) throw new Error(saveError || 'ذخیره ناموفق بود.');
      const r = await api.publish(info.id, config);
      savedJson.current = JSON.stringify(config);
      localStorage.removeItem(localEditKey(info.id));
      updateMyInvitation(info.id, { slug: r.slug });
      setRecord({ ...info, status: r.status, publishedSlug: r.publishedSlug });
      setSaveState('saved');
      setLastSaved(new Date());
      setJustPublished(true);
    } catch (e) {
      const err = e as ApiError;
      setRevealErrors(true);
      setPublishError(err.message);
      if (err.field === 'slug') setSlugState('taken');
    } finally {
      setPublishing(false);
    }
  }

  async function unpublish() {
    if (!record || !confirm('دعوتنامه از دسترس مهمانان خارج شود؟ آدرس لینک برای همین دعوتنامه رزرو می‌ماند و می‌توانید دوباره منتشرش کنید.')) return;
    try {
      const r = await api.unpublish(record.id);
      setRecord({ ...record, status: r.status, publishedSlug: '' });
      setJustPublished(false);
    } catch (e) {
      alert((e as Error).message);
    }
  }

  const resetAll = () => {
    if (!confirm('همه اطلاعات واردشده در این پیش‌نویس پاک شود؟')) return;
    setConfig(blankInvitation());
    setRevealErrors(false);
    setSlugState('idle');
    localStorage.removeItem(LOCAL_DRAFT_KEY);
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
  if (loadState === 'locked') return <AdminGate isEdit={!!initialId} onUnlock={() => window.location.reload()} />;

  const isLast = step === STEPS.length - 1;
  const slugLocked = !!record?.publishedSlug;
  const stepProps = { config, update, slugLocked, recordId: record?.id, issues: revealErrors ? allIssues : [], previewAt, canEditFooter };
  const shareUrl = config.slug ? inviteUrl(config.slug) : undefined;
  const stepPending = step < 5 ? issuesOf(step) : [];

  return (
    <div className="min-h-[100dvh] bg-slate-100 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-2 sm:gap-3">
          <a href={route()} className="p-2 -mr-2 rounded-xl hover:bg-slate-100 text-slate-600" title="صفحه اصلی">
            <Home className="w-5 h-5" />
          </a>
          <div className="min-w-0">
            <h1 className="font-black text-sm sm:text-base truncate">{record ? `دعوتنامه «${config.company.name || 'بدون نام'}»` : 'ساخت دعوتنامه جدید'}</h1>
            {record && <p className={`text-[11px] font-bold ${record.status === 'draft' ? 'text-slate-500' : record.status === 'changed' ? 'text-amber-600' : 'text-emerald-600'}`}>{STATUS_LABEL[record.status]}</p>}
          </div>
          <div className="flex-1" />
          <SaveIndicator state={saveState} error={saveError} lastSaved={lastSaved} onSave={() => save(config)} />
          {!record && (
            <div className="relative">
              <button onClick={() => setMenuOpen(o => !o)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-600" aria-label="گزینه‌ها">
                <MoreVertical className="w-5 h-5" />
              </button>
              {menuOpen && (
                <div className="absolute left-0 top-11 z-40 w-48 bg-white rounded-2xl border border-slate-200 shadow-xl p-1.5">
                  <button onClick={resetAll} className="w-full flex items-center gap-2 text-sm font-bold text-slate-700 hover:bg-slate-100 rounded-xl px-3 py-2.5">
                    <RotateCcw className="w-4 h-4" /> شروع دوباره
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        {/* Stepper: free navigation; amber marks show steps that still have missing items */}
        <nav className="max-w-7xl mx-auto px-4 pb-3 overflow-x-auto [scrollbar-width:none]">
          <ol ref={stepperRef} className="flex items-center gap-1 min-w-max">
            {STEPS.map((s, i) => {
              const open = i < 5 ? issuesOf(i).length : 0;
              const bad = open > 0 && revealErrors;
              return (
                <li key={s.title} className="flex items-center gap-1">
                  <button
                    onClick={() => goStep(i)}
                    className={`flex items-center gap-2 rounded-full pl-3 pr-1 py-1 text-xs font-bold transition ${i === step ? 'bg-sky-500 text-white' : bad ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    <span className={`relative w-6 h-6 rounded-full flex items-center justify-center ${i === step ? 'bg-white/25' : bad ? 'bg-rose-100' : 'bg-slate-200'}`}>
                      {(i + 1).toLocaleString('fa-IR')}
                      {open > 0 && <span className={`absolute -top-0.5 -left-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${bad ? 'bg-rose-500' : 'bg-amber-400'}`} />}
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
                تغییرات ذخیره‌نشده‌ای از {new Date(restorable.savedAt).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' })} روی این دستگاه پیدا شد.
              </p>
              <button
                onClick={() => {
                  setConfig(restorable.config);
                  setRestorable(null);
                }}
                className="rounded-xl bg-sky-500 text-white text-xs font-bold px-3 py-2"
              >
                بازیابی
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem(localEditKey(record!.id));
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
              record={record}
              issues={allIssues}
              revealErrors={revealErrors}
              justPublished={justPublished}
              publishing={publishing}
              error={publishError}
              onPublish={publish}
              onUnpublish={unpublish}
              onSaveForPreview={() => save(config)}
              onHide={key => update('hidden', { [key]: true })}
              goStep={goStep}
            />
          )}

          {stepPending.length > 0 && (
            <div className={`rounded-2xl border p-4 space-y-1.5 ${revealErrors ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
              <p className="text-sm font-bold">{revealErrors ? 'برای انتشار، این موارد باید تکمیل یا پنهان شوند:' : 'موارد تکمیل‌نشده این مرحله:'}</p>
              {stepPending.map(e => (
                <p key={e.message} className="text-sm flex items-center gap-2">
                  <TriangleAlert className="w-4 h-4 shrink-0" />
                  {e.message}
                </p>
              ))}
              {!revealErrors && <p className="text-xs opacity-80 pt-1">اشکالی ندارد — همه چیز خودکار ذخیره می‌شود و می‌توانید بعداً تکمیل کنید. فقط هنگام انتشار نهایی باید کامل باشد.</p>}
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
              <button onClick={() => goStep(step + 1)} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-6 py-3 font-black text-white bg-sky-500 hover:bg-sky-600 shadow-lg shadow-sky-500/20">
                مرحله بعد <ArrowLeft className="w-4 h-4" />
              </button>
            )}
          </div>
        </main>

        {/* Live preview (tablet & desktop) */}
        <aside className="hidden md:block">
          <div className="sticky top-32">
            <PhoneFrame>
              <InvitationView config={config} embedded showMissing focus={focus} shareUrl={shareUrl} />
            </PhoneFrame>
            <p className="text-center text-xs text-slate-500 mt-3">پیش‌نمایش زنده — موارد ناقص با کادر قرمز مشخص شده‌اند</p>
          </div>
        </aside>
      </div>

      {showPreview && (
        <div className="fixed inset-0 z-50 bg-slate-950 md:hidden">
          <InvitationView config={config} embedded showMissing focus={focus} shareUrl={shareUrl} />
          <button onClick={() => setShowPreview(false)} className="absolute top-4 right-4 z-[200] inline-flex items-center gap-1.5 bg-white text-slate-900 rounded-full pl-4 pr-3 py-2 shadow-xl text-sm font-bold" aria-label="بستن پیش‌نمایش">
            <X className="w-5 h-5" /> بازگشت به ویرایش
          </button>
        </div>
      )}
    </div>
  );
}

function SaveIndicator({ state, error, lastSaved, onSave }: { state: SaveState; error: string; lastSaved: Date | null; onSave: () => void }) {
  const time = lastSaved?.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  return (
    <div className="flex items-center gap-2">
      <span className="hidden sm:inline text-[11px] font-bold">
        {state === 'saving' && (
          <span className="inline-flex items-center gap-1 text-slate-500">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> در حال ذخیره…
          </span>
        )}
        {state === 'saved' && (
          <span className="inline-flex items-center gap-1 text-emerald-600">
            <CircleCheck className="w-3.5 h-3.5" /> ذخیره شد {time && `(${time})`}
          </span>
        )}
        {state === 'dirty' && <span className="text-amber-600">تغییرات ذخیره نشده</span>}
        {state === 'error' && (
          <span className="inline-flex items-center gap-1 text-rose-600" title={error}>
            <CloudOff className="w-3.5 h-3.5" /> ذخیره نشد
          </span>
        )}
      </span>
      <button
        onClick={onSave}
        disabled={state === 'saving'}
        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black transition disabled:opacity-60 ${state === 'dirty' || state === 'error' || state === 'idle' ? 'bg-slate-900 text-white hover:bg-slate-700' : 'bg-slate-100 text-slate-600'}`}
        title={error || 'ذخیره پیش‌نویس روی سرور'}
      >
        <Save className="w-4 h-4" /> ذخیره
      </button>
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
  record,
  issues,
  revealErrors,
  justPublished,
  publishing,
  error,
  onPublish,
  onUnpublish,
  onSaveForPreview,
  onHide,
  goStep,
}: {
  config: InvitationConfig;
  record: RecordInfo | null;
  issues: Issue[];
  revealErrors: boolean;
  justPublished: boolean;
  publishing: boolean;
  error: string;
  onPublish: () => void;
  onUnpublish: () => void;
  onSaveForPreview: () => Promise<RecordInfo | null>;
  onHide: (key: NonNullable<Issue['item']>) => void;
  goStep: (i: number) => void;
}) {
  const [qr, setQr] = useState('');
  const liveSlug = record?.publishedSlug || '';
  const url = liveSlug ? inviteUrl(liveSlug) : '';
  const qrColor = ensureContrast(config.theme.primary, '#ffffff', 7);
  const [busyPreview, setBusyPreview] = useState(false);

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

  const preview = record ? previewUrl(record.id, record.previewToken) : '';
  const edit = record?.editToken ? editUrl(record.id, record.editToken) : '';

  return (
    <>
      {/* Client preview – available at any stage */}
      <Section title="پیش‌نمایش برای کارفرما" description="این لینک فقط‌خواندنی را برای کارفرما بفرستید تا نسخه فعلی را ببیند. موارد ناقص با کادر قرمز و عبارت «هنوز وارد نشده» نمایش داده می‌شوند؛ مهمانان هرگز این نسخه را نمی‌بینند.">
        {record ? (
          <div className="flex flex-wrap gap-2">
            <input dir="ltr" readOnly value={preview} className="flex-1 min-w-[200px] rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-xs font-mono" onFocus={e => e.target.select()} />
            <CopyButton text={preview} label="کپی لینک پیش‌نمایش" />
            <a href={preview} target="_blank" rel="noreferrer" className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-slate-300 text-xs font-bold px-3 py-2.5 hover:bg-slate-50">
              <ExternalLink className="w-4 h-4" /> باز کردن
            </a>
          </div>
        ) : (
          <button
            type="button"
            disabled={busyPreview}
            onClick={async () => {
              setBusyPreview(true);
              await onSaveForPreview();
              setBusyPreview(false);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white text-sm font-bold px-4 py-2.5 disabled:opacity-60"
          >
            {busyPreview ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} ذخیره و ساخت لینک پیش‌نمایش
          </button>
        )}
      </Section>

      {liveSlug && (
        <Section title={justPublished ? 'دعوتنامه منتشر شد 🎉' : 'لینک مهمانان'} description="این لینک را برای مهمانان ارسال کنید یا کد QR را روی کارت‌های چاپی قرار دهید.">
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
                <a href={qr} download={`invite-${liveSlug}-qr.png`} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold px-3 py-2.5">
                  <Download className="w-4 h-4" /> دانلود QR
                </a>
              </div>
            </div>
          )}
          <button type="button" onClick={onUnpublish} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-rose-600">
            <EyeOff className="w-4 h-4" /> لغو انتشار (خارج کردن از دسترس مهمانان)
          </button>
        </Section>
      )}

      {edit && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 space-y-2">
          <p className="font-bold text-amber-800 text-sm flex items-center gap-2">
            <TriangleAlert className="w-4 h-4" /> لینک ویرایش (محرمانه)
          </p>
          <p className="text-xs text-amber-700 leading-relaxed">با این لینک می‌توانید از هر دستگاهی ادامه دهید. هر کس آن را داشته باشد می‌تواند دعوتنامه را ویرایش یا حذف کند. اگر گمش کنید، مدیر می‌تواند لینک جدید صادر کند.</p>
          <div className="flex flex-wrap gap-2">
            <input dir="ltr" readOnly value={edit} className="flex-1 min-w-[200px] rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-xs font-mono" onFocus={e => e.target.select()} />
            <CopyButton text={edit} />
            <button
              type="button"
              onClick={() =>
                downloadText(
                  `invite-${config.slug || record!.id}.txt`,
                  `دعوتنامه ${config.company.name} - ${config.event.title}\n\n${url ? `لینک مهمانان:\n${url}\n\n` : ''}لینک پیش‌نمایش برای کارفرما:\n${preview}\n\nلینک ویرایش (محرمانه):\n${edit}\n`,
                )
              }
              className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-amber-300 text-amber-900 text-xs font-bold px-3 py-2.5 hover:bg-amber-100"
            >
              <Download className="w-4 h-4" /> ذخیره در فایل
            </button>
          </div>
        </div>
      )}

      {/* Publish */}
      {(!liveSlug || record?.status === 'changed') && (
        <Section
          title={liveSlug ? 'انتشار تغییرات' : 'انتشار نهایی'}
          description={liveSlug ? 'تغییراتی که بعد از انتشار داده‌اید هنوز برای مهمانان نمایش داده نمی‌شود.' : 'پس از انتشار، دعوتنامه از طریق لینک اختصاصی برای مهمانان در دسترس خواهد بود.'}
        >
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm bg-slate-50 rounded-2xl p-4">
            <dt className="text-slate-500">شرکت</dt>
            <dd className="font-bold break-words">{config.company.name || '—'}</dd>
            <dt className="text-slate-500">نمایشگاه</dt>
            <dd className="font-bold break-words">{config.event.title || '—'}</dd>
            <dt className="text-slate-500">لینک</dt>
            <dd dir="ltr" className="font-mono text-xs text-right self-center break-all">
              {config.slug ? inviteUrl(config.slug) : '—'}
            </dd>
          </dl>

          {issues.length > 0 ? (
            <div className={`rounded-2xl border p-4 space-y-2 ${revealErrors ? 'bg-rose-50 border-rose-300' : 'bg-amber-50 border-amber-200'}`}>
              <p className={`text-sm font-black ${revealErrors ? 'text-rose-800' : 'text-amber-900'}`}>
                {issues.length.toLocaleString('fa-IR')} مورد هنوز کامل نیست. هر مورد را تکمیل کنید، یا اگر فعلاً نباید نمایش داده شود «پنهان کن» را بزنید:
              </p>
              {issues.map(p => (
                <div key={p.message} className={`flex flex-wrap items-center gap-2 text-sm ${revealErrors ? 'text-rose-700' : 'text-amber-800'}`}>
                  <TriangleAlert className="w-4 h-4 shrink-0" />
                  <span className="flex-1 min-w-[160px]">{p.message}</span>
                  <button type="button" onClick={() => goStep(p.step)} className="text-xs font-bold underline whitespace-nowrap">
                    تکمیل در «{STEPS[p.step].title}»
                  </button>
                  {p.item && p.item !== 'calendar' && (
                    <button type="button" onClick={() => onHide(p.item!)} className="text-xs font-bold rounded-lg border border-current px-2 py-0.5 whitespace-nowrap">
                      پنهان کن
                    </button>
                  )}
                  {p.item === 'calendar' && (
                    <button type="button" onClick={() => onHide('calendar')} className="text-xs font-bold rounded-lg border border-current px-2 py-0.5 whitespace-nowrap">
                      دکمه‌های تقویم را پنهان کن
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center gap-2">
              <CircleCheck className="w-4 h-4" /> همه موارد کامل است.
            </p>
          )}
          {error && issues.length === 0 && <div className="rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm p-4 whitespace-pre-line">{error}</div>}
          {error && issues.length > 0 && revealErrors && <p className="text-sm font-bold text-rose-700">{error}</p>}

          {Object.values(config.hidden).some(Boolean) && (
            <p className="text-xs text-slate-500 leading-relaxed">
              موارد پنهان:{' '}
              {Object.entries(config.hidden)
                .filter(([, v]) => v)
                .map(([k]) => ITEMS[k as keyof typeof ITEMS]?.label)
                .filter(Boolean)
                .join('، ')}
            </p>
          )}

          <button
            onClick={onPublish}
            disabled={publishing}
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-500 hover:bg-sky-600 disabled:opacity-60 text-white font-black py-4 shadow-lg shadow-sky-500/20"
          >
            {publishing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Rocket className="w-5 h-5" />}
            {liveSlug ? 'انتشار تغییرات برای مهمانان' : 'انتشار نهایی و دریافت لینک'}
          </button>
        </Section>
      )}
    </>
  );
}
