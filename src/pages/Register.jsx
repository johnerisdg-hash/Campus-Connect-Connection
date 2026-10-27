import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { ThemeToggle } from '../ui.jsx';

export default function Register() {
  const nav = useNavigate();
  const [programs, setPrograms] = useState([]);
  const [form, setForm] = useState({ full_name: '', email: '', password: '', organization_id: '' });
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  useEffect(() => { api.get('/programs').then((d) => setPrograms(d.programs)).catch(() => {}); }, []);

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/signup', form);
      nav('/login');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="auth">
      <div className="auth-top"><ThemeToggle /></div>
      <h1>Student Register</h1>
      <form onSubmit={submit}>
        <label>Full name:</label>
        <input value={form.full_name} onChange={set('full_name')} required />
        <label>Email:</label>
        <input type="email" value={form.email} onChange={set('email')} required />
        <label>Program / college:</label>
        <select value={form.organization_id} onChange={set('organization_id')}>
          <option value="">Select your program</option>
          {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <label>Password (min 6 characters):</label>
        <input type="password" value={form.password} onChange={set('password')} required />
        {error && <p className="error">{error}</p>}
        <button className="btn primary block">Create account</button>
      </form>
      <p className="center">Already registered? <Link to="/login">Login</Link></p>
    </div>
  );
}