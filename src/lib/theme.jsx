// Light / dark mode for every site (student, admin, org manager). Saved in localStorage and shared by all three pages;
// with nothing saved it follows the device setting. Importing this file applies the theme before the first paint.
import { useEffect, useState } from 'react';

const KEY = 'cc_theme';
const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const system = () => (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
export const currentTheme = () => read() || system();
export const applyTheme = (t) => document.documentElement.setAttribute('data-theme', t);
applyTheme(currentTheme());

function setTheme(t) {
  try { localStorage.setItem(KEY, t); } catch { /* private mode: still works for this visit */ }
  applyTheme(t);
  window.dispatchEvent(new Event('cc-theme'));
}

export function ThemeToggle({ withLabel = false }) {
  const [t, setT] = useState(currentTheme());
  useEffect(() => {
    const sync = () => setT(document.documentElement.getAttribute('data-theme') || currentTheme());
    const onStorage = (e) => { if (e.key === KEY) { applyTheme(currentTheme()); sync(); } };
    window.addEventListener('cc-theme', sync);
    window.addEventListener('storage', onStorage);
    return () => { window.removeEventListener('cc-theme', sync); window.removeEventListener('storage', onStorage); };
  }, []);
  const dark = t === 'dark';
  const label = dark ? 'Switch to light mode' : 'Switch to dark mode';
  return (
    <button type="button" className="theme-btn" onClick={() => setTheme(dark ? 'light' : 'dark')} aria-label={label} title={label}>
      {dark ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
      {withLabel && <span>{dark ? 'Light mode' : 'Dark mode'}</span>}
    </button>
  );
}
