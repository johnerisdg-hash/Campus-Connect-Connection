// Admin > Attendance: settings, QR scanner (camera / image / typed ID) and the attendance table.
import { useEffect, useRef, useState } from 'react';
import PickerField from '../components/Picker.jsx';
import { decodeCanvas, parseStudentQR } from '../components/QR.jsx';
import { useDb } from '../lib/store.jsx';
import {
  attSummary, currentRecords, defaultDay, endOf, evSession, fillTimes, multi, readSessionCfg,
  recordAttendance, sessionClosed, slotKeys, slotLabel, slotSes, slotShort, slotStates,
} from '../lib/attendance.js';
import { SID_RE, addDays, clock, fmtRange, fmtT, nDays } from '../lib/utils.js';

export function AttTable({ ev, recs, final, onlyMissed }) {
  const keys = slotKeys(ev);
  const info = recs.map((r) => {
    const st = slotStates(ev, r.att, final);
    return { r, st, missed: keys.filter((k) => st[k] === 'missed') };
  });
  const withMiss = info.filter((x) => x.missed.length);
  const attended = info.filter((x) => keys.some((k) => x.r.att[k])).length;
  const shown = onlyMissed ? withMiss : info;
  return (
    <>
      <div className="fs10" style={{ margin: '6px 0' }}>
        <strong>{ev.title} · {fmtRange(ev)}</strong> ({attSummary(ev)})<br />
        Attended: <strong>{attended}</strong> of {recs.length} · With missed scans:{' '}
        <strong className={withMiss.length ? 'miss' : ''}>{withMiss.length}</strong>
      </div>
      {!shown.length ? (
        <div className="muted">{onlyMissed ? 'No one has missed a scan.' : 'No students yet.'}</div>
      ) : (
        <table className="att">
          <thead>
            <tr><th>Student</th>{keys.map((k) => <th key={k}>{slotShort(k, ev)}</th>)}</tr>
          </thead>
          <tbody>
            {shown.map((x) => (
              <tr key={x.r.sid}>
                <td>
                  {x.r.name}<br /><span style={{ color: 'var(--mute)' }}>{x.r.sid}</span>
                  {x.r.type === 'Walk-in' && <> · <em>walk-in</em></>}
                  {x.missed.length > 0 && (
                    <><br /><span className="miss">{x.missed.length} missed: {x.missed.map((k) => slotShort(k, ev)).join(', ')}</span></>
                  )}
                </td>
                {keys.map((k) => (
                  <td key={k}>
                    {x.st[k] === 'done' ? clock(x.r.att[k]) : x.st[k] === 'missed' ? <span className="miss">Missed</span> : '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

export default function Attendance({ active, org }) {
  const { db, update, toast } = useDb();
  const [evId, setEvId] = useState('');
  const events = org ? db.events.filter((e) => e.orgId === org.id) : db.events;   // an org manager only handles their own events
  const ev = events.find((e) => String(e.id) === evId) || events[0];

  const [session, setSession] = useState(new Date().getHours() < 12 ? 'am' : 'pm');
  const [dir, setDir] = useState('in');
  const [day, setDay] = useState(1);
  const [am, setAm] = useState('');
  const [pm, setPm] = useState('');
  const [sid, setSid] = useState('');
  const [missedOnly, setMissedOnly] = useState(false);
  const [result, setResult] = useState({ msg: '', ok: true });
  const [scanning, setScanning] = useState(false);

  // when another event is picked: refill the settings boxes and jump to that event's current day
  useEffect(() => {
    if (!ev) return;
    setDay(defaultDay(ev));
    const f = fillTimes(ev);
    setAm(f.am);
    setPm(f.pm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ev?.id]);

  const ses = evSession(ev, session);
  const dayNo = ev ? Math.min(day, nDays(ev)) : 1;

  // ---------- recording ----------
  const ctx = useRef({});
  ctx.current = { ev, session, dir, day: dayNo };
  const show = (msg, ok) => setResult({ msg, ok });

  const record = (studentId, info) => {
    const c = ctx.current;
    const r = update((d) => recordAttendance(d, { eventId: c.ev?.id, sid: studentId, info, session: c.session, dir: c.dir, day: c.day }));
    show(r.msg, r.ok);
    return r.ok;
  };
  const checkIn = () => {
    const id = sid.trim().toUpperCase();
    if (!id) return toast('Enter a student ID');
    if (!SID_RE.test(id)) return show('Student ID must follow MCCXXXX-XXXXX (numbers only).', false);
    if (record(id)) setSid('');
  };

  // ---------- QR scanning (camera or saved QR image) ----------
  const video = useRef(null);
  const stream = useRef(null);
  const timer = useRef(0);
  const last = useRef({ key: '', at: 0 });
  const canvas = useRef(null);
  if (!canvas.current && typeof document !== 'undefined') canvas.current = document.createElement('canvas');

  const handleScan = (text, force) => {
    const c = ctx.current;
    const key = c.session + c.dir + c.day + '|' + text; // ignore the same code being read repeatedly by the camera
    if (!force && key === last.current.key && Date.now() - last.current.at < 4000) return;
    last.current = { key, at: Date.now() };
    const s = parseStudentQR(text);
    if (!s) return show('Invalid QR code — it doesn’t match the CampusConnect student QR template. Attendance was not recorded.', false);
    record(s.sid, { name: s.name, ys: s.ys });
  };
  const handleScanRef = useRef(handleScan);
  handleScanRef.current = handleScan;

  const stopScan = () => {
    clearInterval(timer.current);
    timer.current = 0;
    if (stream.current) stream.current.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
    setScanning(false);
  };
  const toggleScan = async () => {
    if (stream.current) return stopScan();
    if (!ev) return show('Pick an event first.', false);
    if (!window.jsQR) return show('QR reader library could not load. Check your internet connection, or use manual entry.', false);
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const v = video.current;
      v.srcObject = stream.current;
      await v.play();
      setScanning(true);
      show('Point the camera at a student QR code…', true);
      timer.current = setInterval(() => {
        if (!v.videoWidth) return;
        const c = canvas.current;
        c.width = v.videoWidth;
        c.height = v.videoHeight;
        c.getContext('2d').drawImage(v, 0, 0);
        const t = decodeCanvas(c);
        if (t) handleScanRef.current(t);
      }, 250);
    } catch {
      stopScan();
      show('Camera unavailable. Allow camera access, or use “Scan QR Image” / manual entry.', false);
    }
  };
  const scanFile = (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    if (!window.jsQR) return show('QR reader library could not load. Check your internet connection.', false);
    const img = new Image();
    img.onload = () => {
      const c = canvas.current;
      c.width = img.width;
      c.height = img.height;
      c.getContext('2d').drawImage(img, 0, 0);
      const t = decodeCanvas(c);
      if (t) handleScan(t, true);
      else show('No QR code found in that image.', false);
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(f);
  };
  // the camera stops when leaving this page or switching to the student view
  useEffect(() => stopScan, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!active) stopScan(); }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- settings / export ----------
  const saveSettings = () => {
    if (!ev) return toast('Pick an event first');
    const r = readSessionCfg(am, pm);
    if (r.error) return toast(r.error);
    const hide = r.cfg.sessions === 'am' ? 'pm' : r.cfg.sessions === 'pm' ? 'am' : null; // a session being switched off
    const kept = hide ? currentRecords(db, ev.id).filter((x) => Object.keys(x.att).some((k) => slotSes(k) === hide && x.att[k])).length : 0;
    update((d) => Object.assign(d.events.find((e) => e.id === ev.id), r.cfg));
    toast(kept ? 'Saved. ' + kept + ' existing ' + (hide === 'pm' ? 'afternoon' : 'morning') + ' scan record(s) are kept but hidden' : 'Attendance settings saved');
  };

  const mu = multi(ev);
  const state = ev ? (sessionClosed(ev, ses, dayNo) ? ' — CLOSED (ended ' + fmtT(endOf(ev, ses)) + ')' : ' — open until ' + fmtT(endOf(ev, ses))) : '';
  const recs = ev ? currentRecords(db, ev.id) : [];

  return (
    <section className="screen active" id="a-attendance">
      <div className="content">
        <h2>Attendance</h2>
        <select className="sel" value={ev ? String(ev.id) : ''} onChange={(e) => setEvId(e.target.value)}>
          {events.length ? events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>) : <option value="">No events yet</option>}
        </select>

        {ev && (
          <div className="card">
            <b style={{ marginBottom: 6 }}>Attendance settings (this event)</b>
            <div className="fs9 hint" style={{ marginBottom: 6 }}>
              Until what time attendance stays open. <strong>Leave a box empty</strong> for no morning (or no afternoon) attendance.
            </div>
            <label className="field">Morning until:
              <span className="tbox"><PickerField kind="time" value={am} onChange={setAm} /><button type="button" className="btn dark" onClick={() => setAm('')}>Clear</button></span>
            </label>
            <label className="field">Afternoon until:
              <span className="tbox"><PickerField kind="time" value={pm} onChange={setPm} /><button type="button" className="btn dark" onClick={() => setPm('')}>Clear</button></span>
            </label>
            <div className="actions" style={{ justifyContent: 'flex-end', marginTop: 0 }}>
              <button className="btn green" onClick={saveSettings}>Save Settings</button>
            </div>
          </div>
        )}

        <div className="card">
          <b style={{ marginBottom: 6 }}>QR Scanner</b>
          Pick the event, choose the <strong>session</strong> and <strong>Time In / Time Out</strong>, then scan each student's QR code.
          The time is recorded automatically, even for students who didn't register (walk-ins).
          <div className="actions" style={{ margin: '8px 0 0', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, width: 50 }}>Session:</span>
            <button className={'btn' + (ses === 'am' ? ' green' : '')} disabled={!!ev && ev.sessions === 'pm'} onClick={() => setSession('am')}>Morning</button>
            <button className={'btn' + (ses === 'pm' ? ' green' : '')} disabled={!!ev && ev.sessions === 'am'} onClick={() => setSession('pm')}>Afternoon</button>
          </div>
          <div className="actions" style={{ margin: '6px 0 0', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, width: 50 }}>Action:</span>
            <button className={'btn' + (dir === 'in' ? ' green' : '')} onClick={() => setDir('in')}>Time In</button>
            <button className={'btn' + (dir === 'out' ? ' red' : '')} onClick={() => setDir('out')}>Time Out</button>
          </div>
          {mu && (
            <div className="actions" style={{ margin: '6px 0 0', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, width: 50 }}>Day:</span>
              {[...Array(nDays(ev))].map((_, i) => (
                <button key={i} className={'btn' + (dayNo === i + 1 ? ' green' : '')} onClick={() => setDay(i + 1)}>
                  Day {i + 1} · {new Date(addDays(ev.date, i) + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </button>
              ))}
            </div>
          )}
          <div style={{ marginTop: 6, fontWeight: 700 }}>
            Now recording: {mu ? 'Day ' + dayNo + ' · ' : ''}{ses === 'am' ? 'Morning' : 'Afternoon'} · {dir === 'in' ? 'Time In' : 'Time Out'}{state}
          </div>
          <div className="actions" style={{ margin: '6px 0' }}>
            <button className="btn green" onClick={toggleScan}>{scanning ? 'Stop Scan' : 'Start QR Scan'}</button>
            <label className="btn dark" style={{ cursor: 'pointer' }}>Scan QR Image<input type="file" accept="image/*" hidden onChange={scanFile} /></label>
          </div>
          <video id="scanVideo" ref={video} playsInline muted style={{ display: scanning ? 'block' : 'none', width: '100%', maxHeight: 220, background: '#000', objectFit: 'cover' }} />
          <div className="fs11" style={{ marginTop: 6, fontWeight: 700, color: result.ok ? 'var(--g)' : 'var(--red)' }}>{result.msg}</div>
          <div style={{ marginTop: 8, borderTop: '1px solid #aaa', paddingTop: 6 }}>Can't scan? Enter the student ID:</div>
          <div className="row" style={{ marginTop: 4 }}>
            <input value={sid} onChange={(e) => setSid(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && checkIn()} placeholder="MCCXXXX-XXXXX"
              style={{ flex: 1, fontSize: 10, padding: 4, border: '1px solid #888' }} />
            <button className="btn dark" onClick={checkIn}>Record</button>
          </div>
        </div>

        <label className="chk"><input type="checkbox" checked={missedOnly} onChange={(e) => setMissedOnly(e.target.checked)} /> Show only students with missed attendance</label>
        <div id="attTable">
          {!ev ? <div className="muted">No events yet. Create one in the Events tab.</div>
            : recs.length ? <AttTable ev={ev} recs={recs} final={false} onlyMissed={missedOnly} />
              : <div className="muted">No students yet.</div>}
        </div>
      </div>
    </section>
  );
}
