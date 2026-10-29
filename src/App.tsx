import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Link, navigate, usePath } from './router';
import { Provider, useStore } from './store';
import Landing, { Footer, PublicHeader } from './Landing';
import Auth from './Auth';
import { Dashboard, navItems, Workspace } from './Workspace';
import Scan from './Scan';
import Collections from './Collections';
import { SettingsPage } from './Settings';
import { InfoPage } from './Information';
import InformationCheck from './InformationCheck';
import Timeline from './Timeline';
import Audit from './Audit';
import Composition from './Composition';
import './App.css';

function Redirect() { const target = location.pathname + location.search; useEffect(() => navigate(`/login?next=${encodeURIComponent(target)}`, true), [target]); return <div className="route-loading" role="status">Opening local demo login…</div>; }
function SettingsRedirect({ section }: { section: string }) { useEffect(() => navigate(`/settings?section=${section}`, true), [section]); return null; }
function Application() {
  const path = usePath(); const { user, toast, notify, storageError } = useStore();
  useEffect(() => {
    const label = navItems.find(i => i.path === path)?.label || ({ '/': 'Point. Scan. Listen.', '/login': 'Log In', '/signup': 'Create Account', '/about': 'About', '/privacy': 'Privacy', '/terms': 'Terms' } as Record<string, string>)[path] || 'Page not found';
    document.title = `${label} · MediRead`;
    requestAnimationFrame(() => document.getElementById('main-content')?.focus({ preventScroll: true }));
    window.speechSynthesis?.cancel();
  }, [path]);
  let content;
  if (path === '/') content = <Landing />;
  else if (path === '/signup' || path === '/login') content = <Auth key={path} signup={path === '/signup'} />;
  else if (path === '/about' || path === '/privacy' || path === '/terms') content = <InfoPage kind={path.slice(1) as 'about' | 'privacy' | 'terms'} />;
  else if (navItems.some(i => i.path === path) || path === '/accessibility' || path === '/help') {
    if (!user) content = <Redirect />;
    else content = <Workspace>{path === '/information-check' ? <InformationCheck /> : path === '/timeline' ? <Timeline /> : path === '/audit' ? <Audit /> : path === '/composition' ? <Composition /> : path === '/dashboard' ? <Dashboard /> : path === '/scan' ? <Scan /> : path === '/history' ? <Collections key="history" /> : path === '/saved' ? <Collections key="saved" saved /> : path === '/accessibility' ? <SettingsRedirect section="accessibility" /> : path === '/help' ? <SettingsRedirect section="help" /> : <SettingsPage />}</Workspace>;
  } else content = <div className="public-shell"><PublicHeader /><main className="not-found" id="main-content" tabIndex={-1}><p className="eyebrow">404 · A SMALL DETOUR</p><h1>Let’s get you back.</h1><p>This page could not be found.</p><Link href={user ? '/dashboard' : '/'} className="btn primary">{user ? 'Go to dashboard' : 'Go home'}</Link></main><Footer /></div>;
  return <><a href="#main-content" className="skip-link">Skip to main content</a>{storageError && <div className="storage-error" role="alert">{storageError}</div>}{content}<div className="toast-region" aria-live="polite" aria-atomic="true">{toast && <div className="toast"><span>{toast}</span><button className="icon-button" aria-label="Dismiss notification" onClick={() => notify('')}><X size={17} /></button></div>}</div></>;
}
export default function App() { return <Provider><Application /></Provider>; }
