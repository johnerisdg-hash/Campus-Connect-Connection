// Three ways to mount the app:
//   StudentSite  -> what students open. Contains NO admin code at all.
//   AdminSite    -> what admins open (a separate page: /admin/).
//   OrgSite      -> what org managers (one per program) open (a separate page: /org/).
//   TestSite     -> the "View as Admin / Student" switch. FOR TESTING / PREVIEW ONLY — never deploy this one.
import { useState } from 'react';
import AdminApp from './admin/AdminApp.jsx';
import OrgApp from './org/OrgApp.jsx';
import StudentApp from './student/StudentApp.jsx';
import { DbProvider, useDb } from './lib/store.jsx';
import logo from './assets/msu-logo.png';
import { ThemeToggle } from './lib/theme.jsx';

function Brand() {
  return (
    <div className="brand">
      <img alt="Mindoro State University logo" src={logo} />
      <div className="bt">
        <h1>CampusConnect</h1>
        <div className="cn">Mindoro State University · Calapan Campus</div>
      </div>
      <ThemeToggle />
    </div>
  );
}

function Toast() {
  const { toastMsg } = useDb();
  return <div id="toast" className={toastMsg ? 'show' : ''}>{toastMsg}</div>;
}

function Frame({ id, on = true, children }) {
  return (
    <div className={'app' + (on ? ' on' : '')} id={id}>
      <Brand />
      {children}
    </div>
  );
}

// the student site has its own layout (sidebar + content), so it doesn't use the centered Frame
function StudentFrame({ on = true }) {
  return <div className={'app sapp' + (on ? ' on' : '')} id="studentApp"><StudentApp /></div>;
}

export function StudentSite() {
  return (
    <DbProvider>
      <StudentFrame />
      <Toast />
    </DbProvider>
  );
}

export function AdminSite() {
  return (
    <DbProvider>
      <Frame id="adminApp"><AdminApp active /></Frame>
      <Toast />
    </DbProvider>
  );
}

export function OrgSite() {
  return (
    <DbProvider>
      <Frame id="orgApp"><OrgApp active /></Frame>
      <Toast />
    </DbProvider>
  );
}

export function TestSite() {
  const [role, setRole] = useState('admin');
  return (
    <DbProvider>
      <div className="switch">
        View as:
        <button className={role === 'admin' ? 'on' : ''} onClick={() => setRole('admin')}>Admin</button>
        <button className={role === 'org' ? 'on' : ''} onClick={() => setRole('org')}>Org Manager</button>
        <button className={role === 'student' ? 'on' : ''} onClick={() => setRole('student')}>Student</button>
        <span style={{ opacity: 0.8 }}>· testing only</span>
      </div>
      {/* both stay mounted so switching keeps your place; the hidden one is display:none */}
      <Frame id="adminApp" on={role === 'admin'}><AdminApp active={role === 'admin'} /></Frame>
      <Frame id="orgApp" on={role === 'org'}><OrgApp active={role === 'org'} /></Frame>
      <StudentFrame on={role === 'student'} />
      <Toast />
    </DbProvider>
  );
}
