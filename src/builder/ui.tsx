import React, { useRef, useState } from 'react';
import { Upload, X, Loader2, Check, Play, Pause } from 'lucide-react';
import { uploadFile, type UploadKind } from '../lib/api';

export function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm">
      <h3 className="font-black text-slate-900 text-base">{title}</h3>
      {description && <p className="text-sm text-slate-500 mt-1 leading-relaxed">{description}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export function Field({ label, hint, error, children, required }: { label: string; hint?: React.ReactNode; error?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-bold text-slate-700 mb-1.5">
        {label}
        {required && <span className="text-rose-500 mr-1">*</span>}
      </span>
      {children}
      {error ? <span className="block text-xs text-rose-600 mt-1.5">{error}</span> : hint && <span className="block text-xs text-slate-500 mt-1.5 leading-relaxed">{hint}</span>}
    </label>
  );
}

const inputCls = 'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/15 placeholder:text-slate-400 disabled:bg-slate-100 disabled:text-slate-500';

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement> & { ltr?: boolean }) {
  const { ltr, className, ...rest } = props;
  return <input {...rest} dir={ltr ? 'ltr' : rest.dir} className={`${inputCls} ${ltr ? 'text-left' : ''} ${className ?? ''}`} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputCls} leading-relaxed resize-y ${props.className ?? ''}`} />;
}

export function Slider({ value, onChange, min = 0, max = 100, suffix = '٪' }: { value: number; onChange: (v: number) => void; min?: number; max?: number; suffix?: string }) {
  return (
    <div className="flex items-center gap-3">
      <input type="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))} className="flex-1 accent-sky-500" />
      <span className="w-12 text-sm font-bold text-slate-600 text-left tabular-nums">
        {value.toLocaleString('fa-IR')}
        {suffix}
      </span>
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center gap-3 text-sm font-bold text-slate-700">
      <span className={`relative w-11 h-6 rounded-full transition ${checked ? 'bg-sky-500' : 'bg-slate-300'}`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${checked ? 'right-0.5' : 'right-[22px]'}`} />
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
            setText(e.target.value);
            if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) onChange(e.target.value);
          }}
          className="flex-1 min-w-0 outline-none font-mono text-sm text-slate-700 uppercase"
        />
      </div>
    </Field>
  );
}

const ACCEPT: Record<UploadKind, string> = {
  image: 'image/png,image/jpeg,image/webp,image/svg+xml,image/gif',
  video: 'video/mp4,video/webm',
  audio: 'audio/mpeg,audio/mp4,audio/ogg,audio/aac,audio/wav,.mp3,.m4a',
  font: '.woff2,.woff,.ttf,.otf',
};

/** A file picker that uploads immediately and reports the stored URL. */
export function UploadButton({ kind, onUploaded, label = 'بارگذاری فایل', compact }: { kind: UploadKind; onUploaded: (url: string) => void; label?: string; compact?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');

  async function onFile(file?: File) {
    if (!file) return;
    setError('');
    setProgress(0);
    try {
      onUploaded(await uploadFile(file, kind, setProgress));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProgress(null);
      if (ref.current) ref.current.value = '';
    }
  }

  return (
    <div>
      <input ref={ref} type="file" accept={ACCEPT[kind]} className="hidden" onChange={e => onFile(e.target.files?.[0])} />
      <button
        type="button"
        disabled={progress !== null}
        onClick={() => ref.current?.click()}
        className={`inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-400 text-slate-700 font-bold hover:border-sky-500 hover:text-sky-600 hover:bg-sky-50 transition disabled:opacity-60 ${compact ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm'}`}
      >
        {progress !== null ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        {progress !== null ? `در حال بارگذاری ${progress.toLocaleString('fa-IR')}٪` : label}
      </button>
      {error && <p className="text-xs text-rose-600 mt-1.5">{error}</p>}
    </div>
  );
}

/** Image slot with preview, upload and remove. */
export function ImageUpload({ label, hint, value, onChange, dark }: { label: string; hint?: string; value: string; onChange: (v: string) => void; dark?: boolean }) {
  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-4">
        <div className={`w-28 h-20 rounded-2xl border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 ${dark ? 'bg-slate-800' : 'bg-[repeating-conic-gradient(#f1f5f9_0_25%,white_0_50%)] bg-[length:16px_16px]'}`}>
          {value ? <img src={value} alt="" className="max-w-full max-h-full object-contain p-2" /> : <span className="text-xs text-slate-400">بدون تصویر</span>}
        </div>
        <div className="flex flex-col gap-2 items-start">
          <UploadButton kind="image" onUploaded={onChange} label={value ? 'تغییر تصویر' : 'بارگذاری تصویر'} compact />
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
      <div onClick={onClick} className={cls}>
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
      <audio ref={ref} src={src} preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
      <span
        role="button"
        tabIndex={0}
        aria-label={playing ? 'توقف' : 'پخش'}
        onClick={e => {
          e.stopPropagation();
          const a = ref.current!;
          if (a.paused) {
            document.querySelectorAll('audio').forEach(o => o !== a && o.pause());
            a.play().catch(() => {});
          } else a.pause();
        }}
        className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-slate-900 text-white hover:bg-sky-600 transition"
      >
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </span>
    </>
  );
}
