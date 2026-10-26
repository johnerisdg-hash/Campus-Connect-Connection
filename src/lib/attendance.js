// Attendance + fines logic (pure functions over the `db` object, no React in here).
import { allPrograms, collegeOfProgram } from './colleges.js';
import { addDays, clock, evEnd, fmtT, money, nDays, todayStr } from './utils.js';

export const SESSIONS = { both: 'Morning & Afternoon', am: 'Morning only', pm: 'Afternoon only' };

// Each event has its own attendance cut-off: morning until amEnd (default 12:00), afternoon until pmEnd (default 17:00).
export const endOf = (ev, ses) => (ses === 'am' ? ev.amEnd || '12:00' : ev.pmEnd || '17:00');

// A scan "slot" = one Time In / Time Out of one session on one day.
// Day 1 keeps plain names (amIn…), later days are d2_amIn…
export const slotKey = (day, ses, dir) => (day > 1 ? 'd' + day + '_' : '') + ses + dir;
export const slotDay = (k) => {
  const m = /^d(\d+)_/.exec(k);
  return m ? +m[1] : 1;
};
export const slotBase = (k) => k.replace(/^d\d+_/, '');
export const slotSes = (k) => slotBase(k).slice(0, 2);

const BASE_LABEL = { amIn: 'Morning In', amOut: 'Morning Out', pmIn: 'Afternoon In', pmOut: 'Afternoon Out' };
const BASE_SHORT = { amIn: 'AM In', amOut: 'AM Out', pmIn: 'PM In', pmOut: 'PM Out' };
export const multi = (ev) => !!ev && nDays(ev) > 1;
export const slotLabel = (k, ev) => (slotDay(k) > 1 || multi(ev) ? 'Day ' + slotDay(k) + ' · ' : '') + BASE_LABEL[slotBase(k)];
export const slotShort = (k, ev) => (slotDay(k) > 1 || multi(ev) ? 'D' + slotDay(k) + ' ' : '') + BASE_SHORT[slotBase(k)];

// every expected scan of an event, in order: day 1 (AM in/out, PM in/out), day 2 …
export const slotKeys = (ev) => {
  const s = ev.sessions || 'both';
  const sess = s === 'am' ? ['am'] : s === 'pm' ? ['pm'] : ['am', 'pm'];
  const out = [];
  for (let d = 1; d <= nDays(ev); d++) {
    sess.forEach((x) => {
      out.push(slotKey(d, x, 'In'));
      out.push(slotKey(d, x, 'Out'));
    });
  }
  return out;
};

export function sessionClosed(ev, ses, day) {
  const t = todayStr();
  if (!ev.date) return false;
  const dd = addDays(ev.date, (day || 1) - 1);
  if (dd < t) return true;
  if (dd > t) return false;
  const [h, m] = endOf(ev, ses).split(':').map(Number);
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes() >= h * 60 + m;
}
export const closedSlot = (ev, k) => sessionClosed(ev, slotSes(k), slotDay(k));

export function attSummary(ev) {
  const s = ev.sessions || 'both';
  const am = 'until ' + fmtT(endOf(ev, 'am'));
  const pm = 'until ' + fmtT(endOf(ev, 'pm'));
  const base = s === 'am' ? `Morning only (${am})` : s === 'pm' ? `Afternoon only (${pm})` : `Morning ${am} · Afternoon ${pm}`;
  return nDays(ev) > 1 ? nDays(ev) + ' days · ' + base : base;
}

// show an event's cut-offs in two boxes: a session the event doesn't have is left empty
export function fillTimes(ev) {
  const s = ev.sessions || 'both';
  return { am: s === 'pm' ? '' : endOf(ev, 'am'), pm: s === 'am' ? '' : endOf(ev, 'pm') };
}

// Morning box filled + afternoon box filled = both sessions; only one filled = that session only.
export function readSessionCfg(am, pm) {
  if (!am && !pm) return { error: 'Fill in at least one: morning until or afternoon until' };
  if (am && pm && am >= pm) return { error: 'Afternoon attendance must end later than the morning attendance' };
  return { cfg: { sessions: am && pm ? 'both' : am ? 'am' : 'pm', amEnd: am || '12:00', pmEnd: pm || '17:00' } };
}

// State of every expected scan for one student at one event: 'done' | 'missed' | 'pending'.
// A scan is MISSED when it is empty and either its part of the day is over, or the student has a LATER scan
// (e.g. no Afternoon In but there is an Afternoon Out). final=true is used for archived events: the day is over.
export function slotStates(ev, att, final) {
  const keys = slotKeys(ev);
  const st = {};
  const closed = (k) => final || closedSlot(ev, k);
  keys.forEach((k, i) => {
    if (att && att[k]) {
      st[k] = 'done';
      return;
    }
    const later = keys.slice(i + 1).some((x) => att && att[x]);
    st[k] = closed(k) || later ? 'missed' : 'pending';
  });
  return st;
}

// The program of a student: chosen at registration (student.program). Older accounts / scanned QR codes only have the
// "BSIT 3-A" text, so the program is read from the start of it, using the known program codes.
export function programOf(db, p) {
  if (p && p.program) return p.program;
  const ys = ((p && p.ys) || '').trim().toUpperCase();
  const list = allPrograms(db).map((x) => x.code).sort((a, b) => b.length - a.length);
  return list.find((x) => ys === x.toUpperCase() || ys.startsWith(x.toUpperCase() + ' ')) || '';
}
export const collegeOf = (db, p) => collegeOfProgram(db, programOf(db, p));

// An event is open to everyone (ev.programs empty) or only to some COLLEGES and/or PROGRAMS, e.g. ['CCS', 'BSTM']:
// a college code covers all the programs under it (CCS = BSIT …), a program code covers just that program.
// A student outside the audience never sees the event, can't register for it and is never fined for it.
export const hasAudience = (ev) => !!(ev.programs && ev.programs.length);
export function inAudience(db, ev, p) {
  if (!hasAudience(ev)) return true;
  const prog = programOf(db, p).toLowerCase();
  const col = collegeOf(db, p).toLowerCase();
  const tokens = ev.programs.map((x) => x.toLowerCase());
  return (!!prog && tokens.includes(prog)) || (!!col && tokens.includes(col));
}
export const audienceText = (ev) => (hasAudience(ev) ? ev.programs.join(', ') : 'All students');

// Two kinds of events:
//   required  (ev.required = true)  mass events such as Students Week: EVERY student of the audience is expected,
//                                    no registration, no capacity.
//   limited   (ev.required = false) competitions / workshops: students register, there is a capacity.
// For a required event everyone with an account (in the audience) is expected; a student whose account was made after
// the event ended is not.
const expectedStudent = (s, ev) => !s.createdAt || s.createdAt <= new Date(evEnd(ev) + 'T23:59:59').getTime();

// the people an event expects (db can also be a working copy `d`): [{sid, name, ys, type, att, exempt}]
// exempt = scanned although outside the event's programs: shown as a walk-in, but never fined.
export function recordsFor(db, ev) {
  const id = ev.id;
  const has = (list, sid) => list.find((x) => x.eventId === id && x.sid === sid);
  if (ev.required) {
    const out = [];
    const seen = new Set();
    db.students.filter((s) => expectedStudent(s, ev) && inAudience(db, ev, s)).forEach((s) => {
      const r = has(db.regs, s.sid) || has(db.walkins, s.sid);
      seen.add(s.sid);
      out.push({ sid: s.sid, name: s.name, ys: s.ys, type: 'Required', att: (r && r.att) || {} });
    });
    // someone who was scanned but is not in the list above: still shown (fined only if they belong to the event's programs)
    db.regs.concat(db.walkins).filter((x) => x.eventId === id && !seen.has(x.sid) && (seen.add(x.sid), true)).forEach((x) => {
      const mine = inAudience(db, ev, x);
      out.push({ sid: x.sid, name: x.name, ys: x.ys, type: mine ? 'Required' : 'Walk-in', exempt: !mine, att: x.att || {} });
    });
    return out;
  }
  return db.regs.filter((r) => r.eventId === id).map((r) => ({ sid: r.sid, name: r.name, ys: r.ys, type: 'Registered', att: r.att || {} }))
    .concat(db.walkins.filter((w) => w.eventId === id).map((w) => ({
      sid: w.sid, name: w.name, ys: w.ys, type: 'Walk-in', exempt: !inAudience(db, ev, w), att: w.att || {},
    })));
}
export const currentRecords = (db, id) => {
  const ev = db.events.find((e) => e.id === id);
  return ev ? recordsFor(db, ev) : [];
};

// the day the scanner records for: today's day of the event (first day before it starts, last day after it ends)
export const defaultDay = (ev) => {
  const t = todayStr();
  const n = nDays(ev);
  if (!ev.date || t <= ev.date) return 1;
  return Math.min(n, Math.round((new Date(t + 'T00:00') - new Date(ev.date + 'T00:00')) / 864e5) + 1);
};
export const evSession = (ev, chosen) => (ev && ev.sessions === 'am' ? 'am' : ev && ev.sessions === 'pm' ? 'pm' : chosen);

// Records one scan for a student at an event. Mutates `d` (a working copy of the db) only when it succeeds.
// Students who didn't register can still be recorded as walk-ins (e.g. Students Week).
// A Time Out is accepted even without a Time In (the missing In is then flagged as missed).
export function recordAttendance(d, { eventId, sid, info, session, dir, day }) {
  const ev = d.events.find((e) => e.id === eventId);
  if (!ev) return { ok: false, msg: 'Pick an event first.' };
  const ses = evSession(ev, session);
  const dd = Math.min(day, nDays(ev));
  const slot = slotKey(dd, ses, dir === 'in' ? 'In' : 'Out');
  const now = Date.now();
  if (sessionClosed(ev, ses, dd)) {
    return {
      ok: false,
      msg: (multi(ev) ? 'Day ' + dd + ' ' : '') + (ses === 'am' ? 'Morning' : 'Afternoon') +
        ' attendance for this event ended at ' + fmtT(endOf(ev, ses)) +
        '. To allow late scans, extend it in Attendance settings above.',
    };
  }
  let rec = d.regs.find((x) => x.eventId === eventId && x.sid === sid) || d.walkins.find((x) => x.eventId === eventId && x.sid === sid);
  let walkin = false;
  if (!rec) {
    const who = info || d.students.find((s) => s.sid === sid);
    if (!who) return { ok: false, msg: 'No student found with ID ' + sid + '. Scan their CampusConnect QR code, or ask them to create an account first.' };
    rec = { eventId, sid, name: who.name, ys: who.ys, att: {} };
    d.walkins.push(rec);
    walkin = true;
  }
  rec.att = rec.att || {};
  if (rec.att[slot]) return { ok: true, msg: rec.name + ' already has ' + slotLabel(slot, ev) + ' recorded at ' + clock(rec.att[slot]) + '.' };
  rec.att[slot] = now;
  let msg = '✓ ' + rec.name + ' (' + sid + ') — ' + slotLabel(slot, ev).toUpperCase() + ' at ' + clock(now);
  if (walkin && !ev.required) msg += ' — walk-in, not registered for this event';
  if (walkin && hasAudience(ev) && !inAudience(d, ev, rec)) msg += ' — not in this event’s program (' + audienceText(ev) + '), so no fine';
  const inKey = slotKey(dd, ses, 'In');
  if (dir === 'out' && !rec.att[inKey]) msg += ' — ⚠ no ' + slotLabel(inKey, ev) + ' on record (counts as missed)';
  return { ok: true, msg };
}

/* ---------------- fines: the organiser sets the amount per event; fines are worked out from missed scans ---------------- */

export const fineLine = (src) => {
  const a = Number(src.fineAmount) || 0;
  return a > 0 ? { amount: money(a), once: src.fineMode === 'event' } : null;
};

// every event (running or finished) that can carry a fine
export function fineTargets(db) {
  return db.events.map((e) => ({ val: 'e' + e.id, obj: e, past: false }))
    .concat(db.history.map((h) => ({ val: 'h' + h.eventId, obj: h, past: true })));
}

// One entry per student with at least one missed scan, for events that have a fine amount.
// A running event only counts once all its attendance sessions have closed (a late scan could still clear a "missed").
export function fineEntries(db) {
  const out = [];
  const add = (src, id, recs, final) => {
    const amt = Number(src.fineAmount) || 0;
    if (amt <= 0) return;
    const keys = slotKeys(src);
    if (!final && !keys.every((k) => closedSlot(src, k))) return;
    recs.forEach((r) => {
      if (r.exempt) return; // outside the event's programs: never fined
      const st = slotStates(src, r.att, final);
      const m = keys.filter((k) => st[k] === 'missed');
      if (!m.length) return;
      const key = id + '|' + r.sid;
      out.push({
        key, eventId: id, title: src.title, date: src.date, src, name: r.name, sid: r.sid, missed: m,
        amount: src.fineMode === 'event' ? amt : amt * m.length,
        status: (db.fines[key] || {}).status === 'paid' ? 'paid' : 'unpaid',
      });
    });
  };
  db.events.forEach((e) => add(e, e.id, currentRecords(db, e.id), false));
  db.history.forEach((h) => add(h, h.eventId, h.records, true));
  return out;
}
