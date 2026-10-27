import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import { Shell, HOME, LOGIN } from './ui.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Events from './pages/student/Events.jsx';
import EventDetail from './pages/student/EventDetail.jsx';
import MyEvents from './pages/student/MyEvents.jsx';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import UpcomingEvents from './pages/admin/UpcomingEvents.jsx';
import CreateEvent from './pages/admin/CreateEvent.jsx';
import EditEvent from './pages/admin/EditEvent.jsx';
import Attendance from './pages/admin/Attendance.jsx';
import ScanEvent from './pages/admin/ScanEvent.jsx';
import OrganizationLayout from './pages/organization/OrganizationLayout.jsx';
import CreateOrganizationEvent from './pages/organization/CreateOrganizationEvent.jsx';

function Protected({ roles, loginPath }) {
  const { user } = useAuth();
  if (!user) return <Navigate to={loginPath} replace />;
  if (!roles.includes(user.role)) return <Navigate to={HOME[user.role]} replace />;
  return <Outlet />;
}

const studentLinks = [
  { to: '/', label: 'Events', end: true },
  { to: '/my-events', label: 'My Attendance' }
];

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login role="student" />} />
      <Route path="/register" element={<Register />} />
      <Route path="/admin/login" element={<Login role="admin" />} />
      <Route path="/org/login" element={<Login role="organizer" />} />

      <Route element={<Protected roles={['student']} loginPath={LOGIN.student} />}>
        <Route element={<Shell links={studentLinks} />}>
          <Route path="/" element={<Events />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/my-events" element={<MyEvents />} />
        </Route>
      </Route>

      <Route element={<Protected roles={['admin']} loginPath={LOGIN.admin} />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<UpcomingEvents />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/upcoming" element={<Navigate to="/admin" replace />} />
          <Route path="/admin/create-event" element={<CreateEvent />} />
          <Route path="/admin/events/:id/edit" element={<EditEvent />} />
          <Route path="/admin/events/:id/attendance" element={<Attendance />} />
          <Route path="/admin/events/:id/scan" element={<ScanEvent />} />
        </Route>
      </Route>
      <Route element={<Protected roles={['organizer']} loginPath={LOGIN.organizer} />}>
        <Route element={<OrganizationLayout />}>
          <Route path="/org" element={<UpcomingEvents basePath="/org" />} />
          <Route path="/org/dashboard" element={<AdminDashboard basePath="/org" />} />
          <Route path="/org/create-event" element={<CreateOrganizationEvent />} />
          <Route path="/org/events/:id/edit" element={<EditEvent />} />
          <Route path="/org/events/:id/attendance" element={<Attendance />} />
          <Route path="/org/events/:id/scan" element={<ScanEvent />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}