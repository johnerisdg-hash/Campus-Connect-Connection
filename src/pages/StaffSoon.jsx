import { useAuth } from '../AuthContext.jsx';

export default function StaffSoon() {
  const { user } = useAuth();
  return (
    <div className="card">
      <h2>Welcome, {user.name}</h2>
      <p className="muted">You're signed in as <b>{user.role}</b>{user.organization_name ? ` (${user.organization_name})` : ''}. The management screens arrive in part 2.</p>
    </div>
  );
}