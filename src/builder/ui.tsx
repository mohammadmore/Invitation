import React, { useRef, useState } from 'react';
import { Upload, X, Loader2, Check, Play, Pause, Info } from 'lucide-react';
import { uploadFile, type UploadKind, type UploadPhase, type UploadResult } from '../lib/api';
import { asset } from '../lib/paths';
import { coerceUrl, safeUrl } from '../shared/invitation';

const faNum = (n: number) => n.toLocaleString('fa-IR');

export function Section({ title, description, children, onFocusCapture }: { title: string; description?: string; children: React.ReactNode; onFocusCapture?: () => void }) {
  return (
    <section onFocusCapture={onFocusCapture} onPointerDownCapture={onFocusCapture} className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm">
      <h3 className="font-black text-slate-900 text-base">{title}</h3>
      {description && <p className="text-sm text-slate-500 mt-1 leading-relaxed">{description}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

/** "Don't show" checkbox: removes the item from the invitation and from the publish checklist. */
export interface HideProps {
  checked: boolean;
  onChange: (v: boolean) => void;
}

export function HideToggle({ checked, onChange }: HideProps) {
  return (
    <label className={`inline-flex items-center gap-1.5 text-[11px] font-bold cursor-pointer select-none rounded-lg px-2 py-1 transition ${checked ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="accent-slate-800 w-3.5 h-3.5" />
      نمایش داده نشود
    </label>
  );
}

export function Field({
  label,
  hint,
  error,
  warning,
  children,
  required,
  count,
  hide,
  action,
}: {
  label: string;
  hint?: React.ReactNode;
  error?: string;
  /** Non-blocking notice (e.g. "not entered yet") */
  warning?: string;
  required?: boolean;
  /** [current length, max length] – shows a counter */
  count?: [number, number];
  hide?: HideProps;
  /** Extra control next to the label (e.g. "insert suggested text") */
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const hidden = hide?.checked;
  return (
    <div className="block">
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mb-1.5">
        <span className="text-sm font-bold text-slate-700">
          {label}
          {required && <span className="text-rose-500 mr-1">*</span>}
        </span>
        <span className="flex items-center gap-1">
          {count && !hidden && count[0] > count[1] * 0.7 && (
            <span className={`text-[11px] font-medium tabular-nums ${count[0] >= count[1] ? 'text-rose-600' : 'text-slate-400'}`}>
              {faNum(count[0])} / {faNum(count[1])}
            </span>
          )}
          {!hidden && action}
          {hide && <HideToggle {...hide} />}
        </span>
      </div>
      {hidden ? (
        <p className="text-xs text-slate-500 bg-slate-100 rounded-xl px-3 py-2.5">این مورد در دعوتنامه نمایش داده نمی‌شود.</p>
      ) : (
        <>
          {children}
          {error ? (
            <span className="block text-xs text-rose-600 mt-1.5">{error}</span>
          ) : warning ? (
            <span className="block text-xs text-amber-700 mt-1.5">{warning}</span>
          ) : (
            hint && <span className="block text-xs text-slate-500 mt-1.5 leading-relaxed">{hint}</span>
          )}
        </>
      )}
    </div>
  );
}

/** Small "insert suggested text" button for a field. */
export function SuggestButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-[11px] font-bold text-sky-600 hover:bg-sky-50 rounded-lg px-2 py-1">
      درج متن پیشنهادی
    </button>
  );
}

const inputCls =
  'w-full rounded-xl border bg-white px-3.5 py-2.5 text-slate-900 outline-none transition focus:ring-4 focus:ring-sky-500/15 placeholder:text-slate-400 disabled:bg-slate-100 disabled:text-slate-500';

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement> & { ltr?: boolean; invalid?: boolean }) {
  const { ltr, invalid, className, ...rest } = props;
  return (
    <input
      {...rest}
      dir={ltr ? 'ltr' : rest.dir}
      className={`${inputCls} ${invalid ? 'border-rose-400 focus:border-rose-500' : 'border-slate-300 focus:border-sky-500'} ${ltr ? 'text-left' : ''} ${className ?? ''}`}
    />
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputCls} border-slate-300 focus:border-sky-500 leading-relaxed resize-y ${props.className ?? ''}`} />;
}

/** URL field: adds https:// on blur and flags values that aren't usable links. */
export function UrlInput({
  label,
  hint,
  value,
  onChange,
  placeholder = 'https://',
  extra,
  hide,
  warning,
  forceError,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  extra?: React.ReactNode;
  hide?: HideProps;
  warning?: string;
  forceError?: boolean;
}) {
  const [touched, setTouched] = useState(false);
  const invalid = !!value.trim() && !safeUrl(value);
  return (
    <Field label={label} hint={hint} hide={hide} warning={warning} error={(touched || forceError) && invalid ? 'این لینک معتبر نیست؛ آدرس کامل را وارد کنید، مثلاً https://neshan.org/...' : undefined}>
      <div className="flex gap-2">
        <TextInput
          ltr
          value={value}
          invalid={touched && invalid}
          maxLength={1000}
          onChange={e => onChange(e.target.value)}
          onBlur={() => {
            setTouched(true);
            const fixed = coerceUrl(value);
            if (fixed !== value && safeUrl(fixed)) onChange(fixed);
          }}
          placeholder={placeholder}
        />
        {extra}
      </div>
    </Field>
  );
}

export function Slider({ value, onChange, min = 0, max = 100, suffix = '٪' }: { value: number; onChange: (v: number) => void; min?: number; max?: number; suffix?: string }) {
  return (
    <div className="flex items-center gap-3">
      <input type="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))} className="flex-1 accent-sky-500" />
      <span className="w-12 text-sm font-bold text-slate-600 text-left tabular-nums">
        {faNum(value)}
        {suffix}
      </span>
    </div>
  );
}

/** RTL switch: knob sits at the start (right) when off and moves to the end (left) when on. */
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex items-center gap-3 text-sm font-bold text-slate-700">
      <span className={`relative w-11 h-6 shrink-0 rounded-full transition ${checked ? 'bg-sky-500' : 'bg-slate-300'}`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${checked ? 'right-[22px]' : 'right-0.5'}`} />
      </span>
      {label}
    </button>
  );
}

export function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(value);
  React.useEffect(() => setText(value), [value]);
  return (
    <Field label={label}>
      <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white p-1.5 focus-within:border-sky-500">
        <input type="color" value={value} onChange={e => onChange(e.target.value)} className="w-10 h-9 rounded-lg cursor-pointer border-0 bg-transparent p-0" />
        <input
          dir="ltr"
          value={text}
          onChange={e => {
            const v = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`;
            setText(v);
            if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v.toUpperCase());
          }}
          onBlur={() => setText(value)}
          className="flex-1 min-w-0 outline-none font-mono text-sm text-slate-700 uppercase"
        />
      </div>
    </Field>
  );
}

const ACCEPT: Record<UploadKind, string> = {
  image: 'image/png,image/jpeg,image/webp,image/svg+xml,image/gif,image/heic,image/heif,.heic,.heif',
  video: 'video/mp4,video/webm,video/quicktime,.mov,.m4v',
  audio: 'audio/mpeg,audio/mp4,audio/ogg,audio/aac,audio/wav,.mp3,.m4a',
  font: '.woff2,.woff,.ttf,.otf',
};

const PHASE_LABEL: Record<UploadPhase, string> = {
  preparing: 'در حال آماده‌سازی…',
  uploading: 'در حال بارگذاری',
  processing: 'در حال بهینه‌سازی ویدئو…',
};

/** A file picker that validates/pre-processes, uploads immediately and reports the stored URL. */
export function UploadButton({
  kind,
  onUploaded,
  label = 'بارگذاری فایل',
  compact,
  maxImageDim,
}: {
  kind: UploadKind;
  onUploaded: (r: UploadResult) => void;
  label?: string;
  compact?: boolean;
  maxImageDim?: number;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<UploadPhase | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  async function onFile(file?: File) {
    if (!file) return;
    setError('');
    setNote('');
    setProgress(0);
    setPhase('preparing');
    try {
      const r = await uploadFile(file, kind, { onProgress: setProgress, onPhase: setPhase, maxImageDim });
      if (r.note) setNote(r.note);
      onUploaded(r);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPhase(null);
      if (ref.current) ref.current.value = '';
    }
  }

  return (
    <div onClick={e => e.stopPropagation()}>
      <input ref={ref} type="file" accept={ACCEPT[kind]} className="hidden" onChange={e => onFile(e.target.files?.[0])} />
      <button
        type="button"
        disabled={phase !== null}
        onClick={() => ref.current?.click()}
        className={`inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-400 bg-white text-slate-700 font-bold hover:border-sky-500 hover:text-sky-600 hover:bg-sky-50 transition disabled:opacity-70 ${compact ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm'}`}
      >
        {phase ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        {phase ? `${PHASE_LABEL[phase]}${phase === 'uploading' ? ` ${faNum(progress)}٪` : ''}` : label}
      </button>
      {error && <p className="text-xs text-rose-600 mt-1.5 leading-relaxed">{error}</p>}
      {note && (
        <p className="text-xs text-amber-700 mt-1.5 leading-relaxed flex gap-1">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          {note}
        </p>
      )}
    </div>
  );
}

/** Image slot with preview, upload and remove. */
export function ImageUpload({
  label,
  hint,
  value,
  onChange,
  dark,
  maxImageDim,
  hide,
  warning,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  dark?: boolean;
  maxImageDim?: number;
  hide?: HideProps;
  warning?: string;
}) {
  const [broken, setBroken] = useState(false);
  React.useEffect(() => setBroken(false), [value]);
  return (
    <Field label={label} hint={hint} hide={hide} warning={warning}>
      <div className="flex items-center gap-4">
        <div className={`w-28 h-20 rounded-2xl border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 ${dark ? 'bg-slate-800' : 'bg-[repeating-conic-gradient(#f1f5f9_0_25%,white_0_50%)] bg-[length:16px_16px]'}`}>
          {value && !broken ? (
            <img src={asset(value)} alt="" onError={() => setBroken(true)} className="max-w-full max-h-full object-contain p-2" />
          ) : (
            <span className={`text-xs px-2 text-center ${broken ? 'text-rose-500' : 'text-slate-400'}`}>{broken ? 'فایل پیدا نشد؛ دوباره بارگذاری کنید' : 'بدون تصویر'}</span>
          )}
        </div>
        <div className="flex flex-col gap-2 items-start min-w-0">
          <UploadButton kind="image" maxImageDim={maxImageDim} onUploaded={r => onChange(r.url)} label={value ? 'تغییر تصویر' : 'بارگذاری تصویر'} compact />
          {value && (
            <button type="button" onClick={() => onChange('')} className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:underline">
              <X className="w-3.5 h-3.5" /> حذف
            </button>
          )}
        </div>
      </div>
    </Field>
  );
}

/** Selectable card used for presets (palettes, fonts, media). */
export function ChoiceCard({ selected, onClick, children, className, asDiv }: { selected: boolean; onClick?: () => void; children: React.ReactNode; className?: string; asDiv?: boolean }) {
  const cls = `relative rounded-2xl border-2 text-right transition ${selected ? 'border-sky-500 ring-4 ring-sky-500/15' : 'border-slate-200 hover:border-slate-300'} ${className ?? ''}`;
  const badge = selected && (
    <span className="absolute top-2 left-2 z-10 bg-sky-500 text-white rounded-full p-0.5">
      <Check className="w-3.5 h-3.5" />
    </span>
  );
  // Cards that contain their own buttons (uploads) must not be <button>s themselves.
  if (asDiv) {
    return (
      <div onClick={onClick} className={`${cls} ${onClick ? 'cursor-pointer' : ''}`}>
        {badge}
        {children}
      </div>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-pressed={selected} className={cls}>
      {badge}
      {children}
    </button>
  );
}

/** Small play/pause control to audition a music track inside the wizard. */
export function AudioPreview({ src }: { src: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  return (
    <>
      <audio ref={ref} src={asset(src)} preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
      <span
        role="button"
        tabIndex={0}
        aria-label={playing ? 'توقف' : 'پخش'}
        onClick={e => {
          e.stopPropagation();
          const a = ref.current!;
          if (a.paused) a.play().catch(() => {});
          else a.pause();
        }}
        className="inline-flex items-center justify-center w-9 h-9 shrink-0 rounded-full bg-slate-900 text-white hover:bg-sky-600 transition"
      >
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </span>
    </>
  );
}
