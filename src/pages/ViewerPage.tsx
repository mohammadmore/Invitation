import { useEffect, useState } from 'react';
import InvitationView from '../invitation/InvitationView';
import { api, ApiError, trackEvent } from '../lib/api';
import { asset, inviteUrl } from '../lib/paths';
import { hideSplash } from '../lib/splash';
import { CUSTOM_FONT, type InvitationConfig } from '../shared/invitation';

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

export default function ViewerPage({ slug }: { slug: string }) {
  const [config, setConfig] = useState<InvitationConfig | null>(null);
  const [error, setError] = useState<'notfound' | 'network' | null>(null);

  useEffect(() => {
    if (!config) return;
    trackEvent(config.slug, 'view');
    const seenKey = `seen:${config.slug}`;
    if (!localStorage.getItem(seenKey)) {
      localStorage.setItem(seenKey, '1');
      trackEvent(config.slug, 'unique');
    }
    if (guestName) trackEvent(config.slug, 'personal');
  }, [config]);

  useEffect(() => {
    api
      .get(slug)
      .then(setConfig)
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
  return (
    <InvitationView
      config={config}
      shareUrl={inviteUrl(config.slug)}
      guestName={guestName}
      initialLang={initialLang}
      onEvent={type => trackEvent(config.slug, type)}
      onRsvp={async data => {
        await api.rsvp(config.slug, data);
      }}
    />
  );
}
