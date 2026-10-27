import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext.jsx';

export default function AdminLayout() {
  const { logout } = useAuth();
  const nav = useNavigate();

  const signOut = async () => {
    await logout();
    nav('/admin/login');
  };

  return (
    <>
      <header className="admin-topbar">
        <div className="admin-brand">CampusConnect</div>

        <nav className="admin-nav" aria-label="Admin navigation">
          <NavLink to="/admin" end className={({ isActive }) => (isActive ? 'admin-nav-link active' : 'admin-nav-link')}>
            Events
          </NavLink>
          <NavLink to="/admin/dashboard" className={({ isActive }) => (isActive ? 'admin-nav-link active' : 'admin-nav-link')}>
            Dashboard
          </NavLink>
          <NavLink to="/admin/create-event" className={({ isActive }) => (isActive ? 'admin-nav-link active' : 'admin-nav-link')}>
            Create Event
          </NavLink>
        </nav>

        <div className="admin-header-actions">
          <span className="admin-user-label">Campus Admin</span>
          <button type="button" className="admin-logout" onClick={signOut}>Logout</button>
        </div>
      </header>

      <main className="admin-page">
        <Outlet />
      </main>
    </>
  );
}
