// The app's data lives in one `db` object, saved in the browser (localStorage).
// Swap this file for API calls when a real backend (LavaLust, etc.) is ready — the components only use `useDb()`.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { evEnd, todayStr } from './utils.js';
import { recordsFor } from './attendance.js';
import { DEFAULT_COLLEGES } from './colleges.js';

const KEY = 'campusconnect_react_v2'; // v2: colleges + programs (older test data from v1 is not carried over)

function normalize(d) {
  d.events = d.events || [];
  d.regs = d.regs || [];
  d.walkins = d.walkins || []; // walk-ins = attended without registering
  d.students = d.students || []; // registered student accounts: {name, sid, ys, pw}
  d.currentSid = d.currentSid || null; // the student who is logged in on this device
  d.fines = d.fines || {}; // paid fines: {'eventId|studentId': {status:'paid'}}; anything else is unpaid
  d.history = d.history || []; // archived attendance of finished events
  // colleges and their programs (Calapan City Campus). Students pick a program; events can be limited to colleges / programs.
  d.colleges = d.colleges || structuredClone(DEFAULT_COLLEGES);
  d.orgs = d.orgs || []; // organization managers (one per program): {id, program, manager, email, pw}
  d.fineRequests = d.fineRequests || []; // fine changes asked by org managers, waiting for the admin
  d.events.forEach((e) => {
    e.sessions = e.sessions || 'both';
    e.amEnd = e.amEnd || '12:00';
    e.pmEnd = e.pmEnd || '17:00';
    e.endDate = e.endDate || '';
    e.programs = e.programs || []; // colleges / programs the event is open to (codes); empty = everyone
    e.required = !!e.required; // true = all students are required (no registration / capacity)
  });
  d.history.forEach((h) => {
    h.amEnd = h.amEnd || '12:00';
    h.pmEnd = h.pmEnd || '17:00';
  });
  return d;
}

function load() {
  try {
    const r = localStorage.getItem(KEY);
    if (r) return normalize(JSON.parse(r));
  } catch {
    /* ignore */
  }
  return normalize({});
}

// Keep an event's attendance in db.history before the event itself is removed, so students keep their record
// and the admin can still check who missed a scan (for fines).
export function archiveEvent(d, ev, onlyIfScans) {
  // a required event is saved for EVERY student it expected, so those who never showed up still get their "missed" record
  const recs = recordsFor(d, ev).map((r) => ({ sid: r.sid, name: r.name, ys: r.ys, type: r.type, exempt: !!r.exempt, att: { ...(r.att || {}) } }));
  if (!recs.length) return;
  if (onlyIfScans && !recs.some((r) => Object.keys(r.att).length)) return; // e.g. a cancelled event nobody attended
  d.history = d.history.filter((h) => h.eventId !== ev.id);
  d.history.push({
    eventId: ev.id, title: ev.title, date: ev.date, endDate: ev.endDate || '', venue: ev.venue, orgId: ev.orgId || null, orgName: ev.orgName || '',
    required: !!ev.required, programs: ev.programs || [], sessions: ev.sessions || 'both', amEnd: ev.amEnd || '12:00', pmEnd: ev.pmEnd || '17:00',
    fineAmount: ev.fineAmount || 0, fineMode: ev.fineMode || 'scan', records: recs,
  });
}

export const dropFines = (d, eventId) =>
  Object.keys(d.fines).filter((k) => k.startsWith(eventId + '|')).forEach((k) => delete d.fines[k]);

// An event is removed automatically once its LAST day has ended (the day after its end date begins),
// together with its registrations and attendance records. Admins can also delete manually.
function purgeExpired(d) {
  const t = todayStr();
  const gone = d.events.filter((e) => e.date && evEnd(e) < t);
  if (!gone.length) return 0;
  gone.forEach((e) => archiveEvent(d, e, false));
  const ids = new Set(gone.map((e) => e.id));
  d.events = d.events.filter((e) => !ids.has(e.id));
  d.regs = d.regs.filter((r) => !ids.has(r.eventId));
  d.walkins = d.walkins.filter((w) => !ids.has(w.eventId));
  return gone.length;
}

const Ctx = createContext(null);
export const useDb = () => useContext(Ctx);

export function DbProvider({ children }) {
  const ref = useRef(null);
  if (ref.current === null) ref.current = load();
  const [db, setDb] = useState(ref.current);
  const [toastMsg, setToastMsg] = useState('');
  const timer = useRef(0);

  const toast = useCallback((m) => {
    setToastMsg(m);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToastMsg(''), 1800);
  }, []);

  const commit = useCallback((next) => {
    ref.current = next;
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage full / blocked: the app still works for this session */
    }
    setDb(next);
  }, []);

  // update(fn): fn receives a working copy of the db and changes it; whatever fn returns is passed back.
  const update = useCallback((fn) => {
    const next = structuredClone(ref.current);
    const ret = fn(next);
    commit(next);
    return ret;
  }, [commit]);

  const getDb = useCallback(() => ref.current, []);

  // finished events disappear on their own (checked on every change and once a minute, so it also happens at midnight)
  useEffect(() => {
    const run = () => {
      const next = structuredClone(ref.current);
      const n = purgeExpired(next);
      if (n) {
        commit(next);
        toast(n + ' past event' + (n > 1 ? 's' : '') + ' removed automatically');
      }
    };
    run();
    const id = setInterval(run, 60000);
    return () => clearInterval(id);
  }, [db.events, commit, toast]);

  // two tabs of the app (e.g. admin + student) stay in sync
  useEffect(() => {
    const h = (e) => {
      if (e.key === KEY) {
        const d = load();
        ref.current = d;
        setDb(d);
      }
    };
    window.addEventListener('storage', h);
    return () => window.removeEventListener('storage', h);
  }, []);

  return <Ctx.Provider value={{ db, update, getDb, toast, toastMsg }}>{children}</Ctx.Provider>;
}
