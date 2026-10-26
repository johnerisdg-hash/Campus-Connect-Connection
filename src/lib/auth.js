import { hashPassword } from './utils.js';

// Admin sign-in.
//
// !! PLACEHOLDER !!  Right now this only checks that the boxes are filled in, so it does NOT protect the admin pages.
// Hiding the admin site from students is only half the job — the real protection must live on the server:
//   1. the admin login calls your API (e.g. POST /api/admin/login on LavaLust) which checks the credentials in the database;
//   2. every admin API endpoint (create/edit/delete events, fines, attendance…) checks the admin's session/token again.
// Replace the body of adminLogin() with that API call; the rest of the app does not need to change.
export async function adminLogin({ username, email, password }) {
  if (!username.trim() || !email.trim() || !password) return { ok: false, error: 'Enter your username, email and password' };
  return { ok: true };
}

// Org manager sign-in (one manager per program, account created by the admin).
// Same PLACEHOLDER warning as above: here it is checked in the browser against the saved accounts; with a backend the
// server must do the check (password_verify), issue the session, and re-check the manager's org on every request.
export async function orgLogin(orgs, { email, password }) {
  if (!email.trim() || !password) return { ok: false, error: 'Enter your email and password' };
  const hash = await hashPassword(password);
  const org = orgs.find((o) => o.email.toLowerCase() === email.trim().toLowerCase());
  if (!org || org.pw !== hash) return { ok: false, error: 'Incorrect email or password' };
  return { ok: true, org };
}
