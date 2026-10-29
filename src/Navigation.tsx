import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronDown, LogOut, Menu, Settings, X } from 'lucide-react';
import { Link, navigate, useHash, usePath } from './router';
import { useStore } from './store';
import { Brand } from './ui';
import './Navigation.css';

const publicLinks = [
  { href: '/', label: 'Home' }, { href: '/#how-it-works', label: 'How It Works' },
  { href: '/#features', label: 'Features' }, { href: '/about', label: 'About' },
];
const workspaceLinks = [
  { href: '/dashboard', label: 'Dashboard' }, { href: '/scan', label: 'Scan' },
  { href: '/history', label: 'History' }, { href: '/saved', label: 'Saved Medicines' },
];

/** One viewport-level header: authentication never changes its width or alignment. */
export function Navigation({ authenticated = false }: { authenticated?: boolean }) {
  const { user, logout } = useStore();
  const path = usePath();
  const hash = useHash();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState(false);
  const header = useRef<HTMLElement>(null);
  const profileButton = useRef<HTMLButtonElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const close = () => { setOpen(false); setProfile(false); };
    window.addEventListener('popstate', close);
    return () => window.removeEventListener('popstate', close);
  }, []);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) { setOpen(false); setProfile(false); }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (profile) profileButton.current?.focus();
        else if (open) menuButton.current?.focus();
        setOpen(false); setProfile(false);
      }
    };
    document.addEventListener('pointerdown', close); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape); };
  }, [open, profile]);
  const links = authenticated ? workspaceLinks : publicLinks;
  const initials = user?.name.trim().split(/\s+/).map(n => n[0]).slice(0, 2).join('').toUpperCase();
  return <header ref={header} className="capsule-header">
    <Brand />
    <nav id={authenticated ? 'workspace-navigation' : 'public-navigation'} className={`capsule-links ${open ? 'open' : ''}`} aria-label={authenticated ? 'Workspace navigation' : 'Public navigation'}>
      {links.map(item => <Link key={item.href} href={item.href} className={path + hash === item.href ? 'active' : ''} aria-current={path + hash === item.href ? 'page' : undefined} onClick={() => setOpen(false)}>{item.label}</Link>)}
    </nav>
    <div className="capsule-actions">
      {authenticated && user ? <><span className="workspace-demo"><span className="online-dot" />Demo</span><div className="profile-control">
        <button ref={profileButton} className="profile-button" aria-label={`Account menu for ${user.name}`} aria-expanded={profile} aria-controls="profile-menu" onClick={() => { setProfile(!profile); setOpen(false); }}><span className="avatar">{initials}</span><ChevronDown size={15} /></button>
        {profile && <div className="profile-menu" id="profile-menu"><strong>{user.name}</strong><span className="micro">{user.email}</span><Link href="/settings" onClick={() => setProfile(false)}><Settings size={16} />Account Settings</Link><button onClick={() => { logout(); navigate('/login'); }}><LogOut size={16} />Sign Out</button></div>}
      </div></> : <><Link href={user ? '/dashboard' : '/login'} className="login-link">{user ? 'Dashboard' : 'Log In'}</Link><Link href={user ? '/scan' : '/signup'} className="btn primary compact">{user ? 'Start a Scan' : 'Get Started'}<ArrowRight size={16} /></Link></>}
      <button ref={menuButton} className="icon-button capsule-toggle" aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} aria-controls={authenticated ? 'workspace-navigation' : 'public-navigation'} onClick={() => { setOpen(!open); setProfile(false); }}>{open ? <X size={21} /> : <Menu size={21} />}</button>
    </div>
  </header>;
}
