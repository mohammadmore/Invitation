import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, CameraOff, CircleCheck, CloudOff, Keyboard, Loader2, RefreshCw, RotateCcw, Search, ScanLine, TriangleAlert, UserPlus, Users, Wifi, XCircle } from 'lucide-react';
import { apiUrl, BASE } from '../lib/paths';
import { hideSplash } from '../lib/splash';
import { ColorModeToggle, useAdminTheme } from '../lib/adminTheme';
import { offlineStore, newOpId, type CheckinOp, type Problem } from '../lib/checkinOffline';
import { ticketFromScan, type CheckinGuest, type ScanStatus } from '../shared/checkin';
import { channelLabel } from '../shared/tracking';

const fa = (n: number) => n.toLocaleString('fa-IR');
/** Times are shown in the venue's time zone (same as the SMS), whatever the phone is set to. */
let venueTz = 'Asia/Tehran';
const timeOf = (iso: string) => (iso ? new Date(iso).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', timeZone: venueTz }) : '');
const dayOf = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: venueTz }).format(new Date(iso));

type Tab = 'scan' | 'search' | 'walkin' | 'present';
interface Result {
  status: ScanStatus | 'unknown';
  guest: CheckinGuest | null;
  code: string;
  /** Saved on this phone only, waiting to be sent */
  pending?: boolean;
}
interface Info {
  company: string;
  event: string;
  timezone: string;
  theme?: { primary: string; accent: string };
}

class Offline extends Error {}

/** POST the queued operations; throws Offline when the server can't be reached (or errors). */
async function postOps(id: string, k: string, ops: CheckinOp[]) {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(apiUrl(`checkin/${encodeURIComponent(id)}/sync?k=${encodeURIComponent(k)}`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ops }),
      signal: ctrl.signal,
    });
    if (res.status === 404) throw new Error('revoked');
    if (!res.ok) throw new Offline();
    return (await res.json()).results as { opId: string; status: string; guest: CheckinGuest | null }[];
  } catch (e) {
    if ((e as Error).message === 'revoked') throw e;
    throw new Offline();
  } finally {
    window.clearTimeout(timer);
  }
}

async function fetchList(id: string, k: string) {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(apiUrl(`checkin/${encodeURIComponent(id)}?k=${encodeURIComponent(k)}`), { signal: ctrl.signal, cache: 'no-store' });
    if (res.status === 404) throw new Error('revoked');
    if (!res.ok) throw new Offline();
    return (await res.json()) as Info & { guests: CheckinGuest[] };
  } catch (e) {
    if ((e as Error).message === 'revoked') throw e;
    throw new Offline();
  } finally {
    window.clearTimeout(timer);
  }
}

/** Apply an operation to the local list (optimistic, also used to re-apply the queue after a refresh). */
function applyLocal(list: CheckinGuest[], op: CheckinOp): { list: CheckinGuest[]; status: Result['status']; guest: CheckinGuest | null } {
  if (op.type === 'walkin') {
    const g: CheckinGuest = { id: `local-${op.opId}`, name: op.name ?? '', org: op.org ?? '', phone: op.phone ?? '', day: '', count: op.count ?? 1, ticket: '', repName: '', channel: '', walkIn: true, checkedInAt: op.at, checkedInBy: op.staff, visits: 1 };
    return { list: [g, ...list.filter(x => x.id !== g.id)], status: 'ok', guest: g };
  }
  const idx = list.findIndex(g => (op.ticket && g.ticket === op.ticket) || (op.rsvpId && g.id === op.rsvpId));
  if (idx < 0) return { list, status: op.type === 'undo' ? 'notfound' : 'unknown', guest: null };
  const g = { ...list[idx] };
  let status: Result['status'];
  if (op.type === 'undo') {
    g.checkedInAt = '';
    g.checkedInBy = '';
    g.visits = 0;
    status = 'ok';
  } else {
    status = g.checkedInAt ? 'already' : 'ok';
    if (!g.checkedInAt) {
      g.checkedInAt = op.at;
      g.checkedInBy = op.staff;
    }
    g.visits += 1;
  }
  const next = [...list];
  next[idx] = g;
  return { list: next, status, guest: g };
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
  const store = useMemo(() => offlineStore(id), [id]);
  const cached = useMemo(() => store.loadData(), [store]);
  const [info, setInfo] = useState<Info | null>(cached?.info ?? null);
  // Dark glass in the invitation's own palette (cached, so it works offline too)
  const { style: palette } = useAdminTheme(info?.theme, 'dark');
  // Read inside the sync callbacks through a ref, so they stay stable (no effect re-run loops).
  const infoRef = useRef<Info | null>(info);
  infoRef.current = info;
  /** Last list received from the server */
  const [serverGuests, setServerGuests] = useState<CheckinGuest[]>(cached?.guests ?? []);
  const [queue, setQueue] = useState<CheckinOp[]>(() => store.loadQueue());
  const [problems, setProblems] = useState<Problem[]>(() => store.loadProblems());
  const [online, setOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string>(cached?.savedAt ?? '');
  const [offlineReady, setOfflineReady] = useState(false);
  const [fatal, setFatal] = useState<'' | 'revoked' | 'firstload'>('');
  const [tab, setTab] = useState<Tab>('scan');
  const [staff, setStaff] = useState(() => localStorage.getItem('checkin-staff') || '');
  const [result, setResult] = useState<Result | null>(null);
  const resultTimer = useRef<number>(0);
  /** The sync currently running (a new one waits for it instead of reporting "offline") */
  const flushing = useRef<Promise<unknown> | null>(null);

  // What the staff see = server list + queued (not yet synced) operations applied on top.
  const guests = useMemo(() => queue.reduce((list, op) => applyLocal(list, op).list, serverGuests), [serverGuests, queue]);

  useEffect(() => store.saveQueue(queue), [queue, store]);
  useEffect(() => store.saveProblems(problems), [problems, store]);
  useEffect(() => localStorage.setItem('checkin-staff', staff), [staff]);
  if (info) venueTz = info.timezone || venueTz;

  const refresh = useCallback(async () => {
    try {
      const r = await fetchList(id, token);
      const i: Info = { company: r.company, event: r.event, timezone: r.timezone, theme: r.theme };
      setInfo(prev => (prev && JSON.stringify(prev) === JSON.stringify(i) ? prev : i));
      setServerGuests(r.guests);
      const at = new Date().toISOString();
      setLastSync(at);
      store.saveData({ info: i, guests: r.guests, savedAt: at });
      setOnline(true);
    } catch (e) {
      if ((e as Error).message === 'revoked') setFatal('revoked');
      else {
        setOnline(false);
        if (!store.loadData()) setFatal('firstload');
      }
    } finally {
      hideSplash();
    }
  }, [id, token, store]);

  /** Send queued operations; returns the server results (or null when still offline). */
  const flush = useCallback(async (): Promise<Map<string, { status: string; guest: CheckinGuest | null }> | null> => {
    while (flushing.current) await flushing.current.catch(() => {});
    const pending = store.loadQueue();
    if (!pending.length) return new Map();
    let release!: () => void;
    flushing.current = new Promise<void>(r => (release = r));
    setSyncing(true);
    try {
      const batch = pending.slice(0, 200);
      const results = await postOps(id, token, batch);
      const byOp = new Map(results.map(r => [r.opId, r]));
      // Codes that turned out to be invalid while we were offline: keep them visible for the staff.
      const newProblems = batch
        .filter(op => op.offline && byOp.get(op.opId)?.status === 'notfound')
        .map(op => ({ opId: op.opId, at: op.at, code: op.ticket ?? '', staff: op.staff }));
      if (newProblems.length) setProblems(p => [...newProblems, ...p].slice(0, 50));
      setServerGuests(list => {
        let next = list;
        for (const r of results) {
          if (!r.guest) continue;
          next = [r.guest, ...next.filter(g => g.id !== r.guest!.id && g.id !== `local-${r.opId}`)];
        }
        store.saveData({ info: infoRef.current ?? { company: '', event: '', timezone: venueTz }, guests: next, savedAt: new Date().toISOString() });
        return next;
      });
      const done = new Set(batch.map(o => o.opId));
      const rest = store.loadQueue().filter(o => !done.has(o.opId));
      store.saveQueue(rest);
      setQueue(rest);
      setOnline(true);
      setLastSync(new Date().toISOString());
      if (rest.length) window.setTimeout(() => flush(), 100);
      // Results of operations sent earlier by another flush are also reported to the caller.
      return byOp;
    } catch (e) {
      if ((e as Error).message === 'revoked') setFatal('revoked');
      setOnline(false);
      return null;
    } finally {
      flushing.current = null;
      release();
      setSyncing(false);
    }
  }, [id, token, store]);

  useEffect(() => {
    document.title = 'ثبت حضور در غرفه';
    refresh().then(() => flush());
    const tick = window.setInterval(() => {
      flush().then(() => refresh());
    }, 20_000);
    const goOnline = () => {
      setOnline(true);
      flush().then(() => refresh());
    };
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.clearInterval(tick);
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [refresh, flush]);

  // Make this page (and the QR decoder) available offline after the first visit.
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !window.caches) return;
    import('jsqr').catch(() => {}); // fetch the decoder now so it gets cached
    navigator.serviceWorker
      .register(`${BASE}sw.js`, { scope: `${BASE}checkin/` })
      .then(() => navigator.serviceWorker.ready)
      .then(async () => {
        const cache = await caches.open('expo-checkin-v1');
        const shell = await fetch(window.location.pathname, { cache: 'no-store' });
        if (shell.ok) await cache.put(new URL('__shell', new URL(`${BASE}checkin/`, window.location.origin)).href, shell);
        await new Promise(r => window.setTimeout(r, 1500)); // let lazy chunks and fonts finish loading
        const urls = performance
          .getEntriesByType('resource')
          .map(e => e.name)
          .filter(u => u.startsWith(window.location.origin) && !u.includes('/api/'));
        await Promise.all([...new Set(urls)].map(u => cache.add(u).catch(() => {})));
        setOfflineReady(true);
      })
      .catch(() => {});
  }, []);

  const showResult = (r: Result) => {
    window.clearTimeout(resultTimer.current);
    setResult(r);
    feedback(r.status === 'ok');
    resultTimer.current = window.setTimeout(() => setResult(null), r.status === 'ok' ? 4000 : 6500);
  };

  /** Every action: applied locally at once, queued, then sent. Works the same with or without internet. */
  const submit = async (partial: Omit<CheckinOp, 'opId' | 'at' | 'staff' | 'offline'>) => {
    const op: CheckinOp = { ...partial, opId: newOpId(), at: new Date().toISOString(), staff };
    // Undoing a walk-in that never reached the server: just drop it from the queue.
    if (op.type === 'undo' && op.rsvpId?.startsWith('local-')) {
      const walkinOp = op.rsvpId.slice('local-'.length);
      setQueue(q => {
        const next = q.filter(o => o.opId !== walkinOp && !(o.rsvpId === op.rsvpId));
        store.saveQueue(next);
        return next;
      });
      setResult(null);
      return;
    }
    const local = applyLocal(guests, op);
    op.offline = !online;
    const q = [...store.loadQueue(), op];
    store.saveQueue(q);
    setQueue(q);
    const server = await flush();
    const r = server?.get(op.opId);
    if (r && op.type !== 'undo') {
      showResult({ status: r.status === 'duplicate' ? 'already' : (r.status as ScanStatus), guest: r.guest, code: op.ticket ?? '' });
    } else if (!r && op.type !== 'undo') {
      // Offline: answer from the list stored on this phone.
      setQueue(cur => cur.map(o => (o.opId === op.opId ? { ...o, offline: true } : o)));
      store.saveQueue(store.loadQueue().map(o => (o.opId === op.opId ? { ...o, offline: true } : o)));
      showResult({ status: local.status, guest: local.guest, code: op.ticket ?? '', pending: true });
    } else {
      setResult(null);
    }
  };

  const today = useMemo(() => (info ? new Intl.DateTimeFormat('en-CA', { timeZone: info.timezone }).format(new Date()) : ''), [info]);
  const present = guests.filter(g => g.checkedInAt);
  const expectedToday = guests.filter(g => !g.walkIn && (g.day === today || !g.day));
  const people = (list: CheckinGuest[]) => list.reduce((n, g) => n + g.count, 0);

  if (fatal) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-2 admin-bg text-slate-50 p-6 text-center" style={palette}>
        <p className="text-2xl font-black">{fatal === 'revoked' ? 'صفحه ثبت حضور در دسترس نیست' : 'اتصال برقرار نشد'}</p>
        <p className="text-slate-400 text-sm leading-relaxed">
          {fatal === 'revoked'
            ? 'ممکن است لینک تغییر کرده یا ثبت حضور غیرفعال شده باشد. از مدیر لینک جدید بگیرید.'
            : 'برای استفاده آفلاین، این صفحه باید یک بار با اینترنت باز شود تا فهرست مهمانان روی گوشی ذخیره شود.'}
        </p>
        {fatal === 'firstload' && (
          <button onClick={() => (setFatal(''), refresh())} className="mt-2 rounded-xl bg-slate-50 text-slate-900 font-bold px-5 py-2.5">
            تلاش دوباره
          </button>
        )}
      </div>
    );
  }
  if (!info) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center admin-bg" style={palette}>
        <Loader2 className="w-8 h-8 animate-spin text-(color:--ad-ink)" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] admin-bg text-slate-50 pb-24" style={palette}>
      <header className="px-4 pt-4 pb-3 space-y-3 max-w-xl mx-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-black text-lg">ثبت حضور در غرفه</h1>
            <p className="text-xs text-slate-400">
              {info.company} — {info.event}
            </p>
          </div>
          <ColorModeToggle className="mr-auto -mt-1 text-slate-300" />
          <input value={staff} onChange={e => setStaff(e.target.value)} placeholder="نام شما (متصدی)" className="w-36 rounded-xl bg-slate-50/10 border border-slate-50/10 px-3 py-2 text-xs outline-none focus:border-(color:--ad-ink)" />
        </div>
        <SyncBar online={online} queued={queue.length} syncing={syncing} lastSync={lastSync} offlineReady={offlineReady} onSync={() => flush().then(() => refresh())} />
        {problems.length > 0 && (
          <div className="rounded-2xl bg-rose-500/15 border border-rose-400/30 p-3 text-xs space-y-1">
            <p className="font-black text-rose-200">{fa(problems.length)} کد هنگام همگام‌سازی نامعتبر بود (در حالت آفلاین ثبت شده بود):</p>
            {problems.slice(0, 5).map(p => (
              <p key={p.opId} className="text-rose-100">
                <span dir="ltr" className="font-mono">
                  {p.code || '—'}
                </span>{' '}
                — {timeOf(p.at)} {p.staff && `(${p.staff})`}
              </p>
            ))}
            <button onClick={() => setProblems([])} className="font-bold underline text-rose-200">
              متوجه شدم
            </button>
          </div>
        )}
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="حاضر امروز" value={fa(present.filter(g => dayOf(g.checkedInAt) === today).length)} />
          <Stat label="منتظر امروز" value={fa(expectedToday.filter(g => !g.checkedInAt).length)} />
          <Stat label="کل حاضرین (نفر)" value={fa(people(present))} />
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4">
        {tab === 'scan' && <Scanner onCode={code => submit({ type: 'scan', ticket: code })} paused={!!result} />}
        {tab === 'search' && <SearchList guests={guests} onCheckIn={g => submit({ type: 'scan', rsvpId: g.id })} />}
        {tab === 'walkin' && <WalkIn onSubmit={async data => submit({ type: 'walkin', ...data })} />}
        {tab === 'present' && <PresentList guests={present} onUndo={g => submit({ type: 'undo', rsvpId: g.id })} />}
      </main>

      {result && <ResultCard result={result} onClose={() => setResult(null)} onUndo={g => submit({ type: 'undo', rsvpId: g.id })} />}

      <nav className="fixed bottom-0 inset-x-0 glass !border-x-0 !border-b-0 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-xl mx-auto grid grid-cols-4">
          {(
            [
              ['scan', ScanLine, 'اسکن'],
              ['search', Search, 'جست‌وجو'],
              ['walkin', UserPlus, 'مهمان جدید'],
              ['present', Users, `حاضرین (${fa(present.length)})`],
            ] as [Tab, typeof ScanLine, string][]
          ).map(([t, Icon, label]) => (
            <button key={t} onClick={() => setTab(t)} className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-bold ${tab === t ? 'text-(color:--ad-ink)' : 'text-slate-400'}`}>
              <Icon className="w-5 h-5" />
              {label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

/** Connection / sync status, always visible so staff know whether scans reached the server. */
function SyncBar({ online, queued, syncing, lastSync, offlineReady, onSync }: { online: boolean; queued: number; syncing: boolean; lastSync: string; offlineReady: boolean; onSync: () => void }) {
  const ago = lastSync ? timeOf(lastSync) : '—';
  return (
    <div className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-bold ${online ? (queued ? 'bg-amber-500/15 text-amber-200' : 'bg-emerald-500/15 text-emerald-200') : 'bg-amber-500/20 text-amber-200'}`}>
      {online ? <Wifi className="w-4 h-4 shrink-0" /> : <CloudOff className="w-4 h-4 shrink-0" />}
      <span className="flex-1">
        {online ? (queued ? `آنلاین — ${fa(queued)} ثبت در حال ارسال` : 'آنلاین — همه ثبت‌ها ارسال شده') : `آفلاین — ثبت‌ها روی همین گوشی ذخیره می‌شوند${queued ? ` (${fa(queued)} در صف)` : ''}`}
        <span className="block text-[10px] font-medium opacity-80">
          آخرین همگام‌سازی: {ago}
          {offlineReady && ' · آماده استفاده بدون اینترنت'}
        </span>
      </span>
      <button onClick={onSync} disabled={syncing} className="shrink-0 rounded-lg bg-slate-50/10 px-2 py-1 inline-flex items-center gap-1 disabled:opacity-60" aria-label="همگام‌سازی">
        <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
        همگام‌سازی
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl glass py-2">
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
  const style = status === 'ok' ? 'bg-emerald-600' : status === 'already' || status === 'unknown' ? 'bg-amber-500' : 'bg-rose-600';
  const Icon = status === 'ok' ? CircleCheck : status === 'already' || status === 'unknown' ? TriangleAlert : XCircle;
  return (
    <div className="fixed inset-x-0 top-0 z-50 p-3" onClick={onClose}>
      <div className={`max-w-xl mx-auto rounded-3xl ${style} p-5 shadow-2xl space-y-2`}>
        <p className="flex items-center gap-2 text-lg font-black">
          <Icon className="w-7 h-7" />
          {status === 'ok' ? 'خوش آمدید — حضور ثبت شد' : status === 'already' ? `قبلاً ثبت شده (${timeOf(guest?.checkedInAt ?? '')})` : status === 'unknown' ? 'ذخیره شد — بعداً بررسی می‌شود' : 'بلیت پیدا نشد'}
        </p>
        {result.pending && <p className="text-[11px] font-bold opacity-90">آفلاین: روی همین گوشی ذخیره شد و با وصل شدن اینترنت ارسال می‌شود.</p>}
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
        ) : status === 'unknown' ? (
          <p className="text-sm opacity-90">
            <span dir="ltr">{result.code}</span> — این کد در فهرست ذخیره‌شده روی این گوشی نیست (شاید مهمان بعد از آخرین همگام‌سازی اعلام حضور کرده). ثبت شد و پس از اتصال بررسی می‌شود.
          </p>
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
      <div className="no-invert relative aspect-square rounded-3xl overflow-hidden bg-black border border-slate-50/10">
        <video ref={videoRef} playsInline muted className={`w-full h-full object-cover ${on ? '' : 'hidden'}`} />
        {on && <div className="absolute inset-[18%] border-4 border-(color:--ad-ink)/80 rounded-3xl pointer-events-none" />}
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
            className="w-full rounded-xl bg-slate-50/10 border border-slate-50/10 pr-9 pl-3 py-3 font-mono tracking-widest placeholder:tracking-normal placeholder:font-sans outline-none focus:border-(color:--ad-ink)"
          />
        </div>
        <button className="rounded-xl btn-ad text-white font-black px-4">ثبت</button>
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
      <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="نام، شرکت، تلفن یا کد بلیت…" className="w-full rounded-xl bg-slate-50/10 border border-slate-50/10 px-3.5 py-3 outline-none focus:border-(color:--ad-ink)" />
      <ul className="space-y-2">
        {list.map(g => (
          <li key={g.id} className="flex items-center gap-3 rounded-2xl glass p-3">
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
  const input = 'w-full rounded-xl bg-slate-50/10 border border-slate-50/10 px-3.5 py-3 outline-none focus:border-(color:--ad-ink)';
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
        <input type="number" min={1} max={20} value={count} onChange={e => setCount(Math.max(1, Number(e.target.value) || 1))} className="w-20 rounded-xl bg-slate-50/10 border border-slate-50/10 px-3 py-2" />
      </label>
      <button disabled={busy || !name.trim()} className="w-full rounded-2xl btn-ad text-white font-black py-3.5 disabled:opacity-50">
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
        <li key={g.id} className="flex items-center gap-3 rounded-2xl glass p-3">
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
