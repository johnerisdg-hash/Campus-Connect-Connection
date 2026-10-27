import { useEffect, useState } from 'react';
import { api } from '../../api.js';

const initialForm = {
  organization_id: '',
  title: '',
  description: '',
  location: '',
  start_at: '',
  end_at: '',
  capacity: '',
  fine_per_session: '25',
  poster: null
};

export default function CreateEvent() {
  const [organizations, setOrganizations] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [loadingOrganizations, setLoadingOrganizations] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api
      .get('/admin/organizations')
      .then((d) => setOrganizations(Array.isArray(d.organizations) ? d.organizations : []))
      .catch((e) => setError(e.message))
      .finally(() => setLoadingOrganizations(false));
  }, []);

  const onFieldChange = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const fd = new FormData();
      fd.append('scope', 'program');
      fd.append('organization_id', form.organization_id);
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('location', form.location);
      if (form.start_at) fd.append('start_at', form.start_at);
      if (form.end_at) fd.append('end_at', form.end_at);
      if (form.capacity) fd.append('capacity', String(form.capacity));
      if (form.fine_per_session) fd.append('fine_per_session', String(form.fine_per_session));
      if (form.poster) fd.append('poster', form.poster);

      const d = await api.post('/admin/events', fd);
      setSuccess(d.message || 'Event created successfully.');
      setForm({ ...initialForm });
    } catch (err) {
      setError(err.message || 'Unable to create event.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="admin-create-event">
      <h1 className="admin-page-title">Create Event</h1>

      <form className="admin-create-form" onSubmit={onSubmit}>
        <label className="admin-form-field">
          <span>Organization</span>
          <select
            value={form.organization_id}
            onChange={(e) => onFieldChange('organization_id', e.target.value)}
            required
            disabled={loadingOrganizations || organizations.length === 0}
          >
            <option value="">{loadingOrganizations ? 'Loading organizations…' : 'Select organization'}</option>
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>{organization.organization_name}</option>
            ))}
          </select>
        </label>

        {error && <p className="admin-form-message error">{error}</p>}

        <label className="admin-form-field">
          <span>Title</span>
          <input type="text" value={form.title} onChange={(e) => onFieldChange('title', e.target.value)} placeholder="Event title" required />
        </label>

        <label className="admin-form-field">
          <span>Description</span>
          <textarea value={form.description} onChange={(e) => onFieldChange('description', e.target.value)} placeholder="Short event description" rows="4" required />
        </label>

        <label className="admin-form-field">
          <span>Location</span>
          <input type="text" value={form.location} onChange={(e) => onFieldChange('location', e.target.value)} placeholder="Room / venue" required />
        </label>

        <label className="admin-form-field">
          <span>Start</span>
          <input type="datetime-local" value={form.start_at} onChange={(e) => onFieldChange('start_at', e.target.value)} required />
        </label>

        <label className="admin-form-field">
          <span>End</span>
          <input type="datetime-local" value={form.end_at} onChange={(e) => onFieldChange('end_at', e.target.value)} required />
        </label>

        <label className="admin-form-field">
          <span>Capacity (leave empty for unlimited)</span>
          <input type="number" min="0" value={form.capacity} onChange={(e) => onFieldChange('capacity', e.target.value)} placeholder="Optional" />
        </label>

        <label className="admin-form-field">
          <span>Fine per missed scan (₱)</span>
          <input type="number" min="0" step="0.01" value={form.fine_per_session} onChange={(e) => onFieldChange('fine_per_session', e.target.value)} required />
        </label>

        <label className="admin-form-field">
          <span>Poster image</span>
          <input type="file" accept="image/*" onChange={(e) => onFieldChange('poster', e.target.files?.[0] || null)} />
        </label>

        {success && <p className="admin-form-message success">{success}</p>}

        <button type="submit" className="admin-submit" disabled={saving || loadingOrganizations || organizations.length === 0 || !form.organization_id}>
          {saving ? 'Saving…' : 'Save event'}
        </button>
      </form>
    </section>
  );
}
