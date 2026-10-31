import type React from 'react';
import { useEffect, useState } from 'react';
import { Ban, Link2, Loader2, RefreshCw, CheckCircle2, XCircle, Wand2 } from 'lucide-react';
import { CUSTOM_FONT, FONTS, PALETTES, PRESET_MUSIC, PRESET_VIDEOS, SLUG_RE, type InvitationConfig } from '../shared/invitation';
import { jalaliRangeLabel, timeRangeLabel } from '../shared/calendar';
import { api } from '../lib/api';
import { AudioPreview, ChoiceCard, ColorInput, Field, ImageUpload, Section, Slider, TextArea, TextInput, Toggle, UploadButton } from './ui';

export type Update = <K extends keyof InvitationConfig>(section: K, patch: InvitationConfig[K] extends object ? Partial<InvitationConfig[K]> : InvitationConfig[K]) => void;

export interface StepProps {
  config: InvitationConfig;
  update: Update;
  isEdit: boolean;
}

export type SlugState = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export const normalizeSlug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 40);

// ------------------------------------------------------------------ 1. basics

export function BasicsStep({ config, update, isEdit, slugState, setSlugState }: StepProps & { slugState: SlugState; setSlugState: (s: SlugState) => void }) {
  const slug = config.slug;

  useEffect(() => {
    if (isEdit) return;
    if (!slug) return setSlugState('idle');
    if (!SLUG_RE.test(slug)) return setSlugState('invalid');
    setSlugState('checking');
    const t = window.setTimeout(() => {
      api
        .slugAvailable(slug)
        .then(r => setSlugState(!r.valid ? 'invalid' : r.available ? 'available' : 'taken'))
        .catch(() => setSlugState('idle'));
    }, 400);
    return () => window.clearTimeout(t);
  }, [slug, isEdit, setSlugState]);

  const slugMsg: Record<SlugState, React.ReactNode> = {
    idle: 'فقط حروف انگلیسی کوچک، عدد و خط تیره؛ مثلاً behansar-iranpharma',
    checking: (
      <span className="inline-flex items-center gap-1">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> در حال بررسی…
      </span>
    ),
    available: (
      <span className="inline-flex items-center gap-1 text-emerald-600">
        <CheckCircle2 className="w-3.5 h-3.5" /> این آدرس آزاد است
      </span>
    ),
    taken: (
      <span className="inline-flex items-center gap-1 text-rose-600">
        <XCircle className="w-3.5 h-3.5" /> این آدرس قبلاً گرفته شده است
      </span>
    ),
    invalid: <span className="text-rose-600">بین ۳ تا ۴۰ کاراکتر؛ فقط a-z، ۰-۹ و خط تیره (نه در ابتدا یا انتها)</span>,
  };

  return (
    <>
      <Section title="شرکت و نمایشگاه" description="نام شرکت دعوت‌کننده و نمایشگاهی که در آن غرفه دارید.">
        <Field label="نام شرکت" required>
          <TextInput value={config.company.name} onChange={e => update('company', { name: e.target.value })} placeholder="مثلاً: بهان سار" />
        </Field>
        <Field label="نام نمایشگاه" required>
          <TextInput value={config.event.title} onChange={e => update('event', { title: e.target.value })} placeholder="مثلاً: نمایشگاه ایران فارما" />
        </Field>
        <Field label="عنوان بالای نام نمایشگاه" hint="متن کوچکی که بالای نام نمایشگاه در صفحه اول نمایش داده می‌شود.">
          <TextInput value={config.event.badge} onChange={e => update('event', { badge: e.target.value })} placeholder="دعوتنامه رسمی" />
        </Field>
      </Section>

      <Section title="لینک اختصاصی" description="آدرسی که برای مهمانان ارسال می‌شود. بعد از انتشار قابل تغییر نیست.">
        <Field label="آدرس لینک" required hint={isEdit ? 'آدرس دعوتنامه‌های منتشرشده قابل تغییر نیست.' : slugMsg[slugState]}>
          <div dir="ltr" className="flex items-stretch rounded-xl border border-slate-300 overflow-hidden focus-within:border-sky-500 focus-within:ring-4 focus-within:ring-sky-500/15">
            <span className="flex items-center gap-1 bg-slate-100 text-slate-500 px-3 text-sm whitespace-nowrap">
              <Link2 className="w-4 h-4" />
              {window.location.host}/i/
            </span>
            <input
              dir="ltr"
              disabled={isEdit}
              value={slug}
              onChange={e => update('slug', normalizeSlug(e.target.value))}
              placeholder="company-expo"
              className="flex-1 min-w-0 px-3 py-2.5 outline-none text-slate-900 disabled:bg-slate-100 disabled:text-slate-500"
            />
          </div>
        </Field>
      </Section>
    </>
  );
}

// ------------------------------------------------------------------ 2. brand

export function BrandStep({ config, update }: StepProps) {
  const { theme } = config;
  return (
    <>
      <Section title="لوگوها" description="بهتر است از فایل PNG یا SVG با پس‌زمینه شفاف استفاده کنید.">
        <ImageUpload label="لوگوی اصلی شرکت (افقی)" hint="در صفحه اول، روی ویدئو نمایش داده می‌شود." value={config.company.logo} onChange={logo => update('company', { logo })} dark />
        <ImageUpload label="نشان شرکت (مربعی)" hint="داخل دایره بالای متن دعوتنامه قرار می‌گیرد." value={config.company.icon} onChange={icon => update('company', { icon })} />
        <ImageUpload label="لوگوی نمایشگاه (اختیاری)" hint="زیر نام نمایشگاه در کارت صفحه اول." value={config.event.logo} onChange={logo => update('event', { logo })} />
      </Section>

      <Section title="رنگ‌های سیستم" description="یکی از ترکیب‌های آماده را انتخاب کنید یا رنگ‌ها را دستی تنظیم کنید.">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PALETTES.map(p => (
            <ChoiceCard
              key={p.name}
              selected={p.primary === theme.primary && p.accent === theme.accent && p.background === theme.background}
              onClick={() => update('theme', { primary: p.primary, accent: p.accent, background: p.background })}
              className="p-2.5"
            >
              <div className="flex h-8 rounded-lg overflow-hidden mb-2">
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
      </Section>

      <Section title="فونت" description="همه فونت‌ها روی سرور خودتان میزبانی می‌شوند و به گوگل وابسته نیستند.">
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
            <UploadButton kind="font" compact label={theme.customFontUrl ? 'تغییر فایل' : 'woff2 / ttf'} onUploaded={url => update('theme', { customFontUrl: url, font: CUSTOM_FONT })} />
          </ChoiceCard>
        </div>
      </Section>
    </>
  );
}

// ------------------------------------------------------------------ 3. media

export function MediaStep({ config, update }: StepProps) {
  const { media } = config;
  const presetVideo = PRESET_VIDEOS.find(v => v.url === media.video);
  const customVideo = !!media.video && !presetVideo;
  const presetMusic = PRESET_MUSIC.find(m => m.url === media.music);
  const customMusic = !!media.music && !presetMusic;

  return (
    <>
      <Section title="ویدئوی پس‌زمینه" description="ویدئو بی‌صدا و به‌صورت حلقه پخش می‌شود. فرمت MP4 (H.264) با حجم زیر ۵ مگابایت برای همه گوشی‌ها، به‌خصوص آیفون، بهترین گزینه است.">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <ChoiceCard selected={!media.video} onClick={() => update('media', { video: '', videoPoster: '' })} className="aspect-[3/4] flex flex-col items-center justify-center gap-2 bg-slate-50">
            <Ban className="w-6 h-6 text-slate-400" />
            <span className="text-xs font-bold text-slate-600">بدون ویدئو</span>
          </ChoiceCard>
          {PRESET_VIDEOS.map(v => (
            <ChoiceCard key={v.id} selected={media.video === v.url} onClick={() => update('media', { video: v.url, videoPoster: v.poster })} className="aspect-[3/4] overflow-hidden">
              <img src={v.poster} alt="" className="absolute inset-0 w-full h-full object-cover rounded-[14px]" />
              <span className="absolute bottom-2 right-2 text-xs font-bold text-white bg-black/50 rounded-lg px-2 py-1">{v.label}</span>
            </ChoiceCard>
          ))}
          <ChoiceCard asDiv selected={customVideo} className="aspect-[3/4] overflow-hidden flex flex-col items-center justify-center gap-2 bg-slate-50 p-2">
            {customVideo && <video src={media.video} poster={media.videoPoster || undefined} muted autoPlay loop playsInline className="absolute inset-0 w-full h-full object-cover rounded-[14px] opacity-60" />}
            <span className="relative text-xs font-bold text-slate-700">ویدئوی دلخواه</span>
            <span className="relative">
              <UploadButton kind="video" compact label={customVideo ? 'تغییر' : 'MP4 / WebM'} onUploaded={url => update('media', { video: url, videoPoster: '' })} />
            </span>
          </ChoiceCard>
        </div>
        {customVideo && (
          <ImageUpload label="تصویر پیش از بارگذاری ویدئو (اختیاری)" hint="تا وقتی ویدئو بارگذاری نشده، این تصویر نمایش داده می‌شود." value={media.videoPoster} onChange={videoPoster => update('media', { videoPoster })} />
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
          <ChoiceCard asDiv selected={customMusic} className="p-3 flex items-center gap-3">
            {customMusic && <AudioPreview src={media.music} />}
            <span className="text-sm font-bold text-slate-700 flex-1">موزیک دلخواه</span>
            <UploadButton kind="audio" compact label={customMusic ? 'تغییر' : 'MP3'} onUploaded={music => update('media', { music })} />
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

export function TextsStep({ config, update }: StepProps) {
  return (
    <>
      <Section title="صفحه خوش‌آمد">
        <Field label="جمله خوش‌آمد">
          <TextInput value={config.event.welcomeText} onChange={e => update('event', { welcomeText: e.target.value })} placeholder="مفتخریم میزبان شما در این رویداد بزرگ باشیم" />
        </Field>
        <Field label="متن دکمه ورود">
          <TextInput value={config.texts.enterButton} onChange={e => update('texts', { enterButton: e.target.value })} />
        </Field>
      </Section>

      <Section title="متن دعوتنامه">
        <Field
          label="متن نامه"
          hint={
            <>
              برای شروع پاراگراف جدید یک خط خالی بگذارید. می‌توانید از <code className="bg-slate-100 rounded px-1">{'{company}'}</code> و <code className="bg-slate-100 rounded px-1">{'{event}'}</code> به‌جای نام شرکت و نمایشگاه استفاده کنید.
            </>
          }
        >
          <TextArea rows={9} value={config.texts.letter} onChange={e => update('texts', { letter: e.target.value })} />
        </Field>
        <Field label="شعار شرکت (زیر امضا)">
          <TextInput value={config.company.tagline} onChange={e => update('company', { tagline: e.target.value })} placeholder="همراه شما در مسیر سلامت و نوآوری" />
        </Field>
        <Field label="متن دکمه ادامه">
          <TextInput value={config.texts.detailsButton} onChange={e => update('texts', { detailsButton: e.target.value })} />
        </Field>
      </Section>

      <Section title="صفحه زمان و مکان">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="متن دکمه نقشه غرفه">
            <TextInput value={config.texts.mapButton} onChange={e => update('texts', { mapButton: e.target.value })} />
          </Field>
          <Field label="متن دکمه اشتراک‌گذاری">
            <TextInput value={config.texts.shareButton} onChange={e => update('texts', { shareButton: e.target.value })} />
          </Field>
        </div>
        <Field label="متن پیام اشتراک‌گذاری (اختیاری)" hint="اگر خالی بماند، به‌طور خودکار از نام نمایشگاه، تاریخ و محل ساخته می‌شود.">
          <TextArea rows={3} value={config.texts.shareText} onChange={e => update('texts', { shareText: e.target.value })} />
        </Field>
      </Section>

      <Section title="امضای پایین صفحه">
        <Toggle checked={config.footer.show} onChange={show => update('footer', { show })} label="نمایش امضای طراح در پایین صفحه" />
        {config.footer.show && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="متن اول">
              <TextInput value={config.footer.text} onChange={e => update('footer', { text: e.target.value })} />
            </Field>
            <Field label="متن دوم">
              <TextInput value={config.footer.subText} onChange={e => update('footer', { subText: e.target.value })} />
            </Field>
            <Field label="لینک">
              <TextInput ltr value={config.footer.url} onChange={e => update('footer', { url: e.target.value })} placeholder="https://" />
            </Field>
          </div>
        )}
      </Section>
    </>
  );
}

// ------------------------------------------------------------------ 5. event

export function EventStep({ config, update }: StepProps) {
  const e = config.event;
  const [autoLabels, setAutoLabels] = useState(() => !e.dateLabel || e.dateLabel === jalaliRangeLabel(e.startDate, e.endDate));

  const setDates = (patch: Partial<InvitationConfig['event']>) => {
    const next = { ...e, ...patch };
    if (patch.startDate && (!next.endDate || next.endDate < patch.startDate)) next.endDate = patch.startDate;
    update('event', {
      ...patch,
      endDate: next.endDate,
      ...(autoLabels ? { dateLabel: jalaliRangeLabel(next.startDate, next.endDate), timeLabel: timeRangeLabel(next.startTime, next.endTime) } : {}),
    });
  };

  return (
    <>
      <Section title="زمان برگزاری" description="تاریخ‌ها برای ثبت در تقویم گوگل و اپل استفاده می‌شوند؛ متن نمایشی به‌صورت خودکار به تاریخ شمسی تبدیل می‌شود.">
        <div className="grid grid-cols-2 gap-3">
          <Field label="تاریخ شروع" required>
            <TextInput type="date" value={e.startDate} onChange={ev => setDates({ startDate: ev.target.value })} />
          </Field>
          <Field label="تاریخ پایان" required>
            <TextInput type="date" value={e.endDate} min={e.startDate} onChange={ev => setDates({ endDate: ev.target.value })} />
          </Field>
          <Field label="ساعت شروع (به وقت تهران)">
            <TextInput type="time" value={e.startTime} onChange={ev => setDates({ startTime: ev.target.value })} />
          </Field>
          <Field label="ساعت پایان">
            <TextInput type="time" value={e.endTime} onChange={ev => setDates({ endTime: ev.target.value })} />
          </Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="متن نمایشی تاریخ">
            <TextInput
              value={e.dateLabel}
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
              update('event', { dateLabel: jalaliRangeLabel(e.startDate, e.endDate), timeLabel: timeRangeLabel(e.startTime, e.endTime) });
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 hover:underline"
          >
            <RefreshCw className="w-3.5 h-3.5" /> ساخت خودکار متن‌ها از روی تاریخ و ساعت
          </button>
        )}
      </Section>

      <Section title="مکان">
        <Field label="محل برگزاری" required>
          <TextInput value={e.location} onChange={ev => update('event', { location: ev.target.value })} placeholder="مثلاً: مصلی تهران" />
        </Field>
        <Field label="لینک مسیریابی" hint="لینک مکان در گوگل‌مپ، نشان یا بلد.">
          <div className="flex gap-2">
            <TextInput ltr value={e.mapUrl} onChange={ev => update('event', { mapUrl: ev.target.value })} placeholder="https://" />
            <button
              type="button"
              disabled={!e.location}
              onClick={() => update('event', { mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.location)}` })}
              title="ساخت لینک گوگل‌مپ از روی نام محل"
              className="shrink-0 inline-flex items-center gap-1 rounded-xl border border-slate-300 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <Wand2 className="w-4 h-4" /> خودکار
            </button>
          </div>
        </Field>
        <Field label="شماره سالن و غرفه">
          <TextInput value={e.booth} onChange={ev => update('event', { booth: ev.target.value })} placeholder="سالن E، غرفه‌های ۱۵۹ تا ۱۶۲" />
        </Field>
        <Field label="لینک نقشه تعاملی غرفه (اختیاری)" hint="اگر نقشه سه‌بعدی یا تصویری از غرفه دارید، لینک آن را وارد کنید تا دکمه «مکان‌یابی دقیق غرفه» نمایش داده شود.">
          <TextInput ltr value={e.boothMapUrl} onChange={ev => update('event', { boothMapUrl: ev.target.value })} placeholder="https://" />
        </Field>
      </Section>
    </>
  );
}
