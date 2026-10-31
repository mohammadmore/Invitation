import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, CameraOff, CircleCheck, Keyboard, Loader2, RotateCcw, Search, ScanLine, TriangleAlert, UserPlus, Users, XCircle } from 'lucide-react';
import { api } from '../lib/api';
import { hideSplash } from '../lib/splash';
import { ticketFromScan, type CheckinGuest, type ScanStatus } from '../shared/checkin';
import { channelLabel } from '../shared/tracking';

const fa = (n: number) => n.toLocaleString('fa-IR');
/** Times are shown in the venue's time zone (same as the SMS), whatever the phone is set to. */
let venueTz = 'Asia/Tehran';
const timeOf = (iso: string) => (iso ? new Date(iso).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', timeZone: venueTz }) : '');
const dayOf = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: venueTz }).format(new Date(iso));

type Tab = 'scan' | 'search' | 'walkin' | 'present';
interface Result {
  status: ScanStatus;
  guest: CheckinGuest | null;
  code: string;
}

/** Short beep + vibration so staff notice the result without looking. */
function feedback(ok: boolean) {
  try {
    navigator.vibrate?.(ok ? 80 : [60, 60, 60]);
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = ok ? 880 : 220;
    g.gain.value = 0.15;
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + (ok ? 0.12 : 0.35));
    o.onended = () => ctx.close();
  } catch {
    /* ignore */
  }
}

/** Booth staff page: scan guests' ticket QR codes, search, register walk-ins. */
export default function CheckinPage({ id }: { id: string }) {
  const token = decodeURIComponent(window.location.hash.slice(1));
  const [info, setInfo] = useState<{ company: string; event: string; timezone: string } | null>(null);
  const [guests, setGuests] = useState<CheckinGuest[]>([]);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<Tab>('scan');
  const [staff, setStaff] = useState(() => localStorage.getItem('checkin-staff') || '');
  const [result, setResult] = useState<Result | null>(null);
  const resultTimer = useRef<number>(0);

  const load = useCallback(() => {
    api
      .checkinList(id, token)
      .then(r => {
        venueTz = r.timezone || venueTz;
        setInfo({ company: r.company, event: r.event, timezone: r.timezone });
        setGuests(r.guests);
      })
      .catch(() => setError(true))
      .finally(hideSplash);
  }, [id, token]);

  useEffect(() => {
    document.title = 'ثبت حضور در غرفه';
    document.body.style.backgroundColor = '#0f172a';
    load();
    const t = window.setInterval(load, 20_000); // pick up new RSVPs and other staff's check-ins
    return () => window.clearInterval(t);
  }, [load]);

  useEffect(() => localStorage.setItem('checkin-staff', staff), [staff]);

  const merge = (g: CheckinGuest) => setGuests(list => (list.some(x => x.id === g.id) ? list.map(x => (x.id === g.id ? g : x)) : [g, ...list]));

  const showResult = (r: Result) => {
    window.clearTimeout(resultTimer.current);
    setResult(r);
    feedback(r.status === 'ok');
    resultTimer.current = window.setTimeout(() => setResult(null), r.status === 'ok' ? 4000 : 6000);
  };

  const checkIn = async (body: { ticket?: string; rsvpId?: string }) => {
    try {
      const r = await api.checkinScan(id, token, { ...body, staff });
      if (r.guest) merge(r.guest);
      showResult({ status: r.status, guest: r.guest, code: body.ticket ?? '' });
    } catch {
      showResult({ status: 'notfound', guest: null, code: body.ticket ?? '' });
    }
  };

  const undo = async (g: CheckinGuest) => {
    const r = await api.checkinUndo(id, token, g.id).catch(() => null);
    if (r?.guest) merge(r.guest);
    setResult(null);
  };

  const today = useMemo(() => (info ? new Intl.DateTimeFormat('en-CA', { timeZone: info.timezone }).format(new Date()) : ''), [info]);
  const present = guests.filter(g => g.checkedInAt);
  const expectedToday = guests.filter(g => !g.walkIn && (g.day === today || !g.day));
  const people = (list: CheckinGuest[]) => list.reduce((n, g) => n + g.count, 0);

  if (error) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-2 bg-slate-900 text-white p-6 text-center">
        <p className="text-2xl font-black">صفحه ثبت حضور در دسترس نیست</p>
        <p className="text-slate-400 text-sm">ممکن است لینک تغییر کرده یا ثبت حضور غیرفعال شده باشد. از مدیر لینک جدید بگیرید.</p>
      </div>
    );
  }
  if (!info) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-slate-900 text-white pb-24">
      <header className="px-4 pt-4 pb-3 space-y-3 max-w-xl mx-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-black text-lg">ثبت حضور در غرفه</h1>
            <p className="text-xs text-slate-400">
              {info.company} — {info.event}
            </p>
          </div>
          <input value={staff} onChange={e => setStaff(e.target.value)} placeholder="نام شما (متصدی)" className="w-36 rounded-xl bg-white/10 border border-white/10 px-3 py-2 text-xs outline-none focus:border-sky-400" />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="حاضر امروز" value={fa(present.filter(g => dayOf(g.checkedInAt) === today).length)} />
          <Stat label="منتظر امروز" value={fa(expectedToday.filter(g => !g.checkedInAt).length)} />
          <Stat label="کل حاضرین (نفر)" value={fa(people(present))} />
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4">
        {tab === 'scan' && <Scanner onCode={code => checkIn({ ticket: code })} paused={!!result} />}
        {tab === 'search' && <SearchList guests={guests} onCheckIn={g => checkIn({ rsvpId: g.id })} />}
        {tab === 'walkin' && (
          <WalkIn
            onSubmit={async data => {
              const r = await api.checkinWalkin(id, token, { ...data, staff });
              merge(r.guest);
              showResult({ status: 'ok', guest: r.guest, code: '' });
            }}
          />
        )}
        {tab === 'present' && <PresentList guests={present} onUndo={undo} />}
      </main>

      {result && <ResultCard result={result} onClose={() => setResult(null)} onUndo={undo} />}

      <nav className="fixed bottom-0 inset-x-0 bg-slate-950/95 backdrop-blur border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-xl mx-auto grid grid-cols-4">
          {(
            [
              ['scan', ScanLine, 'اسکن'],
              ['search', Search, 'جست‌وجو'],
              ['walkin', UserPlus, 'مهمان جدید'],
              ['present', Users, `حاضرین (${fa(present.length)})`],
            ] as [Tab, typeof ScanLine, string][]
          ).map(([t, Icon, label]) => (
            <button key={t} onClick={() => setTab(t)} className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-bold ${tab === t ? 'text-sky-400' : 'text-slate-400'}`}>
              <Icon className="w-5 h-5" />
              {label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/5 py-2">
      <p className="text-xl font-black tabular-nums">{value}</p>
      <p className="text-[10px] text-slate-400 font-bold">{label}</p>
    </div>
  );
}

function GuestLine({ g }: { g: CheckinGuest }) {
  return (
    <div className="min-w-0">
      <p className="font-black truncate">{g.name}</p>
      <p className="text-xs text-slate-400 truncate">
        {[g.org, `${fa(g.count)} نفر`, g.repName && `کارشناس: ${g.repName}`, g.channel && channelLabel(g.channel), g.walkIn && 'بدون اعلام قبلی'].filter(Boolean).join('، ')}
      </p>
    </div>
  );
}

function ResultCard({ result, onClose, onUndo }: { result: Result; onClose: () => void; onUndo: (g: CheckinGuest) => void }) {
  const { status, guest } = result;
  const style = status === 'ok' ? 'bg-emerald-600' : status === 'already' ? 'bg-amber-500' : 'bg-rose-600';
  const Icon = status === 'ok' ? CircleCheck : status === 'already' ? TriangleAlert : XCircle;
  return (
    <div className="fixed inset-x-0 top-0 z-50 p-3" onClick={onClose}>
      <div className={`max-w-xl mx-auto rounded-3xl ${style} p-5 shadow-2xl space-y-2`}>
        <p className="flex items-center gap-2 text-lg font-black">
          <Icon className="w-7 h-7" />
          {status === 'ok' ? 'خوش آمدید — حضور ثبت شد' : status === 'already' ? `قبلاً ثبت شده (${timeOf(guest?.checkedInAt ?? '')})` : 'بلیت پیدا نشد'}
        </p>
        {guest ? (
          <>
            <p className="text-2xl font-black">{guest.name}</p>
            <p className="text-sm font-bold opacity-90">{[guest.org, `${fa(guest.count)} نفر`].filter(Boolean).join('، ')}</p>
            {guest.repName && <p className="text-sm font-bold">کارشناس: {guest.repName}</p>}
            {status === 'already' && <p className="text-xs opacity-90">مراجعه {fa(guest.visits)}م — ثبت‌شده توسط {guest.checkedInBy || '—'}</p>}
            {status === 'ok' && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  onUndo(guest);
                }}
                className="inline-flex items-center gap-1 text-xs font-bold underline opacity-90"
              >
                <RotateCcw className="w-3.5 h-3.5" /> اشتباه بود، لغو کن
              </button>
            )}
          </>
        ) : (
          <p className="text-sm opacity-90">
            {result.code ? <span dir="ltr">{result.code}</span> : null} — این کد مربوط به این دعوتنامه نیست. نام مهمان را در «جست‌وجو» پیدا کنید یا او را در «مهمان جدید» ثبت کنید.
          </p>
        )}
      </div>
    </div>
  );
}

/** Camera QR scanner: native BarcodeDetector when available, jsQR otherwise (iPhone). */
function Scanner({ onCode, paused }: { onCode: (code: string) => void; paused: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [on, setOn] = useState(false);
  const [camError, setCamError] = useState('');
  const [manual, setManual] = useState('');
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const last = useRef({ code: '', at: 0 });

  useEffect(() => {
    if (!on) return;
    let stream: MediaStream | null = null;
    let stopped = false;
    let timer = 0;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      } catch {
        setCamError('دسترسی به دوربین ممکن نشد. اجازه دوربین را در مرورگر بدهید (صفحه باید با https باز شده باشد) یا کد را دستی وارد کنید.');
        setOn(false);
        return;
      }
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play().catch(() => {});
      const Detector = (window as any).BarcodeDetector;
      const detector = Detector ? new Detector({ formats: ['qr_code'] }) : null;
      const jsQR = detector ? null : (await import('jsqr')).default;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      const tick = async () => {
        if (stopped) return;
        if (!pausedRef.current && video.readyState >= 2) {
          let text = '';
          if (detector) {
            const codes = await detector.detect(video).catch(() => []);
            text = codes[0]?.rawValue ?? '';
          } else if (jsQR) {
            const w = Math.min(640, video.videoWidth);
            const h = Math.round((video.videoHeight / video.videoWidth) * w) || 480;
            canvas.width = w;
            canvas.height = h;
            ctx.drawImage(video, 0, 0, w, h);
            text = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' })?.data ?? '';
          }
          const code = text ? ticketFromScan(text) || `?${text.slice(0, 40)}` : '';
          // Ignore the same code for a few seconds (the guest is still holding it up).
          if (code && (code !== last.current.code || Date.now() - last.current.at > 5000)) {
            last.current = { code, at: Date.now() };
            onCode(code.startsWith('?') ? '' : code);
          }
        }
        timer = window.setTimeout(tick, 200);
      };
      tick();
    })();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      stream?.getTracks().forEach(t => t.stop());
    };
  }, [on, onCode]);

  return (
    <div className="space-y-3">
      <div className="relative aspect-square rounded-3xl overflow-hidden bg-black border border-white/10">
        <video ref={videoRef} playsInline muted className={`w-full h-full object-cover ${on ? '' : 'hidden'}`} />
        {on && <div className="absolute inset-[18%] border-4 border-sky-400/80 rounded-3xl pointer-events-none" />}
        {!on && (
          <button onClick={() => (setCamError(''), setOn(true))} className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-300">
            <Camera className="w-14 h-14" />
            <span className="font-black">روشن کردن دوربین و اسکن بلیت</span>
          </button>
        )}
      </div>
      {on && (
        <button onClick={() => setOn(false)} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400">
          <CameraOff className="w-4 h-4" /> خاموش کردن دوربین
        </button>
      )}
      {camError && <p className="text-xs text-amber-300 leading-relaxed">{camError}</p>}
      <form
        onSubmit={e => {
          e.preventDefault();
          const code = ticketFromScan(manual);
          if (code) {
            onCode(code);
            setManual('');
          }
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Keyboard className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            dir="ltr"
            value={manual}
            onChange={e => setManual(e.target.value.toUpperCase())}
            placeholder="کد ۸ حرفی بلیت"
            className="w-full rounded-xl bg-white/10 border border-white/10 pr-9 pl-3 py-3 font-mono tracking-widest placeholder:tracking-normal placeholder:font-sans outline-none focus:border-sky-400"
          />
        </div>
        <button className="rounded-xl bg-sky-500 text-slate-950 font-black px-4">ثبت</button>
      </form>
    </div>
  );
}

function SearchList({ guests, onCheckIn }: { guests: CheckinGuest[]; onCheckIn: (g: CheckinGuest) => void }) {
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const norm = (v: string) => v.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
    return (s ? guests.filter(g => [g.name, g.org, g.phone, g.ticket].some(v => norm(v).includes(norm(s)))) : guests).slice(0, 100);
  }, [q, guests]);
  return (
    <div className="space-y-3">
      <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="نام، شرکت، تلفن یا کد بلیت…" className="w-full rounded-xl bg-white/10 border border-white/10 px-3.5 py-3 outline-none focus:border-sky-400" />
      <ul className="space-y-2">
        {list.map(g => (
          <li key={g.id} className="flex items-center gap-3 rounded-2xl bg-white/5 p-3">
            <div className="flex-1 min-w-0">
              <GuestLine g={g} />
            </div>
            {g.checkedInAt ? (
              <span className="text-xs font-bold text-emerald-400 shrink-0">✓ {timeOf(g.checkedInAt)}</span>
            ) : (
              <button onClick={() => onCheckIn(g)} className="shrink-0 rounded-xl bg-emerald-500 text-slate-950 text-xs font-black px-3 py-2">
                ثبت حضور
              </button>
            )}
          </li>
        ))}
        {list.length === 0 && <p className="text-sm text-slate-400 text-center py-6">کسی پیدا نشد. می‌توانید او را در «مهمان جدید» ثبت کنید.</p>}
      </ul>
    </div>
  );
}

function WalkIn({ onSubmit }: { onSubmit: (d: { name: string; phone: string; org: string; count: number }) => Promise<void> }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [org, setOrg] = useState('');
  const [count, setCount] = useState(1);
  const [busy, setBusy] = useState(false);
  const input = 'w-full rounded-xl bg-white/10 border border-white/10 px-3.5 py-3 outline-none focus:border-sky-400';
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await onSubmit({ name: name.trim(), phone: phone.trim(), org: org.trim(), count });
      setName('');
      setPhone('');
      setOrg('');
      setCount(1);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm text-slate-400 leading-relaxed">بازدیدکننده‌ای که از قبل اعلام حضور نکرده است؛ ثبت می‌شود و در آمار «حضور بدون اعلام قبلی» شمرده می‌شود.</p>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="نام و نام خانوادگی *" className={input} />
      <input value={org} onChange={e => setOrg(e.target.value)} placeholder="شرکت / سازمان" className={input} />
      <input dir="ltr" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="شماره تماس" className={`${input} text-left`} />
      <label className="flex items-center gap-3 text-sm text-slate-300">
        تعداد نفرات
        <input type="number" min={1} max={20} value={count} onChange={e => setCount(Math.max(1, Number(e.target.value) || 1))} className="w-20 rounded-xl bg-white/10 border border-white/10 px-3 py-2" />
      </label>
      <button disabled={busy || !name.trim()} className="w-full rounded-2xl bg-sky-500 text-slate-950 font-black py-3.5 disabled:opacity-50">
        ثبت و ورود
      </button>
    </form>
  );
}

function PresentList({ guests, onUndo }: { guests: CheckinGuest[]; onUndo: (g: CheckinGuest) => void }) {
  const sorted = [...guests].sort((a, b) => b.checkedInAt.localeCompare(a.checkedInAt));
  return (
    <ul className="space-y-2">
      {sorted.map(g => (
        <li key={g.id} className="flex items-center gap-3 rounded-2xl bg-white/5 p-3">
          <span className="text-xs font-bold text-emerald-400 w-12 shrink-0 tabular-nums">{timeOf(g.checkedInAt)}</span>
          <div className="flex-1 min-w-0">
            <GuestLine g={g} />
          </div>
          <button onClick={() => confirm(`ثبت حضور «${g.name}» لغو شود؟`) && onUndo(g)} className="p-2 rounded-lg text-slate-400 hover:text-rose-400" aria-label="لغو">
            <RotateCcw className="w-4 h-4" />
          </button>
        </li>
      ))}
      {sorted.length === 0 && <p className="text-sm text-slate-400 text-center py-6">هنوز کسی ثبت نشده است.</p>}
    </ul>
  );
}
