// Admin side: login, shell (top bar + menu), dashboard, events, schedules, registrations.
import { useState } from 'react';
import PickerField from '../components/Picker.jsx';
import { useDb } from '../lib/store.jsx';
import { archiveEvent, dropFines } from '../lib/store.jsx';
import { attSummary, audienceText, fillTimes, readSessionCfg } from '../lib/attendance.js';
import {
  MAX_DAYS, evEnd, fmtD, fmtRange, fmtT, nDays, todayStr,
} from '../lib/utils.js';
import { adminLogin } from '../lib/auth.js';
import Attendance from './Attendance.jsx';
import Fines from './Fines.jsx';
import Organizations from './Organizations.jsx';
import Approvals from './Approvals.jsx';
import { pendingRequests } from '../lib/orgs.js';

const NAV = [
  ['events', 'Events'],
  ['schedules', 'Schedules'],
  ['fines', 'Student Fines'],
  ['approvals', 'Approvals'],
  ['orgs', 'Organizations'],
  ['registrations', 'Registrations'],
  ['attendance', 'Attendance'],
];

export default function AdminApp({ active = true }) {
  const { db, toast } = useDb();
  const [authed, setAuthed] = useState(false);
  const [cred, setCred] = useState({ username: '', email: '', password: '' });
  const setC = (k) => (e) => setCred({ ...cred, [k]: e.target.value });
  const login = async () => {
    const r = await adminLogin(cred);
    if (!r.ok) return toast(r.error);
    setCred({ username: '', email: '', password: '' });
    setAuthed(true);
    go('dashboard');
  };
  const [screen, setScreen] = useState('dashboard');
  const [navOpen, setNavOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [regEvent, setRegEvent] = useState('');

  const go = (s) => {
    setScreen(s);
    setNavOpen(false);
  };
  const pending = db.regs.filter((r) => r.unreg === 'pending').length;
  const waitingFines = pendingRequests(db).length;
  const label = (key, text) =>
    key === 'registrations' && pending ? text + ' (' + pending + ')' : key === 'approvals' && waitingFines ? text + ' (' + waitingFines + ')' : text;
  const current = NAV.find(([k]) => k === screen);

  if (!authed) {
    return (
      <section className="screen active" id="a-login">
        <div className="pad">
          <h3>Admin Login</h3>
          <label className="field">Username: <input value={cred.username} onChange={setC('username')} autoComplete="username" /></label>
          <label className="field">Email: <input type="email" value={cred.email} onChange={setC('email')} autoComplete="email" /></label>
          <label className="field">Password: <input type="password" value={cred.password} onChange={setC('password')} onKeyDown={(e) => e.key === 'Enter' && login()} autoComplete="current-password" /></label>
          <button className="btn dark big login-go" onClick={login}>Login</button>
        </div>
      </section>
    );
  }

  return (
    <div id="adminShell">
      <div className="topbar">
        <div className="avatar" />
        <span>Welcome, Admin</span>
        <button className="logout" onClick={() => { setAuthed(false); setScreen('dashboard'); }}>Log out</button>
      </div>
      <button
        type="button"
        className="nav-toggle"
        aria-expanded={navOpen}
        aria-controls="anav"
        onClick={() => setNavOpen(!navOpen)}
       
      >
        <span>{current ? label(current[0], current[1]) : 'Menu'}</span>
        <span className="chev">{navOpen ? '✕' : '☰'}</span>
      </button>
      <nav id="anav" className={navOpen ? 'open' : ''}>
        {NAV.map(([k, t]) => (
          <button key={k} className={screen === k ? 'active' : ''} onClick={() => go(k)}>{label(k, t)}</button>
        ))}
      </nav>

      {screen === 'dashboard' && <Dashboard />}
      {screen === 'events' && <Events onEdit={(id) => { setEditId(id); go('eventform'); }} onCreate={() => { setEditId(null); go('eventform'); }}
        onViewRegs={(id) => { setRegEvent(String(id)); go('registrations'); }} />}
      {screen === 'eventform' && <EventForm editId={editId} onDone={() => go('events')} />}
      {screen === 'schedules' && <Schedules />}
      {screen === 'fines' && <Fines />}
      {screen === 'approvals' && <Approvals />}
      {screen === 'orgs' && <Organizations />}
      {screen === 'registrations' && <Registrations evId={regEvent} setEvId={setRegEvent} />}
      {screen === 'attendance' && <Attendance active={active} />}
    </div>
  );
}

// the events a signed-in user can see: admin = all, org manager = only their own org's
export const scopeEvents = (db, org) => (org ? db.events.filter((e) => e.orgId === org.id) : db.events);
const published = (db) => db.events.filter((e) => e.status === 'Approved').sort((a, b) => (a.date || '').localeCompare(b.date || ''));
const regCount = (db, id) => db.regs.filter((r) => r.eventId === id).length;

function Dashboard() {
  const { db } = useDb();
  const list = published(db);
  return (
    <section className="screen active" id="a-dashboard">
      <div className="content">
        <h2>Upcoming Events</h2>
        <div id="dashList">
          {list.length ? list.map((e) => (
            <div className="card" key={e.id}>
              <b>{e.title}</b>{fmtRange(e)} · {e.venue}<br />{e.required ? 'Required for all students' : 'Registered: ' + regCount(db, e.id) + ' / ' + e.capacity}
            </div>
          )) : <div className="card muted">No upcoming events.</div>}
        </div>
      </div>
    </section>
  );
}

export function Events({ onEdit, onCreate, onViewRegs, org }) {
  const { db, update, toast } = useDb();
  const events = scopeEvents(db, org);
  const [delPending, setDelPending] = useState(null);

  const setStatus = (id, s) => {
    update((d) => { d.events.find((e) => e.id === id).status = s; });
    toast(s === 'Approved' ? 'Event published to students' : 'Event hidden from students');
  };
  const del = (id) => {
    if (delPending !== id) {
      setDelPending(id);
      toast('Tap Delete again to confirm');
      setTimeout(() => setDelPending((p) => (p === id ? null : p)), 3000);
      return;
    }
    if (org && !events.some((e) => e.id === id)) return toast('You can only delete your own org’s events');
    update((d) => {
      const ev = d.events.find((e) => e.id === id);
      if (ev) archiveEvent(d, ev, true); // keep attendance if anyone was scanned
      d.events = d.events.filter((e) => e.id !== id);
      d.regs = d.regs.filter((r) => r.eventId !== id);
      d.walkins = d.walkins.filter((w) => w.eventId !== id);
      if (!d.history.some((h) => h.eventId === id)) dropFines(d, id); // no saved record left -> its fines go too
      d.fineRequests = d.fineRequests.filter((r) => r.eventId !== id || r.status !== 'pending');
    });
    setDelPending(null);
    toast('Event deleted');
  };

  return (
    <section className="screen active" id="a-events">
      <div className="content">
        <div className="row" style={{ marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>{org ? org.college + ' Events' : 'My Events'}</h2>
          <button className="btn" onClick={onCreate}>Create an Event</button>
        </div>
        <div id="eventList">
          {events.length ? events.map((e) => (
            <div className="card" key={e.id}>
              <span className="tag-org">{e.orgName ? 'Organized by ' + e.orgName : 'Organized by Admin'}</span>
              <b>{e.title}</b>
              {fmtRange(e)} · {e.venue}<br />
              {fmtT(e.start)}{e.end ? ' - ' + fmtT(e.end) : ''} · {e.required ? <strong>Required for all students</strong> : 'Registered: ' + regCount(db, e.id) + ' / ' + e.capacity}<br />
              Attendance: {attSummary(e)}<br />
              Open to: <strong>{audienceText(e)}</strong><br />
              Status: <strong>{e.status === 'Approved' ? 'Published' : 'Hidden'}</strong> ·{' '}
              <span style={{ color: 'var(--mute)' }}>Auto-removes after {fmtD(evEnd(e))}</span>
              {e.description
                ? <div className="desc">{e.description}</div>
                : <div className="desc" style={{ color: 'var(--mute)' }}>No description yet. Tap Edit to add one.</div>}
              <div className="actions">
                {!org && <button className="btn green" onClick={() => setStatus(e.id, 'Approved')}>Approve</button>}
                {!org && <button className="btn red" onClick={() => setStatus(e.id, 'Rejected')}>Reject</button>}
                <button className="btn dark" onClick={() => onEdit(e.id)}>Edit</button>
                <button className="btn red" onClick={() => del(e.id)}>Delete</button>
                <button className="btn dark" onClick={() => toast('Poster upload needs Cloudinary — to be connected')}>Upload Poster</button>
                {!e.required && <button className="btn dark" onClick={() => onViewRegs(e.id)}>View Registrants</button>}
              </div>
            </div>
          )) : <div className="card muted">No events yet. Tap “Create an Event” to post one.</div>}
        </div>
      </div>
    </section>
  );
}

export function EventForm({ editId, onDone, org }) {
  const { db, update, toast } = useDb();
  const existing = scopeEvents(db, org).find((x) => x.id === editId);
  const e0 = existing || { title: '', date: '', endDate: '', venue: '', start: '', end: '', required: true, programs: org ? [org.college] : [], capacity: 15, description: '', sessions: 'both', amEnd: '12:00', pmEnd: '17:00' };
  const t0 = fillTimes(e0);
  const [f, setF] = useState({
    title: e0.title, date: e0.date, endDate: e0.endDate || '', venue: e0.venue, start: e0.start, end: e0.end,
    required: !!e0.required, aud: (e0.programs || []).length ? 'some' : 'all', programs: e0.programs || [], capacity: e0.capacity, description: e0.description || '', am: t0.am, pm: t0.pm,
  });
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));
  // picking every program of a college = the whole college; unticking one program of a whole college keeps the others
  const toggleProgram = (c, code, on) => {
    const codes = c.programs.map((x) => x.code);
    let t = f.programs.includes(c.code) ? f.programs.filter((x) => x !== c.code).concat(codes) : f.programs;
    t = on ? [...new Set([...t, code])] : t.filter((x) => x !== code);
    if (codes.length && codes.every((x) => t.includes(x))) t = t.filter((x) => !codes.includes(x)).concat(c.code);
    set('programs')(t);
  };
  const inp = (k) => ({ value: f[k], onChange: (ev) => set(k)(ev.target.value) });

  const save = () => {
    const ev = {
      title: f.title.trim(), date: f.date, venue: f.venue.trim(), start: f.start, end: f.end,
      required: f.required, programs: f.aud === 'all' ? [] : f.programs, capacity: Math.max(1, parseInt(f.capacity) || 15), description: f.description.trim(),
    };
    if (editId && !existing) return toast('You can only edit your own org’s events');
    if (!ev.title || !ev.date || !ev.venue) return toast('Title, date and venue are required');
    if (f.aud === 'some' && !f.programs.length) return toast('Pick at least one college or program, or choose “All students”');
    if (ev.date < todayStr()) return toast('The event date can’t be in the past');
    ev.endDate = f.endDate === ev.date ? '' : f.endDate;
    if (ev.endDate && ev.endDate < ev.date) return toast('The end date can’t be before the start date');
    if (ev.endDate && nDays(ev) > MAX_DAYS) return toast('An event can last at most ' + MAX_DAYS + ' days');
    const r = readSessionCfg(f.am, f.pm);
    if (r.error) return toast(r.error);
    Object.assign(ev, r.cfg);
    update((d) => {
      if (editId) Object.assign(d.events.find((x) => x.id === editId), ev);
      else d.events.push({ id: Date.now(), status: 'Approved', ...(org ? { orgId: org.id, orgName: org.college } : {}), ...ev });
    });
    toast(editId ? 'Event updated' : 'Event posted — students can now see it');
    onDone();
  };

  return (
    <section className="screen active" id="a-eventform">
      <div className="content">
        <h2>{editId ? 'Edit Event' : 'Create an Event'}</h2>
        <label className="field">Title: <input {...inp('title')} /></label>
        <label className="field">Start date: <PickerField kind="date" min={todayStr()} value={f.date} onChange={set('date')} /></label>
        <label className="field">End date:
          <span className="tbox">
            <PickerField kind="date" min={f.date || todayStr()} value={f.endDate} onChange={set('endDate')} />
            <button type="button" className="btn dark" onClick={() => set('endDate')('')}>Clear</button>
          </span>
        </label>
        <div className="fs9 hint" style={{ margin: '-4px 0 8px' }}>
          For an event that lasts several days (e.g. Students Week), pick its last day. <strong>Leave empty</strong> for a
          one-day event. Attendance is then recorded for every day.
        </div>
        <label className="field">Venue: <input {...inp('venue')} /></label>
        <label className="field">Start: <PickerField kind="time" value={f.start} onChange={set('start')} /></label>
        <label className="field">End: <PickerField kind="time" value={f.end} onChange={set('end')} /></label>
        <label className="field">Open to:
          <select value={f.aud} onChange={(e) => set('aud')(e.target.value)}>
            <option value="all">All students</option>
            <option value="some">Specific colleges / programs only</option>
          </select>
        </label>
        {f.aud === 'some' && (
          <div className="aud">
            {db.colleges.map((c) => {
              const codes = c.programs.map((x) => x.code);
              const whole = f.programs.includes(c.code);
              return (
                <div key={c.code} className="aud-col">
                  <label className="chk">
                    <input type="checkbox" checked={whole}
                      onChange={(e) => set('programs')(e.target.checked ? [...f.programs.filter((t) => !codes.includes(t)), c.code] : f.programs.filter((t) => t !== c.code))} />
                    {' '}<strong>{c.code}</strong> — {c.name}
                  </label>
                  <div className="aud-progs">
                    {c.programs.map((pr) => (
                      <label key={pr.code} className="chk" title={pr.name}>
                        <input type="checkbox" checked={whole || f.programs.includes(pr.code)} onChange={(e) => toggleProgram(c, pr.code, e.target.checked)} /> {pr.code}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="fs9 hint" style={{ margin: '-4px 0 8px' }}>
          Students outside the chosen colleges / programs won’t see this event, can’t register for it, and are never fined for it. A college covers all of its programs.
        </div>
        <label className="field">Who attends:
          <select value={f.required ? 'all' : 'limited'} onChange={(e) => set('required')(e.target.value === 'all')}>
            <option value="all">All students are required</option>
            <option value="limited">Registration with limited slots</option>
          </select>
        </label>
        <div className="fs9 hint" style={{ margin: '-4px 0 8px' }}>
          {f.required
            ? 'For mass events (e.g. Students Week, assemblies). No registration and no capacity — every student is expected to attend, and missed scans can be fined.'
            : 'For events students sign up for (competitions, workshops, activities). Students register until the slots are full.'}
        </div>
        {!f.required && <label className="field">Capacity (slots): <input type="number" min="1" {...inp('capacity')} /></label>}
        <div className="fs11" style={{ fontWeight: 700, margin: '4px 0 2px' }}>Attendance</div>
        <div className="fs9 hint" style={{ marginBottom: 6 }}>
          Set until what time attendance stays open. <strong>Leave a box empty</strong> if the event has no morning (or no afternoon) attendance.
        </div>
        <label className="field">Morning until:
          <span className="tbox">
            <PickerField kind="time" value={f.am} onChange={set('am')} />
            <button type="button" className="btn dark" onClick={() => set('am')('')}>Clear</button>
          </span>
        </label>
        <label className="field">Afternoon until:
          <span className="tbox">
            <PickerField kind="time" value={f.pm} onChange={set('pm')} />
            <button type="button" className="btn dark" onClick={() => set('pm')('')}>Clear</button>
          </span>
        </label>
        <label className="field top">Description:
          <textarea placeholder="What is this event about? Dress code, what to bring, etc." {...inp('description')} />
        </label>
        <div className="actions" style={{ justifyContent: 'flex-end' }}>
          <button className="btn dark" onClick={onDone}>Cancel</button>
          <button className="btn green" onClick={save}>Post Event</button>
        </div>
      </div>
    </section>
  );
}

export function Schedules({ org }) {
  const { db } = useDb();
  const list = [...scopeEvents(db, org)].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  return (
    <section className="screen active" id="a-schedules">
      <div className="content">
        <h2>Schedules</h2>
        <div id="schedList">
          {list.length ? (
            <table>
              <thead><tr><th>Date</th><th>Time</th><th>Event</th><th>Venue</th></tr></thead>
              <tbody>
                {list.map((e) => (
                  <tr key={e.id}>
                    <td>{fmtRange(e)}</td>
                    <td>{fmtT(e.start)}{e.end ? '-' + fmtT(e.end) : ''}</td>
                    <td>{e.title}</td>
                    <td>{e.venue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div className="card muted">No scheduled events.</div>}
        </div>
      </div>
    </section>
  );
}

export function Registrations({ evId, setEvId, org }) {
  const { db, update, toast } = useDb();
  const events = scopeEvents(db, org).filter((e) => !e.required);   // required (all-student) events have no registration
  const sel = events.find((e) => String(e.id) === evId) || events[0];
  const list = sel ? db.regs.filter((r) => r.eventId === sel.id) : [];
  const ids = new Set(events.map((e) => e.id));
  const pend = db.regs.filter((r) => r.unreg === 'pending' && ids.has(r.eventId));   // an org manager approves leavers of their own events

  const approve = (eventId, sid) => {
    const r = db.regs.find((x) => x.eventId === eventId && x.sid === sid);
    if (!r || !ids.has(eventId)) return;
    update((d) => { d.regs = d.regs.filter((x) => !(x.eventId === eventId && x.sid === sid)); });
    toast(r.name + ' has been unregistered');
  };
  const deny = (eventId, sid) => {
    update((d) => { const r = d.regs.find((x) => x.eventId === eventId && x.sid === sid); if (r) r.unreg = 'denied'; });
    toast('Request denied — student stays registered');
  };

  return (
    <section className="screen active" id="a-registrations">
      <div className="content">
        <h2>Registrations</h2>
        {pend.length > 0 && (
          <div className="card">
            <b style={{ marginBottom: 4 }}>Unregister Requests ({pend.length})</b>
            {pend.map((r) => {
              const ev = db.events.find((e) => e.id === r.eventId);
              return (
                <div key={r.eventId + r.sid} style={{ borderTop: '1px solid #aaa', padding: '5px 0' }}>
                  {r.name} ({r.sid}) wants to leave <strong>{ev ? ev.title : 'an event'}</strong>
                  <div className="actions" style={{ marginTop: 4 }}>
                    <button className="btn green" onClick={() => approve(r.eventId, r.sid)}>Approve</button>
                    <button className="btn red" onClick={() => deny(r.eventId, r.sid)}>Deny</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <select className="sel" value={sel ? String(sel.id) : ''} onChange={(e) => setEvId(e.target.value)}>
          {events.length ? events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>) : <option value="">No events with registration</option>}
        </select>
        {!events.length && <div className="card muted">No events need registration. Events marked “All students are required” don’t have one — check them in Attendance.</div>}
        <div id="regTable">
          {list.length ? (
            <table>
              <thead><tr><th>Name</th><th>Student ID</th><th>Program, Year &amp; Section</th><th>Status</th></tr></thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.sid}><td>{r.name}</td><td>{r.sid}</td><td>{r.ys}</td><td>{r.unreg === 'pending' ? 'Unregister requested' : 'Registered'}</td></tr>
                ))}
              </tbody>
            </table>
          ) : <div className="muted">No registrations yet.</div>}
        </div>
      </div>
    </section>
  );
}
