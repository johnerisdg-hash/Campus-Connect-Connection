import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { ThemeToggle, HOME } from '../ui.jsx';

const TITLES = { student: 'Student Login', admin: 'Admin Login', organizer: 'Organization Manager Login' };

const ROLES = [
  { role: 'student', to: '/login', label: 'Student' },
  { role: 'admin', to: '/admin/login', label: 'Admin' },
  { role: 'organizer', to: '/org/login', label: 'Organization Manager' }
];

export default function Login({ role }) {
  const { user, login, logout } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Switching roles keeps this component mounted, so clear the leftovers
  useEffect(() => { setError(''); setPassword(''); }, [role]);

  if (user && user.role === role) return <Navigate to={HOME[role]} replace />;

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const u = await login(email.trim(), password);
      if (u.role !== role) {
        await logout();
        setError('This account cannot sign in here. Use the login page for your role.');
      } else {
        nav(HOME[role]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <div className="auth-top"><ThemeToggle /></div>
      <h1>{TITLES[role]}</h1>

      <div className="role-switch">
        <span className="muted">Sign in as:</span>
        {ROLES.map((r) => (
          <Link key={r.role} to={r.to} className={r.role === role ? 'active' : ''}>{r.label}</Link>
        ))}
      </div>

      <form onSubmit={submit}>
        <label>Email:</label>
        <input type="email" placeholder="name@school.edu" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label>Password:</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="error">{error}</p>}
        <button className="btn primary block" disabled={busy}>{busy ? 'Signing in…' : 'Login'}</button>
      </form>
      {role === 'student' && <p className="center">No account yet? <Link to="/register">Register</Link></p>}
    </div>
  );
}