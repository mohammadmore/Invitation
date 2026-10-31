import { useEffect, useState } from 'react';
import InvitationView from '../invitation/InvitationView';
import { api } from '../lib/api';
import { hideSplash } from '../lib/splash';
import type { InvitationConfig } from '../shared/invitation';

export default function ViewerPage({ slug }: { slug: string }) {
  const [config, setConfig] = useState<InvitationConfig | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get(slug)
      .then(setConfig)
      .catch(e => {
        setError(e.message);
        hideSplash();
      });
  }, [slug]);

  useEffect(() => {
    if (!config) return;
    document.title = `${config.event.badge || 'دعوتنامه'} ${config.event.title} | ${config.company.name}`;
    document.body.style.backgroundColor = config.theme.background;
    // Give logos a moment to load so the first screen appears complete; never wait more than 2.5s.
    const t = window.setTimeout(hideSplash, 2500);
    const images = [config.company.logo, config.event.logo].filter(Boolean);
    Promise.all(
      images.map(
        src =>
          new Promise<void>(res => {
            const img = new Image();
            img.onload = img.onerror = () => res();
            img.src = src;
          }),
      ),
    ).then(hideSplash);
    return () => window.clearTimeout(t);
  }, [config]);

  if (error) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-3 bg-slate-900 text-white p-6 text-center">
        <p className="text-2xl font-black">دعوتنامه پیدا نشد</p>
        <p className="text-slate-400">لینک را بررسی کنید یا با برگزارکننده تماس بگیرید.</p>
      </div>
    );
  }
  if (!config) return null;
  return <InvitationView config={config} />;
}
