import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api.js';
import { useAuth } from '../../AuthContext.jsx';

const emptyForm = {
  organization_id: '',
  title: '',
  description: '',
  location: '',
  start_at: '',
  end_at: '',
  capacity: '',
  fine_per_session: '25',
  reason: '',
  poster: null
};

function localDateTime(value) {
  return value ? String(value).replace(' ', 'T').slice(0, 16) : '';
}

export default function EditEvent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOrganizer = user?.role === 'organizer';
  const basePath = isOrganizer ? '/org' : '/admin';
  const [event, setEvent] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const isApprovedOrganizerEvent = isOrganizer && event?.status === 'approved';

  useEffect(() => {
    const organizationsRequest = isOrganizer ? Promise.resolve({ organizations: [] }) : api.get('/admin/organizations');
    Promise.all([api.get('/admin/events'), organizationsRequest])
      .then(([eventData, organizationData]) => {
        const found = (eventData.events || []).find((item) => String(item.id) === String(id));
        if (!found) throw new Error('Event not found.');
        setEvent(found);
        setOrganizations(Array.isArray(organizationData.organizations) ? organizationData.organizations : []);
        setForm({
          organization_id: found.organization_id ? String(found.organization_id) : '',
          title: found.title || '',
          description: found.description || '',
          location: found.location || '',
          start_at: localDateTime(found.start_at),
          end_at: localDateTime(found.end_at),
          capacity: found.capacity || '',
          fine_per_session: found.fine_per_session ?? '25',
          poster: null
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, isOrganizer]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const body = new FormData();
      if (!isOrganizer) {
        body.append('scope', 'program');
        body.append('organization_id', form.organization_id);
      }
      body.append('title', form.title);
      body.append('description', form.description);
      body.append('location', form.location);
      body.append('start_at', form.start_at);
      body.append('end_at', form.end_at);
      body.append('capacity', String(form.capacity));
      body.append('fine_per_session', String(form.fine_per_session));
      if (isApprovedOrganizerEvent) body.append('reason', form.reason);
      if (form.poster) body.append('poster', form.poster);

      const endpoint = isApprovedOrganizerEvent
        ? `/admin/events/${id}/request-change`
        : `/admin/events/${id}/update`;
      const result = await api.post(endpoint, body);
      setMessage(result.message || 'Event updated.');
      const refreshed = await api.get('/admin/events');
      setEvent((refreshed.events || []).find((item) => String(item.id) === String(id)) || event);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeEvent() {
    if (!window.confirm(`Permanently delete "${event.title}"? This cannot be undone.`)) return;

    let confirm = '';
    if (Number(event.registered_count) > 0) {
      confirm = window.prompt(
        `This permanently deletes the event, its ${event.registered_count} registrations, attendance scans, and fines.\n\nType DELETE to confirm:`
      ) || '';
      if (confirm !== 'DELETE') {
        setError('Nothing was deleted: confirmation text did not match.');
        return;
      }
    }

    setDeleting(true);
    setError('');
    try {
      await api.post(`/admin/events/${id}/delete`, confirm ? { confirm } : {});
      navigate(basePath, { replace: true });
    } catch (e) {
      setError(e.message);
      setDeleting(false);
    }
  }

  if (loading) return <div className="admin-state">Loading event…</div>;
  if (!event) return <section className="admin-edit-event"><p className="admin-state admin-error">{error || 'Event not found.'}</p><Link className="admin-back-link" to={basePath}>Back to events</Link></section>;

  return (
    <section className="admin-edit-event">
      <Link className="admin-back-link" to={basePath}>← Back to events</Link>
      <h1 className="admin-page-title">{isApprovedOrganizerEvent ? 'Request Event Changes' : 'Edit Event'}</h1>
      {isApprovedOrganizerEvent && (
        <p className="org-approval-note">
          This event is approved. Changes will be sent to the admin for review before they take effect.
        </p>
      )}

      <form className="admin-create-form" onSubmit={save}>
        {isOrganizer ? (
          <label className="admin-form-field">
            <span>Organization</span>
            <input value={event.organization_name || user?.organization_name || ''} readOnly />
          </label>
        ) : (
          <label className="admin-form-field">
            <span>Organization</span>
            <select value={form.organization_id} onChange={(e) => updateField('organization_id', e.target.value)} required>
              <option value="">Select organization</option>
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>{organization.organization_name}</option>
              ))}
            </select>
          </label>
        )}

        <label className="admin-form-field">
          <span>Title</span>
          <input value={form.title} onChange={(e) => updateField('title', e.target.value)} required />
        </label>

        <label className="admin-form-field">
          <span>Description</span>
          <textarea rows="4" value={form.description} onChange={(e) => updateField('description', e.target.value)} />
        </label>

        <label className="admin-form-field">
          <span>Location</span>
          <input value={form.location} onChange={(e) => updateField('location', e.target.value)} required />
        </label>

        <label className="admin-form-field">
          <span>Start</span>
          <input type="datetime-local" value={form.start_at} onChange={(e) => updateField('start_at', e.target.value)} required />
        </label>

        <label className="admin-form-field">
          <span>End</span>
          <input type="datetime-local" value={form.end_at} onChange={(e) => updateField('end_at', e.target.value)} required />
        </label>

        <label className="admin-form-field">
          <span>Capacity ({Number(event.registered_count || 0)} registered so far)</span>
          <input type="number" min={Number(event.registered_count || 1)} value={form.capacity} onChange={(e) => updateField('capacity', e.target.value)} />
        </label>

        <label className="admin-form-field">
          <span>Fine per missed scan (₱)</span>
          <input type="number" min="0" step="0.01" value={form.fine_per_session} onChange={(e) => updateField('fine_per_session', e.target.value)} required />
        </label>

        <label className="admin-form-field">
          <span>Poster (leave empty to keep the current one)</span>
          {event.poster_url && <img className="admin-edit-poster" src={event.poster_url} alt="Current event poster" />}
          <input type="file" accept="image/*" onChange={(e) => updateField('poster', e.target.files?.[0] || null)} />
        </label>

        {isApprovedOrganizerEvent && (
          <label className="admin-form-field">
            <span>Reason for requested changes</span>
            <textarea rows="3" value={form.reason} onChange={(e) => updateField('reason', e.target.value)} required />
          </label>
        )}

        {error && <p className="admin-form-message error" role="alert">{error}</p>}
        {message && <p className="admin-form-message success" role="status">{message}</p>}
        <button type="submit" className="admin-submit" disabled={saving || (!isOrganizer && !form.organization_id) || (isApprovedOrganizerEvent && !form.reason.trim())}>
          {saving ? 'Saving…' : isApprovedOrganizerEvent ? 'Submit change request' : 'Save changes'}
        </button>
      </form>

      {(!isOrganizer || Number(event.registered_count || 0) === 0) && <div className="admin-danger-zone">
        <h2>Danger zone</h2>
        <p>
          Permanently deletes this event with its <b>{Number(event.registered_count || 0)}</b> registrations,
          attendance scans, and fines. This cannot be undone. To keep the records, cancel the event instead.
        </p>
        <button type="button" className="admin-button red" onClick={removeEvent} disabled={deleting}>
          {deleting ? 'Deleting…' : 'Delete permanently'}
        </button>
      </div>}
    </section>
  );
}
