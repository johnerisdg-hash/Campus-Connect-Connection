// Admin > Student Fines: set a fine per event, see who owes what, mark paid / unpaid, export.
import { useEffect, useState } from 'react';
import { useDb } from '../lib/store.jsx';
import { fineEntries, fineTargets, slotKeys, slotLabel, slotShort, closedSlot } from '../lib/attendance.js';
import { fmtRange, money } from '../lib/utils.js';
import { supersedeRequests } from '../lib/orgs.js';

export default function Fines() {
  const { db, update, toast } = useDb();
  const targets = fineTargets(db);
  const [sel, setSel] = useState('');
  const cur = targets.find((t) => t.val === sel) || targets[0];
  const [amt, setAmt] = useState('');
  const [mode, setMode] = useState('scan');
  const [evFilter, setEvFilter] = useState('all');
  const [stFilter, setStFilter] = useState('all');
  const [q, setQ] = useState('');
  const [ticked, setTicked] = useState(() => new Set());

  // the amount form is refilled only when another event is picked, so unsaved typing isn't overwritten
  useEffect(() => {
    if (!cur) return;
    setAmt(cur.obj.fineAmount || '');
    setMode(cur.obj.fineMode || 'scan');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur?.val]);

  const label = (t) => t.obj.title + ' · ' + fmtRange(t.obj) + (t.obj.orgName ? ' · ' + t.obj.orgName : '') + (t.past ? ' (past)' : '');
  const all = fineEntries(db);
  const sum = (st) => all.filter((f) => f.status === st).reduce((n, f) => n + f.amount, 0);
  const rows = all
    .filter((f) => (evFilter === 'all' || 'e' + f.eventId === evFilter || 'h' + f.eventId === evFilter)
      && (stFilter === 'all' || f.status === stFilter)
      && (!q.trim() || f.name.toLowerCase().includes(q.trim().toLowerCase()) || f.sid.toLowerCase().includes(q.trim().toLowerCase())))
    .sort((a, b) => (b.date || '').localeCompare(a.date || '') || a.name.localeCompare(b.name));
  const waiting = db.events.filter((e) => (Number(e.fineAmount) || 0) > 0 && !slotKeys(e).every((k) => closedSlot(e, k))).length;

  const n = cur ? slotKeys(cur.obj).length : 0;
  const a = Number(amt) || 0;
  const hint = !cur ? '' : a > 0
    ? (mode === 'event'
      ? `A student who misses any of the ${n} scans is fined ${money(a)} once.`
      : `${n} scans in total. Each missed scan = ${money(a)}; missing all ${n} = ${money(a * n)}.`)
    : 'Leave at 0 for no fine on this event.';

  const saveFine = () => {
    if (!cur) return toast('Pick an event first');
    const v = Number(amt || 0);
    if (!(v >= 0)) return toast('Enter a valid amount');
    update((d) => {
      const e = cur.past ? d.history.find((h) => 'h' + h.eventId === cur.val) : d.events.find((x) => 'e' + x.id === cur.val);
      e.fineAmount = v;
      e.fineMode = mode;
      supersedeRequests(d, cur.obj.eventId || cur.obj.id);   // the admin's own change wins over any waiting org request
    });
    toast(v > 0 ? 'Fine saved: ' + money(v) + (mode === 'event' ? ' per event' : ' per missed scan') : 'Fine removed for this event');
  };

  const toggle = (key, on) => setTicked((p) => { const s = new Set(p); on ? s.add(key) : s.delete(key); return s; });
  const toggleAll = (on) => setTicked((p) => { const s = new Set(p); rows.forEach((f) => (on ? s.add(f.key) : s.delete(f.key))); return s; });
  const mark = (status) => {
    const valid = new Set(all.map((f) => f.key));
    const keys = [...ticked].filter((k) => valid.has(k));
    if (!keys.length) return toast('Tick at least one student first');
    update((d) => keys.forEach((k) => { if (status === 'paid') d.fines[k] = { status: 'paid', at: Date.now() }; else delete d.fines[k]; }));
    setTicked(new Set());
    toast(keys.length + ' fine' + (keys.length > 1 ? 's' : '') + (status === 'paid' ? ' marked as paid' : ' marked as unpaid'));
  };

  return (
    <section className="screen active" id="a-fines">
      <div className="content">
        <h2>Student Fines</h2>
        <div className="card">
          <b style={{ marginBottom: 6 }}>Set the fine for an event</b>
          <select className="sel" value={cur ? cur.val : ''} onChange={(e) => setSel(e.target.value)}>
            {targets.length ? targets.map((t) => <option key={t.val} value={t.val}>{label(t)}</option>) : <option value="">No events yet</option>}
          </select>
          <label className="field">Fine amount (₱): <input type="number" min="0" step="1" placeholder="0" value={amt} onChange={(e) => setAmt(e.target.value)} /></label>
          <label className="field">Charged:
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="scan">Per missed scan</option>
              <option value="event">Once per event (if any scan is missed)</option>
            </select>
          </label>
          <div className="fs9 hint" style={{ marginBottom: 6 }}>{hint}</div>
          <div className="actions" style={{ justifyContent: 'flex-end', marginTop: 0 }}><button className="btn green" onClick={saveFine}>Save Fine</button></div>
        </div>

        <div className="card">
          <div className="row"><b>Summary</b></div>
          <div style={{ marginTop: 3 }}>
            Total Unpaid: <strong className={sum('unpaid') ? 'miss' : ''}>{money(sum('unpaid'))}</strong> &nbsp;|&nbsp; Total Collected: <strong className="ok">{money(sum('paid'))}</strong><br />
            <span className="fs10 hint">{all.filter((f) => f.status === 'unpaid').length} unpaid · {all.filter((f) => f.status === 'paid').length} paid</span>
          </div>
        </div>

        <div className="card">
          <b style={{ marginBottom: 6 }}>Filter</b>
          <div className="row">
            <select value={evFilter} onChange={(e) => setEvFilter(e.target.value)} className="fs10" style={{ flex: 1 }}>
              <option value="all">All Events</option>
              {targets.map((t) => <option key={t.val} value={t.val}>{label(t)}</option>)}
            </select>
            <select value={stFilter} onChange={(e) => setStFilter(e.target.value)} className="fs10" style={{ flex: 1 }}>
              <option value="all">All Status</option><option value="unpaid">Unpaid</option><option value="paid">Paid</option>
            </select>
          </div>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search student name / ID" className="fs10" style={{ width: '100%', marginTop: 6, padding: 3, border: '1px solid #888' }} />
        </div>

        <div id="fineTable">
          {rows.length ? (
            <table className="att">
              <thead>
                <tr>
                  <th><input type="checkbox" className="fchk" title="Select all" checked={rows.every((f) => ticked.has(f.key))} onChange={(e) => toggleAll(e.target.checked)} /></th>
                  <th>Student</th><th>Event</th><th>Reason</th><th>Amount</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((f) => (
                  <tr key={f.key}>
                    <td><input type="checkbox" className="fchk" checked={ticked.has(f.key)} onChange={(e) => toggle(f.key, e.target.checked)} /></td>
                    <td>{f.name}<br /><span style={{ color: 'var(--mute)' }}>{f.sid}</span></td>
                    <td>{f.title}<br /><span style={{ color: 'var(--mute)' }}>{fmtRange(f.src)}</span></td>
                    <td className="miss">Missed {f.missed.length}<br /><span style={{ fontWeight: 400 }}>{f.missed.map((k) => slotShort(k, f.src)).join(', ')}</span></td>
                    <td>{money(f.amount)}</td>
                    <td><strong className={f.status === 'paid' ? 'ok' : 'miss'}>{f.status === 'paid' ? 'Paid' : 'Unpaid'}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div className="card muted">No fines to show. Set an amount for an event above; students who miss a scan appear here once attendance closes.</div>}
        </div>
        <div className="fs9 hint" style={{ marginTop: 6 }}>
          {waiting ? waiting + ' event(s) with a fine are still open for attendance — their fines appear once attendance closes.' : ''}
        </div>
        <div className="fs9 hint" style={{ marginTop: 6 }}>Tick the students, then press Mark as Paid or Mark as Unpaid.</div>
        <div className="actions">
          <button className="btn green" onClick={() => mark('paid')}>Mark as Paid</button>
          <button className="btn dark" onClick={() => mark('unpaid')}>Mark as Unpaid</button>
          <button className="btn dark" onClick={() => toast('Fine notices need the Email API — to be connected')}>Send Notice</button>
        </div>
      </div>
    </section>
  );
}
