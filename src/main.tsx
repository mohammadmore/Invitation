import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './fonts';
import './index.css';
import ViewerPage from './pages/ViewerPage';
import { appPath } from './lib/paths';

// Guests only download the invitation viewer; the wizard and home page are separate chunks.
const HomePage = lazy(() => import('./pages/HomePage'));
const BuilderPage = lazy(() => import('./pages/BuilderPage'));

function Router() {
  const path = appPath();
  let m: RegExpMatchArray | null;
  if (path === 'builder') return <BuilderPage />;
  if ((m = path.match(/^builder\/([^/]+)$/))) return <BuilderPage editSlug={decodeURIComponent(m[1]).toLowerCase()} />;
  if ((m = path.match(/^([^/]+)$/))) return <ViewerPage slug={decodeURIComponent(m[1]).toLowerCase()} />;
  return <HomePage />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={null}>
      <Router />
    </Suspense>
  </StrictMode>,
);
