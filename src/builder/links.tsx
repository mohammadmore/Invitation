import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CircleCheck, Copy, Download, Link2, Loader2, Plus, QrCode, Save, Trash2, TriangleAlert, UserPlus, Users, Wand2 } from 'lucide-react';
import { api } from '../lib/api';
import { linkUrl, repReportUrl } from '../lib/paths';
import { CHANNELS, CODE_RE, channelLabel, randomCode, randomToken, type ChannelId, type PublicLinkInfo, type Rep, type TrackedLink, type Tracking } from '../shared/tracking';
import { toCsv } from './panels';
import { Field, ImageUpload, Section, TextInput, Toggle } from './ui';

const fa = (n: number) => n.toLocaleString('fa-IR');

function download(name: string, href: string) {
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  a.click();
}
function downloadCsv(name: string, text: string) {
  const url = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' }));
  download(name, url);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const newRepId = () => randomToken().slice(0, 10);

function CopyBtn({ text, label = 'کپی' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text).catch(() => {});
        setDone(true);
        window.setTimeout(() => setDone(false), 1500);
      }}
      className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-[11px] font-bold hover:bg-slate-50"
    >
      {done ? <CircleCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
      {done ? 'کپی شد' : label}
    </button>
  );
}

/**
 * Optional multi-link mode: sales reps, tracked links (rep × channel), and their options.
 * Saved immediately (live), independent of the invitation's draft/publish cycle.
 */
export default function LinksStep({
  recordId,
  slug,
  publishedSlug,
  onEnsureSaved,
  onPreview,
}: {
  recordId?: string;
  slug: string;
  publishedSlug: string;
  onEnsureSaved: () => Promise<string | null>;
  onPreview: (link: PublicLinkInfo | null, t: Tracking | null) => void;
}) {
  const [tracking, setTracking] = useState<Tracking | null>(null);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState('');
  const lastSaved = useRef('');
  const liveSlug = publishedSlug || slug;

  useEffect(() => {
    if (!recordId) return;
    api
      .tracking(recordId)
      .then(t => {
        lastSaved.current = JSON.stringify(t);
        setTracking(t);
      })
      .catch(e => setError(e.message));
  }, [recordId]);

  // Live preview: show the first rep's card while this step is open.
  useEffect(() => {
    if (!tracking?.settings.enabled) return onPreview(null, tracking);
    const rep = tracking.reps[0];
    onPreview(rep ? { code: 'demo', channel: 'other', rep } : null, tracking);
  }, [tracking, onPreview]);
  useEffect(() => () => onPreview(null, null), [onPreview]);

  // Autosave (debounced) – takes effect immediately for guests.
  useEffect(() => {
    if (!tracking || !recordId || JSON.stringify(tracking) === lastSaved.current) return;
    setState('saving');
    const t = window.setTimeout(() => {
      const json = JSON.stringify(tracking);
      api
        .saveTracking(recordId, tracking)
        .then(() => {
          lastSaved.current = json;
          setState('saved');
        })
        .catch(e => {
          setState('error');
          setError(e.message);
        });
    }, 700);
    return () => window.clearTimeout(t);
  }, [tracking, recordId]);

  const set = useCallback((fn: (t: Tracking) => Tracking) => setTracking(t => (t ? fn(structuredClone(t)) : t)), []);

  if (!recordId) {
    return (
      <Section title="لینک‌ها و کارشناس‌ها" description="برای ساخت لینک‌های جداگانه، ابتدا دعوتنامه باید ذخیره شود.">
        <button onClick={() => onEnsureSaved()} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white text-sm font-bold px-4 py-2.5">
          <Save className="w-4 h-4" /> ذخیره دعوتنامه
        </button>
      </Section>
    );
  }
  if (!tracking) {
    return error ? <p className="text-sm text-rose-600">{error}</p> : <Loader2 className="w-6 h-6 animate-spin text-(color:--ad-ink) mx-auto" />;
  }

  const s = tracking.settings;
  const setSetting = <K extends keyof Tracking['settings']>(k: K, v: Tracking['settings'][K]) =>
    set(t => {
      t.settings[k] = v;
      return t;
    });

  return (
    <>
      <Section
        title="لینک‌ها و کارشناس‌ها"
        description="برای شرکت‌هایی با چند کارشناس فروش یا چند کانال ارسال (پیامک، اینستاگرام، QR چاپی…): هر لینک اطلاعات تماس کارشناس خودش را نشان می‌دهد و بازدید و اعلام حضورش جداگانه سنجیده می‌شود."
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Toggle checked={s.enabled} onChange={v => setSetting('enabled', v)} label="چند لینک و پایش جداگانه فعال باشد" />
          <span className="text-[11px] font-bold">
            {state === 'saving' && <span className="text-slate-500">در حال ذخیره…</span>}
            {state === 'saved' && <span className="text-emerald-600">ذخیره شد — بلافاصله اعمال می‌شود</span>}
            {state === 'error' && <span className="text-rose-600">{error || 'ذخیره نشد'}</span>}
          </span>
        </div>
        {!s.enabled && (
          <p className="text-sm text-slate-500 bg-slate-50 rounded-xl p-3 leading-relaxed">
            دعوتنامه با یک لینک واحد منتشر می‌شود و آمار کلی در «انتشار و گزارش» نمایش داده می‌شود. اگر بعداً فعال کنید، لینک اصلی همچنان کار می‌کند و تغییری نمی‌کند.
          </p>
        )}
      </Section>

      {s.enabled && (
        <>
          <Section title="تنظیمات" description="هر کدام را می‌توانید جداگانه روشن یا خاموش کنید؛ تغییرات بلافاصله برای مهمانان اعمال می‌شود.">
            <div className="grid sm:grid-cols-2 gap-3">
              <Option checked={s.repCard} onChange={v => setSetting('repCard', v)} title="کارت «کارشناس شما»" text="روی لینک هر کارشناس، نام، عکس و راه‌های تماس او نمایش داده می‌شود و «ذخیره در مخاطبین» کارت او را ذخیره می‌کند." />
              <Option checked={s.showCompanyContact} onChange={v => setSetting('showCompanyContact', v)} title="تماس شرکت هم نمایش داده شود" text="زیر کارت کارشناس، اطلاعات تماس عمومی شرکت هم نمایش داده می‌شود." />
              <Option checked={s.referral} onChange={v => setSetting('referral', v)} title="سنجش ارجاع" text="وقتی مهمان دعوتنامه را برای دیگران بفرستد، اعتبار برای همان کارشناس می‌ماند ولی بازدیدها جداگانه با عنوان «ارجاع» شمرده می‌شوند." />
              <Option checked={s.utm} onChange={v => setSetting('utm', v)} title="ثبت پارامترهای UTM" text="اگر پنل پیامک یا ابزار تبلیغاتی utm_source و utm_campaign به لینک اضافه کند، جداگانه گزارش می‌شود." />
              <Option checked={s.repDashboards} onChange={v => setSetting('repDashboards', v)} title="گزارش اختصاصی هر کارشناس" text="هر کارشناس یک لینک فقط‌خواندنی دارد که فقط آمار و اعلام حضورهای لینک‌های خودش را نشان می‌دهد." />
              <div className="rounded-2xl border border-slate-200 p-3 space-y-2">
                <p className="text-sm font-bold text-slate-800">اعتبار اعلام حضور</p>
                <select value={s.attribution} onChange={e => setSetting('attribution', e.target.value as 'first' | 'last')} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
                  <option value="first">اولین لینک (پیشنهادی)</option>
                  <option value="last">آخرین لینک</option>
                </select>
                <p className="text-[11px] text-slate-500 leading-relaxed">اگر مهمانی با چند لینک وارد شده باشد، اعلام حضورش به نام کدام لینک و کارشناس ثبت شود. «اولین لینک» برای کارشناس‌ها منصفانه‌تر است.</p>
              </div>
            </div>
          </Section>

          <RepsSection tracking={tracking} set={set} recordId={recordId} />
          <LinksSection tracking={tracking} set={set} liveSlug={liveSlug} published={!!publishedSlug} />
        </>
      )}
    </>
  );
}

function Option({ checked, onChange, title, text }: { checked: boolean; onChange: (v: boolean) => void; title: string; text: string }) {
  return (
    <div className={`rounded-2xl border p-3 space-y-1.5 transition ${checked ? 'border-(color:--ad-ink)/40 bg-(color:--ad-ink)/5' : 'border-slate-200'}`}>
      <Toggle checked={checked} onChange={onChange} label={title} />
      <p className="text-[11px] text-slate-500 leading-relaxed">{text}</p>
    </div>
  );
}

// ------------------------------------------------------------------ reps

function RepsSection({ tracking, set, recordId }: { tracking: Tracking; set: (fn: (t: Tracking) => Tracking) => void; recordId: string }) {
  const update = (id: string, patch: Partial<Rep>) =>
    set(t => {
      const r = t.reps.find(x => x.id === id);
      if (r) Object.assign(r, patch);
      return t;
    });
  const add = () =>
    set(t => {
      t.reps.push({ id: newRepId(), name: '', title: 'کارشناس فروش', photo: '', phone: '', whatsapp: '', email: '', reportToken: randomToken() });
      return t;
    });
  const remove = (rep: Rep) => {
    const used = tracking.links.filter(l => l.repId === rep.id).length;
    if (!confirm(used ? `${fa(used)} لینک به «${rep.name || 'این کارشناس'}» متصل است. با حذف، این لینک‌ها به لینک شرکت تبدیل می‌شوند (کار می‌کنند ولی کارت کارشناس ندارند). ادامه می‌دهید؟` : `«${rep.name || 'این کارشناس'}» حذف شود؟`)) return;
    set(t => {
      t.reps = t.reps.filter(x => x.id !== rep.id);
      t.links.forEach(l => l.repId === rep.id && (l.repId = ''));
      return t;
    });
  };

  return (
    <Section title={`کارشناس‌ها (${fa(tracking.reps.length)})`} description="فیلدهای خالی تماس از اطلاعات شرکت پر می‌شوند.">
      {tracking.reps.map(rep => (
        <div key={rep.id} className="rounded-2xl border border-slate-200 p-3 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="نام">
              <TextInput value={rep.name} maxLength={120} onChange={e => update(rep.id, { name: e.target.value })} placeholder="نام و نام خانوادگی" />
            </Field>
            <Field label="سمت">
              <TextInput value={rep.title} maxLength={120} onChange={e => update(rep.id, { title: e.target.value })} />
            </Field>
            <Field label="تلفن همراه">
              <TextInput ltr inputMode="tel" value={rep.phone} maxLength={40} onChange={e => update(rep.id, { phone: e.target.value })} placeholder="0912…" />
            </Field>
            <Field label="واتس‌اپ" action={rep.phone && !rep.whatsapp ? <button type="button" onClick={() => update(rep.id, { whatsapp: rep.phone })} className="text-[11px] font-bold text-(color:--ad-ink)">همان تلفن</button> : undefined}>
              <TextInput ltr inputMode="tel" value={rep.whatsapp} maxLength={40} onChange={e => update(rep.id, { whatsapp: e.target.value })} />
            </Field>
            <Field label="ایمیل">
              <TextInput ltr type="email" value={rep.email} maxLength={120} onChange={e => update(rep.id, { email: e.target.value })} />
            </Field>
            <ImageUpload label="عکس (اختیاری)" value={rep.photo} onChange={photo => update(rep.id, { photo })} maxImageDim={400} />
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
            <span className="text-[11px] text-slate-500">{fa(tracking.links.filter(l => l.repId === rep.id).length)} لینک</span>
            {tracking.settings.repDashboards && (
              <>
                <span className="text-[11px] text-slate-400">·</span>
                <CopyBtn text={repReportUrl(recordId, rep.id, rep.reportToken)} label="کپی لینک گزارش کارشناس" />
              </>
            )}
            <span className="flex-1" />
            <button type="button" onClick={() => remove(rep)} className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:underline">
              <Trash2 className="w-3.5 h-3.5" /> حذف کارشناس
            </button>
          </div>
        </div>
      ))}
      <button type="button" onClick={add} className="inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-400 px-4 py-2.5 text-sm font-bold text-slate-700 hover:border-(color:--ad-ink) hover:text-(color:--ad-ink)">
        <UserPlus className="w-4 h-4" /> افزودن کارشناس
      </button>
    </Section>
  );
}

// ------------------------------------------------------------------ links

function LinksSection({ tracking, set, liveSlug, published }: { tracking: Tracking; set: (fn: (t: Tracking) => Tracking) => void; liveSlug: string; published: boolean }) {
  const [label, setLabel] = useState('');
  const [repId, setRepId] = useState('');
  const [channel, setChannel] = useState<ChannelId>('sms');
  const [custom, setCustom] = useState('');
  const [bulkReps, setBulkReps] = useState<string[]>([]);
  const [bulkChannels, setBulkChannels] = useState<ChannelId[]>([]);
  const [filter, setFilter] = useState('');
  const [msg, setMsg] = useState('');
  const taken = useMemo(() => new Set(tracking.links.map(l => l.code)), [tracking.links]);
  const repName = (id: string) => tracking.reps.find(r => r.id === id)?.name || '';
  const url = (code: string) => (liveSlug ? linkUrl(liveSlug, code) : `…/${code}`);

  const addLinks = (items: Omit<TrackedLink, 'code' | 'createdAt' | 'active'>[], customCode = '') => {
    set(t => {
      const used = new Set(t.links.map(l => l.code));
      for (const it of items) {
        const code = customCode || randomCode(used);
        used.add(code);
        t.links.push({ ...it, code, active: true, createdAt: new Date().toISOString() });
      }
      return t;
    });
  };

  const createOne = () => {
    const code = custom.trim().toLowerCase();
    if (code && (!CODE_RE.test(code) || taken.has(code))) return setMsg(taken.has(code) ? 'این کد قبلاً استفاده شده است.' : 'کد فقط حروف انگلیسی کوچک، عدد و خط تیره (حداکثر ۲۴).');
    addLinks([{ label: label.trim() || [repName(repId) || 'شرکت', channelLabel(channel)].join(' — '), repId, channel }], code);
    setLabel('');
    setCustom('');
    setMsg('لینک ساخته شد.');
  };

  const createBulk = () => {
    const reps = bulkReps.length ? bulkReps : [''];
    const items = reps.flatMap(r => bulkChannels.map(ch => ({ label: `${r ? repName(r) || 'کارشناس' : 'شرکت'} — ${channelLabel(ch)}`, repId: r, channel: ch })));
    if (!items.length) return setMsg('حداقل یک کانال انتخاب کنید.');
    addLinks(items);
    setMsg(`${fa(items.length)} لینک ساخته شد.`);
    setBulkChannels([]);
  };

  const update = (code: string, patch: Partial<TrackedLink>) =>
    set(t => {
      const l = t.links.find(x => x.code === code);
      if (l) Object.assign(l, patch);
      return t;
    });
  const remove = (l: TrackedLink) => {
    if (!confirm(`لینک «${l.label}» حذف شود؟ اگر این لینک جایی ارسال یا چاپ شده، بهتر است به‌جای حذف «غیرفعال» شود. (لینک حذف‌شده یا غیرفعال، مهمان را به دعوتنامه اصلی می‌برد.)`)) return;
    set(t => {
      t.links = t.links.filter(x => x.code !== l.code);
      return t;
    });
  };
  const qr = async (l: TrackedLink) => {
    const QR = await import('qrcode');
    download(`qr-${liveSlug}-${l.code}.png`, await QR.toDataURL(url(l.code), { width: 800, margin: 2, errorCorrectionLevel: 'M' }));
  };

  const shown = tracking.links.filter(l => !filter || [l.label, l.code, repName(l.repId), channelLabel(l.channel)].some(v => v.toLowerCase().includes(filter.toLowerCase())));
  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);

  return (
    <Section title={`لینک‌ها (${fa(tracking.links.length)})`} description="هر لینک = یک کارشناس (یا شرکت) × یک کانال. کد کوتاه تصادفی حدس‌زدنی نیست و برای پیامک مناسب است.">
      {!liveSlug && (
        <p className="text-sm text-amber-700 flex gap-1.5">
          <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" /> ابتدا آدرس لینک دعوتنامه را در «اطلاعات پایه» تعیین کنید.
        </p>
      )}
      {liveSlug && !published && <p className="text-xs text-amber-700">لینک‌ها بعد از انتشار نهایی دعوتنامه برای مهمانان کار می‌کنند.</p>}

      {/* single */}
      <div className="rounded-2xl bg-slate-50 p-3 space-y-2">
        <p className="text-sm font-black text-slate-800 flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> ساخت یک لینک
        </p>
        <div className="grid sm:grid-cols-2 gap-2">
          <TextInput value={label} maxLength={120} onChange={e => setLabel(e.target.value)} placeholder="برچسب (اختیاری)، مثلاً: کمپین پیامکی آبان" />
          <select value={repId} onChange={e => setRepId(e.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
            <option value="">بدون کارشناس (تماس شرکت)</option>
            {tracking.reps.map(r => (
              <option key={r.id} value={r.id}>
                {r.name || 'کارشناس بدون نام'}
              </option>
            ))}
          </select>
          <select value={channel} onChange={e => setChannel(e.target.value as ChannelId)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
            {CHANNELS.map(c => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <TextInput ltr value={custom} maxLength={24} onChange={e => setCustom(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="کد دلخواه (اختیاری)، مثلاً ali" />
        </div>
        <button type="button" onClick={createOne} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold px-3 py-2">
          <Link2 className="w-4 h-4" /> ساخت لینک
        </button>
      </div>

      {/* bulk */}
      <div className="rounded-2xl bg-slate-50 p-3 space-y-2">
        <p className="text-sm font-black text-slate-800 flex items-center gap-1.5">
          <Users className="w-4 h-4" /> ساخت گروهی (کارشناس‌ها × کانال‌ها)
        </p>
        {tracking.reps.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tracking.reps.map(r => (
              <button key={r.id} type="button" onClick={() => setBulkReps(b => toggle(b, r.id))} className={`rounded-full px-3 py-1 text-xs font-bold ${bulkReps.includes(r.id) ? 'btn-ad text-white' : 'bg-white border border-slate-300 text-slate-600'}`}>
                {r.name || 'بدون نام'}
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-1.5">
          {CHANNELS.map(c => (
            <button key={c.id} type="button" onClick={() => setBulkChannels(b => toggle(b, c.id))} className={`rounded-full px-3 py-1 text-xs font-bold ${bulkChannels.includes(c.id) ? 'bg-emerald-500 text-white' : 'bg-white border border-slate-300 text-slate-600'}`}>
              {c.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={createBulk} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold px-3 py-2">
          <Wand2 className="w-4 h-4" /> ساخت {fa(Math.max(1, bulkReps.length) * bulkChannels.length)} لینک
        </button>
        <p className="text-[11px] text-slate-500">اگر کارشناسی انتخاب نشود، لینک‌های شرکت (بدون کارشناس) برای هر کانال ساخته می‌شود.</p>
      </div>
      {msg && <p className="text-xs font-bold text-(color:--ad-ink)">{msg}</p>}

      {/* list */}
      {tracking.links.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <TextInput value={filter} onChange={e => setFilter(e.target.value)} placeholder="جست‌وجو در لینک‌ها…" className="max-w-xs" />
            <span className="flex-1" />
            <button
              type="button"
              onClick={() =>
                downloadCsv(
                  `links-${liveSlug || 'invitation'}.csv`,
                  toCsv([['برچسب', 'کارشناس', 'کانال', 'لینک', 'وضعیت'], ...tracking.links.map(l => [l.label, repName(l.repId) || 'شرکت', channelLabel(l.channel), url(l.code), l.active ? 'فعال' : 'غیرفعال'])]),
                )
              }
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 text-xs font-bold px-3 py-2"
            >
              <Download className="w-4 h-4" /> همه لینک‌ها (اکسل)
            </button>
          </div>
          <ul className="space-y-2">
            {shown.map(l => (
              <li key={l.code} className={`rounded-2xl border p-3 space-y-2 ${l.active ? 'border-slate-200' : 'border-slate-200 bg-slate-50 opacity-70'}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <input value={l.label} maxLength={120} onChange={e => update(l.code, { label: e.target.value })} className="flex-1 min-w-[160px] rounded-lg border border-transparent hover:border-slate-200 focus:border-(color:--ad-ink) px-2 py-1 text-sm font-bold outline-none" />
                  <Toggle checked={l.active} onChange={active => update(l.code, { active })} label={l.active ? 'فعال' : 'غیرفعال'} />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select value={l.repId} onChange={e => update(l.code, { repId: e.target.value })} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs" title="انتقال لینک به کارشناس دیگر (آدرس تغییر نمی‌کند)">
                    <option value="">شرکت (بدون کارشناس)</option>
                    {tracking.reps.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name || 'بدون نام'}
                      </option>
                    ))}
                  </select>
                  <select value={l.channel} onChange={e => update(l.code, { channel: e.target.value as ChannelId })} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs">
                    {CHANNELS.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <span dir="ltr" className="text-xs font-mono text-slate-600 truncate max-w-full">
                    {url(l.code)}
                  </span>
                  <span className="flex-1" />
                  {liveSlug && <CopyBtn text={url(l.code)} />}
                  {liveSlug && (
                    <button type="button" onClick={() => qr(l)} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-[11px] font-bold hover:bg-slate-50">
                      <QrCode className="w-3.5 h-3.5" /> QR
                    </button>
                  )}
                  <button type="button" onClick={() => remove(l)} className="p-1 rounded-lg text-rose-500 hover:bg-rose-50" aria-label="حذف">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Section>
  );
}
