import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Clock, Building, Calendar as CalendarIcon, Share2, ChevronLeft, ChevronRight, Map, Volume2, VolumeX, Copy, ExternalLink, CalendarX, TriangleAlert, Phone, Mail, Globe, Send, MessageCircle, UserPlus, CircleCheck, X, Languages } from 'lucide-react';
import { contactLinks, CUSTOM_FONT, fillPlaceholders, isFilled, isMissing, isShown, ITEMS, localize, safeUrl, type ContactLink, type InvitationConfig, type ItemKey, type Lang } from '../shared/invitation';
import { dateText as dateTextOf, dayCount, eventEnded, googleCalendarUrl, icsContent, timeText as timeTextOf } from '../shared/calendar';
import { repVcardContent, vcardContent } from '../shared/vcard';
import type { PublicLinkInfo } from '../shared/tracking';
import { strings } from './i18n';
import { themeColors } from '../shared/color';
import { apiUrl, asset } from '../lib/paths';

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" className="@2xl:w-6 @2xl:h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
);

const AppleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" className="@2xl:w-[22px] @2xl:h-[22px]" viewBox="0 0 384 512" fill="currentColor"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>
);

const IN_APP_RE = /Instagram|Telegram|Snapchat|WhatsApp|FBAV|FBAN|Line\/|Twitter|LinkedIn/i;
/** Browser activation events (touchstart is *not* one on iOS). */
const GESTURE_EVENTS = ['pointerup', 'touchend', 'click', 'keydown'] as const;

function mediaType(url: string): string | undefined {
  const ext = url.split('.').pop()?.toLowerCase();
  return ({ mp4: 'video/mp4', webm: 'video/webm' } as Record<string, string>)[ext ?? ''];
}

/** iOS ignores HTMLMediaElement.volume; detect that so we can use a Web Audio gain node instead. */
const volumeSettable = (() => {
  if (typeof document === 'undefined') return true;
  const a = document.createElement('audio');
  a.volume = 0.5;
  return a.volume === 0.5;
})();

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

const hideOnError = (e: React.SyntheticEvent<HTMLImageElement>) => (e.currentTarget.style.visibility = 'hidden');

/** Red, unmissable placeholder for content that hasn't been provided yet (previews only). */
function Missing({ text, className = '' }: { text: string; className?: string }) {
  return (
    <div role="alert" className={`flex items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-red-500 bg-red-50 text-red-600 font-black text-sm leading-snug px-3 py-2 text-center shadow-[0_0_0_3px_rgba(239,68,68,0.15)] ${className}`}>
      <TriangleAlert className="w-4 h-4 shrink-0" />
      <span>{text}</span>
    </div>
  );
}

export interface InvitationViewProps {
  config: InvitationConfig;
  /** Rendered inside the wizard preview: no autoplay, no history, contained positioning. */
  embedded?: boolean;
  /** Jump to `step` whenever `key` changes (used by the wizard to follow the edited field). */
  focus?: { step: number; key: number };
  /** Absolute URL that should be shared (defaults to the current page). */
  shareUrl?: string;
  /** Draft previews: show every missing (not hidden) item as a red placeholder. */
  showMissing?: boolean;
  /** Name from a personal link (?to=...) */
  guestName?: string;
  /** Initial language (?lang=en); guests can switch when the English version is enabled */
  initialLang?: Lang;
  /** Force a language (the wizard shows English while the English step is edited) */
  forcedLang?: Lang;
  /** Analytics hook (published invitations only) */
  onEvent?: (type: string) => void;
  /** Send an attendance confirmation; absent in previews (nothing is stored there) */
  onRsvp?: (data: RsvpData) => Promise<void>;
  /** Tracked link this page was opened with (multi-link mode) */
  link?: PublicLinkInfo | null;
  /** Show the "your sales rep" card on rep links */
  repCard?: boolean;
  /** Also show the company's own contact card under the rep card */
  showCompanyContact?: boolean;
}

export interface RsvpData {
  name: string;
  phone: string;
  org: string;
  day: string;
  count: number;
  guest: string;
  lang: Lang;
}

const CONTACT_ICONS: Record<ContactLink['kind'], React.ComponentType<{ className?: string }>> = {
  phone: Phone,
  whatsapp: MessageCircle,
  email: Mail,
  website: Globe,
  instagram: InstagramIcon,
  telegram: Send,
};

/** Data-saver / very slow connection: skip the background video. */
function prefersLowData(): boolean {
  const conn = (navigator as any).connection;
  return !!conn && (conn.saveData === true || /(^|-)2g$/.test(conn.effectiveType || ''));
}

/** Exhibition days as YYYY-MM-DD (for the RSVP day picker). */
function eventDays(start: string, end: string): string[] {
  if (!start) return [];
  const n = Math.min(dayCount(start, end), 14);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(`${start}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

function dayLabel(iso: string, lang: Lang): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return lang === 'en'
    ? new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(d)
    : new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(d);
}

export default function InvitationView({
  config,
  embedded = false,
  focus,
  shareUrl,
  showMissing = false,
  guestName = '',
  initialLang = 'fa',
  forcedLang,
  onEvent,
  onRsvp,
  link = null,
  repCard = true,
  showCompanyContact = true,
}: InvitationViewProps) {
  const rep = repCard ? (link?.rep ?? null) : null;
  const repName = link?.rep?.name ?? '';
  const [userLang, setUserLang] = useState<Lang>(initialLang);
  useEffect(() => {
    if (forcedLang) setUserLang(forcedLang);
  }, [forcedLang]);
  const lang: Lang = config.en.enabled ? userLang : 'fa';
  const T = strings(lang);
  const isEn = lang === 'en';
  const NextIcon = isEn ? ChevronRight : ChevronLeft;
  const BackIcon = isEn ? ChevronLeft : ChevronRight;
  /** The invitation in the current language (English texts replace the Persian ones). */
  const L = useMemo(() => localize(config, lang), [config, lang]);
  const { company, event, texts } = L;
  const { theme, media, footer } = config;
  const shown = (k: ItemKey) => isShown(L, k);
  const miss = (k: ItemKey) => showMissing && isMissing(L, k);
  const ready = (k: ItemKey) => shown(k) && isFilled(L, k);
  const track = (type: string) => onEvent?.(type);
  const lowData = useMemo(() => !embedded && typeof navigator !== 'undefined' && prefersLowData(), [embedded]);
  const rsvpKey = `rsvp-done:${config.slug}`;
  const [rsvpOpen, setRsvpOpen] = useState(false);
  const [rsvpDone, setRsvpDone] = useState(() => !embedded && typeof localStorage !== 'undefined' && !!localStorage.getItem(rsvpKey));
  const hasMap = ready('boothMap');
  const [step, setStep] = useState(1);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [mapState, setMapState] = useState<'loading' | 'loaded' | 'slow'>('loading');
  const [toast, setToast] = useState('');
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const userMutedRef = useRef(false);
  const graphRef = useRef<{ ctx: AudioContext; gain: GainNode } | null>(null);
  const depthRef = useRef(0);
  const toastTimer = useRef<number | undefined>(undefined);
  const isInApp = useMemo(() => !embedded && typeof navigator !== 'undefined' && IN_APP_RE.test(navigator.userAgent), [embedded]);
  const ended = useMemo(() => eventEnded(config), [config]);

  // ---------- navigation (browser back button walks back through the steps) ----------
  const goTo = useCallback(
    (next: number) => {
      setStep(next);
      if (!embedded) {
        depthRef.current += 1;
        window.history.pushState({ inviteStep: next, depth: depthRef.current }, '');
      }
    },
    [embedded],
  );

  /** In-page "back" buttons: pop history instead of pushing, so the phone's Back button stays consistent. */
  const goBack = useCallback(
    (target: number) => {
      if (!embedded && depthRef.current > 0) window.history.back();
      else setStep(target);
    },
    [embedded],
  );

  useEffect(() => {
    if (embedded) return;
    window.history.replaceState({ inviteStep: 1, depth: 0 }, '');
    const onPop = (e: PopStateEvent) => {
      depthRef.current = typeof e.state?.depth === 'number' ? e.state.depth : 0;
      setStep(typeof e.state?.inviteStep === 'number' ? e.state.inviteStep : 1);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [embedded]);

  useEffect(() => {
    if (focus) setStep(focus.step === 4 && !hasMap ? 3 : focus.step);
  }, [focus?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (step === 4 && !hasMap) setStep(3);
    if (step !== 4) return;
    setMapState('loading');
    const t = window.setTimeout(() => setMapState(s => (s === 'loading' ? 'slow' : s)), 10_000);
    return () => window.clearTimeout(t);
  }, [step, hasMap]);

  // ---------- background video: pause behind the map to free the GPU ----------
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (step === 4) video.pause();
    else video.play().catch(() => {});
  }, [step]);

  useEffect(() => setIsVideoLoaded(false), [media.video]);

  // ---------- background music ----------
  const volume = media.musicVolume / 100;

  const startAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return Promise.reject();
    // Inside a user gesture: on iOS route through a gain node so the volume setting works.
    if (!volumeSettable && !graphRef.current) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (Ctx) {
        const ctx: AudioContext = new Ctx();
        const gain = ctx.createGain();
        gain.gain.value = volume;
        ctx.createMediaElementSource(audio).connect(gain).connect(ctx.destination);
        graphRef.current = { ctx, gain };
      }
    }
    graphRef.current?.ctx.resume().catch(() => {});
    return audio.play();
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (graphRef.current) graphRef.current.gain.gain.value = volume;
    else if (audio) audio.volume = volume;
  }, [volume, media.music]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !media.music) return;
    const cleanupGraph = () => {
      graphRef.current?.ctx.close().catch(() => {});
      graphRef.current = null;
    };
    if (embedded) return cleanupGraph;

    const removeListeners = () => GESTURE_EVENTS.forEach(e => document.removeEventListener(e, tryPlay, true));
    function tryPlay() {
      if (userMutedRef.current) return removeListeners();
      startAudio().then(removeListeners).catch(() => {});
    }
    audio.play().catch(() => GESTURE_EVENTS.forEach(e => document.addEventListener(e, tryPlay, { capture: true, passive: true })));

    // Don't keep playing while the tab/app is in the background.
    let resumeOnVisible = false;
    const onVisibility = () => {
      if (document.hidden) {
        resumeOnVisible = !audio.paused;
        audio.pause();
      } else if (resumeOnVisible) {
        audio.play().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      removeListeners();
      document.removeEventListener('visibilitychange', onVisibility);
      audio.pause();
      cleanupGraph();
    };
  }, [embedded, media.music]); // eslint-disable-line react-hooks/exhaustive-deps

  // Note: while autoplay is blocked the document-level gesture listener (capture phase) also
  // starts playback on this click; both paths "play", so the result is consistent.
  const toggleMusic = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      userMutedRef.current = false;
      startAudio().catch(() => {});
    } else {
      userMutedRef.current = true;
      audio.pause();
    }
  };

  const enter = () => {
    goTo(2);
    track('enter');
    const audio = audioRef.current;
    if (!embedded && audio && audio.paused && !userMutedRef.current) startAudio().catch(() => {});
  };

  // ---------- share / calendar ----------
  const showToast = (msg: string) => {
    window.clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = window.setTimeout(() => setToast(''), 2500);
  };

  const pageUrl = () => shareUrl || window.location.href.split('#')[0];

  const handleShare = async () => {
    const url = pageUrl();
    track('share');
    const text =
      fillPlaceholders(texts.shareText, L, guestName, repName) || T.shareText(event.title, dateText, ready('location') ? event.location : '', ready('booth') ? event.booth : '');
    if (navigator.share) {
      try {
        await navigator.share({ title: event.title, text, url });
        return;
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') return; // user closed the share sheet
      }
    }
    showToast((await copyText(url)) ? T.copied : T.unsupported);
  };

  const calendarReady = ready('calendar') && !ended;
  const gcalUrl = useMemo(() => (calendarReady ? googleCalendarUrl(config, lang) : '#'), [config, calendarReady, lang]);
  // Published invitations get real .ics/.vcf files from the server (much more reliable on iOS / in-app browsers).
  const live = !embedded && !showMissing && !!config.slug;
  const icsUrl = useMemo(() => {
    if (!calendarReady) return '#';
    if (live) return apiUrl(`invitations/${config.slug}/ics?lang=${lang}`);
    return `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent(config, lang))}`;
  }, [config, calendarReady, live, lang]);
  const contacts = useMemo(() => contactLinks(config.contact), [config.contact]);
  const repContacts = useMemo(() => (rep ? contactLinks({ phone: rep.phone, whatsapp: rep.whatsapp, email: rep.email, website: '', instagram: '', telegram: '' }) : []), [rep]);
  const repVcardUrl = useMemo(() => {
    if (!rep) return '';
    if (live && link) return apiUrl(`invitations/${config.slug}/vcard?link=${link.code}&lang=${lang}`);
    return `data:text/vcard;charset=utf-8,${encodeURIComponent(repVcardContent(config, rep, lang))}`;
  }, [rep, live, link, config, lang]);
  const vcardUrl = useMemo(() => {
    if (!contacts.some(c => c.kind === 'phone' || c.kind === 'email' || c.kind === 'whatsapp')) return '';
    if (live) return apiUrl(`invitations/${config.slug}/vcard?lang=${lang}`);
    return `data:text/vcard;charset=utf-8,${encodeURIComponent(vcardContent(config, lang))}`;
  }, [config, contacts, live, lang]);

  // ---------- theming ----------
  const colors = useMemo(() => themeColors(theme), [theme]);
  const fontFamily = theme.font === CUSTOM_FONT ? 'InviteCustomFont' : theme.font;
  const themeStyle = {
    '--c-primary': colors.primary,
    '--c-accent': colors.accent,
    '--c-bg': colors.background,
    '--c-fg': colors.fg,
    '--c-primary-ink': colors.primaryInk,
    '--c-accent-ink': colors.accentInk,
    '--c-btn-primary': colors.btnPrimary,
    '--c-btn-accent': colors.btnAccent,
    fontFamily: `'${fontFamily}', 'Vazirmatn', Tahoma, sans-serif`,
  } as React.CSSProperties;

  const letterParagraphs = fillPlaceholders(texts.letter, L, guestName, repName)
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean);
  const mapUrl = safeUrl(event.mapUrl);
  const boothMapUrl = safeUrl(event.boothMapUrl);
  const footerUrl = safeUrl(footer.url);
  const spring = { duration: 0.8, type: 'spring' as const, bounce: 0.4 };
  const btnPrimary = 'animate-gradient-btn hover:scale-[1.02] hover:shadow-[0_10px_25px_rgba(0,0,0,0.35)]';
  const poster = ready('video') ? asset(media.videoPoster) : '';
  const dateText = dateTextOf(config, lang);
  const timeText = timeTextOf(config, lang);
  const mapUrlShown = ready('mapUrl') ? mapUrl : '';

  const locationInner = (
    <>
      <div className="bg-(--c-accent)/10 p-2 @2xl:p-3 rounded-2xl text-(--c-accent-ink) group-hover:bg-(--c-accent)/20 transition-colors shrink-0">
        <MapPin className="w-5 h-5 @2xl:w-6 @2xl:h-6" />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="font-bold text-base @2xl:text-lg leading-tight break-words">{event.location}</span>
        {miss('mapUrl') && <Missing text={ITEMS.mapUrl.missing} className="mt-1.5 text-xs py-1" />}
        {mapUrlShown && (
          <span className="text-xs @2xl:text-sm text-(--c-accent-ink) font-bold mt-1 opacity-80 group-hover:opacity-100 flex items-center gap-1">
            <Map className="w-3.5 h-3.5 @2xl:w-4 @2xl:h-4" />
            {T.mapHint}
          </span>
        )}
      </div>
    </>
  );

  const mapOverlay = step === 4 && hasMap && (
    <motion.div
      key="step4"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      style={themeStyle}
      className={`${embedded ? 'absolute' : 'fixed'} inset-0 z-[100] w-full h-full bg-(--c-bg)`}
    >
      <button
        onClick={() => goBack(3)}
        aria-label={T.back}
        className="absolute top-20 left-6 z-[110] bg-white/30 hover:bg-white/50 backdrop-blur-md p-3 rounded-full text-slate-800 transition-all shadow-md border border-white/40 flex items-center justify-center"
      >
        <BackIcon className="w-5 h-5" />
      </button>
      {mapState !== 'loaded' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-(--c-fg) px-8 text-center">
          {mapState === 'loading' ? (
            <>
              <div className="w-10 h-10 border-4 border-slate-500/40 border-t-(--c-accent) rounded-full animate-spin" />
              <span className="font-bold">{T.mapLoading}</span>
            </>
          ) : (
            <span className="font-bold leading-relaxed">{T.mapSlow}</span>
          )}
        </div>
      )}
      <iframe src={boothMapUrl} onLoad={() => setMapState('loaded')} className="w-full h-full border-0 absolute inset-0" title={T.mapTitle} allow="fullscreen; accelerometer; gyroscope" />
      {/* Many sites refuse to be framed – always offer a way out. */}
      <a
        href={boothMapUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[110] inline-flex items-center gap-2 whitespace-nowrap bg-slate-900/80 backdrop-blur text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-xl"
      >
        <ExternalLink className="w-4 h-4" />
        {T.openMap}
      </a>
    </motion.div>
  );

  return (
    <div
      dir={isEn ? 'ltr' : 'rtl'}
      lang={lang}
      style={themeStyle}
      className={`@container ${embedded ? 'h-full overflow-y-auto overflow-x-hidden' : 'min-h-[100dvh] overflow-hidden'} flex flex-col px-5 py-2 @2xl:p-6 relative bg-(--c-bg) text-(--c-fg)`}
    >
      {theme.font === CUSTOM_FONT && theme.customFontUrl && (
        <style>{`@font-face{font-family:'InviteCustomFont';src:url('${asset(theme.customFontUrl)}');font-display:swap;}`}</style>
      )}

      {/* Preload images to prevent flashing when changing steps */}
      <div className="hidden">
        {company.logo && <img src={asset(company.logo)} alt="" />}
        {company.icon && <img src={asset(company.icon)} alt="" />}
      </div>

      {/* Background: poster is visible immediately (and stays when video can't autoplay, e.g. iOS Low Power Mode) */}
      <div className="absolute inset-0 z-0 bg-(--c-bg) overflow-hidden">
        {poster && (
          <img
            src={poster}
            alt=""
            onError={hideOnError}
            style={{ opacity: media.videoOpacity / 100 }}
            className="absolute inset-0 w-full h-full object-cover @3xl:blur-2xl @3xl:scale-110"
          />
        )}
        {ready('video') && !lowData && (
          <video
            key={media.video}
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            poster={poster || undefined}
            onCanPlay={() => setIsVideoLoaded(true)}
            style={{ opacity: isVideoLoaded ? media.videoOpacity / 100 : 0 }}
            className="absolute inset-0 w-full h-full object-cover @3xl:object-contain transition-opacity duration-1000 ease-in-out"
          >
            <source src={asset(media.video)} type={mediaType(media.video)} />
          </video>
        )}
      </div>

      {/* Soft glows for depth */}
      <div className={`absolute inset-0 z-0 overflow-hidden pointer-events-none ${step === 4 ? 'hidden' : 'block'}`}>
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-(--c-primary)/20 rounded-full blur-3xl" style={{ transform: 'translateZ(0)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-(--c-accent)/10 rounded-full blur-3xl" style={{ transform: 'translateZ(0)' }} />
      </div>

      {ready('music') && (
        <audio key={media.music} ref={audioRef} loop preload="none" src={asset(media.music)} onPlay={() => setIsMusicPlaying(true)} onPause={() => setIsMusicPlaying(false)} />
      )}

      {(miss('video') || miss('music')) && (
        <div className="absolute top-20 inset-x-4 z-50 flex flex-col items-center gap-1.5 pointer-events-none">
          {miss('video') && <Missing text={ITEMS.video.missing} className="text-xs py-1" />}
          {miss('music') && <Missing text={ITEMS.music.missing} className="text-xs py-1" />}
        </div>
      )}

      {ready('music') && (
        <button
          onClick={toggleMusic}
          aria-label={isMusicPlaying ? T.mute : T.unmute}
          title={isMusicPlaying ? T.mute : T.unmute}
          className="absolute top-6 left-6 z-50 bg-white/30 hover:bg-white/50 backdrop-blur-md p-3 rounded-full text-slate-800 transition-all shadow-md border border-white/40 flex items-center justify-center"
        >
          {isMusicPlaying ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-slate-600" />}
        </button>
      )}

      {config.en.enabled && (
        <button
          onClick={() => {
            const next = isEn ? 'fa' : 'en';
            setUserLang(next);
            if (next === 'en') track('en');
          }}
          className="absolute top-6 right-6 z-50 bg-white/30 hover:bg-white/50 backdrop-blur-md px-3.5 py-2.5 rounded-full text-slate-800 text-xs font-black transition-all shadow-md border border-white/40 flex items-center gap-1.5"
          style={{ fontFamily: isEn ? "'Vazirmatn', sans-serif" : undefined }}
        >
          <Languages className="w-4 h-4" />
          {T.langSwitch}
        </button>
      )}

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full pb-8 pt-16 @2xl:pt-0 @2xl:pb-16">
        <AnimatePresence mode="wait">
          {/* STEP 1: WELCOME SCREEN */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, scale: 0.95, y: 50 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -50 }} transition={spring} className="text-center w-full">
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8 }} className="mb-8 relative">
                <div className="absolute inset-0 bg-white/20 blur-xl rounded-full" />
                {ready('logo') ? (
                  <img src={asset(company.logo)} alt={company.name} onError={hideOnError} className="w-72 max-h-40 object-contain h-auto mx-auto drop-shadow-2xl relative z-10" />
                ) : miss('logo') ? (
                  <Missing text={ITEMS.logo.missing} className="relative z-10 max-w-xs mx-auto py-6" />
                ) : null}
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.8 }} className="bg-white/90 backdrop-blur-xl p-5 @2xl:p-8 rounded-3xl border border-white/50 shadow-2xl">
                {ended && (
                  <p className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-100 rounded-full px-3 py-1">
                    <CalendarX className="w-3.5 h-3.5" /> {T.ended}
                  </p>
                )}
                {guestName && <p className="mb-2 text-sm font-bold text-slate-500">{T.guestFor} {guestName}</p>}
                <h1 className="text-3xl font-black text-(--c-primary-ink) mb-0 leading-tight relative z-10 break-words">
                  {ready('badge') && <span className="block text-(--c-accent-ink) text-xl mb-2 @2xl:mb-3 font-bold">{event.badge}</span>}
                  {miss('badge') && <Missing text={ITEMS.badge.missing} className="mb-2 text-xs py-1" />}
                  {event.title || (showMissing ? <Missing text="نام نمایشگاه هنوز وارد نشده" /> : null)}
                </h1>

                {ready('eventLogo') ? (
                  <div className="w-full flex justify-center items-center -mt-4 @2xl:-mt-5 -mb-3 @2xl:-mb-5 relative z-0">
                    <img src={asset(event.logo)} alt={event.title} onError={hideOnError} className="h-24 @2xl:h-28 max-w-full w-auto object-contain" />
                  </div>
                ) : miss('eventLogo') ? (
                  <Missing text={ITEMS.eventLogo.missing} className="my-3" />
                ) : (
                  <div className="h-4" />
                )}

                {ready('welcomeText') && <p className="text-slate-600 mb-4 @2xl:mb-6 font-medium text-lg relative z-10 break-words">{fillPlaceholders(event.welcomeText, L, guestName, repName)}</p>}
                {miss('welcomeText') && <Missing text={ITEMS.welcomeText.missing} className="mb-4" />}

                <button onClick={enter} className={`flex items-center justify-center gap-2 text-white px-8 py-4 rounded-full font-bold shadow-lg transition-all w-full ${btnPrimary}`}>
                  <span className="text-lg">{texts.enterButton}</span>
                  <NextIcon className="w-5 h-5" />
                </button>
              </motion.div>
            </motion.div>
          )}

          {/* STEP 2: INVITATION MESSAGE */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, scale: 0.95, y: 50 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -50 }} transition={spring} className="bg-white/90 backdrop-blur-xl p-4 @2xl:p-6 pb-4 @2xl:pb-5 rounded-3xl border border-white/50 shadow-2xl text-slate-800 w-full relative mt-6">
              {ready('icon') && (
                <div className="absolute -top-7 @2xl:-top-10 left-1/2 transform -translate-x-1/2 bg-white p-2.5 @2xl:p-3 rounded-full shadow-xl z-10">
                  <img src={asset(company.icon)} alt={company.name} onError={hideOnError} className="w-12 h-12 @2xl:w-16 @2xl:h-16 object-contain" />
                </div>
              )}
              {miss('icon') && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-10 w-20 h-20 rounded-full border-2 border-dashed border-red-500 bg-red-50 text-red-600 text-[10px] font-black leading-tight flex items-center justify-center text-center p-2 shadow-xl">
                  نشان شرکت وارد نشده
                </div>
              )}

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className={`space-y-2 @2xl:space-y-3 ${shown('icon') ? 'pt-8 @2xl:pt-10' : 'pt-1'}`}>
                {guestName && <p className="text-[15px] @2xl:text-[18px] font-black text-(--c-primary-ink)">{fillPlaceholders(texts.guestGreeting, L, guestName, repName)}</p>}
                {miss('letter') && <Missing text={ITEMS.letter.missing} className="py-8" />}
                {(ready('letter') ? letterParagraphs : []).map((p, i) => (
                  <p key={i} className="text-[14.5px] @2xl:text-[17px] leading-[1.6] @2xl:leading-[1.7] font-medium text-justify whitespace-pre-line break-words">
                    {p}
                  </p>
                ))}
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="text-center pt-3 @2xl:pt-4 border-t border-slate-200 mt-3 @2xl:mt-4">
                {company.name ? <p className="font-bold text-(--c-primary-ink) text-sm @2xl:text-base">{company.name}</p> : showMissing && <Missing text="نام شرکت هنوز وارد نشده" />}
                {ready('tagline') && <p className="text-xs @2xl:text-sm font-semibold text-(--c-accent-ink) mt-0.5 @2xl:mt-1">{company.tagline}</p>}
                {miss('tagline') && <Missing text={ITEMS.tagline.missing} className="mt-1.5 text-xs py-1" />}
              </motion.div>

              <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 }} onClick={() => {
                  goTo(3);
                  track('details');
                }} className={`mt-4 @2xl:mt-5 flex items-center justify-center gap-2 text-white px-6 @2xl:px-8 py-2.5 @2xl:py-3 rounded-full font-bold shadow-lg transition-all w-full ${btnPrimary}`}>
                <span className="text-sm @2xl:text-base">{texts.detailsButton}</span>
                <NextIcon className="w-4 h-4 @2xl:w-5 @2xl:h-5" />
              </motion.button>

              <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} onClick={() => goBack(1)} className="mt-3 @2xl:mt-4 text-[13px] @2xl:text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center gap-1 mx-auto w-full">
                <BackIcon className="w-4 h-4" />
                {T.back}
              </motion.button>
            </motion.div>
          )}

          {/* STEP 3: TIME & PLACE */}
          {step >= 3 && (
            <motion.div key="step3" initial={{ opacity: 0, scale: 0.95, y: 50 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -50 }} transition={spring} className="w-full flex flex-col gap-4">
              {(shown('date') || shown('time') || shown('location') || shown('booth')) && (
              <div className="bg-white/90 backdrop-blur-xl p-4 @2xl:p-6 rounded-3xl border border-white/50 shadow-2xl space-y-3 @2xl:space-y-5 text-slate-800">
                {shown('date') && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="flex items-center gap-3 @2xl:gap-4">
                    <div className="bg-(--c-accent)/10 p-2 @2xl:p-3 rounded-2xl text-(--c-accent-ink) shrink-0">
                      <CalendarIcon className="w-5 h-5 @2xl:w-6 @2xl:h-6" />
                    </div>
                    {ready('date') ? <span className="font-bold text-base @2xl:text-lg">{dateText}</span> : miss('date') && <Missing text={ITEMS.date.missing} className="flex-1" />}
                  </motion.div>
                )}

                {shown('time') && (ready('time') || miss('time')) && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="flex items-center gap-3 @2xl:gap-4">
                    <div className="bg-(--c-accent)/10 p-2 @2xl:p-3 rounded-2xl text-(--c-accent-ink) shrink-0">
                      <Clock className="w-5 h-5 @2xl:w-6 @2xl:h-6" />
                    </div>
                    {ready('time') ? <span className="font-bold text-base @2xl:text-lg">{timeText}</span> : <Missing text={ITEMS.time.missing} className="flex-1" />}
                  </motion.div>
                )}

                {shown('location') &&
                  (!ready('location') ? (
                    miss('location') && (
                      <div className="flex items-center gap-3 @2xl:gap-4">
                        <div className="bg-(--c-accent)/10 p-2 @2xl:p-3 rounded-2xl text-(--c-accent-ink) shrink-0">
                          <MapPin className="w-5 h-5 @2xl:w-6 @2xl:h-6" />
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <Missing text={ITEMS.location.missing} />
                          {miss('mapUrl') && <Missing text={ITEMS.mapUrl.missing} className="text-xs py-1" />}
                        </div>
                      </div>
                    )
                  ) : mapUrlShown ? (
                    <motion.a initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }} href={mapUrlShown} target="_blank" rel="noopener noreferrer" onClick={() => track('map')} className="flex items-center gap-3 @2xl:gap-4 hover:text-(--c-accent-ink) transition-colors group">
                      {locationInner}
                    </motion.a>
                  ) : (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }} className="flex items-center gap-3 @2xl:gap-4">
                      {locationInner}
                    </motion.div>
                  ))}

                {ready('booth') && (
                  <motion.button
                    type="button"
                    disabled={!hasMap}
                    onClick={() => {
                      if (!hasMap) return;
                      goTo(4);
                      track('boothMap');
                    }}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 }}
                    className="w-full text-start flex items-center gap-3 @2xl:gap-4 enabled:hover:text-(--c-accent-ink) transition-colors group pt-3 @2xl:pt-4 border-t border-slate-200"
                  >
                    <div className="bg-(--c-accent)/10 p-2 @2xl:p-3 rounded-2xl text-(--c-accent-ink) shrink-0">
                      <Building className="w-5 h-5 @2xl:w-6 @2xl:h-6" />
                    </div>
                    <span className="font-bold text-base @2xl:text-lg leading-tight break-words min-w-0">{event.booth}</span>
                  </motion.button>
                )}
                {miss('booth') && (
                  <div className="flex items-center gap-3 @2xl:gap-4 pt-3 @2xl:pt-4 border-t border-slate-200">
                    <div className="bg-(--c-accent)/10 p-2 @2xl:p-3 rounded-2xl text-(--c-accent-ink) shrink-0">
                      <Building className="w-5 h-5 @2xl:w-6 @2xl:h-6" />
                    </div>
                    <Missing text={ITEMS.booth.missing} className="flex-1" />
                  </div>
                )}
              </div>
              )}

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }} className="flex flex-col gap-2 @2xl:gap-3 mt-1 @2xl:mt-2">
                {miss('boothMap') && <Missing text={ITEMS.boothMap.missing} className="py-3 mb-2" />}
                {config.rsvp.enabled && !ended && (
                  <button
                    onClick={() => !rsvpDone && setRsvpOpen(true)}
                    className={`flex items-center justify-center gap-2 w-full py-3 @2xl:py-4 px-6 rounded-2xl font-black shadow-lg transition-all mb-1 ${rsvpDone ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-white text-(--c-primary-ink) border border-white hover:-translate-y-0.5'}`}
                  >
                    <CircleCheck className="w-5 h-5" />
                    {rsvpDone ? T.rsvpDone : T.rsvp}
                  </button>
                )}
                {hasMap && (
                  <button
                    onClick={() => {
                      goTo(4);
                      track('boothMap');
                    }}
                    className={`flex items-center justify-center gap-2 @2xl:gap-3 w-full text-white py-3 @2xl:py-4 px-6 rounded-2xl font-bold transition-all shadow-lg mb-2 @2xl:mb-3 ${btnPrimary}`}>
                    <Map className="w-5 h-5 @2xl:w-6 @2xl:h-6" />
                    <span className="text-base @2xl:text-lg">{texts.mapButton}</span>
                  </button>
                )}

                {calendarReady && (
                  <div className="flex gap-2 @2xl:gap-3 w-full">
                    <a href={gcalUrl} target="_blank" rel="noopener noreferrer" onClick={() => track('gcal')} className="flex flex-1 flex-col items-center justify-center gap-1.5 @2xl:gap-2 bg-white text-slate-800 py-2 @2xl:py-3 px-2 rounded-2xl font-bold transition-all shadow-lg border border-slate-100 hover:bg-slate-50 transform hover:-translate-y-1">
                      <GoogleIcon />
                      <span className="text-[11px] @2xl:text-sm text-center leading-tight">
                        {T.gcal[0]} <br />
                        {T.gcal[1]}
                      </span>
                    </a>
                    <a href={icsUrl} download="invite.ics" onClick={() => track('ics')} className="flex flex-1 flex-col items-center justify-center gap-1.5 @2xl:gap-2 bg-white text-slate-800 py-2 @2xl:py-3 px-2 rounded-2xl font-bold transition-all shadow-lg border border-slate-100 hover:bg-slate-50 transform hover:-translate-y-1">
                      <AppleIcon />
                      <span className="text-[11px] @2xl:text-sm text-center leading-tight">
                        {T.ics[0]} <br />
                        {T.ics[1]}
                      </span>
                    </a>
                  </div>
                )}

                {showMissing && shown('calendar') && !isFilled(config, 'calendar') && <Missing text={ITEMS.calendar.missing} />}

                {isInApp && calendarReady && (
                  <button
                    onClick={async () => showToast((await copyText(pageUrl())) ? T.copiedOpenBrowser : T.openFromMenu)}
                    className="flex items-center justify-center gap-2 text-[11px] @2xl:text-xs text-white/90 bg-black/40 backdrop-blur rounded-xl py-2 px-3"
                  >
                    <Copy className="w-3.5 h-3.5 shrink-0" />
                    {T.inApp}
                  </button>
                )}

                {shown('share') && (
                  <button onClick={handleShare} className={`mt-1 @2xl:mt-2 flex items-center justify-center gap-2 @2xl:gap-3 w-full text-white py-3 @2xl:py-4 px-6 rounded-2xl font-bold transition-all shadow-lg ${btnPrimary}`}>
                    <Share2 className="w-5 h-5 @2xl:w-6 @2xl:h-6" />
                    <span className="text-base @2xl:text-lg">{texts.shareButton}</span>
                  </button>
                )}

                {rep && (
                  <div className="mt-1 bg-white/95 backdrop-blur-xl rounded-2xl p-3 @2xl:p-4 shadow-lg text-slate-800 border-2 border-(--c-accent)/30">
                    <p className="text-xs font-black text-(--c-accent-ink) mb-2 text-center">{T.yourRep}</p>
                    <div className="flex items-center gap-3 mb-2">
                      {rep.photo ? (
                        <img src={asset(rep.photo)} alt={rep.name} onError={hideOnError} className="w-14 h-14 rounded-full object-cover shrink-0 border-2 border-white shadow" />
                      ) : (
                        <span className="w-14 h-14 rounded-full bg-(--c-btn-primary) text-white flex items-center justify-center text-xl font-black shrink-0">{rep.name.trim().charAt(0) || '؟'}</span>
                      )}
                      <div className="min-w-0">
                        <p className="font-black text-base break-words">{rep.name}</p>
                        {rep.title && <p className="text-xs font-bold text-slate-500 break-words">{rep.title}</p>}
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2">
                      {repContacts.map(c => {
                        const Icon = CONTACT_ICONS[c.kind];
                        return (
                          <a key={c.kind} href={c.href} target={c.kind === 'whatsapp' ? '_blank' : undefined} rel="noopener noreferrer" onClick={() => track('contact')} title={c.label} className="flex flex-col items-center gap-1 w-16 py-2 rounded-xl hover:bg-(--c-accent)/10 transition-colors">
                            <span className="w-10 h-10 rounded-full bg-(--c-accent)/10 text-(--c-accent-ink) flex items-center justify-center">
                              <Icon className="w-5 h-5" />
                            </span>
                            <span className="text-[10px] font-bold text-slate-600">{T.contactLabels[c.kind]}</span>
                          </a>
                        );
                      })}
                    </div>
                    {repVcardUrl && (
                      <a href={repVcardUrl} download={`${config.slug || 'contact'}-${link?.code ?? 'rep'}.vcf`} onClick={() => track('vcard')} className="mt-2 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                        <UserPlus className="w-4 h-4" />
                        {T.saveContact}
                      </a>
                    )}
                  </div>
                )}

                {shown('contact') && contacts.length > 0 && (!rep || showCompanyContact) && (
                  <div className="mt-1 bg-white/90 backdrop-blur-xl rounded-2xl p-3 @2xl:p-4 shadow-lg text-slate-800">
                    <p className="text-xs font-black text-slate-500 mb-2 text-center">{rep ? T.companyContact : T.contact}</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {contacts.map(c => {
                        const Icon = CONTACT_ICONS[c.kind];
                        return (
                          <a
                            key={c.kind}
                            href={c.href}
                            target={c.kind === 'phone' || c.kind === 'email' ? undefined : '_blank'}
                            rel="noopener noreferrer"
                            onClick={() => track('contact')}
                            title={c.label}
                            className="flex flex-col items-center gap-1 w-16 py-2 rounded-xl hover:bg-(--c-accent)/10 transition-colors"
                          >
                            <span className="w-10 h-10 rounded-full bg-(--c-accent)/10 text-(--c-accent-ink) flex items-center justify-center">
                              <Icon className="w-5 h-5" />
                            </span>
                            <span className="text-[10px] font-bold text-slate-600">{T.contactLabels[c.kind]}</span>
                          </a>
                        );
                      })}
                    </div>
                    {vcardUrl && !rep && (
                      <a href={vcardUrl} download={`${config.slug || 'contact'}.vcf`} onClick={() => track('vcard')} className="mt-2 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                        <UserPlus className="w-4 h-4" />
                        {T.saveContact}
                      </a>
                    )}
                  </div>
                )}
                {miss('contact') && <Missing text={ITEMS.contact.missing} />}

                <button onClick={() => goBack(2)} className="mt-2 @2xl:mt-5 text-xs @2xl:text-sm font-semibold text-(--c-fg)/70 hover:text-(--c-fg) transition-colors flex items-center justify-center gap-1 mx-auto">
                  <BackIcon className="w-4 h-4" />
                {T.back}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {embedded ? <AnimatePresence>{mapOverlay}</AnimatePresence> : createPortal(<AnimatePresence>{mapOverlay}</AnimatePresence>, document.body)}

      {/* Footer credits */}
      <AnimatePresence>
        {footer.show && (footer.text || footer.subText) && (step === 1 || step === 3) && (
          <motion.a
            href={footerUrl || undefined}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="relative mt-4 z-10 flex flex-col items-center justify-center cursor-pointer group"
          >
            {footer.text && (
              <div dir="ltr" className="flex items-center gap-1.5 text-(--c-fg)/80 group-hover:text-(--c-fg) transition-colors drop-shadow-md">
                {footerUrl.includes('instagram.com') && <InstagramIcon className="w-3.5 h-3.5 @2xl:w-4 @2xl:h-4" />}
                <p className="text-[9px] @2xl:text-[10px] font-semibold tracking-[0.2em] mt-0.5 uppercase">{footer.text}</p>
              </div>
            )}
            {footer.subText && <p className="text-[10px] @2xl:text-[11px] text-(--c-fg)/60 group-hover:text-(--c-fg)/80 transition-colors font-medium drop-shadow-md mt-1 tracking-wide">{footer.subText}</p>}
          </motion.a>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {rsvpOpen && (
          <RsvpForm
            key="rsvp"
            T={T}
            lang={lang}
            config={config}
            guestName={guestName}
            embedded={embedded}
            onClose={() => setRsvpOpen(false)}
            onSubmit={async data => {
              if (!onRsvp) {
                setRsvpOpen(false);
                showToast(isEn ? 'Preview only — nothing was saved' : 'در پیش‌نمایش ثبت نمی‌شود');
                return;
              }
              await onRsvp(data);
              localStorage.setItem(rsvpKey, '1');
              setRsvpDone(true);
              setRsvpOpen(false);
              showToast(T.thanks);
            }}
          />
        )}
        {toast && (
          <motion.div dir="auto" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className={`${embedded ? 'absolute' : 'fixed'} bottom-6 left-1/2 -translate-x-1/2 z-[160] bg-slate-900/90 text-white text-sm font-bold px-4 py-2.5 rounded-2xl shadow-xl w-max max-w-[90%] text-center`}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RsvpForm({
  T,
  lang,
  config,
  guestName,
  embedded,
  onClose,
  onSubmit,
}: {
  T: ReturnType<typeof strings>;
  lang: Lang;
  config: InvitationConfig;
  guestName: string;
  embedded: boolean;
  onClose: () => void;
  onSubmit: (d: RsvpData) => Promise<void>;
}) {
  const [name, setName] = useState(guestName);
  const [phone, setPhone] = useState('');
  const [org, setOrg] = useState('');
  const days = eventDays(config.event.startDate, config.event.endDate);
  const [day, setDay] = useState(days.length === 1 ? days[0] : '');
  const [count, setCount] = useState(1);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const input = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-(--c-accent) text-sm';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError(T.nameRequired);
    setBusy(true);
    setError('');
    try {
      await onSubmit({ name: name.trim(), phone: phone.trim(), org: org.trim(), day, count, guest: guestName, lang });
    } catch {
      setError(T.sendFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`${embedded ? 'absolute' : 'fixed'} inset-0 z-[150] bg-black/50 backdrop-blur-sm flex items-end @md:items-center justify-center p-3`}
      onClick={onClose}
    >
      <motion.form
        initial={{ y: 40 }}
        animate={{ y: 0 }}
        onSubmit={submit}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-5 space-y-3 text-slate-800 max-h-[90%] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-black text-lg text-(--c-primary-ink)">{T.rsvpTitle}</h2>
          <button type="button" onClick={onClose} aria-label={T.cancel} className="p-1.5 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <label className="block text-xs font-bold text-slate-600">
          {T.name}
          <input value={name} onChange={e => setName(e.target.value)} maxLength={120} className={`${input} mt-1`} autoComplete="name" />
        </label>
        {config.rsvp.askPhone && (
          <label className="block text-xs font-bold text-slate-600">
            {T.phone} <span className="font-normal text-slate-400">{T.optional}</span>
            <input value={phone} onChange={e => setPhone(e.target.value)} maxLength={40} inputMode="tel" dir="ltr" className={`${input} mt-1`} autoComplete="tel" />
          </label>
        )}
        {config.rsvp.askCompany && (
          <label className="block text-xs font-bold text-slate-600">
            {T.org} <span className="font-normal text-slate-400">{T.optional}</span>
            <input value={org} onChange={e => setOrg(e.target.value)} maxLength={120} className={`${input} mt-1`} autoComplete="organization" />
          </label>
        )}
        <div className="grid grid-cols-[1fr_auto] gap-2">
          {days.length > 1 && (
            <label className="block text-xs font-bold text-slate-600">
              {T.day}
              <select value={day} onChange={e => setDay(e.target.value)} className={`${input} mt-1`}>
                <option value="">{T.notSure}</option>
                {days.map(d => (
                  <option key={d} value={d}>
                    {dayLabel(d, lang)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className={`block text-xs font-bold text-slate-600 ${days.length > 1 ? '' : 'col-span-2'}`}>
            {T.count}
            <input type="number" min={1} max={20} value={count} onChange={e => setCount(Math.min(20, Math.max(1, Number(e.target.value) || 1)))} className={`${input} mt-1 w-24`} />
          </label>
        </div>
        {config.rsvp.note && <p className="text-[11px] text-slate-500 leading-relaxed">{config.rsvp.note}</p>}
        {error && <p className="text-xs font-bold text-rose-600">{error}</p>}
        <button disabled={busy} className="w-full rounded-2xl py-3 font-black text-white animate-gradient-btn disabled:opacity-60">
          {T.submit}
        </button>
      </motion.form>
    </motion.div>
  );
}
