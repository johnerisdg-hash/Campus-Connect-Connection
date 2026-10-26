// Organization managers + fine-change approvals (pure functions over the `db` object).
//
// Roles:
//   admin        -> everything; creates the org accounts; approves fine changes
//   org manager  -> ONE per program (BSIT, BSEd, CCJE …). Creates / edits / deletes the events of their own org,
//                   sees their own registrations + attendance. Cannot change a fine by themselves: they send a
//                   request, the current fine stays active until the admin approves it.
import { money } from './utils.js';

export const orgEvents = (db, orgId) => db.events.filter((e) => e.orgId === orgId);

// an event (still running) or an archived one (finished) that can carry a fine
export function findFineTarget(db, eventId) {
  const e = db.events.find((x) => x.id === eventId);
  if (e) return { obj: e, past: false };
  const h = db.history.find((x) => x.eventId === eventId);
  if (h) return { obj: h, past: true };
  return null;
}

export const fineText = (amount, mode) =>
  Number(amount) > 0 ? money(amount) + (mode === 'event' ? ' once per event' : ' per missed scan') : 'No fine';

export const pendingRequests = (db) => db.fineRequests.filter((r) => r.status === 'pending' && findFineTarget(db, r.eventId));

// An org manager asks to change the fine of one of THEIR events. Nothing changes until the admin approves.
export function requestFineChange(d, { eventId, orgId, amount, mode }) {
  const t = findFineTarget(d, eventId);
  if (!t || t.obj.orgId !== orgId) return { ok: false, msg: 'Event not found' };
  const curA = Number(t.obj.fineAmount) || 0;
  const curM = t.obj.fineMode || 'scan';
  const same = amount === curA && (amount === 0 || mode === curM);
  const hadPending = d.fineRequests.some((r) => r.eventId === eventId && r.status === 'pending');
  d.fineRequests = d.fineRequests.filter((r) => !(r.eventId === eventId && r.status === 'pending')); // newest request replaces the old one
  if (same) return { ok: true, msg: hadPending ? 'Pending request withdrawn — it matches the current fine' : 'No change: this is already the current fine' };
  const org = d.orgs.find((o) => o.id === orgId);
  d.fineRequests.push({
    id: Date.now(), eventId, orgId, orgName: org ? org.college : t.obj.orgName || '', title: t.obj.title,
    amount, mode, prevAmount: curA, prevMode: curM, at: Date.now(), status: 'pending',
  });
  return { ok: true, msg: 'Sent to the admin for approval. The current fine stays until it is approved.' };
}

// admin decision on a request (approve = the new fine is applied to the event)
export function decideRequest(d, id, approve) {
  const r = d.fineRequests.find((x) => x.id === id && x.status === 'pending');
  if (!r) return null;
  if (approve) {
    const t = findFineTarget(d, r.eventId);
    if (!t) {
      r.status = 'rejected';
      r.note = 'The event no longer exists';
    } else {
      t.obj.fineAmount = r.amount;
      t.obj.fineMode = r.mode;
      r.status = 'approved';
    }
  } else r.status = 'rejected';
  r.decidedAt = Date.now();
  // keep every pending request + only the 50 most recent decisions
  const decided = d.fineRequests.filter((x) => x.status !== 'pending').sort((a, b) => (b.decidedAt || 0) - (a.decidedAt || 0)).slice(0, 50);
  d.fineRequests = d.fineRequests.filter((x) => x.status === 'pending').concat(decided);
  return r;
}

// the admin changed the fine directly -> any waiting request for that event is no longer needed
export function supersedeRequests(d, eventId) {
  d.fineRequests.forEach((r) => {
    if (r.eventId === eventId && r.status === 'pending') {
      r.status = 'rejected';
      r.note = 'Replaced by the admin';
      r.decidedAt = Date.now();
    }
  });
}
