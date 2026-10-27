import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { useAuth } from '../../AuthContext.jsx';
import { fmt } from '../../ui.jsx';

function EventCard({ ev }) {
  return (
    <Link to={`/events/${ev.id}`} className="card event">
      {ev.poster_url ? <img className="poster" src={ev.poster_url} alt="" /> : <div className="poster empty">No poster</div>}
      <h3>{ev.title}</h3>
      <p className="muted">{ev.organization_name}</p>
      <p>📅 {fmt(ev.start_at)}</p>
      <p>📍 {ev.location}</p>
      <p className="muted">Registered: {ev.registered_count}{ev.capacity ? ` / ${ev.capacity}` : ''}</p>
    </Link>
  );
}

function Section({ title, events }) {
  return (
    <section>
      <h2>{title}</h2>
      {events.length === 0 ? <p className="muted">Nothing here yet.</p> : <div className="grid">{events.map((e) => <EventCard key={e.id} ev={e} />)}</div>}
    </section>
  );
}

export default function Events() {
  const { user } = useAuth();
  const [events, setEvents] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { api.get('/events').then((d) => setEvents(d.events)).catch((e) => setError(e.message)); }, []);

  if (error) return <p className="error">{error}</p>;
  if (!events) return <p className="muted">Loading…</p>;

  return (
    <>
      <h1>Event Dashboard</h1>
      <Section title="School-wide events" events={events.filter((e) => e.scope === 'school')} />
      <Section
        title={`Events for ${user.organization_name || 'your program'}`}
        events={events.filter((e) => e.scope === 'program')}
      />
      {!user.organization_id && <p className="muted">Your account has no program yet, so only school-wide events are shown.</p>}
    </>
  );
}