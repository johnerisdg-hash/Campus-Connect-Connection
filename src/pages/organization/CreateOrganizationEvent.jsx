import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { useAuth } from '../../AuthContext.jsx';

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

export default function CreateOrganizationEvent() {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [loadingOrganizations, setLoadingOrganizations] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.get('/programs')
      .then((data) => {
        const available = Array.isArray(data.programs) ? data.programs : [];
        setOrganizations(available);
        setForm((current) => ({
          ...current,
          organization_id: String(user?.organization_id || '')
        }));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingOrganizations(false));
  }, [user?.organization_id]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    if (!form.organization_id) {
      setError('Select an organization before submitting.');
      setSaving(false);
      return;
    }

    try {
      const body = new FormData();
      body.append('scope', 'program');
      body.append('organization_id', form.organization_id);
      body.append('title', form.title);
      body.append('description', form.description);
      body.append('location', form.location);
      body.append('start_at', form.start_at);
      body.append('end_at', form.end_at);
      if (form.capacity) body.append('capacity', form.capacity);
      body.append('fine_per_session', form.fine_per_session);
      if (form.poster) body.append('poster', form.poster);

      const result = await api.post('/admin/events', body);
      setSuccess(result.message || 'Event submitted for admin approval.');
      setForm(initialForm);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="admin-create-event">
      <h1 className="admin-page-title">Create Event</h1>
      <p className="org-approval-note">
        New events are submitted to the admin for approval before they become visible to students.
      </p>

      <form className="admin-create-form" onSubmit={submit}>
        <label className="admin-form-field">
          <span>Organization</span>
          <select
            value={form.organization_id}
            onChange={(e) => updateField('organization_id', e.target.value)}
            required
            disabled={loadingOrganizations || organizations.length === 0}
          >
            <option value="">
              {loadingOrganizations ? 'Loading organizations…' : organizations.length ? 'Select organization' : 'No organizations available'}
            </option>
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>{organization.name}</option>
            ))}
          </select>
        </label>

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
          <span>Capacity (leave empty for unlimited)</span>
          <input type="number" min="0" value={form.capacity} onChange={(e) => updateField('capacity', e.target.value)} />
        </label>

        <label className="admin-form-field">
          <span>Fine per missed scan (₱)</span>
          <input type="number" min="0" step="0.01" value={form.fine_per_session} onChange={(e) => updateField('fine_per_session', e.target.value)} required />
        </label>

        <label className="admin-form-field">
          <span>Poster image</span>
          <input type="file" accept="image/*" onChange={(e) => updateField('poster', e.target.files?.[0] || null)} />
        </label>

        {error && <p className="admin-form-message error" role="alert">{error}</p>}
        {success && <p className="admin-form-message success" role="status">{success}</p>}
        <button type="submit" className="admin-submit" disabled={saving || loadingOrganizations || organizations.length === 0 || !form.organization_id}>
          {saving ? 'Submitting…' : 'Submit for approval'}
        </button>
      </form>
    </section>
  );
}
