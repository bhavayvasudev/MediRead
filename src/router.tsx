import { useSyncExternalStore } from 'react';
import type { AnchorHTMLAttributes } from 'react';

const subscribe = (listener: () => void) => {
  window.addEventListener('popstate', listener);
  return () => window.removeEventListener('popstate', listener);
};
export function usePath() {
  return useSyncExternalStore(subscribe, () => window.location.pathname);
}
export function useSearch() { return useSyncExternalStore(subscribe, () => window.location.search); }
export function useHash() { return useSyncExternalStore(subscribe, () => window.location.hash); }
export function navigate(to: string, replace = false) {
  const url = new URL(to, location.origin);
  if (url.origin !== location.origin) return;
  history[replace ? 'replaceState' : 'pushState']({}, '', to);
  window.dispatchEvent(new PopStateEvent('popstate'));
  if (url.hash) requestAnimationFrame(() => document.getElementById(url.hash.slice(1))?.scrollIntoView());
  else window.scrollTo(0, 0);
}
export function Link({ href = '/', onClick, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} href={href} onClick={event => {
    onClick?.(event);
    if (!event.defaultPrevented && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0 && !props.target && href.startsWith('/')) {
      event.preventDefault(); navigate(href);
    }
  }} />;
}
