import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './fonts';
import './index.css';
import ViewerPage from './pages/ViewerPage';
import { appPath } from './lib/paths';

// Guests only download the invitation viewer; the wizard and home page are separate chunks.
const HomePage = lazy(() => import('./pages/HomePage'));
const BuilderPage = lazy(() => import('./pages/BuilderPage'));
const PreviewPage = lazy(() => import('./pages/PreviewPage'));
const RepReportPage = lazy(() => import('./pages/RepReportPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

function Router() {
  const path = appPath();
  let m: RegExpMatchArray | null;
  if (path === 'builder') return <BuilderPage />;
  if (path === 'settings') return <SettingsPage />;
  if ((m = path.match(/^builder\/([^/]+)$/))) return <BuilderPage recordId={decodeURIComponent(m[1]).toLowerCase()} />;
  if ((m = path.match(/^preview\/([^/]+)$/))) return <PreviewPage id={decodeURIComponent(m[1]).toLowerCase()} />;
  if ((m = path.match(/^rep\/([^/]+)$/))) return <RepReportPage id={decodeURIComponent(m[1]).toLowerCase()} />;
  if ((m = path.match(/^([^/]+)$/))) return <ViewerPage slug={decodeURIComponent(m[1]).toLowerCase()} />;
  if ((m = path.match(/^([^/]+)\/([^/]+)$/))) return <ViewerPage slug={decodeURIComponent(m[1]).toLowerCase()} code={decodeURIComponent(m[2]).toLowerCase()} />;
  return <HomePage />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={null}>
      <Router />
    </Suspense>
  </StrictMode>,
);
