import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Ban, Link2, Loader2, RefreshCw, CheckCircle2, XCircle, Wand2, TriangleAlert, Lightbulb } from 'lucide-react';
import { CUSTOM_FONT, FONTS, LIMITS, PALETTES, PRESET_MUSIC, PRESET_VIDEOS, RESERVED_SLUGS, SLUG_RE, TIMEZONES, type InvitationConfig, type Issue, type IssueField } from '../shared/invitation';
import { jalaliRangeLabel, timeRangeLabel } from '../shared/calendar';
import { colorWarnings } from '../shared/color';
import { api } from '../lib/api';
import { asset, route } from '../lib/paths';
import JalaliDatePicker from './JalaliDatePicker';
import { AudioPreview, ChoiceCard, ColorInput, Field, ImageUpload, Section, Slider, TextArea, TextInput, Toggle, UploadButton, UrlInput } from './ui';

export type Update = <K extends keyof InvitationConfig>(section: K, patch: InvitationConfig[K] extends object ? Partial<InvitationConfig[K]> : InvitationConfig[K]) => void;

export interface StepProps {
  config: InvitationConfig;
  update: Update;
  isEdit: boolean;
  /** Validation problems to show inline (only after the user tried to continue/publish) */
  issues: Issue[];
  /** Move the live preview to the screen that shows the field being edited */
  previewAt: (step: number) => void;
  canEditFooter: boolean;
}

const issueFor = (issues: Issue[], field: IssueField) => issues.find(i => i.field === field)?.message;

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

/** Rough Latin version of a Persian name, for a slug suggestion ("بهان سار" -> "bahan-sar"-ish). */
export function suggestSlug(name: string): string {
  const latin = [...name.trim()].map(ch => TRANSLIT[ch] ?? (/[a-z0-9]/i.test(ch) ? ch : ch === ' ' || ch === '‌' ? '-' : '')).join('');
  const s = normalizeSlug(latin).replace(/^-+|-+$/g, '');
  return s.length >= 3 ? s : `invite-${Math.random().toString(36).slice(2, 6)}`;
}

// ------------------------------------------------------------------ 1. basics

export function BasicsStep({ config, update, isEdit, issues, previewAt, slugState, setSlugState }: StepProps & { slugState: SlugState; setSlugState: (s: SlugState) => void }) {
  const slug = config.slug;
  const [slugTouched, setSlugTouched] = useState(false);
  const [nonLatin, setNonLatin] = useState(false);

  useEffect(() => {
    if (isEdit) return;
    if (!slug) return setSlugState('idle');
    if (!SLUG_RE.test(slug) || RESERVED_SLUGS.has(slug)) return setSlugState('invalid');
    setSlugState('checking');
    const t = window.setTimeout(() => {
      api
        .slugAvailable(slug)
        .then(r => setSlugState(!r.valid ? 'invalid' : r.available ? 'available' : 'taken'))
        .catch(() => setSlugState('idle'));
    }, 400);
    return () => window.clearTimeout(t);
  }, [slug, isEdit, setSlugState]);

  const showInvalid = slugState === 'invalid' && (slugTouched || issues.some(i => i.field === 'slug'));
  const slugMsg: React.ReactNode = nonLatin ? (
    <span className="text-amber-700">فقط حروف انگلیسی پذیرفته می‌شود؛ صفحه‌کلید را انگلیسی کنید.</span>
  ) : slugState === 'checking' ? (
    <span className="inline-flex items-center gap-1">
      <Loader2 className="w-3.5 h-3.5 animate-spin" /> در حال بررسی…
    </span>
  ) : slugState === 'available' ? (
    <span className="inline-flex items-center gap-1 text-emerald-600">
      <CheckCircle2 className="w-3.5 h-3.5" /> این آدرس آزاد است
    </span>
  ) : slugState === 'taken' ? (
    <span className="inline-flex items-center gap-1 text-rose-600">
      <XCircle className="w-3.5 h-3.5" /> این آدرس قبلاً گرفته شده است
    </span>
  ) : showInvalid ? (
    <span className="text-rose-600">{RESERVED_SLUGS.has(slug) ? 'این آدرس رزرو شده است.' : 'بین ۳ تا ۴۰ کاراکتر؛ فقط a-z، ۰-۹ و خط تیره (نه در ابتدا یا انتها)'}</span>
  ) : (
    'فقط حروف انگلیسی کوچک، عدد و خط تیره؛ مثلاً behansar-iranpharma'
  );

  return (
    <>
      <Section title="شرکت و نمایشگاه" description="نام شرکت دعوت‌کننده و نمایشگاهی که در آن غرفه دارید." onFocusCapture={() => previewAt(1)}>
        <Field label="نام شرکت" required error={issueFor(issues, 'company.name')} count={[config.company.name.length, LIMITS.short]}>
          <TextInput value={config.company.name} maxLength={LIMITS.short} invalid={!!issueFor(issues, 'company.name')} onChange={e => update('company', { name: e.target.value })} placeholder="مثلاً: بهان سار" />
        </Field>
        <Field label="نام نمایشگاه" required error={issueFor(issues, 'event.title')} count={[config.event.title.length, LIMITS.short]}>
          <TextInput value={config.event.title} maxLength={LIMITS.short} invalid={!!issueFor(issues, 'event.title')} onChange={e => update('event', { title: e.target.value })} placeholder="مثلاً: نمایشگاه ایران فارما" />
        </Field>
        <Field label="عنوان بالای نام نمایشگاه" hint="متن کوچکی که بالای نام نمایشگاه در صفحه اول نمایش داده می‌شود.">
          <TextInput value={config.event.badge} maxLength={LIMITS.short} onChange={e => update('event', { badge: e.target.value })} placeholder="دعوتنامه رسمی" />
        </Field>
      </Section>

      <Section title="لینک اختصاصی" description="آدرسی که برای مهمانان ارسال می‌شود. بعد از انتشار قابل تغییر نیست.">
        <Field label="آدرس لینک" required hint={isEdit ? 'آدرس دعوتنامه‌های منتشرشده قابل تغییر نیست.' : slugMsg}>
          <div className="flex gap-2">
            <div
              dir="ltr"
              className={`flex-1 min-w-0 flex items-stretch rounded-xl border overflow-hidden focus-within:ring-4 focus-within:ring-sky-500/15 ${showInvalid || slugState === 'taken' ? 'border-rose-400' : 'border-slate-300 focus-within:border-sky-500'}`}
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
                disabled={isEdit}
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
            {!isEdit && (
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
    </>
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
          <ImageUpload label="لوگوی اصلی شرکت (افقی)" hint="در صفحه اول، روی ویدئو نمایش داده می‌شود." value={config.company.logo} onChange={logo => update('company', { logo })} dark maxImageDim={1200} />
        </div>
        <div onFocusCapture={() => previewAt(2)} onPointerDownCapture={() => previewAt(2)}>
          <ImageUpload label="نشان شرکت (مربعی)" hint="داخل دایره بالای متن دعوتنامه قرار می‌گیرد." value={config.company.icon} onChange={icon => update('company', { icon })} maxImageDim={512} />
        </div>
        <div onFocusCapture={() => previewAt(1)} onPointerDownCapture={() => previewAt(1)}>
          <ImageUpload label="لوگوی نمایشگاه (اختیاری)" hint="زیر نام نمایشگاه در کارت صفحه اول." value={config.event.logo} onChange={logo => update('event', { logo })} maxImageDim={1000} />
        </div>
        <ImageUpload
          label="تصویر پیش‌نمایش لینک (اختیاری)"
          hint="وقتی لینک در تلگرام یا واتس‌اپ ارسال می‌شود این تصویر نمایش داده می‌شود. اندازه پیشنهادی ۱۲۰۰×۶۳۰ پیکسل، JPG یا PNG (نه SVG). اگر خالی بماند از لوگو استفاده می‌شود."
          value={config.company.shareImage}
          onChange={shareImage => update('company', { shareImage })}
          maxImageDim={1200}
        />
      </Section>

      <Section title="رنگ‌های سیستم" description="یکی از ترکیب‌های آماده را انتخاب کنید یا رنگ‌ها را دستی تنظیم کنید." onFocusCapture={() => previewAt(1)}>
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

export function MediaStep({ config, update, previewAt }: StepProps) {
  const { media } = config;
  const presetVideo = PRESET_VIDEOS.find(v => v.url === media.video);
  const customVideo = !!media.video && !presetVideo;
  const presetMusic = PRESET_MUSIC.find(m => m.url === media.music);
  const customMusic = !!media.music && !presetMusic;

  return (
    <>
      <Section
        title="ویدئوی پس‌زمینه"
        description="ویدئو بی‌صدا و به‌صورت حلقه پخش می‌شود. یک ویدئوی کوتاه (۱۰ تا ۱۵ ثانیه) با فرمت MP4 و حجم زیر ۸ مگابایت بهترین تجربه را روی همه گوشی‌ها دارد."
        onFocusCapture={() => previewAt(1)}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <ChoiceCard selected={!media.video} onClick={() => update('media', { video: '', videoPoster: '' })} className="aspect-[3/4] flex flex-col items-center justify-center gap-2 bg-slate-50">
            <Ban className="w-6 h-6 text-slate-400" />
            <span className="text-xs font-bold text-slate-600">بدون ویدئو</span>
          </ChoiceCard>
          {PRESET_VIDEOS.map(v => (
            <ChoiceCard key={v.id} selected={media.video === v.url} onClick={() => update('media', { video: v.url, videoPoster: v.poster })} className="aspect-[3/4] overflow-hidden">
              <img src={asset(v.poster)} alt="" className="absolute inset-0 w-full h-full object-cover rounded-[14px]" />
              <span className="absolute bottom-2 right-2 text-xs font-bold text-white bg-black/50 rounded-lg px-2 py-1">{v.label}</span>
            </ChoiceCard>
          ))}
          <ChoiceCard asDiv selected={customVideo} className="aspect-[3/4] overflow-hidden flex flex-col items-center justify-center gap-2 bg-slate-50 p-2">
            {customVideo && media.videoPoster && <img src={asset(media.videoPoster)} alt="" className="absolute inset-0 w-full h-full object-cover rounded-[14px] opacity-60" />}
            <span className="relative text-xs font-bold text-slate-700 bg-white/80 rounded px-1.5">ویدئوی دلخواه</span>
            <span className="relative">
              <UploadButton kind="video" compact label={customVideo ? 'تغییر' : 'MP4 / MOV'} onUploaded={r => update('media', { video: r.url, videoPoster: r.poster ?? '' })} />
            </span>
          </ChoiceCard>
        </div>
        {customVideo && (
          <ImageUpload label="تصویر پیش از پخش ویدئو" hint="تا وقتی ویدئو بارگذاری نشده (یا در حالت کم‌مصرف آیفون که ویدئو پخش نمی‌شود) این تصویر نمایش داده می‌شود. به‌طور خودکار از ویدئو ساخته می‌شود." value={media.videoPoster} onChange={videoPoster => update('media', { videoPoster })} maxImageDim={1280} />
        )}
        {media.video && (
          <Field label="میزان وضوح ویدئو" hint="عدد کمتر یعنی ویدئو کم‌رنگ‌تر و رنگ پس‌زمینه پررنگ‌تر.">
            <Slider value={media.videoOpacity} onChange={videoOpacity => update('media', { videoOpacity })} />
          </Field>
        )}
      </Section>

      <Section title="موزیک پس‌زمینه" description="مرورگرها اجازه پخش خودکار صدا را نمی‌دهند؛ موزیک با اولین لمس مهمان شروع می‌شود و دکمه قطع صدا همیشه در دسترس است.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <ChoiceCard selected={!media.music} onClick={() => update('media', { music: '' })} className="p-3 flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center">
              <Ban className="w-4 h-4 text-slate-400" />
            </span>
            <span className="text-sm font-bold text-slate-700">بدون موزیک</span>
          </ChoiceCard>
          {PRESET_MUSIC.map(m => (
            <ChoiceCard key={m.id} selected={media.music === m.url} onClick={() => update('media', { music: m.url })} className="p-3 flex items-center gap-3">
              <AudioPreview src={m.url} />
              <span className="text-sm font-bold text-slate-700">موزیک {m.label}</span>
            </ChoiceCard>
          ))}
          <ChoiceCard asDiv selected={customMusic} className="p-3 flex items-center gap-3 flex-wrap">
            {customMusic && <AudioPreview src={media.music} />}
            <span className="text-sm font-bold text-slate-700 flex-1">موزیک دلخواه</span>
            <UploadButton kind="audio" compact label={customMusic ? 'تغییر' : 'MP3'} onUploaded={r => update('media', { music: r.url })} />
          </ChoiceCard>
        </div>
        {media.music && (
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
        <Field label="جمله خوش‌آمد" count={[config.event.welcomeText.length, LIMITS.text]}>
          <TextInput value={config.event.welcomeText} maxLength={LIMITS.text} onChange={e => update('event', { welcomeText: e.target.value })} placeholder="مفتخریم میزبان شما در این رویداد بزرگ باشیم" />
        </Field>
        <Field label="متن دکمه ورود" count={[config.texts.enterButton.length, LIMITS.button]}>
          <TextInput value={config.texts.enterButton} maxLength={LIMITS.button} onChange={e => update('texts', { enterButton: e.target.value })} />
        </Field>
      </Section>

      <Section title="متن دعوتنامه" onFocusCapture={() => previewAt(2)}>
        <Field
          label="متن نامه"
          count={[config.texts.letter.length, LIMITS.letter]}
          hint={
            <>
              برای شروع پاراگراف جدید یک خط خالی بگذارید. می‌توانید از <code className="bg-slate-100 rounded px-1">{'{company}'}</code> و <code className="bg-slate-100 rounded px-1">{'{event}'}</code> به‌جای نام شرکت و نمایشگاه استفاده کنید.
            </>
          }
        >
          <TextArea rows={9} maxLength={LIMITS.letter} value={config.texts.letter} onChange={e => update('texts', { letter: e.target.value })} />
        </Field>
        <Field label="شعار شرکت (زیر امضا)" count={[config.company.tagline.length, LIMITS.short]}>
          <TextInput value={config.company.tagline} maxLength={LIMITS.short} onChange={e => update('company', { tagline: e.target.value })} placeholder="همراه شما در مسیر سلامت و نوآوری" />
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
          <Field label="متن دکمه اشتراک‌گذاری" count={[config.texts.shareButton.length, LIMITS.button]}>
            <TextInput value={config.texts.shareButton} maxLength={LIMITS.button} onChange={e => update('texts', { shareButton: e.target.value })} />
          </Field>
        </div>
        <Field label="متن پیام اشتراک‌گذاری (اختیاری)" hint="اگر خالی بماند، به‌طور خودکار از نام نمایشگاه، تاریخ و محل ساخته می‌شود." count={[config.texts.shareText.length, LIMITS.shareText]}>
          <TextArea rows={3} maxLength={LIMITS.shareText} value={config.texts.shareText} onChange={e => update('texts', { shareText: e.target.value })} />
        </Field>
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
              <UrlInput label="لینک" value={config.footer.url} onChange={url => update('footer', { url })} />
              {issueFor(issues, 'footer.url') && <p className="text-xs text-rose-600">{issueFor(issues, 'footer.url')}</p>}
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

  const timeError = e.endTime <= e.startTime ? 'ساعت پایان باید بعد از ساعت شروع باشد.' : undefined;

  return (
    <>
      <Section title="زمان برگزاری" description="تاریخ‌ها برای ثبت در تقویم گوگل و اپل استفاده می‌شوند. اگر نمایشگاه چندروزه است، ساعت‌ها ساعت کاری هر روز است." onFocusCapture={() => previewAt(3)}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="تاریخ شروع" required error={issueFor(issues, 'event.dates')}>
            <JalaliDatePicker value={e.startDate} invalid={!!issueFor(issues, 'event.dates')} onChange={startDate => setSchedule({ startDate })} />
          </Field>
          <Field label="تاریخ پایان" required>
            <JalaliDatePicker value={e.endDate} min={e.startDate} onChange={endDate => setSchedule({ endDate })} />
          </Field>
          <Field label="ساعت شروع">
            <TextInput type="time" value={e.startTime} onChange={ev => ev.target.value && setSchedule({ startTime: ev.target.value })} />
          </Field>
          <Field label="ساعت پایان" error={timeError}>
            <TextInput type="time" value={e.endTime} invalid={!!timeError} onChange={ev => ev.target.value && setSchedule({ endTime: ev.target.value })} />
          </Field>
        </div>
        <Field label="منطقه زمانی محل برگزاری" hint="برای ثبت درست ساعت در تقویم مهمانانی که در کشور دیگری هستند.">
          <select
            value={e.timezone}
            onChange={ev => setSchedule({ timezone: ev.target.value })}
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 outline-none focus:border-sky-500"
          >
            {TIMEZONES.map(z => (
              <option key={z.id} value={z.id}>
                {z.label}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="متن نمایشی تاریخ">
            <TextInput
              value={e.dateLabel}
              maxLength={LIMITS.short}
              onChange={ev => {
                setAutoLabels(false);
                update('event', { dateLabel: ev.target.value });
              }}
              placeholder="۱ تا ۳ مهر ماه ۱۴۰۵"
            />
          </Field>
          <Field label="متن نمایشی ساعت">
            <TextInput
              value={e.timeLabel}
              maxLength={LIMITS.short}
              onChange={ev => {
                setAutoLabels(false);
                update('event', { timeLabel: ev.target.value });
              }}
            />
          </Field>
        </div>
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
      </Section>

      <Section title="مکان" onFocusCapture={() => previewAt(3)}>
        <Field label="محل برگزاری" required error={issueFor(issues, 'event.location')}>
          <TextInput value={e.location} maxLength={LIMITS.short} invalid={!!issueFor(issues, 'event.location')} onChange={ev => update('event', { location: ev.target.value })} placeholder="مثلاً: مصلی تهران" />
        </Field>
        <UrlInput
          label="لینک مسیریابی"
          hint="لینک مکان را از گوگل‌مپ، نشان یا بلد کپی کنید (دکمه «اشتراک‌گذاری» در همان برنامه)."
          value={e.mapUrl}
          onChange={mapUrl => update('event', { mapUrl })}
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
        <Field label="شماره سالن و غرفه">
          <TextInput value={e.booth} maxLength={LIMITS.short} onChange={ev => update('event', { booth: ev.target.value })} placeholder="سالن E، غرفه‌های ۱۵۹ تا ۱۶۲" />
        </Field>
        <UrlInput
          label="لینک نقشه تعاملی غرفه (اختیاری)"
          hint="اگر نقشه سه‌بعدی یا تصویری از غرفه دارید، لینک آن را وارد کنید تا دکمه «مکان‌یابی دقیق غرفه» نمایش داده شود. بعضی سایت‌ها اجازه نمایش داخل صفحه را نمی‌دهند؛ در آن صورت مهمان می‌تواند نقشه را در صفحه جدید باز کند. در پیش‌نمایش امتحانش کنید."
          value={e.boothMapUrl}
          onChange={boothMapUrl => update('event', { boothMapUrl })}
        />
      </Section>
    </>
  );
}
