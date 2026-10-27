import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { fmt } from '../../ui.jsx';
import { useAuth } from '../../AuthContext.jsx';

function statusLabel(raw) {
  const s = String(raw || '').toLowerCase();
  if (s === 'cancelled') return 'cancelled';
  if (s === 'pending') return 'pending';
  if (s === 'approved') return 'approved';
  if (s === 'rejected') return 'rejected';
  return s || 'unknown';
}

export default function AdminDashboard({ basePath = '/admin' }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyEvent, setBusyEvent] = useState(null);

  const loadEvents = useCallback(() => {
    api
      .get('/admin/events')
      .then((d) => setEvents(Array.isArray(d.events) ? d.events : []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  async function changeStatus(event) {
    const action = event.status === 'cancelled' ? 'reopen' : 'cancel';
    const label = action === 'reopen' ? 'reopen' : 'cancel';
    if (!window.confirm(`Are you sure you want to ${label} "${event.title}"?`)) return;

    setBusyEvent(event.id);
    setError('');
    try {
      await api.post(`/admin/events/${event.id}/${action}`);
      loadEvents();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyEvent(null);
    }
  }

  async function reviewEvent(event, status) {
    let note = '';
    if (status === 'rejected') {
      note = window.prompt(`Optional: enter a reason for rejecting "${event.title}".`) || '';
    }

    setBusyEvent(event.id);
    setError('');
    try {
      await api.post(`/admin/events/${event.id}/status`, { status, note });
      setEvents((current) => current.map((item) => (
        String(item.id) === String(event.id) ? { ...item, status } : item
      )));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyEvent(null);
    }
  }

  const rows = useMemo(
    () =>
      events.map((event) => ({
        ...event,
        title: event.title || event.name || 'Untitled event',
        org: event.organization_name || event.organization || 'General',
        status: statusLabel(event.status),
        registered: Number(event.registered_count || 0),
        attended: Number(event.present_count || 0),
        fines: event.fines == null ? null : Number(event.fines)
      })),
    [events]
  );

  if (loading && events.length === 0) return <div className="admin-state">Loading…</div>;
  if (rows.length === 0) {
    return (
      <section className="admin-dashboard">
        <h1 className="admin-page-title">Dashboard</h1>
        {error ? <div className="admin-state admin-error">{error}</div> : <div className="admin-state">No events have been created yet.</div>}
      </section>
    );
  }

  return (
    <section className="admin-dashboard">
      <h1 className="admin-page-title">Dashboard</h1>
      {error && <div className="admin-state admin-error" role="alert">{error}</div>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Event</th>
              <th>Date</th>
              <th>Status</th>
              <th>Registered</th>
              <th>Attended (1+ scan)</th>
              <th>Fines</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((event) => (
              <tr key={event.id ?? `${event.title}-${event.start_at}`}>
                <td>
                  <div className="admin-event-cell-title">{event.title}</div>
                  <div className="admin-event-cell-sub">{event.org}</div>
                </td>
                <td>
                  <div className="admin-date-main">{fmt(event.start_at)}</div>
                </td>
                <td>
                  <span className={`admin-status-pill ${event.status}`}>{event.status}</span>
                </td>
                <td>{event.registered}</td>
                <td>{event.attended}</td>
                <td>{event.fines == null ? '—' : `₱${event.fines.toFixed(2)}`}</td>
                <td>
                  <div className="admin-action-stack">
                    <Link to={`${basePath}/events/${event.id}/attendance`} className="admin-button blue">Attendance &amp; fines</Link>
                    <Link to={`${basePath}/events/${event.id}/scan`} className="admin-button green">Scan</Link>
                    <Link to={`${basePath}/events/${event.id}/edit`} className="admin-button gray">Edit</Link>
                    {isAdmin && event.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          className="admin-button green"
                          onClick={() => reviewEvent(event, 'approved')}
                          disabled={busyEvent === event.id}
                        >
                          {busyEvent === event.id ? 'Saving…' : 'Approve'}
                        </button>
                        <button
                          type="button"
                          className="admin-button red"
                          onClick={() => reviewEvent(event, 'rejected')}
                          disabled={busyEvent === event.id}
                        >
                          {busyEvent === event.id ? 'Saving…' : 'Reject'}
                        </button>
                      </>
                    )}
                    {(event.status === 'approved' || event.status === 'pending' || event.status === 'cancelled') && (
                      <button
                        type="button"
                        className={`admin-button ${event.status === 'cancelled' ? 'green' : 'red'}`}
                        onClick={() => changeStatus(event)}
                        disabled={busyEvent === event.id}
                      >
                        {busyEvent === event.id ? 'Saving…' : event.status === 'cancelled' ? 'Reopen event' : 'Cancel event'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
