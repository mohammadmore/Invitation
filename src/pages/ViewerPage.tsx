import { useEffect, useState } from 'react';
import InvitationView from '../invitation/InvitationView';
import { api, ApiError, trackEvent } from '../lib/api';
import { asset, inviteUrl, ticketUrl } from '../lib/paths';
import { hideSplash } from '../lib/splash';
import { CUSTOM_FONT, type InvitationConfig } from '../shared/invitation';
import { statKey, type PublicLinkInfo, type PublicTracking } from '../shared/tracking';

const withTimeout = <T,>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<void>(r => window.setTimeout(r, ms))]);

function loadImage(src: string) {
  return new Promise<void>(res => {
    const img = new Image();
    img.onload = img.onerror = () => res();
    img.src = src;
  });
}

const params = new URLSearchParams(window.location.search);
/** Personal link: ?to=Name (kept short and plain-text) */
const guestName = (params.get('to') || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 80);
const initialLang = params.get('lang') === 'en' ? 'en' : 'fa';
const viaShare = params.get('via') === 'share';
const utmParam = [params.get('utm_source'), params.get('utm_campaign')]
  .filter(Boolean)
  .map(v => v!.replace(/[\u0000-\u001f<>]/g, '').slice(0, 40))
  .join(' / ');

function storageGet(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function storageSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode */
  }
}

/**
 * Multi-link attribution. Each visit has a stats key (link code, "_" for the main link,
 * "+ref" when it came from a link a guest shared). The key credited for an RSVP is the
 * first (or last non-main) link this browser arrived through.
 */
function resolveTracking(slug: string, tracking: PublicTracking, link: PublicLinkInfo | null) {
  if (!tracking.enabled) return { current: '', credited: '', utm: '' };
  const current = statKey(link?.code ?? '', viaShare && tracking.referral);
  const attrKey = `attr:${slug}`;
  const stored = storageGet(attrKey);
  if (!stored || (tracking.attribution === 'last' && !current.startsWith('_'))) storageSet(attrKey, current);
  const utm = tracking.utm ? utmParam : '';
  if (utm && !storageGet(`utm:${slug}`)) storageSet(`utm:${slug}`, utm);
  return { current, credited: storageGet(attrKey) || current, utm: utm || storageGet(`utm:${slug}`) || '' };
}

export default function ViewerPage({ slug, code = '' }: { slug: string; code?: string }) {
  const [config, setConfig] = useState<InvitationConfig | null>(null);
  const [link, setLink] = useState<PublicLinkInfo | null>(null);
  const [tracking, setTracking] = useState<PublicTracking | null>(null);
  const [error, setError] = useState<'notfound' | 'network' | null>(null);
  const [dims, setDims] = useState({ current: '', credited: '', utm: '' });

  useEffect(() => {
    if (!config || !tracking) return;
    const d = resolveTracking(config.slug, tracking, link);
    setDims(d);
    const send = (type: string) => trackEvent(config.slug, type, { link: d.current, utm: d.utm });
    send('view');
    if (!storageGet(`seen:${config.slug}`)) {
      storageSet(`seen:${config.slug}`, '1');
      trackEvent(config.slug, 'unique'); // overall unique visitors
    }
    if (d.current && !storageGet(`seen:${config.slug}:${d.current}`)) {
      storageSet(`seen:${config.slug}:${d.current}`, '1');
      send('linkUnique'); // unique visitors of this particular link
    }
    if (guestName) send('personal');
  }, [config, tracking, link]);

  useEffect(() => {
    api
      .get(slug, code)
      .then(r => {
        setLink(r.link);
        setTracking(r.tracking);
        setConfig(r.config);
        // A deactivated/unknown link shows the main invitation; keep the address bar honest.
        if (code && !r.link) history.replaceState(null, '', window.location.pathname.replace(/\/[^/]+\/?$/, '') + window.location.search);
      })
      .catch(e => {
        setError(e instanceof ApiError && e.status === 404 ? 'notfound' : 'network');
        hideSplash();
      });
  }, [slug]);

  useEffect(() => {
    if (!config) return;
    document.title = `${config.event.badge || 'دعوتنامه'} ${config.event.title} | ${config.company.name}`;
    document.body.style.backgroundColor = config.theme.background;
    // Wait (briefly) for the chosen font and the logos so the first screen doesn't "jump".
    const family = config.theme.font === CUSTOM_FONT ? 'InviteCustomFont' : config.theme.font;
    const ready = Promise.all([
      document.fonts?.load(`700 1em "${family}"`, 'دعوت').catch(() => {}),
      document.fonts?.load(`400 1em "${family}"`, 'دعوت').catch(() => {}),
      ...[config.company.logo, config.event.logo, config.media.videoPoster].filter(Boolean).map(p => loadImage(asset(p))),
    ]);
    withTimeout(ready, 2500).then(hideSplash);
  }, [config]);

  if (error) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-3 bg-slate-900 text-white p-6 text-center">
        {error === 'notfound' ? (
          <>
            <p className="text-2xl font-black">دعوتنامه پیدا نشد</p>
            <p className="text-slate-400">لینک را بررسی کنید یا با برگزارکننده تماس بگیرید.</p>
          </>
        ) : (
          <>
            <p className="text-2xl font-black">ارتباط برقرار نشد</p>
            <p className="text-slate-400">اتصال اینترنت را بررسی کنید.</p>
            <button onClick={() => window.location.reload()} className="mt-2 rounded-xl bg-white text-slate-900 font-bold px-5 py-2.5">
              تلاش دوباره
            </button>
          </>
        )}
      </div>
    );
  }
  if (!config) return null;
  const base = link ? `${inviteUrl(config.slug)}/${link.code}` : inviteUrl(config.slug);
  // Links shared by guests keep the rep's link (credit stays with the rep) but are counted as referrals.
  const shareUrl = tracking?.enabled && tracking.referral ? `${base}?via=share` : base;
  return (
    <InvitationView
      config={config}
      shareUrl={shareUrl}
      guestName={guestName}
      initialLang={initialLang}
      link={link}
      repCard={tracking?.repCard ?? true}
      showCompanyContact={tracking?.showCompanyContact ?? true}
      onEvent={type => trackEvent(config.slug, type, { link: dims.current, utm: dims.utm })}
      onRsvp={async data => (await api.rsvp(config.slug, { ...data, link: dims.credited, via: dims.current, utm: dims.utm })).ticket}
      ticketUrlOf={code => ticketUrl(config.slug, code)}
    />
  );
}
