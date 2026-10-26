// Student side: register once -> log in later with Student ID + password.
// One account per Student ID. Registering is only possible while logged out.
import { useState } from 'react';
import { useDb } from '../lib/store.jsx';
import { ThemeToggle } from '../lib/theme.jsx';
import logo from '../assets/msu-logo.png';
import { attSummary, audienceText, fineEntries, fineLine, inAudience, slotKey, slotKeys, slotShort, slotStates } from '../lib/attendance.js';
import {
  MIN_PASSWORD, SID_RE, clock, fmtRange, fmtT, hashPassword, money, nDays, todayStr,
} from '../lib/utils.js';
import { multi } from '../lib/attendance.js';

export default function StudentApp() {
  const { db, update, toast } = useDb();
  const student = db.students.find((s) => s.sid === db.currentSid) || null;
  const [screen, setScreen] = useState(student ? 'dash' : 'login');
  const [viewId, setViewId] = useState(null);

  // not logged in -> only the login / register screens are reachable
  const view = student ? (['login', 'register'].includes(screen) ? 'dash' : screen) : (screen === 'register' ? 'register' : 'login');
  const go = setScreen;

  const logout = () => {
    update((d) => { d.currentSid = null; });
    go('login');
    toast('Logged out');
  };

  if (!student) {
    return (
      <AuthShell>
        {view === 'register'
          ? <Register onDone={() => go('dash')} onLogin={() => go('login')} />
          : <Login onDone={() => go('dash')} onRegister={() => go('register')} />}
      </AuthShell>
    );
  }

  const tab = view === 'details' ? 'dash' : view;
  return (
    <div className="shell">
      <Sidebar student={student} active={tab} go={go} onLogout={logout} />
      <main className="main">
        {view === 'dash' && (
          <section className="screen active" id="s-dash">
            <Dashboard student={student} onDetails={(id) => { setViewId(id); go('details'); }} />
          </section>
        )}
        {view === 'details' && (
          <section className="screen active" id="s-details">
            <PageHead title="Event details" sub="Everything you need to know before you go." />
            <Details id={viewId} student={student} onBack={() => go('dash')} />
          </section>
        )}
        {view === 'history' && (
          <section className="screen active" id="s-history">
            <PageHead title="My Attendance" sub={student.name + ' · ' + student.sid} />
            <MyAttendance student={student} />
          </section>
        )}
      </main>
      <BottomTabs active={tab} go={go} />
    </div>
  );
}

const TABS = [
  ['dash', 'Dashboard', <path key="a" d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />],
  ['history', 'My Attendance', <g key="b"><rect x="4" y="3" width="16" height="18" rx="2" /><path d="m8.5 12 2.5 2.5 4.5-5" /></g>],
];
const Icon = ({ children }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

// desktop: sticky sidebar (profile + menu).  phones: just a slim header; the menu moves to the bottom tab bar.
function Sidebar({ student, active, go, onLogout }) {
  const { db } = useDb();
  const unpaid = fineEntries(db).filter((f) => f.sid === student.sid && f.status !== 'paid').reduce((n, f) => n + f.amount, 0);
  return (
    <aside className="side">
      <div className="side-brand">
        <img alt="Mindoro State University logo" src={logo} />
        <div><strong>CampusConnect</strong><span>MinSU · Calapan</span></div>
        <ThemeToggle />
      </div>
      <div className="side-profile">
        <div className="avatar lg">{student.name.trim().charAt(0).toUpperCase()}</div>
        <div className="who"><strong>{student.name}</strong><span>{student.sid}</span><span>{student.ys}</span></div>
      </div>
      <div className="side-nav" role="tablist">
        {TABS.map(([k, t, ic]) => (
          <button key={k} className={'sbtn' + (active === k ? ' on' : '')} onClick={() => go(k)}><Icon>{ic}</Icon>{t}</button>
        ))}
      </div>
      {unpaid > 0 && <div className="side-fine"><span>Unpaid fines</span><strong>{money(unpaid)}</strong></div>}
      <button className="logout" onClick={onLogout}>Log out</button>
    </aside>
  );
}

function BottomTabs({ active, go }) {
  return (
    <div className="tabbar">
      {TABS.map(([k, t, ic]) => (
        <button key={k} className={active === k ? 'on' : ''} onClick={() => go(k)}><Icon>{ic}</Icon><span>{t}</span></button>
      ))}
    </div>
  );
}

function PageHead({ title, sub, children }) {
  return (
    <header className="page-head">
      <div><h2>{title}</h2>{sub && <p>{sub}</p>}</div>
      {children}
    </header>
  );
}

function Dashboard({ student, onDetails }) {
  const { db } = useDb();
  const list = published(db).filter((e) => inAudience(db, e, student));
  const mine = list.filter((e) => db.regs.some((r) => r.eventId === e.id && r.sid === student.sid)).length;
  const required = list.filter((e) => e.required).length;
  const first = student.name.trim().split(/\s+/)[0];
  return (
    <>
      <PageHead title={'Hello, ' + first} sub="Here is what is coming up for your program." />
      <div className="stats">
        <div className="stat"><strong>{list.length}</strong><span>Upcoming events</span></div>
        <div className="stat"><strong>{mine}</strong><span>You registered</span></div>
        <div className="stat"><strong>{required}</strong><span>Required for all</span></div>
      </div>
      <h2 className="sec">Upcoming events</h2>
      <EventList student={student} onDetails={onDetails} />
    </>
  );
}

// login / register: brand panel on the left (desktop), form on the right
const AuthShell = ({ children }) => (
  <div className="auth">
    <aside className="auth-hero">
      <div className="hero-brand">
        <img alt="Mindoro State University logo" src={logo} />
        <div><strong>CampusConnect</strong><span>Mindoro State University · Calapan Campus</span></div>
      </div>
      <div className="hero-copy">
        <h1>Every school event,<br />one simple place.</h1>
        <ul>
          <li>See the events meant for your program</li>
          <li>Register — or ask to unregister — in a tap</li>
          <li>Check your Time In / Time Out and any fines</li>
        </ul>
      </div>
    </aside>
    <div className="auth-main">
      <div className="auth-top"><ThemeToggle withLabel /></div>
      {children}
    </div>
  </div>
);

/* ---------------- login / register ---------------- */

function Login({ onDone, onRegister }) {
  const { getDb, update, toast } = useDb();
  const [sid, setSid] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const id = sid.trim().toUpperCase();
    if (!id || !pw) return toast('Enter your Student ID and password');
    setBusy(true);
    const hash = await hashPassword(pw);
    setBusy(false);
    const acc = getDb().students.find((s) => s.sid === id);
    if (!acc || acc.pw !== hash) return toast('Incorrect Student ID or password');
    update((d) => { d.currentSid = id; });
    toast('Welcome, ' + acc.name);
    onDone();
  };

  return (
    <section className="screen active" id="s-login">
      <div className="pad">
        <h3>Student Login</h3>
        <label className="field">Student ID No: <input value={sid} onChange={(e) => setSid(e.target.value)} placeholder="MCCXXXX-XXXXX" maxLength={13} autoComplete="username" /></label>
        <label className="field">Password:
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} autoComplete="current-password" />
        </label>
        <button className="btn dark big login-go" disabled={busy} onClick={submit}>Login</button>
        <div className="auth-alt">No account yet? <button className="link-btn" onClick={onRegister}>Register</button></div>
      </div>
    </section>
  );
}

function Register({ onDone, onLogin }) {
  const { db, getDb, update, toast } = useDb();
  const [f, setF] = useState({ name: '', sid: '', program: '', ys: '', pw: '', pw2: '' });
  const [busy, setBusy] = useState(false);
  const inp = (k) => ({ value: f[k], onChange: (e) => setF({ ...f, [k]: e.target.value }) });

  const submit = async () => {
    const name = f.name.trim();
    const sid = f.sid.trim().toUpperCase();
    const section = f.ys.trim();
    const ys = f.program + ' ' + section; // e.g. "BSIT 3-A"
    if (!name || !sid || !f.program || !section || !f.pw || !f.pw2) return toast('Please fill in all fields');
    if (!SID_RE.test(sid)) return toast('Student ID must follow MCCXXXX-XXXXX (numbers only), e.g. MCC2026-12345');
    if (f.pw.length < MIN_PASSWORD) return toast('Password must be at least ' + MIN_PASSWORD + ' characters');
    if (f.pw !== f.pw2) return toast('Passwords do not match');
    if (getDb().students.some((s) => s.sid === sid)) return toast('That student ID is already registered — please log in');
    setBusy(true);
    const pw = await hashPassword(f.pw);
    setBusy(false);
    update((d) => {
      d.students.push({ name, sid, program: f.program, ys, pw, createdAt: Date.now() });
      d.currentSid = sid;
    });
    onDone();
  };

  return (
    <section className="screen active" id="s-registration">
      <div className="pad">
        <h3>Registration</h3>
        <label className="field">Name: <input {...inp('name')} autoComplete="name" /></label>
        <label className="field">Student ID No: <input {...inp('sid')} placeholder="MCCXXXX-XXXXX" maxLength={13} /></label>
        <div className="fs9 hint" style={{ margin: '-4px 0 8px', textAlign: 'right' }}>Format: MCCXXXX-XXXXX (X = number)</div>
        <label className="field">Program:
          <select value={f.program} onChange={(e) => setF({ ...f, program: e.target.value })}>
            <option value="">Select your program</option>
            {db.colleges.map((c) => (
              <optgroup key={c.code} label={c.code + ' — ' + c.name}>
                {c.programs.map((p) => <option key={p.code} value={p.code}>{p.code} — {p.name}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
        <div className="fs9 hint" style={{ margin: '-4px 0 8px', textAlign: 'right' }}>You will only see — and be fined for — events of your college / program, or events open to all students.</div>
        <label className="field">Year &amp; Section: <input {...inp('ys')} placeholder="e.g. 3-A" maxLength={20} /></label>
        <label className="field">Password: <input type="password" {...inp('pw')} autoComplete="new-password" /></label>
        <div className="fs9 hint" style={{ margin: '-4px 0 8px', textAlign: 'right' }}>At least {MIN_PASSWORD} characters. You'll use it with your Student ID to log in.</div>
        <label className="field">Confirm password: <input type="password" {...inp('pw2')} autoComplete="new-password" /></label>
        <button className="btn dark big login-go" disabled={busy} onClick={submit}>Register</button>
        <div className="auth-alt">Already registered? <button className="link-btn" onClick={onLogin}>Log in</button></div>
      </div>
    </section>
  );
}

/* ---------------- events ---------------- */

const published = (db) => db.events.filter((e) => e.status === 'Approved').sort((a, b) => (a.date || '').localeCompare(b.date || ''));
const regCount = (db, id) => db.regs.filter((r) => r.eventId === id).length;

function RegButton({ e, student }) {
  const { db, update, toast } = useDb();
  const [confirm, setConfirm] = useState(false);
  const mine = db.regs.find((r) => r.eventId === e.id && r.sid === student.sid);

  const register = () => {
    if (e.status !== 'Approved' || !inAudience(db, e, student)) return toast('Event is not available');
    if (regCount(db, e.id) >= e.capacity) return toast('Event is full');
    update((d) => { d.regs.push({ eventId: e.id, sid: student.sid, name: student.name, ys: student.ys, att: {} }); });
    toast('Registered for ' + e.title);
  };
  const requestUnreg = () => {
    if (!confirm) {
      setConfirm(true);
      toast('Tap again to confirm your unregister request');
      setTimeout(() => setConfirm(false), 3000);
      return;
    }
    setConfirm(false);
    update((d) => { d.regs.find((r) => r.eventId === e.id && r.sid === student.sid).unreg = 'pending'; });
    toast('Request sent — waiting for admin approval');
  };

  if (mine) {
    if (mine.unreg === 'pending') {
      return <><span className="tag">Registered ✓</span><button className="btn" disabled>Unregister pending admin approval</button></>;
    }
    const denied = mine.unreg === 'denied';
    return (
      <>
        <span className="tag">Registered ✓{denied ? ' · last request denied' : ''}</span>
        <button className="btn red" onClick={requestUnreg}>{denied ? 'Request Again' : 'Request Unregister'}</button>
      </>
    );
  }
  if (regCount(db, e.id) >= e.capacity) return <button className="btn" disabled>Full</button>;
  return <button className="btn dark" onClick={register}>Register</button>;
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
function DateBadge({ date }) {
  const [, m, d] = (date || '').split('-');
  return <div className="dbadge"><span>{m ? MONTHS[+m - 1] : 'TBA'}</span><strong>{d ? +d : '—'}</strong></div>;
}

function EventList({ student, onDetails }) {
  const { db } = useDb();
  const list = published(db).filter((e) => inAudience(db, e, student)); // events of other programs are not shown
  return (
    <div id="sEventList">
      {list.length ? list.map((e, i) => {
        const n = regCount(db, e.id);
        const pct = e.capacity ? Math.min(100, Math.round((n / e.capacity) * 100)) : 0;
        return (
          <article className={'card ev' + (i === 0 ? ' feat' : '')} key={e.id}>
            <DateBadge date={e.date} />
            <div className="ev-body">
              <div className="ev-tags">
                {i === 0 && <span className="kicker">Next up</span>}
                {e.orgName && <span className="tag-org">{e.orgName}</span>}
              </div>
              <b>{e.title}</b>
              <div className="ev-meta">{fmtRange(e)}{e.venue ? ' · ' + e.venue : ''}</div>
              {e.required
                ? <strong className="req">Required for all students</strong>
                : <div className="meter-wrap"><div className="meter"><i style={{ width: pct + '%' }} /></div><span>{n} / {e.capacity} registered</span></div>}
              <div className="actions ev-actions">
                <button className="btn dark" onClick={() => onDetails(e.id)}>Details</button>
                {!e.required && <RegButton e={e} student={student} />}
              </div>
            </div>
          </article>
        );
      }) : <div className="card muted">No upcoming events yet. Check back soon.</div>}
    </div>
  );
}

function Details({ id, student, onBack }) {
  const { db } = useDb();
  const found = db.events.find((x) => x.id === id);
  const e = found && inAudience(db, found, student) ? found : null;
  if (!e) return <div id="sDetail"><div className="card muted">This event is no longer available.</div><div className="actions"><button className="btn dark" onClick={onBack}>Back</button></div></div>;
  const fine = fineLine(e);
  const fact = (k, v) => <div className="fact"><span>{k}</span><strong>{v}</strong></div>;
  return (
    <div id="sDetail" className="detail">
      <div className="card detail-main">
        <div className="ev-tags">{e.orgName && <span className="tag-org">Organized by {e.orgName}</span>}</div>
        <h3>{e.title}</h3>
        {e.description ? <div className="desc plain">{e.description}</div> : <div className="hint">No description yet.</div>}
        {e.required && <p className="req"><strong>Required for all students — no registration needed. Just attend the event and have your attendance recorded.</strong></p>}
      </div>
      <aside className="card detail-side">
        {fact('Date', fmtRange(e))}
        {fact('Venue', e.venue || 'TBA')}
        {fact('Time', fmtT(e.start) + (e.end ? ' - ' + fmtT(e.end) : ''))}
        {fact('Attendance', attSummary(e))}
        {fine && fact('Fine', fine.amount + (fine.once ? ' (once, if any scan is missed)' : ' per missed scan'))}
        {!e.required && fact('Registered', regCount(db, e.id) + ' / ' + e.capacity)}
        <div className="actions">
          <button className="btn dark" onClick={onBack}>Back</button>
          {!e.required && <RegButton e={e} student={student} />}
        </div>
      </aside>
    </div>
  );
}

/* ---------------- my attendance ---------------- */

// every event the student registered for or attended: events happening now + saved records of finished ones
function myAttendance(db, student) {
  const sid = student.sid;
  const t = todayStr();
  const out = [];
  db.events.forEach((e) => {
    if (!e.date || e.date > t) return; // events that haven't started yet have nothing to show
    const reg = db.regs.find((r) => r.eventId === e.id && r.sid === sid);
    const rec = reg || db.walkins.find((w) => w.eventId === e.id && w.sid === sid);
    if (e.required && !rec && inAudience(db, e, student)) out.push({ ...e, eventId: e.id, type: 'Required', att: {}, final: false }); // required for everyone, even before the first scan
    else if (rec) out.push({ ...e, eventId: e.id, type: e.required && inAudience(db, e, student) ? 'Required' : reg ? 'Registered' : 'Walk-in', att: rec.att || {}, final: false, exempt: !reg && !inAudience(db, e, student) });
  });
  db.history.forEach((h) => {
    const rec = h.records.find((r) => r.sid === sid);
    if (rec) out.push({ ...h, type: rec.type, att: rec.att || {}, final: true, exempt: !!rec.exempt });
  });
  return out.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

function MyAttendance({ student }) {
  const { db } = useDb();
  const list = myAttendance(db, student);
  const fines = fineEntries(db);
  if (!list.length) return <div id="sHistList"><div className="card muted">No attendance records yet. Your Time In / Time Out for each event will show up here.</div></div>;

  return (
    <div id="sHistList">
      {list.map((a) => {
        const keys = slotKeys(a);
        const st = slotStates(a, a.att, a.final);
        const missed = a.exempt ? [] : keys.filter((k) => st[k] === 'missed'); // outside the event's programs: nothing counts as missed
        const cell = (k) => (st[k] === 'done' ? clock(a.att[k]) : st[k] === 'missed' && !a.exempt ? <span className="miss">Missed</span> : '—');
        const parts = [];
        if (a.sessions !== 'pm') parts.push(['Morning', 'am']);
        if (a.sessions !== 'am') parts.push(['Afternoon', 'pm']);
        const f = fines.find((x) => x.key === a.eventId + '|' + student.sid);
        return (
          <div className="card" key={a.eventId}>
            <b>{a.title}</b>{fmtRange(a)} · {a.type}{a.final ? '' : <> · <em>happening today</em></>}
            <table className="att" style={{ marginTop: 6 }}>
              <thead><tr><th></th><th>Time In</th><th>Time Out</th></tr></thead>
              <tbody>
                {[...Array(nDays(a))].map((_, i) => parts.map(([n, p]) => (
                  <tr key={i + p}>
                    <td><strong>{multi(a) ? 'Day ' + (i + 1) + ' · ' : ''}{n}</strong></td>
                    <td>{cell(slotKey(i + 1, p, 'In'))}</td>
                    <td>{cell(slotKey(i + 1, p, 'Out'))}</td>
                  </tr>
                )))}
              </tbody>
            </table>
            {a.exempt && <div className="hint" style={{ marginTop: 6 }}>This event is for {audienceText(a)} only — no fine for you.</div>}
            {missed.length > 0
              ? <div className="miss" style={{ marginTop: 6 }}>⚠ {missed.length} missed: {missed.map((k) => slotShort(k, a)).join(', ')}</div>
              : !a.exempt && keys.every((k) => st[k] === 'done') && <div className="ok" style={{ marginTop: 6 }}>✓ Complete attendance</div>}
            {f && <div style={{ marginTop: 4 }}><strong>Fine:</strong> {money(f.amount)} · <strong className={f.status === 'paid' ? 'ok' : 'miss'}>{f.status === 'paid' ? 'Paid' : 'Unpaid'}</strong></div>}
          </div>
        );
      })}
    </div>
  );
}
