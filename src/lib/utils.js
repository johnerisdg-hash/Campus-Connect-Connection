// Small shared helpers: dates, money, passwords.

export const pad = (n) => String(n).padStart(2, '0');
export const toDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayStr = () => toDateStr(new Date());

export const fmtD = (d) =>
  d ? new Date(d + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBA';

export const fmtT = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return ((h % 12) || 12) + ':' + pad(m) + (h < 12 ? 'am' : 'pm');
};

export const clock = (ts) => new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export const addDays = (s, n) => {
  const d = new Date(s + 'T00:00');
  d.setDate(d.getDate() + n);
  return toDateStr(d);
};

// ----- multi-day events (e.g. Students Week): date = first day, endDate = last day (empty = one-day event) -----
export const MAX_DAYS = 7;
export const evEnd = (ev) => (ev.endDate && ev.endDate > ev.date ? ev.endDate : ev.date);
export const nDays = (ev) =>
  ev.date ? Math.round((new Date(evEnd(ev) + 'T00:00') - new Date(ev.date + 'T00:00')) / 864e5) + 1 : 1;

export const fmtRange = (ev) => {
  if (!ev.date) return 'TBA';
  const e = evEnd(ev);
  if (e === ev.date) return fmtD(ev.date);
  const a = new Date(ev.date + 'T00:00');
  const b = new Date(e + 'T00:00');
  const o = { month: 'short', day: 'numeric' };
  if (a.getFullYear() !== b.getFullYear()) return fmtD(ev.date) + ' – ' + fmtD(e);
  return (
    a.toLocaleDateString('en-US', o) + ' – ' +
    (a.getMonth() === b.getMonth() ? b.getDate() : b.toLocaleDateString('en-US', o)) + ', ' + b.getFullYear()
  );
};

export const money = (n) =>
  '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ----- student account -----
export const SID_RE = /^MCC\d{4}-\d{5}$/; // Student ID template: MCCXXXX-XXXXX (X = number)
export const MIN_PASSWORD = 6;

// Passwords are never stored as typed. NOTE: this app keeps its data in the browser (localStorage), which is
// fine for a prototype, but real accounts need a server/database that does the hashing and checking.
export async function hashPassword(pw) {
  const text = 'campusconnect:' + pw;
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    let h = 5381;
    for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
    return 'x' + h.toString(36);
  }
}
