// Admin > Approvals: fine changes asked by org managers. The current fine stays until the admin approves.
import { useDb } from '../lib/store.jsx';
import { decideRequest, findFineTarget, fineText, pendingRequests } from '../lib/orgs.js';

export default function Approvals() {
  const { db, update, toast } = useDb();
  const pend = pendingRequests(db).sort((a, b) => a.at - b.at);
  const done = db.fineRequests.filter((r) => r.status !== 'pending').sort((a, b) => (b.decidedAt || 0) - (a.decidedAt || 0)).slice(0, 10);

  const decide = (r, approve) => {
    update((d) => decideRequest(d, r.id, approve));
    toast(approve ? 'Approved — the new fine is now active' : 'Request rejected — the fine stays as it was');
  };
  const when = (ts) => new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

  return (
    <section className="screen active" id="a-approvals">
      <div className="content">
        <h2>Approvals</h2>
        <div className="fs10 hint" style={{ marginBottom: 8 }}>
          Fine changes asked by organization managers. Nothing changes until you approve.
        </div>
        <div id="approvalList">
          {pend.length ? pend.map((r) => {
            const t = findFineTarget(db, r.eventId);
            return (
              <div className="card" key={r.id}>
                <span className="tag-org">{r.orgName || 'Org'}</span>
                <b>{t ? t.obj.title : r.title}</b>
                Fine change · asked {when(r.at)}
                <div className="pending-box">
                  <div>Now: <strong>{fineText(r.prevAmount, r.prevMode)}</strong></div>
                  <div>Requested: <strong>{fineText(r.amount, r.mode)}</strong></div>
                </div>
                <div className="actions" style={{ justifyContent: 'flex-end', marginTop: 4 }}>
                  <button className="btn green" onClick={() => decide(r, true)}>Approve</button>
                  <button className="btn red" onClick={() => decide(r, false)}>Reject</button>
                </div>
              </div>
            );
          }) : <div className="card muted">Nothing is waiting for approval.</div>}
        </div>

        {done.length > 0 && (
          <>
            <h2 style={{ marginTop: 14 }}>Recent decisions</h2>
            {done.map((r) => (
              <div className="card" key={r.id}>
                <span className="tag-org">{r.orgName || 'Org'}</span>
                <b>{r.title}</b>
                {fineText(r.prevAmount, r.prevMode)} → {fineText(r.amount, r.mode)}<br />
                <strong className={r.status === 'approved' ? 'ok' : 'miss'}>{r.status === 'approved' ? 'Approved' : 'Rejected'}</strong>
                {r.note ? ' · ' + r.note : ''} · {when(r.decidedAt || r.at)}
              </div>
            ))}
          </>
        )}
      </div>
    </section>
  );
}
