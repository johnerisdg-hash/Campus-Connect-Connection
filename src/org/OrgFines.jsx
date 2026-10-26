// Org manager > Fines: ask to set / change the fine for one of THEIR events. The admin has to approve it.
import { useEffect, useState } from 'react';
import { useDb } from '../lib/store.jsx';
import { fineEntries, slotKeys, slotShort } from '../lib/attendance.js';
import { findFineTarget, fineText, requestFineChange } from '../lib/orgs.js';
import { fmtRange, money } from '../lib/utils.js';

export default function OrgFines({ org }) {
  const { db, update, toast } = useDb();
  const targets = db.events.filter((e) => e.orgId === org.id).map((e) => ({ val: e.id, obj: e, past: false }))
    .concat(db.history.filter((h) => h.orgId === org.id).map((h) => ({ val: h.eventId, obj: h, past: true })));
  const [sel, setSel] = useState('');
  const cur = targets.find((t) => String(t.val) === sel) || targets[0];
  const [amt, setAmt] = useState('');
  const [mode, setMode] = useState('scan');

  const pend = cur && db.fineRequests.find((r) => r.eventId === cur.val && r.status === 'pending');
  // the form is refilled only when another event is picked (or its request changes), so typing isn't overwritten
  useEffect(() => {
    if (!cur) return;
    const src = pend || { amount: cur.obj.fineAmount || 0, mode: cur.obj.fineMode || 'scan' };
    setAmt(src.amount || '');
    setMode(src.mode || 'scan');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur?.val, pend?.id]);

  const label = (t) => t.obj.title + ' · ' + fmtRange(t.obj) + (t.past ? ' (past)' : '');
  const n = cur ? slotKeys(cur.obj).length : 0;
  const a = Number(amt) || 0;
  const hint = !cur ? '' : a > 0
    ? (mode === 'event' ? `A student who misses any of the ${n} scans is fined ${money(a)} once.` : `${n} scans in total. Each missed scan = ${money(a)}; missing all ${n} = ${money(a * n)}.`)
    : 'Set 0 to ask for no fine on this event.';

  const send = () => {
    if (!cur) return toast('Pick an event first');
    const v = Number(amt || 0);
    if (!(v >= 0)) return toast('Enter a valid amount');
    const r = update((d) => requestFineChange(d, { eventId: cur.val, orgId: org.id, amount: v, mode }));
    toast(r.msg);
  };
  const withdraw = () => {
    update((d) => { d.fineRequests = d.fineRequests.filter((r) => !(r.eventId === cur.val && r.status === 'pending')); });
    toast('Request withdrawn');
  };

  const mine = db.fineRequests.filter((r) => r.orgId === org.id && findFineTarget(db, r.eventId) || (r.orgId === org.id && r.status !== 'pending'))
    .sort((a1, b1) => b1.at - a1.at).slice(0, 8);
  const owed = fineEntries(db).filter((f) => f.src.orgId === org.id);

  return (
    <section className="screen active" id="a-fines">
      <div className="content">
        <h2>Fines</h2>
        <div className="card">
          <b style={{ marginBottom: 6 }}>Ask for a fine on an event</b>
          <div className="fs9 hint" style={{ marginBottom: 6 }}>
            Changing a fine needs the <strong>admin’s approval</strong>. The current fine stays in effect until it is approved.
          </div>
          <select className="sel" value={cur ? String(cur.val) : ''} onChange={(e) => setSel(e.target.value)}>
            {targets.length ? targets.map((t) => <option key={t.val} value={t.val}>{label(t)}</option>) : <option value="">No events yet</option>}
          </select>
          {cur && <div style={{ margin: '4px 0' }}>Current fine: <strong>{fineText(cur.obj.fineAmount, cur.obj.fineMode)}</strong></div>}
          {pend && (
            <div className="pending-box">
              ⏳ Waiting for admin approval: <strong>{fineText(pend.amount, pend.mode)}</strong>
              <div style={{ marginTop: 4 }}><button className="btn dark" onClick={withdraw}>Withdraw request</button></div>
            </div>
          )}
          <label className="field">Fine amount (₱): <input type="number" min="0" step="1" placeholder="0" value={amt} onChange={(e) => setAmt(e.target.value)} /></label>
          <label className="field">Charged:
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="scan">Per missed scan</option>
              <option value="event">Once per event (if any scan is missed)</option>
            </select>
          </label>
          <div className="fs9 hint" style={{ marginBottom: 6 }}>{hint}</div>
          <div className="actions" style={{ justifyContent: 'flex-end', marginTop: 0 }}><button className="btn green" onClick={send}>Send for Approval</button></div>
        </div>

        {mine.length > 0 && (
          <div className="card">
            <b style={{ marginBottom: 4 }}>My requests</b>
            {mine.map((r) => (
              <div key={r.id} style={{ borderTop: '1px solid #aaa', padding: '4px 0' }}>
                {r.title}: {fineText(r.prevAmount, r.prevMode)} → <strong>{fineText(r.amount, r.mode)}</strong><br />
                <strong className={r.status === 'approved' ? 'ok' : r.status === 'rejected' ? 'miss' : ''}>
                  {r.status === 'pending' ? 'Waiting for approval' : r.status === 'approved' ? 'Approved' : 'Rejected'}
                </strong>{r.note ? ' · ' + r.note : ''}
              </div>
            ))}
          </div>
        )}

        <h2 style={{ marginTop: 12 }}>Fines owed (my events)</h2>
        {owed.length ? (
          <table className="att">
            <thead><tr><th>Student</th><th>Event</th><th>Reason</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>
              {owed.map((f) => (
                <tr key={f.key}>
                  <td>{f.name}<br /><span style={{ color: 'var(--mute)' }}>{f.sid}</span></td>
                  <td>{f.title}</td>
                  <td className="miss">Missed {f.missed.length}<br /><span style={{ fontWeight: 400 }}>{f.missed.map((k) => slotShort(k, f.src)).join(', ')}</span></td>
                  <td>{money(f.amount)}</td>
                  <td><strong className={f.status === 'paid' ? 'ok' : 'miss'}>{f.status === 'paid' ? 'Paid' : 'Unpaid'}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="card muted">No fines yet. Students who miss a scan appear here once attendance closes (only for events with an approved fine).</div>}
        <div className="fs9 hint" style={{ marginTop: 6 }}>Payments are marked by the admin.</div>
      </div>
    </section>
  );
}
