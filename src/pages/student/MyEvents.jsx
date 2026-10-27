import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { Badge, fmt, peso } from '../../ui.jsx';

function status(r, totalSlots) {
  if (r.status === 'cancelled') return { tone: 'gray', text: 'Event cancelled' };
  const n = r.summary.attended;
  if (n === totalSlots) return { tone: 'green', text: 'Complete attendance' };
  if (n > 0) return { tone: 'amber', text: `Incomplete (${n}/${totalSlots} scans)` };
  return r.summary.final ? { tone: 'red', text: 'Absent' } : { tone: 'gray', text: 'No scans yet' };
}

function FineLine({ r }) {
  if (r.status === 'cancelled') return <p className="muted">No fines (event cancelled).</p>;
  if (!r.summary.final) return <p className="muted">Fine: pending until the event ends.</p>;
  if (r.summary.missed === 0) return <p><Badge tone="green">No fine</Badge></p>;
  return (
    <p>
      Fine: <b>{peso(r.summary.fine)}</b> ({r.summary.missed} missed × {peso(r.summary.rate)}){' '}
      {r.fine_record
        ? <Badge tone={r.fine_record.status === 'paid' ? 'green' : 'red'}>{r.fine_record.status}</Badge>
        : <Badge tone="amber">not charged yet</Badge>}
    </p>
  );
}

export default function MyEvents() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { api.get('/my-registrations').then(setData).catch((e) => setError(e.message)); }, []);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p className="muted">Loading…</p>;

  const { registrations, slots, total_fines } = data;
  const totalSlots = Object.keys(slots).length;

  return (
    <>
      <h1>My Attendance</h1>
      {registrations.length > 0 && (
        <div className="card">Total fines from finished events: <b>{peso(total_fines)}</b></div>
      )}
      {registrations.length === 0 && <p className="muted">You haven't registered for any events yet. <Link to="/">Browse events</Link></p>}

      {registrations.map((r) => {
        const st = status(r, totalSlots);
        return (
          <div key={r.id} className="card pass">
            <img className="qr" src={r.qr} alt="Your attendance QR code" />
            <div>
              <h3>{r.title}</h3>
              <p className="muted">📅 {fmt(r.start_at)} · 📍 {r.location}</p>
              <p><Badge tone={st.tone}>{st.text}</Badge></p>
              <table className="mini">
                <tbody>
                  {Object.entries(slots).map(([key, label]) => (
                    <tr key={key}>
                      <td>{label}</td>
                      <td>
                        {r.scans[key]
                          ? <Badge tone="green">✔ {fmt(r.scans[key])}</Badge>
                          : r.summary.final && r.status !== 'cancelled'
                            ? <Badge tone="red">missed</Badge>
                            : <span className="muted">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <FineLine r={r} />
            </div>
          </div>
        );
      })}
    </>
  );
}