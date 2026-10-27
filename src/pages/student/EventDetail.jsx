import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api.js';
import { Badge, fmt, calendarUrl } from '../../ui.jsx';

export default function EventDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = () => api.get(`/events/${id}`).then(setData).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [id]);

  async function register() {
    setMsg(''); setError('');
    try {
      const d = await api.post(`/events/${id}/register`);
      setMsg(d.message);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  if (error && !data) return <p className="error">{error}</p>;
  if (!data) return <p className="muted">Loading…</p>;

  const { event: ev, registered } = data;
  const cancelled = ev.status === 'cancelled';
  const full = ev.capacity && Number(ev.registered_count) >= Number(ev.capacity);

  return (
    <>
      <Link to="/" className="muted">← Back to events</Link>
      <div className="card detail">
        {ev.poster_url && <img className="poster big" src={ev.poster_url} alt="" />}
        <h1>{ev.title} {cancelled && <Badge tone="red">Cancelled</Badge>}</h1>
        <p className="muted">{ev.organization_name}</p>
        {ev.description && <p>{ev.description}</p>}
        <p>📅 {fmt(ev.start_at)} – {fmt(ev.end_at)}</p>
        <p>📍 {ev.location}</p>
        <p className="muted">
          Registered: {ev.registered_count}{ev.capacity ? ` / ${ev.capacity}` : ''} · Fine per missed scan: ₱{Number(ev.fine_per_session).toFixed(2)}
        </p>

        {msg && <p className="success">{msg}</p>}
        {error && <p className="error">{error}</p>}

        <div className="row">
          {cancelled ? null : registered ? (
            <Link className="btn primary" to="/my-events">View my QR pass</Link>
          ) : (
            <button className="btn primary" onClick={register} disabled={full}>{full ? 'Event full' : 'Register'}</button>
          )}
          <a className="btn ghost" href={calendarUrl(ev)} target="_blank" rel="noreferrer">Add to Google Calendar</a>
        </div>
      </div>
    </>
  );
}