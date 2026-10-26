// Admin > Organizations: ONE org manager per COLLEGE (CCS, CBM, CAS, CCJE, CTE …) — a college's manager covers every
// program under it (CCS = BSIT …). Also where the admin edits the colleges and their programs.
import { useState } from 'react';
import { useDb } from '../lib/store.jsx';
import { programOf } from '../lib/attendance.js';
import { codeTaken } from '../lib/colleges.js';
import { MIN_PASSWORD, hashPassword } from '../lib/utils.js';

const EMPTY = { college: '', manager: '', email: '', pw: '' };

export default function Organizations() {
  const { db, getDb, update, toast } = useDb();
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [resetFor, setResetFor] = useState(null);
  const [newPw, setNewPw] = useState('');
  const [delPending, setDelPending] = useState(null);
  const inp = (k) => ({ value: f[k], onChange: (e) => setF({ ...f, [k]: e.target.value }) });

  /* ---------------- manager accounts ---------------- */
  const create = async () => {
    const manager = f.manager.trim();
    const email = f.email.trim().toLowerCase();
    if (!f.college || !manager || !email || !f.pw) return toast('Please fill in all fields');
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast('Enter a valid email address');
    if (f.pw.length < MIN_PASSWORD) return toast('Password must be at least ' + MIN_PASSWORD + ' characters');
    const cur = getDb();
    if (cur.orgs.some((o) => o.college === f.college)) return toast(f.college + ' already has a manager — one manager per college');
    if (cur.orgs.some((o) => o.email.toLowerCase() === email)) return toast('That email is already used by another manager');
    setBusy(true);
    const pw = await hashPassword(f.pw);
    setBusy(false);
    update((d) => { d.orgs.push({ id: Date.now(), college: f.college, manager, email, pw }); });
    toast(f.college + ' manager account created');
    setF(EMPTY);
  };

  const savePw = async (id) => {
    if (newPw.length < MIN_PASSWORD) return toast('Password must be at least ' + MIN_PASSWORD + ' characters');
    const pw = await hashPassword(newPw);
    update((d) => { d.orgs.find((o) => o.id === id).pw = pw; });
    setResetFor(null);
    setNewPw('');
    toast('Password changed');
  };

  const remove = (o) => {
    if (delPending !== o.id) {
      setDelPending(o.id);
      toast('Tap Remove again to confirm');
      setTimeout(() => setDelPending((p) => (p === o.id ? null : p)), 3000);
      return;
    }
    // the org's events stay (the admin manages them from now on); only the manager's access ends
    update((d) => {
      d.orgs = d.orgs.filter((x) => x.id !== o.id);
      d.events.forEach((e) => { if (e.orgId === o.id) delete e.orgId; });
      d.history.forEach((h) => { if (h.orgId === o.id) h.orgId = null; });
      d.fineRequests = d.fineRequests.filter((r) => r.orgId !== o.id || r.status !== 'pending');
    });
    setDelPending(null);
    toast(o.college + ' manager removed');
  };

  /* ---------------- colleges & programs ---------------- */
  const [nc, setNc] = useState({ code: '', name: '' });
  const [np, setNp] = useState({ college: '', code: '', name: '' });
  const usedInEvents = (code) => db.events.some((e) => (e.programs || []).some((x) => x.toLowerCase() === code.toLowerCase()));

  const addCollege = () => {
    const code = nc.code.trim();
    const name = nc.name.trim();
    if (!code || !name) return toast('Type the college code and its full name');
    if (/\s/.test(code)) return toast('The code can’t have spaces, e.g. CCS');
    if (codeTaken(getDb(), code)) return toast(code + ' is already used');
    update((d) => { d.colleges.push({ code, name, programs: [] }); });
    setNc({ code: '', name: '' });
    toast(code + ' added');
  };
  const addProgram = () => {
    const code = np.code.trim();
    const name = np.name.trim();
    if (!np.college) return toast('Pick the college of the program');
    if (!code || !name) return toast('Type the program code and its full name');
    if (/\s/.test(code)) return toast('The code can’t have spaces, e.g. BSIT');
    if (codeTaken(getDb(), code)) return toast(code + ' is already used');
    update((d) => { d.colleges.find((c) => c.code === np.college).programs.push({ code, name }); });
    setNp({ ...np, code: '', name: '' });
    toast(code + ' added to ' + np.college);
  };
  const removeProgram = (c, p) => {
    const used = db.students.some((s) => (programOf(db, s) || '').toLowerCase() === p.code.toLowerCase()) || usedInEvents(p.code);
    if (used) return toast(p.code + ' is still used by a student or an event, so it can’t be removed');
    update((d) => { const col = d.colleges.find((x) => x.code === c.code); col.programs = col.programs.filter((x) => x.code !== p.code); });
    toast(p.code + ' removed');
  };
  const removeCollege = (c) => {
    if (c.programs.length) return toast('Remove the programs of ' + c.code + ' first');
    if (db.orgs.some((o) => o.college === c.code) || usedInEvents(c.code)) return toast(c.code + ' still has a manager or events, so it can’t be removed');
    update((d) => { d.colleges = d.colleges.filter((x) => x.code !== c.code); });
    toast(c.code + ' removed');
  };

  return (
    <section className="screen active" id="a-orgs">
      <div className="content">
        <h2>Organizations</h2>

        <div className="card">
          <b style={{ marginBottom: 6 }}>Colleges &amp; programs <span className="fs9 hint">(Calapan City Campus)</span></b>
          <div className="fs9 hint" style={{ marginBottom: 6 }}>
            Based on the MinSU programs page. Each college has <strong>one</strong> org manager who covers all its programs.
            Students pick their program when they register, and events can be limited to a whole college or to some programs.
          </div>
          <div id="collegeList">
            {db.colleges.map((c) => (
              <div key={c.code} className="aud-col">
                <strong>{c.code}</strong> — {c.name}{' '}
                <button type="button" className="link-btn" style={{ fontSize: 11 }} title={'Remove ' + c.code} onClick={() => removeCollege(c)}>✕</button>
                <div className="aud-progs">
                  {c.programs.length ? c.programs.map((p) => (
                    <span key={p.code} className="tag-org" title={p.name}>{p.code}{' '}
                      <button type="button" className="link-btn" style={{ fontSize: 11 }} title={'Remove ' + p.code} onClick={() => removeProgram(c, p)}>✕</button>
                    </span>
                  )) : <span className="fs9 hint">No programs yet</span>}
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid #aaa', marginTop: 8, paddingTop: 6 }}>
            <div className="fs10" style={{ fontWeight: 700, marginBottom: 4 }}>Add a program</div>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <select value={np.college} onChange={(e) => setNp({ ...np, college: e.target.value })} className="fs10">
                <option value="">College…</option>
                {db.colleges.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
              </select>
              <input value={np.code} onChange={(e) => setNp({ ...np, code: e.target.value })} placeholder="Code, e.g. BSBA" maxLength={12} className="fs10" style={{ width: 110, padding: 4, border: '1px solid #888' }} />
              <input value={np.name} onChange={(e) => setNp({ ...np, name: e.target.value })} placeholder="Full program name" className="fs10" style={{ flex: 1, minWidth: 140, padding: 4, border: '1px solid #888' }} />
              <button className="btn green" onClick={addProgram}>Add</button>
            </div>
            <div className="fs10" style={{ fontWeight: 700, margin: '8px 0 4px' }}>Add a college</div>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <input value={nc.code} onChange={(e) => setNc({ ...nc, code: e.target.value })} placeholder="Code, e.g. COE" maxLength={12} className="fs10" style={{ width: 110, padding: 4, border: '1px solid #888' }} />
              <input value={nc.name} onChange={(e) => setNc({ ...nc, name: e.target.value })} placeholder="Full college name" className="fs10" style={{ flex: 1, minWidth: 140, padding: 4, border: '1px solid #888' }} />
              <button className="btn green" onClick={addCollege}>Add</button>
            </div>
          </div>
        </div>

        <div className="card">
          <b style={{ marginBottom: 6 }}>Add an organization manager</b>
          <div className="fs9 hint" style={{ marginBottom: 6 }}>
            One manager per college (they cover every program of it). A manager can create and edit the events of their own org.
            A change to a fine needs your approval.
          </div>
          <label className="field">College:
            <select value={f.college} onChange={(e) => setF({ ...f, college: e.target.value })}>
              <option value="">Select a college</option>
              {db.colleges.map((c) => {
                const taken = db.orgs.some((o) => o.college === c.code);
                return <option key={c.code} value={c.code} disabled={taken}>{c.code} — {c.name}{taken ? ' (has a manager)' : ''}</option>;
              })}
            </select>
          </label>
          <label className="field">Manager name: <input {...inp('manager')} /></label>
          <label className="field">Email: <input type="email" {...inp('email')} autoComplete="off" /></label>
          <label className="field">Password: <input type="password" {...inp('pw')} autoComplete="new-password" /></label>
          <div className="actions" style={{ justifyContent: 'flex-end', marginTop: 0 }}>
            <button className="btn green" disabled={busy} onClick={create}>Create Account</button>
          </div>
        </div>

        <div id="orgList">
          {db.orgs.length ? db.orgs.map((o) => {
            const n = db.events.filter((e) => e.orgId === o.id).length;
            const col = db.colleges.find((c) => c.code === o.college);
            return (
              <div className="card" key={o.id}>
                <span className="tag-org">{o.college}</span>
                <b>{o.manager}</b>
                {o.email}<br />
                {col ? col.name + ' · ' + (col.programs.map((p) => p.code).join(', ') || 'no programs') : o.college}<br />
                {n} event{n === 1 ? '' : 's'}
                {resetFor === o.id ? (
                  <div className="row" style={{ marginTop: 6 }}>
                    <input type="password" placeholder="New password" value={newPw} onChange={(e) => setNewPw(e.target.value)}
                      style={{ flex: 1, fontSize: 11, padding: 4, border: '1px solid #888' }} autoComplete="new-password" />
                    <button className="btn green" onClick={() => savePw(o.id)}>Save</button>
                    <button className="btn dark" onClick={() => { setResetFor(null); setNewPw(''); }}>Cancel</button>
                  </div>
                ) : (
                  <div className="actions">
                    <button className="btn dark" onClick={() => { setResetFor(o.id); setNewPw(''); }}>Reset Password</button>
                    <button className="btn red" onClick={() => remove(o)}>Remove</button>
                  </div>
                )}
              </div>
            );
          }) : <div className="card muted">No organization managers yet. Add one above.</div>}
        </div>
      </div>
    </section>
  );
}
