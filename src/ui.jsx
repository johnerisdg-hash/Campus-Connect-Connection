import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
<<<<<<< HEAD
import logo from './assets/msu-logo.png';
=======
>>>>>>> 23078622c8a597b7c7fc68423f55d3b6614e633a

export const HOME = { student: '/', admin: '/admin', organizer: '/org' };
export const LOGIN = { student: '/login', admin: '/admin/login', organizer: '/org/login' };

export const fmt = (s) =>
  s ? new Date(s.replace(' ', 'T')).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—';
export const peso = (n) => '₱' + Number(n || 0).toFixed(2);

const stamp = (s) => s.replace(/[-: ]/g, '').replace(/^(\d{8})(\d{6})$/, '$1T$2');
export const calendarUrl = (ev) =>
  'https://calendar.google.com/calendar/render?action=TEMPLATE' +
  `&text=${encodeURIComponent(ev.title)}&dates=${stamp(ev.start_at)}/${stamp(ev.end_at)}` +
  `&location=${encodeURIComponent(ev.location)}&details=${encodeURIComponent(ev.description || '')}`;

export function Badge({ tone = 'gray', children }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState(document.documentElement.dataset.theme || 'dark');
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('theme', next);
    setTheme(next);
  };
  return (
    <button type="button" className="pill" onClick={toggle}>
      {theme === 'dark' ? '☀ Light mode' : '☾ Dark mode'}
    </button>
  );
}

<<<<<<< HEAD
export function AuthLayout({ children }) {
  return (
    <div className="auth">
      <aside className="auth-hero">
        <div className="hero-brand">
          <img alt="Mindoro State University logo" src={logo} />
          <div>
            <strong>CampusConnect</strong>
            <span>Mindoro State University · Calapan Campus</span>
          </div>
        </div>
        <div className="hero-copy">
          <h1>Every school event,<br />one simple place.</h1>
          <ul>
            <li>Discover events happening on campus</li>
            <li>Register and keep track of your attendance</li>
            <li>Stay connected with your campus community</li>
          </ul>
        </div>
      </aside>
      <main className="auth-main">
        <div className="auth-top"><ThemeToggle /></div>
        <div className="auth-content">{children}</div>
      </main>
    </div>
  );
}

=======
>>>>>>> 23078622c8a597b7c7fc68423f55d3b6614e633a
// Top bar + page area shared by every role (used as a layout route)
export function Shell({ title, links }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const signOut = async () => {
    const to = LOGIN[user.role];
    await logout();
    nav(to);
  };
  return (
    <>
      <header className="topbar">
        <div className="brand">CampusConnect{title && <span className="muted"> · {title}</span>}</div>
        <nav>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}>{l.label}</NavLink>
          ))}
        </nav>
        <div className="grow" />
        <ThemeToggle />
        <span className="muted hide-sm">{user.name}</span>
        <button className="btn ghost" onClick={signOut}>Logout</button>
      </header>
      <main className="container"><Outlet /></main>
    </>
  );
}