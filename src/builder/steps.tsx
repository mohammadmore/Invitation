import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Ban, Link2, Loader2, RefreshCw, CheckCircle2, XCircle, Wand2, TriangleAlert, Lightbulb, Upload } from 'lucide-react';
import {
  CUSTOM_FONT,
  FONTS,
  ITEMS,
  LIMITS,
  PALETTES,
  PRESET_MUSIC,
  RESERVED_SLUGS,
  SLUG_RE,
  SUGGESTIONS,
  SUGGESTIONS_EN,
  TIMEZONES,
  contactLinks,
  isMissing,
  isShown,
  type InvitationConfig,
  type Issue,
  type IssueField,
  type ItemKey,
} from '../shared/invitation';
import { englishDateLabel, englishTimeLabel, jalaliRangeLabel, timeRangeLabel } from '../shared/calendar';
import { colorWarnings } from '../shared/color';
import { api } from '../lib/api';
import { asset, route } from '../lib/paths';
import JalaliDatePicker from './JalaliDatePicker';
import { AudioPreview, ChoiceCard, ColorInput, Field, ImageUpload, Section, Slider, SuggestButton, TextArea, TextInput, Toggle, UploadButton, UrlInput, type HideProps } from './ui';

export type Update = <K extends keyof InvitationConfig>(section: K, patch: InvitationConfig[K] extends object ? Partial<InvitationConfig[K]> : InvitationConfig[K]) => void;

export interface StepProps {
  config: InvitationConfig;
  update: Update;
  /** Address can no longer change (invitation already published) */
  slugLocked: boolean;
  recordId?: string;
  /** Problems to show inline (only after the admin tried to publish) */
  issues: Issue[];
  /** Move the live preview to the screen that shows the field being edited */
  previewAt: (step: number) => void;
  canEditFooter: boolean;
}

const issueFor = (issues: Issue[], ...fields: IssueField[]) => issues.find(i => fields.includes(i.field))?.message;

/** Props for a field's "don't show" checkbox. */
const hideProps = (config: InvitationConfig, update: Update, key: ItemKey): HideProps => ({
  checked: !!config.hidden[key],
  onChange: v => update('hidden', { [key]: v }),
});

/** Amber "not entered yet" notice – informative only; saving is always allowed. */
const pending = (config: InvitationConfig, key: ItemKey) => (isMissing(config, key) ? `${ITEMS[key].missing} — می‌توانید بعداً تکمیل کنید یا تیک «نمایش داده نشود» را بزنید.` : undefined);

export type SlugState = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export const normalizeSlug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 40);

const TRANSLIT: Record<string, string> = {
  ا: 'a', آ: 'a', أ: 'a', ب: 'b', پ: 'p', ت: 't', ث: 's', ج: 'j', چ: 'ch', ح: 'h', خ: 'kh', د: 'd', ذ: 'z', ر: 'r', ز: 'z', ژ: 'zh', س: 's', ش: 'sh', ص: 's', ض: 'z', ط: 't', ظ: 'z', ع: 'a', غ: 'gh', ف: 'f', ق: 'gh', ک: 'k', ك: 'k', گ: 'g', ل: 'l', م: 'm', ن: 'n', و: 'v', ه: 'h', ی: 'i', ي: 'i', ئ: 'i', ۀ: 'e', ة: 'e',
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
};

/** Rough Latin version of a Persian name, for a slug suggestion. */
export function suggestSlug(name: string): string {
  const latin = [...name.trim()].map(ch => TRANSLIT[ch] ?? (/[a-z0-9]/i.test(ch) ? ch : ch === ' ' || ch === '‌' ? '-' : '')).join('');
  const s = normalizeSlug(latin).replace(/^-+|-+$/g, '');
  return s.length >= 3 ? s : `invite-${Math.random().toString(36).slice(2, 6)}`;
}

// ------------------------------------------------------------------ 1. basics

export function BasicsStep({ config, update, slugLocked, recordId, issues, previewAt, slugState, setSlugState }: StepProps & { slugState: SlugState; setSlugState: (s: SlugState) => void }) {
  const slug = config.slug;
  const [slugTouched, setSlugTouched] = useState(false);
  const [nonLatin, setNonLatin] = useState(false);

  useEffect(() => {
    if (slugLocked) return;
    if (!slug) return setSlugState('idle');
    if (!SLUG_RE.test(slug) || RESERVED_SLUGS.has(slug)) return setSlugState('invalid');
    setSlugState('checking');
    const t = window.setTimeout(() => {
      api
        .slugAvailable(slug, recordId)
        .then(r => setSlugState(!r.valid ? 'invalid' : r.available ? 'available' : 'taken'))
        .catch(() => setSlugState('idle'));
    }, 400);
    return () => window.clearTimeout(t);
  }, [slug, slugLocked, recordId, setSlugState]);

  const slugIssue = issueFor(issues, 'slug');
  const showInvalid = slugState === 'invalid' && (slugTouched || !!slugIssue);
  const slugMsg: React.ReactNode = nonLatin ? (
    <span className="text-amber-700">فقط حروف انگلیسی پذیرفته می‌شود؛ صفحه‌کلید را انگلیسی کنید.</span>
  ) : slugState === 'checking' ? (
    <span className="inline-flex items-center gap-1">
      <Loader2 className="w-3.5 h-3.5 animate-spin" /> در حال بررسی…
    </span>
  ) : slugState === 'available' ? (
    <span className="inline-flex items-center gap-1 text-emerald-600">
      <CheckCircle2 className="w-3.5 h-3.5" /> این آدرس آزاد است (با ذخیره، برای این دعوتنامه رزرو می‌شود)
    </span>
  ) : slugState === 'taken' ? (
    <span className="inline-flex items-center gap-1 text-rose-600">
      <XCircle className="w-3.5 h-3.5" /> این آدرس متعلق به دعوتنامه دیگری است
    </span>
  ) : showInvalid ? (
    <span className="text-rose-600">{RESERVED_SLUGS.has(slug) ? 'این آدرس رزرو شده است.' : 'بین ۳ تا ۴۰ کاراکتر؛ فقط a-z، ۰-۹ و خط تیره (نه در ابتدا یا انتها)'}</span>
  ) : slugIssue ? (
    <span className="text-rose-600">{slugIssue}</span>
  ) : (
    'فقط حروف انگلیسی کوچک، عدد و خط تیره؛ مثلاً company-expo1405. اگر هنوز مشخص نیست، خالی بگذارید.'
  );

  return (
    <>
      <Section title="شرکت و نمایشگاه" description="نام شرکت دعوت‌کننده و نمایشگاهی که در آن غرفه دارد." onFocusCapture={() => previewAt(1)}>
        <Field label="نام شرکت" required error={issueFor(issues, 'company.name')} count={[config.company.name.length, LIMITS.short]}>
          <TextInput value={config.company.name} maxLength={LIMITS.short} invalid={!!issueFor(issues, 'company.name')} onChange={e => update('company', { name: e.target.value })} placeholder="نام شرکت کارفرما" />
        </Field>
        <Field label="نام نمایشگاه" required error={issueFor(issues, 'event.title')} count={[config.event.title.length, LIMITS.short]}>
          <TextInput value={config.event.title} maxLength={LIMITS.short} invalid={!!issueFor(issues, 'event.title')} onChange={e => update('event', { title: e.target.value })} placeholder="نام کامل نمایشگاه" />
        </Field>
        <Field
          label="عنوان بالای نام نمایشگاه"
          hint="متن کوچکی که بالای نام نمایشگاه در صفحه اول نمایش داده می‌شود."
          warning={pending(config, 'badge')}
          hide={hideProps(config, update, 'badge')}
          action={!config.event.badge && <SuggestButton onClick={() => update('event', { badge: SUGGESTIONS.badge })} />}
        >
          <TextInput value={config.event.badge} maxLength={LIMITS.short} onChange={e => update('event', { badge: e.target.value })} placeholder={SUGGESTIONS.badge} />
        </Field>
      </Section>

      <Section title="لینک اختصاصی" description={slugLocked ? undefined : 'آدرسی که برای مهمانان ارسال می‌شود. بعد از انتشار قابل تغییر نیست.'}>
        <Field label="آدرس لینک" hint={slugLocked ? 'آدرس دعوتنامه‌های منتشرشده قابل تغییر نیست.' : slugMsg}>
          <div className="flex gap-2">
            <div
              dir="ltr"
              className={`flex-1 min-w-0 flex items-stretch rounded-xl border overflow-hidden focus-within:ring-4 focus-within:ring-sky-500/15 ${showInvalid || slugState === 'taken' || slugIssue ? 'border-rose-400' : 'border-slate-300 focus-within:border-sky-500'}`}
            >
              <span className="flex items-center gap-1 bg-slate-100 text-slate-500 px-3 text-xs sm:text-sm whitespace-nowrap max-w-[55%] overflow-hidden">
                <Link2 className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  {window.location.host}
                  {route()}
                </span>
              </span>
              <input
                dir="ltr"
                disabled={slugLocked}
                value={slug}
                maxLength={40}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                onBlur={() => setSlugTouched(true)}
                onChange={e => {
                  setNonLatin(/[؀-ۿ]/.test(e.target.value));
                  update('slug', normalizeSlug(e.target.value));
                }}
                placeholder="company-expo"
                className="flex-1 min-w-0 px-3 py-2.5 outline-none text-slate-900 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>
            {!slugLocked && (
              <button
                type="button"
                onClick={() => {
                  setNonLatin(false);
                  update('slug', suggestSlug(config.company.name));
                }}
                title="پیشنهاد آدرس از روی نام شرکت"
                className="shrink-0 inline-flex items-center gap-1 rounded-xl border border-slate-300 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <Lightbulb className="w-4 h-4" /> پیشنهاد
              </button>
            )}
          </div>
        </Field>
      </Section>

      <ContactSection config={config} update={update} issues={issues} previewAt={previewAt} />
    </>
  );
}

function ContactSection({ config, update, issues, previewAt }: Pick<StepProps, 'config' | 'update' | 'issues' | 'previewAt'>) {
  const c = config.contact;
  const set = (patch: Partial<InvitationConfig['contact']>) => update('contact', patch);
  const valid = contactLinks(c).map(l => l.kind);
  const bad = (k: keyof InvitationConfig['contact']) => !!c[k].trim() && !valid.includes(k);
  return (
    <Section title="اطلاعات تماس شرکت" description="به مهمان امکان تماس، پیام در واتس‌اپ و ذخیره شرکت در مخاطبین گوشی را می‌دهد. فقط موارد پرشده نمایش داده می‌شوند." onFocusCapture={() => previewAt(3)}>
      <Field label="راه‌های تماس" hide={hideProps(config, update, 'contact')} warning={pending(config, 'contact')} error={issueFor(issues, 'contact.email')}>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs font-bold text-slate-500 mb-1">تلفن</span>
            <TextInput ltr inputMode="tel" value={c.phone} maxLength={40} invalid={bad('phone')} onChange={e => set({ phone: e.target.value })} placeholder="021-12345678" />
          </label>
          <label className="block">
            <span className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
              واتس‌اپ
              {c.phone && !c.whatsapp && (
                <button type="button" onClick={() => set({ whatsapp: c.phone })} className="text-[11px] text-sky-600">
                  همان تلفن
                </button>
              )}
            </span>
            <TextInput ltr inputMode="tel" value={c.whatsapp} maxLength={40} invalid={bad('whatsapp')} onChange={e => set({ whatsapp: e.target.value })} placeholder="0912…" />
          </label>
          <label className="block">
            <span className="block text-xs font-bold text-slate-500 mb-1">ایمیل</span>
            <TextInput ltr type="email" value={c.email} maxLength={120} invalid={bad('email')} onChange={e => set({ email: e.target.value })} placeholder="info@company.com" />
          </label>
          <label className="block">
            <span className="block text-xs font-bold text-slate-500 mb-1">وب‌سایت</span>
            <TextInput ltr value={c.website} maxLength={300} invalid={bad('website')} onChange={e => set({ website: e.target.value })} placeholder="company.com" />
          </label>
          <label className="block">
            <span className="block text-xs font-bold text-slate-500 mb-1">اینستاگرام</span>
            <TextInput ltr value={c.instagram} maxLength={120} invalid={bad('instagram')} onChange={e => set({ instagram: e.target.value })} placeholder="@company" />
          </label>
          <label className="block">
            <span className="block text-xs font-bold text-slate-500 mb-1">تلگرام</span>
            <TextInput ltr value={c.telegram} maxLength={120} invalid={bad('telegram')} onChange={e => set({ telegram: e.target.value })} placeholder="@company" />
          </label>
        </div>
        {(['phone', 'whatsapp', 'email', 'website', 'instagram', 'telegram'] as const).some(bad) && <p className="text-xs text-rose-600 mt-1.5">موارد قرمز معتبر نیستند و نمایش داده نمی‌شوند.</p>}
      </Field>
    </Section>
  );
}

// ------------------------------------------------------------------ 2. brand

export function BrandStep({ config, update, issues, previewAt }: StepProps) {
  const { theme } = config;
  const warnings = useMemo(() => colorWarnings(theme), [theme]);
  return (
    <>
      <Section title="لوگوها" description="بهتر است از فایل PNG یا SVG با پس‌زمینه شفاف استفاده کنید. تصاویر بزرگ به‌طور خودکار کوچک و فشرده می‌شوند.">
        <div onFocusCapture={() => previewAt(1)} onPointerDownCapture={() => previewAt(1)}>
          <ImageUpload label="لوگوی اصلی شرکت (افقی)" hint="در صفحه اول، روی ویدئو نمایش داده می‌شود." value={config.company.logo} onChange={logo => update('company', { logo })} dark maxImageDim={1200} trim hide={hideProps(config, update, 'logo')} warning={pending(config, 'logo')} />
        </div>
        <div onFocusCapture={() => previewAt(2)} onPointerDownCapture={() => previewAt(2)}>
          <ImageUpload label="نشان شرکت (مربعی)" hint="داخل دایره بالای متن دعوتنامه قرار می‌گیرد." value={config.company.icon} onChange={icon => update('company', { icon })} maxImageDim={512} trim hide={hideProps(config, update, 'icon')} warning={pending(config, 'icon')} />
        </div>
        <div onFocusCapture={() => previewAt(1)} onPointerDownCapture={() => previewAt(1)}>
          <ImageUpload label="لوگوی نمایشگاه" hint="زیر نام نمایشگاه در کارت صفحه اول." value={config.event.logo} onChange={logo => update('event', { logo })} maxImageDim={1000} trim hide={hideProps(config, update, 'eventLogo')} warning={pending(config, 'eventLogo')} />
        </div>
        <ImageUpload
          label="تصویر پیش‌نمایش لینک (اختیاری)"
          hint="وقتی لینک در تلگرام یا واتس‌اپ ارسال می‌شود این تصویر نمایش داده می‌شود. اندازه پیشنهادی ۱۲۰۰×۶۳۰ پیکسل، JPG یا PNG (نه SVG). اگر خالی بماند از لوگو استفاده می‌شود."
          value={config.company.shareImage}
          onChange={shareImage => update('company', { shareImage })}
          maxImageDim={1200}
        />
      </Section>

      <Section title="رنگ‌های سیستم" description="یکی از ترکیب‌های آماده را انتخاب کنید یا رنگ‌های سازمانی کارفرما را دستی وارد کنید." onFocusCapture={() => previewAt(1)}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PALETTES.map(p => (
            <ChoiceCard
              key={p.name}
              selected={p.primary.toLowerCase() === theme.primary.toLowerCase() && p.accent.toLowerCase() === theme.accent.toLowerCase() && p.background.toLowerCase() === theme.background.toLowerCase()}
              onClick={() => update('theme', { primary: p.primary, accent: p.accent, background: p.background })}
              className="p-2.5"
            >
              <div className="flex h-8 rounded-lg overflow-hidden mb-2 border border-slate-200">
                <span className="flex-1" style={{ background: p.background }} />
                <span className="flex-1" style={{ background: p.primary }} />
                <span className="flex-1" style={{ background: p.accent }} />
              </div>
              <span className="text-xs font-bold text-slate-700">{p.name}</span>
            </ChoiceCard>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <ColorInput label="رنگ اصلی" value={theme.primary} onChange={primary => update('theme', { primary })} />
          <ColorInput label="رنگ تأکیدی" value={theme.accent} onChange={accent => update('theme', { accent })} />
          <ColorInput label="رنگ پس‌زمینه" value={theme.background} onChange={background => update('theme', { background })} />
        </div>
        {warnings.length > 0 && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 space-y-1">
            {warnings.map(w => (
              <p key={w} className="text-xs text-amber-800 leading-relaxed flex gap-1.5">
                <TriangleAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                {w}
              </p>
            ))}
          </div>
        )}
      </Section>

      <Section title="فونت" description="همه فونت‌ها روی سرور خودتان میزبانی می‌شوند و به گوگل وابسته نیستند." onFocusCapture={() => previewAt(1)}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {FONTS.map(f => (
            <ChoiceCard key={f.id} selected={theme.font === f.id} onClick={() => update('theme', { font: f.id })} className="p-3">
              <span className="block text-lg font-bold text-slate-900 leading-snug" style={{ fontFamily: `'${f.id}'` }}>
                {f.label}
              </span>
              <span className="block text-xs text-slate-500 mt-1" style={{ fontFamily: `'${f.id}'` }}>
                {f.sample} — ۱۴۰۵
              </span>
            </ChoiceCard>
          ))}
          <ChoiceCard asDiv selected={theme.font === CUSTOM_FONT} onClick={() => theme.customFontUrl && update('theme', { font: CUSTOM_FONT })} className="p-3">
            <span className="block text-sm font-bold text-slate-900 mb-2">فونت اختصاصی</span>
            <UploadButton kind="font" compact label={theme.customFontUrl ? 'تغییر فایل' : 'woff2 / ttf'} onUploaded={r => update('theme', { customFontUrl: r.url, font: CUSTOM_FONT })} />
          </ChoiceCard>
        </div>
        {issueFor(issues, 'theme.font') && <p className="text-xs text-rose-600">{issueFor(issues, 'theme.font')}</p>}
      </Section>
    </>
  );
}

// ------------------------------------------------------------------ 3. media

function PendingNote({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <p className="text-xs text-amber-700 flex gap-1.5 leading-relaxed">
      <TriangleAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
      {text}
    </p>
  );
}

export function MediaStep({ config, update, previewAt }: StepProps) {
  const { media, hidden } = config;
  const presetMusic = PRESET_MUSIC.find(m => m.url === media.music);
  const customMusic = !!media.music && !presetMusic;

  return (
    <>
      <Section
        title="ویدئوی پس‌زمینه"
        description="ویدئوی مخصوص کارفرما را بارگذاری کنید (بی‌صدا و حلقه‌ای پخش می‌شود). یک ویدئوی کوتاه ۱۰ تا ۱۵ ثانیه‌ای با حجم زیر ۸ مگابایت بهترین تجربه را روی همه گوشی‌ها دارد."
        onFocusCapture={() => previewAt(1)}
      >
        <div className="grid grid-cols-2 gap-2">
          <ChoiceCard selected={!!hidden.video} onClick={() => {
              update('media', { video: '', videoPoster: '' });
              update('hidden', { video: true });
            }} className="aspect-[4/3] flex flex-col items-center justify-center gap-2 bg-slate-50">
            <Ban className="w-6 h-6 text-slate-400" />
            <span className="text-xs font-bold text-slate-600">بدون ویدئو</span>
          </ChoiceCard>
          <ChoiceCard asDiv selected={!!media.video && !hidden.video} className="aspect-[4/3] overflow-hidden flex flex-col items-center justify-center gap-2 bg-slate-50 p-2">
            {media.video && media.videoPoster && !hidden.video && <img src={asset(media.videoPoster)} alt="" className="absolute inset-0 w-full h-full object-cover rounded-[14px] opacity-60" />}
            {!media.video && <Upload className="relative w-6 h-6 text-slate-400" />}
            <span className="relative text-xs font-bold text-slate-700 bg-white/80 rounded px-1.5">ویدئوی کارفرما</span>
            <span className="relative">
              <UploadButton
                kind="video"
                compact
                label={media.video ? 'تغییر' : 'MP4 / MOV'}
                onUploaded={r => {
                  update('media', { video: r.url, videoPoster: r.poster ?? '' });
                  update('hidden', { video: false });
                }}
              />
            </span>
          </ChoiceCard>
        </div>
        <PendingNote text={pending(config, 'video')} />
        {media.video && !hidden.video && (
          <>
            <ImageUpload label="تصویر پیش از پخش ویدئو" hint="تا وقتی ویدئو بارگذاری نشده (یا در حالت کم‌مصرف آیفون که ویدئو پخش نمی‌شود) این تصویر نمایش داده می‌شود. به‌طور خودکار از ویدئو ساخته می‌شود." value={media.videoPoster} onChange={videoPoster => update('media', { videoPoster })} maxImageDim={1280} />
            <Field label="میزان وضوح ویدئو" hint="عدد کمتر یعنی ویدئو کم‌رنگ‌تر و رنگ پس‌زمینه پررنگ‌تر.">
              <Slider value={media.videoOpacity} onChange={videoOpacity => update('media', { videoOpacity })} />
            </Field>
          </>
        )}
      </Section>

      <Section title="موزیک پس‌زمینه" description="مرورگرها اجازه پخش خودکار صدا را نمی‌دهند؛ موزیک با اولین لمس مهمان شروع می‌شود و دکمه قطع صدا همیشه در دسترس است.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <ChoiceCard selected={!!hidden.music} onClick={() => {
              update('media', { music: '' });
              update('hidden', { music: true });
            }} className="p-3 flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center">
              <Ban className="w-4 h-4 text-slate-400" />
            </span>
            <span className="text-sm font-bold text-slate-700">بدون موزیک</span>
          </ChoiceCard>
          {PRESET_MUSIC.map(m => (
            <ChoiceCard
              key={m.id}
              selected={media.music === m.url && !hidden.music}
              onClick={() => {
                update('media', { music: m.url });
                update('hidden', { music: false });
              }}
              className="p-3 flex items-center gap-3"
            >
              <AudioPreview src={m.url} />
              <span className="text-sm font-bold text-slate-700">موزیک {m.label}</span>
            </ChoiceCard>
          ))}
          <ChoiceCard asDiv selected={customMusic && !hidden.music} className="p-3 flex items-center gap-3 flex-wrap">
            {customMusic && <AudioPreview src={media.music} />}
            <span className="text-sm font-bold text-slate-700 flex-1">موزیک دلخواه</span>
            <UploadButton
              kind="audio"
              compact
              label={customMusic ? 'تغییر' : 'MP3'}
              onUploaded={r => {
                update('media', { music: r.url });
                update('hidden', { music: false });
              }}
            />
          </ChoiceCard>
        </div>
        <PendingNote text={pending(config, 'music')} />
        {media.music && !hidden.music && (
          <Field label="بلندی صدا">
            <Slider value={media.musicVolume} onChange={musicVolume => update('media', { musicVolume })} />
          </Field>
        )}
      </Section>
    </>
  );
}

// ------------------------------------------------------------------ 4. texts

export function TextsStep({ config, update, issues, previewAt, canEditFooter }: StepProps) {
  return (
    <>
      <Section title="صفحه خوش‌آمد" onFocusCapture={() => previewAt(1)}>
        <Field
          label="جمله خوش‌آمد"
          count={[config.event.welcomeText.length, LIMITS.text]}
          hide={hideProps(config, update, 'welcomeText')}
          warning={pending(config, 'welcomeText')}
          action={!config.event.welcomeText && <SuggestButton onClick={() => update('event', { welcomeText: SUGGESTIONS.welcomeText })} />}
        >
          <TextInput value={config.event.welcomeText} maxLength={LIMITS.text} onChange={e => update('event', { welcomeText: e.target.value })} placeholder={SUGGESTIONS.welcomeText} />
        </Field>
        <Field label="متن دکمه ورود" count={[config.texts.enterButton.length, LIMITS.button]}>
          <TextInput value={config.texts.enterButton} maxLength={LIMITS.button} onChange={e => update('texts', { enterButton: e.target.value })} />
        </Field>
      </Section>

      <Section title="متن دعوتنامه" onFocusCapture={() => previewAt(2)}>
        <Field
          label="متن نامه"
          count={[config.texts.letter.length, LIMITS.letter]}
          hide={hideProps(config, update, 'letter')}
          warning={pending(config, 'letter')}
          action={!config.texts.letter.trim() && <SuggestButton onClick={() => update('texts', { letter: SUGGESTIONS.letter })} />}
          hint={
            <>
              برای شروع پاراگراف جدید یک خط خالی بگذارید. می‌توانید از <code className="bg-slate-100 rounded px-1">{'{company}'}</code> و <code className="bg-slate-100 rounded px-1">{'{event}'}</code> به‌جای نام شرکت و نمایشگاه استفاده کنید؛ در حالت چند لینک، <code className="bg-slate-100 rounded px-1">{"{rep}"}</code> نام کارشناس است.
            </>
          }
        >
          <TextArea rows={9} maxLength={LIMITS.letter} value={config.texts.letter} onChange={e => update('texts', { letter: e.target.value })} placeholder="متن دعوتنامه را بنویسید یا «درج متن پیشنهادی» را بزنید." />
        </Field>
        <Field label="شعار شرکت (زیر امضا)" count={[config.company.tagline.length, LIMITS.short]} hide={hideProps(config, update, 'tagline')} warning={pending(config, 'tagline')}>
          <TextInput value={config.company.tagline} maxLength={LIMITS.short} onChange={e => update('company', { tagline: e.target.value })} placeholder="شعار رسمی کارفرما" />
        </Field>
        <Field label="متن دکمه ادامه" count={[config.texts.detailsButton.length, LIMITS.button]}>
          <TextInput value={config.texts.detailsButton} maxLength={LIMITS.button} onChange={e => update('texts', { detailsButton: e.target.value })} />
        </Field>
      </Section>

      <Section title="صفحه زمان و مکان" onFocusCapture={() => previewAt(3)}>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="متن دکمه نقشه غرفه" count={[config.texts.mapButton.length, LIMITS.button]}>
            <TextInput value={config.texts.mapButton} maxLength={LIMITS.button} onChange={e => update('texts', { mapButton: e.target.value })} />
          </Field>
          <Field label="متن دکمه اشتراک‌گذاری" count={[config.texts.shareButton.length, LIMITS.button]} hide={hideProps(config, update, 'share')}>
            <TextInput value={config.texts.shareButton} maxLength={LIMITS.button} onChange={e => update('texts', { shareButton: e.target.value })} />
          </Field>
        </div>
        {!config.hidden.share && (
          <Field label="متن پیام اشتراک‌گذاری (اختیاری)" hint="اگر خالی بماند، به‌طور خودکار از نام نمایشگاه، تاریخ و محل ساخته می‌شود." count={[config.texts.shareText.length, LIMITS.shareText]}>
            <TextArea rows={3} maxLength={LIMITS.shareText} value={config.texts.shareText} onChange={e => update('texts', { shareText: e.target.value })} />
          </Field>
        )}
      </Section>

      {canEditFooter && (
        <Section title="امضای پایین صفحه" description="فقط مدیر سامانه می‌تواند این بخش را تغییر دهد." onFocusCapture={() => previewAt(1)}>
          <Toggle checked={config.footer.show} onChange={show => update('footer', { show })} label="نمایش امضای طراح در پایین صفحه" />
          {config.footer.show && (
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="متن اول">
                <TextInput value={config.footer.text} maxLength={LIMITS.short} onChange={e => update('footer', { text: e.target.value })} />
              </Field>
              <Field label="متن دوم">
                <TextInput value={config.footer.subText} maxLength={LIMITS.short} onChange={e => update('footer', { subText: e.target.value })} />
              </Field>
              <UrlInput label="لینک" value={config.footer.url} onChange={url => update('footer', { url })} forceError={!!issueFor(issues, 'footer.url')} />
            </div>
          )}
        </Section>
      )}
    </>
  );
}

// ------------------------------------------------------------------ 5. event

export function EventStep({ config, update, issues, previewAt }: StepProps) {
  const e = config.event;
  const [autoLabels, setAutoLabels] = useState(
    () => !e.dateLabel || (e.dateLabel === jalaliRangeLabel(e.startDate, e.endDate) && e.timeLabel === timeRangeLabel(e.startTime, e.endTime, e.timezone)),
  );

  const setSchedule = (patch: Partial<InvitationConfig['event']>) => {
    const next = { ...e, ...patch };
    if (patch.startDate && (!next.endDate || next.endDate < patch.startDate)) next.endDate = patch.startDate;
    update('event', {
      ...patch,
      endDate: next.endDate,
      ...(autoLabels ? { dateLabel: jalaliRangeLabel(next.startDate, next.endDate), timeLabel: timeRangeLabel(next.startTime, next.endTime, next.timezone) } : {}),
    });
  };

  const timeError = e.startTime && e.endTime && e.endTime <= e.startTime ? 'ساعت پایان باید بعد از ساعت شروع باشد.' : undefined;
  const dateHidden = !!config.hidden.date;
  const timeHidden = !!config.hidden.time;

  return (
    <>
      <Section title="زمان برگزاری" description="تاریخ‌ها برای ثبت در تقویم گوگل و اپل هم استفاده می‌شوند. اگر نمایشگاه چندروزه است، ساعت‌ها ساعت کاری هر روز است." onFocusCapture={() => previewAt(3)}>
        <Field label="تاریخ برگزاری" hide={hideProps(config, update, 'date')} warning={pending(config, 'date')} error={issueFor(issues, 'event.dates')}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className="block text-xs font-bold text-slate-500 mb-1">از</span>
              <JalaliDatePicker value={e.startDate} onChange={startDate => setSchedule({ startDate })} placeholder="تاریخ شروع" />
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-500 mb-1">تا</span>
              <JalaliDatePicker value={e.endDate} min={e.startDate} onChange={endDate => setSchedule({ endDate })} placeholder="تاریخ پایان" />
            </div>
          </div>
          {(e.startDate || e.endDate) && (
            <button type="button" onClick={() => setSchedule({ startDate: '', endDate: '' })} className="mt-1.5 text-[11px] font-bold text-slate-500 hover:text-rose-600">
              پاک کردن تاریخ
            </button>
          )}
        </Field>

        <Field label="ساعت کاری" hide={hideProps(config, update, 'time')} warning={pending(config, 'time')} error={timeError}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="block text-xs font-bold text-slate-500 mb-1">از ساعت</span>
              <TextInput type="time" value={e.startTime} onChange={ev => setSchedule({ startTime: ev.target.value })} />
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-500 mb-1">تا ساعت</span>
              <TextInput type="time" value={e.endTime} invalid={!!timeError} onChange={ev => setSchedule({ endTime: ev.target.value })} />
            </div>
          </div>
        </Field>

        {(!dateHidden || !timeHidden) && (
          <Field label="منطقه زمانی محل برگزاری" hint="برای ثبت درست ساعت در تقویم مهمانانی که در کشور دیگری هستند.">
            <select value={e.timezone} onChange={ev => setSchedule({ timezone: ev.target.value })} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 outline-none focus:border-sky-500">
              {TIMEZONES.map(z => (
                <option key={z.id} value={z.id}>
                  {z.label}
                </option>
              ))}
            </select>
          </Field>
        )}

        {(!dateHidden || !timeHidden) && (
          <div className="grid sm:grid-cols-2 gap-3">
            {!dateHidden && (
              <Field label="متن نمایشی تاریخ">
                <TextInput
                  value={e.dateLabel}
                  maxLength={LIMITS.short}
                  onChange={ev => {
                    setAutoLabels(false);
                    update('event', { dateLabel: ev.target.value });
                  }}
                  placeholder="به‌طور خودکار از تاریخ ساخته می‌شود"
                />
              </Field>
            )}
            {!timeHidden && (
              <Field label="متن نمایشی ساعت">
                <TextInput
                  value={e.timeLabel}
                  maxLength={LIMITS.short}
                  onChange={ev => {
                    setAutoLabels(false);
                    update('event', { timeLabel: ev.target.value });
                  }}
                  placeholder="به‌طور خودکار از ساعت ساخته می‌شود"
                />
              </Field>
            )}
          </div>
        )}
        {!autoLabels && (
          <button
            type="button"
            onClick={() => {
              setAutoLabels(true);
              update('event', { dateLabel: jalaliRangeLabel(e.startDate, e.endDate), timeLabel: timeRangeLabel(e.startTime, e.endTime, e.timezone) });
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 hover:underline"
          >
            <RefreshCw className="w-3.5 h-3.5" /> ساخت خودکار متن‌ها از روی تاریخ و ساعت
          </button>
        )}
        <Field label="دکمه‌های «ثبت در تقویم»" hide={hideProps(config, update, 'calendar')} warning={pending(config, 'calendar')}>
          <p className="text-xs text-slate-500 leading-relaxed">مهمان می‌تواند رویداد را در تقویم گوگل یا اپل ثبت کند. اگر ساعت مشخص نباشد، رویداد تمام‌روز ثبت می‌شود.</p>
        </Field>
      </Section>

      <Section title="مکان" onFocusCapture={() => previewAt(3)}>
        <Field label="محل برگزاری" hide={hideProps(config, update, 'location')} warning={pending(config, 'location')}>
          <TextInput value={e.location} maxLength={LIMITS.short} onChange={ev => update('event', { location: ev.target.value })} placeholder="مثلاً: مرکز نمایشگاهی …" />
        </Field>
        {!config.hidden.location && (
          <UrlInput
            label="لینک مسیریابی"
            hint="لینک مکان را از گوگل‌مپ، نشان یا بلد کپی کنید (دکمه «اشتراک‌گذاری» در همان برنامه)."
            value={e.mapUrl}
            onChange={mapUrl => update('event', { mapUrl })}
            hide={hideProps(config, update, 'mapUrl')}
            warning={pending(config, 'mapUrl')}
            forceError={!!issueFor(issues, 'event.mapUrl')}
            extra={
              <button
                type="button"
                disabled={!e.location}
                onClick={() => update('event', { mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.location)}` })}
                title="ساخت لینک گوگل‌مپ از روی نام محل"
                className="shrink-0 inline-flex items-center gap-1 rounded-xl border border-slate-300 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <Wand2 className="w-4 h-4" /> گوگل‌مپ
              </button>
            }
          />
        )}
        <Field label="شماره سالن و غرفه" hide={hideProps(config, update, 'booth')} warning={pending(config, 'booth')} hint="اگر غرفه هنوز مشخص نیست و می‌خواهید نسخه اولیه را منتشر کنید، «نمایش داده نشود» را بزنید.">
          <TextInput value={e.booth} maxLength={LIMITS.short} onChange={ev => update('event', { booth: ev.target.value })} placeholder="مثلاً: سالن ۵، غرفه ۱۲" />
        </Field>
        <UrlInput
          label="لینک نقشه تعاملی غرفه"
          hint="اگر نقشه سه‌بعدی یا تصویری از غرفه دارید، لینک آن را وارد کنید تا دکمه «مکان‌یابی دقیق غرفه» نمایش داده شود. بعضی سایت‌ها اجازه نمایش داخل صفحه را نمی‌دهند؛ در آن صورت مهمان می‌تواند نقشه را در صفحه جدید باز کند."
          value={e.boothMapUrl}
          onChange={boothMapUrl => update('event', { boothMapUrl })}
          hide={hideProps(config, update, 'boothMap')}
          warning={pending(config, 'boothMap')}
          forceError={!!issueFor(issues, 'event.boothMapUrl')}
        />
      </Section>
    </>
  );
}

// ------------------------------------------------------------------ 6. English

export function EnglishStep({ config, update, issues }: StepProps) {
  const e = config.en;
  const set = (patch: Partial<InvitationConfig['en']>) => update('en', patch);
  const err = (f: keyof InvitationConfig['en']) => issueFor(issues, `en.${f}` as IssueField);
  const missing = (f: keyof InvitationConfig['en']) => (e.enabled && !String(e[f]).trim() ? 'هنوز وارد نشده' : undefined);
  const shown = (k: ItemKey) => isShown(config, k);
  const ref = (fa: string) => (fa ? <span className="text-slate-400">فارسی: {fa.length > 90 ? `${fa.slice(0, 90)}…` : fa}</span> : undefined);
  const en = (props: React.InputHTMLAttributes<HTMLInputElement>) => <TextInput dir="ltr" className="text-left" {...props} />;

  return (
    <>
      <Section title="نسخه انگلیسی" description="برای مهمانان خارجی؛ دکمه English در بالای دعوتنامه نمایش داده می‌شود و مهمان می‌تواند زبان را عوض کند. پیش‌نمایش در این مرحله انگلیسی است.">
        <Toggle checked={e.enabled} onChange={enabled => set({ enabled })} label="دعوتنامه نسخه انگلیسی هم داشته باشد" />
      </Section>

      {e.enabled && (
        <>
          <Section title="شرکت و نمایشگاه">
            <Field label="Company name" required hint={ref(config.company.name)} error={err('companyName')} warning={missing('companyName')}>
              {en({ value: e.companyName, maxLength: LIMITS.short, onChange: ev => set({ companyName: ev.target.value }) })}
            </Field>
            <Field label="Exhibition name" required hint={ref(config.event.title)} error={err('title')} warning={missing('title')}>
              {en({ value: e.title, maxLength: LIMITS.short, onChange: ev => set({ title: ev.target.value }) })}
            </Field>
            {shown('badge') && (
              <Field label="Badge" hint={ref(config.event.badge)} error={err('badge')} warning={missing('badge')} action={!e.badge && <SuggestButton onClick={() => set({ badge: SUGGESTIONS_EN.badge })} />}>
                {en({ value: e.badge, maxLength: LIMITS.short, onChange: ev => set({ badge: ev.target.value }), placeholder: SUGGESTIONS_EN.badge })}
              </Field>
            )}
            {shown('tagline') && (
              <Field label="Tagline" hint={ref(config.company.tagline)} error={err('tagline')} warning={missing('tagline')}>
                {en({ value: e.tagline, maxLength: LIMITS.short, onChange: ev => set({ tagline: ev.target.value }) })}
              </Field>
            )}
          </Section>

          <Section title="متن‌ها">
            {shown('welcomeText') && (
              <Field label="Welcome line" hint={ref(config.event.welcomeText)} error={err('welcomeText')} warning={missing('welcomeText')} action={!e.welcomeText && <SuggestButton onClick={() => set({ welcomeText: SUGGESTIONS_EN.welcomeText })} />}>
                {en({ value: e.welcomeText, maxLength: LIMITS.text, onChange: ev => set({ welcomeText: ev.target.value }) })}
              </Field>
            )}
            {shown('letter') && (
              <Field label="Invitation letter" hint="Leave a blank line between paragraphs. {company}, {event} and {guest} are replaced automatically." error={err('letter')} warning={missing('letter')} action={!e.letter.trim() && <SuggestButton onClick={() => set({ letter: SUGGESTIONS_EN.letter })} />}>
                <TextArea dir="ltr" className="text-left" rows={8} maxLength={LIMITS.letter} value={e.letter} onChange={ev => set({ letter: ev.target.value })} />
              </Field>
            )}
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Enter button">{en({ value: e.enterButton, maxLength: LIMITS.button, onChange: ev => set({ enterButton: ev.target.value }) })}</Field>
              <Field label="Details button">{en({ value: e.detailsButton, maxLength: LIMITS.button, onChange: ev => set({ detailsButton: ev.target.value }) })}</Field>
              {shown('boothMap') && <Field label="Booth map button">{en({ value: e.mapButton, maxLength: LIMITS.button, onChange: ev => set({ mapButton: ev.target.value }) })}</Field>}
              {shown('share') && <Field label="Share button">{en({ value: e.shareButton, maxLength: LIMITS.button, onChange: ev => set({ shareButton: ev.target.value }) })}</Field>}
            </div>
          </Section>

          <Section title="زمان و مکان">
            {shown('date') && (
              <Field label="Date label" hint={`Generated automatically: ${englishDateLabel(config.event.startDate, config.event.endDate) || '—'}`}>
                {en({ value: e.dateLabel, maxLength: LIMITS.short, onChange: ev => set({ dateLabel: ev.target.value }), placeholder: englishDateLabel(config.event.startDate, config.event.endDate) || 'Automatic' })}
              </Field>
            )}
            {shown('time') && (
              <Field label="Hours label" hint={`Generated automatically: ${englishTimeLabel(config.event.startTime, config.event.endTime, config.event.timezone) || '—'}`}>
                {en({ value: e.timeLabel, maxLength: LIMITS.short, onChange: ev => set({ timeLabel: ev.target.value }), placeholder: englishTimeLabel(config.event.startTime, config.event.endTime, config.event.timezone) || 'Automatic' })}
              </Field>
            )}
            {shown('location') && (
              <Field label="Venue" hint={ref(config.event.location)} error={err('location')} warning={missing('location')}>
                {en({ value: e.location, maxLength: LIMITS.short, onChange: ev => set({ location: ev.target.value }) })}
              </Field>
            )}
            {shown('booth') && (
              <Field label="Hall & booth" hint={ref(config.event.booth)} error={err('booth')} warning={missing('booth')}>
                {en({ value: e.booth, maxLength: LIMITS.short, onChange: ev => set({ booth: ev.target.value }), placeholder: 'Hall 5, Booth 12' })}
              </Field>
            )}
          </Section>
        </>
      )}
    </>
  );
}

// ------------------------------------------------------------------ 7. guests

export function GuestsStep({ config, update, previewAt }: StepProps) {
  const r = config.rsvp;
  return (
    <>
      <Section title="متن خطاب در لینک‌های شخصی" description="وقتی مهمان با لینک شخصی وارد شود، این جمله بالای متن دعوتنامه نمایش داده می‌شود. {guest} با نام مهمان جایگزین می‌شود." onFocusCapture={() => previewAt(2)}>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="فارسی">
            <TextInput value={config.texts.guestGreeting} maxLength={LIMITS.short} onChange={e => update('texts', { guestGreeting: e.target.value })} placeholder="{guest} گرامی" />
          </Field>
          {config.en.enabled && (
            <Field label="English">
              <TextInput dir="ltr" className="text-left" value={config.en.guestGreeting} maxLength={LIMITS.short} onChange={e => update('en', { guestGreeting: e.target.value })} placeholder="Dear {guest}," />
            </Field>
          )}
        </div>
      </Section>

      <Section title="اعلام حضور (RSVP)" description="مهمان با دکمه «اعلام حضور» نام، روز حضور و تعداد نفرات را ثبت می‌کند تا شرکت برای هر روز آماده باشد." onFocusCapture={() => previewAt(3)}>
        <Toggle checked={r.enabled} onChange={enabled => update('rsvp', { enabled })} label="فرم اعلام حضور فعال باشد" />
        {r.enabled && (
          <>
            <div className="flex flex-wrap gap-4">
              <Toggle checked={r.askPhone} onChange={askPhone => update('rsvp', { askPhone })} label="پرسیدن شماره تماس" />
              <Toggle checked={r.askCompany} onChange={askCompany => update('rsvp', { askCompany })} label="پرسیدن نام شرکت/سازمان" />
            </div>
            <Field label="توضیح حریم خصوصی زیر فرم" hint="به مهمان بگویید اطلاعاتش برای چه استفاده می‌شود.">
              <TextArea rows={2} maxLength={LIMITS.text} value={r.note} onChange={e => update('rsvp', { note: e.target.value })} />
            </Field>
          </>
        )}
      </Section>
    </>
  );
}
