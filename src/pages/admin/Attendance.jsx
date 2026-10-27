import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api.js';
import { fmt, peso } from '../../ui.jsx';
import { useAuth } from '../../AuthContext.jsx';

export default function Attendance() {
  const { id } = useParams();
  const { user } = useAuth();
  const basePath = user?.role === 'organizer' ? '/org' : '/admin';
  const [data, setData] = useState(null);
  const [ended, setEnded] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [charging, setCharging] = useState(false);

  const load = useCallback(() => {
    api.get(`/admin/events/${id}/attendees`)
      .then((result) => {
        setData(result);
        setEnded(new Date(String(result.event.end_at || '').replace(' ', 'T')).getTime() < Date.now());
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function chargeFines() {
    setCharging(true);
    setError('');
    setMessage('');
    try {
      const result = await api.post(`/admin/events/${id}/charge-fines`);
      setMessage(result.message || 'Fines charged.');
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setCharging(false);
    }
  }

  if (loading && !data) return <div className="admin-state">Loading attendance…</div>;
  if (!data) return <section className="admin-attendance"><p className="admin-state admin-error">{error}</p><Link className="admin-back-link" to={`${basePath}/dashboard`}>Back to dashboard</Link></section>;

  const { event, rows = [], slots = {}, total_fines = 0 } = data;
  const cancelled = event.status === 'cancelled';

  return (
    <section className="admin-attendance">
      <Link className="admin-back-link" to={`${basePath}/dashboard`}>← Back to dashboard</Link>
      <h1 className="admin-page-title">{event.title}</h1>
      <div className="admin-attendance-summary card">
        <p>Registered: <b>{rows.length}</b></p>
        <p>Fine per missed scan: <b>{peso(event.fine_per_session)}</b></p>
        <p>Total fines: <b>{cancelled ? 'No fines (event cancelled)' : ended ? peso(total_fines) : 'Pending until the event ends'}</b></p>
        {user?.role === 'admin' && !cancelled && ended && (
          <button type="button" className="admin-submit admin-charge-button" onClick={chargeFines} disabled={charging}>
            {charging ? 'Charging…' : 'Charge fines'}
          </button>
        )}
      </div>
      {error && <p className="admin-form-message error" role="alert">{error}</p>}
      {message && <p className="admin-form-message success" role="status">{message}</p>}

      {rows.length === 0 ? (
        <div className="admin-state">No one has registered for this event yet.</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table admin-attendance-table">
            <thead>
              <tr>
                <th>Student</th>
                {Object.entries(slots).map(([key, label]) => <th key={key}>{label}</th>)}
                <th>Attended</th>
                <th>Fine</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div className="admin-event-cell-title">{row.full_name}</div>
                    <div className="admin-event-cell-sub">{row.email}</div>
                  </td>
                  {Object.keys(slots).map((key) => (
                    <td key={key}>
                      {row.scans?.[key]
                        ? <span className="admin-attendance-mark">{fmt(row.scans[key])}</span>
                        : row.summary?.final && !cancelled
                          ? <span className="admin-missed-mark">Missed</span>
                          : '—'}
                    </td>
                  ))}
                  <td>{row.summary?.attended || 0}/{Object.keys(slots).length}</td>
                  <td>{cancelled ? '—' : row.summary?.final ? peso(row.summary.fine) : 'Pending'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
