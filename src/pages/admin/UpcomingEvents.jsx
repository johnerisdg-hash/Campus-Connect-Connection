import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { fmt } from '../../ui.jsx';

export default function UpcomingEvents({ basePath = '/admin' }) {
  const [upcoming, setUpcoming] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/admin/events')
      .then((d) => {
        const now = Date.now();
        const events = Array.isArray(d.events) ? d.events : [];
        setUpcoming(
          events
            .map((event) => {
              const start = new Date(String(event.start_at || '').replace(' ', 'T')).getTime();
              const end = new Date(String(event.end_at || '').replace(' ', 'T')).getTime();
              const status = String(event.status || '').toLowerCase();
              let displayStatus = 'upcoming';

              if (status === 'pending') displayStatus = 'pending';
              else if (status === 'rejected') displayStatus = 'rejected';
              else if (status === 'cancelled') displayStatus = 'cancelled';
              else if (Number.isFinite(end) && end < now) displayStatus = 'done';
              else if (Number.isFinite(start) && start <= now && Number.isFinite(end) && end >= now) displayStatus = 'ongoing';

              return { ...event, display_status: displayStatus };
            })
        );
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (error) return <div className="admin-state admin-error">{error}</div>;
  if (loading) return <div className="admin-state">Loading…</div>;

  return (
    <section className="admin-upcoming">
      <h1 className="admin-page-title">Events</h1>

      {upcoming.length === 0 ? <div className="admin-state">No events have been created yet.</div> : <div className="admin-card-grid">
        {upcoming.map((event) => (
          <article key={event.id ?? event.title} className="admin-upcoming-card">
            <div className="admin-card-image-wrap">
              {event.poster_url ? (
                <img src={event.poster_url} alt={event.title} className="admin-card-image" />
              ) : (
                <div className="admin-card-image placeholder" aria-label="No image" />
              )}
              <span className={`admin-event-status ${event.display_status}`}>{event.display_status}</span>
            </div>

            <div className="admin-card-body">
              <h2>{event.title || 'Untitled event'}</h2>
              <p className="admin-meta-line">{event.organization_name || 'General'} · {event.location || 'TBD'}</p>
              <p className="admin-meta-line">{fmt(event.start_at)}</p>
              <p className="admin-meta-line">Registered: {event.registered_count || 0}</p>
              <div className="admin-card-actions">
                <Link to={`${basePath}/events/${event.id}/attendance`} className="admin-button blue small">Attendance &amp; fines</Link>
                <Link to={`${basePath}/events/${event.id}/edit`} className="admin-button gray small">Edit</Link>
              </div>
            </div>
          </article>
        ))}
      </div>}
    </section>
  );
}
