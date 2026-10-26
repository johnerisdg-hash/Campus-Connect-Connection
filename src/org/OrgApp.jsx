// Org manager side: login (email + password), then their own events, schedules, fines, registrations and attendance.
// One manager per program (BSIT, BSEd, CCJE …). Everything is filtered to the manager's own org.
import { useState } from 'react';
import { useDb } from '../lib/store.jsx';
import { orgLogin } from '../lib/auth.js';
import { EventForm, Events, Registrations, Schedules } from '../admin/AdminApp.jsx';
import Attendance from '../admin/Attendance.jsx';
import OrgFines from './OrgFines.jsx';

const NAV = [
  ['events', 'My Events'],
  ['schedules', 'Schedules'],
  ['fines', 'Fines'],
  ['registrations', 'Registrations'],
  ['attendance', 'Attendance'],
];

export default function OrgApp({ active = true }) {
  const { db, getDb, toast } = useDb();
  const [orgId, setOrgId] = useState(null);
  const [cred, setCred] = useState({ email: '', password: '' });
  const [screen, setScreen] = useState('events');
  const [navOpen, setNavOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [regEvent, setRegEvent] = useState('');

  const org = db.orgs.find((o) => o.id === orgId) || null; // removed by the admin while signed in -> signed out
  const go = (s) => { setScreen(s); setNavOpen(false); };

  const login = async () => {
    const r = await orgLogin(getDb().orgs, cred);
    if (!r.ok) return toast(r.error);
    setCred({ email: '', password: '' });
    setOrgId(r.org.id);
    go('events');
  };

  if (!org) {
    return (
      <section className="screen active" id="a-login">
        <div className="pad">
          <h3>Org Manager Login</h3>
          <label className="field">Email: <input type="email" value={cred.email} onChange={(e) => setCred({ ...cred, email: e.target.value })} autoComplete="username" /></label>
          <label className="field">Password:
            <input type="password" value={cred.password} onChange={(e) => setCred({ ...cred, password: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && login()} autoComplete="current-password" />
          </label>
          <button className="btn dark big login-go" onClick={login}>Login</button>
          <div className="auth-alt hint">Accounts are created by the admin — one manager per program.</div>
        </div>
      </section>
    );
  }

  const pending = db.regs.filter((r) => r.unreg === 'pending' && db.events.some((e) => e.id === r.eventId && e.orgId === org.id)).length;
  const label = (key, text) => (key === 'registrations' && pending ? text + ' (' + pending + ')' : text);
  const current = NAV.find(([k]) => k === screen);

  return (
    <div id="orgShell">
      <div className="topbar">
        <div className="avatar" />
        <span>Welcome, {org.manager} · <strong>{org.college}</strong> Manager</span>
        <button className="logout" onClick={() => { setOrgId(null); setScreen('events'); }}>Log out</button>
      </div>
      <button type="button" className="nav-toggle" aria-expanded={navOpen} aria-controls="anav" onClick={() => setNavOpen(!navOpen)}>
        <span>{current ? label(current[0], current[1]) : 'Menu'}</span>
        <span className="chev">{navOpen ? '✕' : '☰'}</span>
      </button>
      <nav id="anav" className={navOpen ? 'open' : ''}>
        {NAV.map(([k, t]) => <button key={k} className={screen === k ? 'active' : ''} onClick={() => go(k)}>{label(k, t)}</button>)}
      </nav>

      {screen === 'events' && <Events org={org} onEdit={(id) => { setEditId(id); go('eventform'); }} onCreate={() => { setEditId(null); go('eventform'); }}
        onViewRegs={(id) => { setRegEvent(String(id)); go('registrations'); }} />}
      {screen === 'eventform' && <EventForm org={org} editId={editId} onDone={() => go('events')} />}
      {screen === 'schedules' && <Schedules org={org} />}
      {screen === 'fines' && <OrgFines org={org} />}
      {screen === 'registrations' && <Registrations org={org} evId={regEvent} setEvId={setRegEvent} />}
      {screen === 'attendance' && <Attendance org={org} active={active} />}
    </div>
  );
}
