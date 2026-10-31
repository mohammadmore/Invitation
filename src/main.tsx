import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './fonts';
import './index.css';
import HomePage from './pages/HomePage';
import BuilderPage from './pages/BuilderPage';
import ViewerPage from './pages/ViewerPage';

function Router() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  let m: RegExpMatchArray | null;
  if ((m = path.match(/^\/i\/([^/]+)$/))) return <ViewerPage slug={decodeURIComponent(m[1])} />;
  if (path === '/builder') return <BuilderPage />;
  if ((m = path.match(/^\/builder\/([^/]+)$/))) return <BuilderPage editSlug={decodeURIComponent(m[1])} />;
  return <HomePage />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router />
  </StrictMode>,
);
