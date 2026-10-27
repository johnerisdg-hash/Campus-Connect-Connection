import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext.jsx';

export default function OrganizationLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function signOut() {
    await logout();
    navigate('/org/login');
  }

  return (
    <>
      <header className="admin-topbar">
        <div className="admin-brand">CampusConnect</div>
        <nav className="admin-nav" aria-label="Organization navigation">
          <NavLink to="/org" end className={({ isActive }) => (isActive ? 'admin-nav-link active' : 'admin-nav-link')}>Events</NavLink>
          <NavLink to="/org/dashboard" className={({ isActive }) => (isActive ? 'admin-nav-link active' : 'admin-nav-link')}>Dashboard</NavLink>
          <NavLink to="/org/create-event" className={({ isActive }) => (isActive ? 'admin-nav-link active' : 'admin-nav-link')}>Create Event</NavLink>
        </nav>
        <div className="admin-header-actions">
          <span className="admin-user-label">{user?.organization_name || user?.name || 'Organization Manager'}</span>
          <button type="button" className="admin-logout" onClick={signOut}>Logout</button>
        </div>
      </header>
      <main className="admin-page"><Outlet /></main>
    </>
  );
}
