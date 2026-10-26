# CampusConnect (React)

React version of the CampusConnect prototype (admin + student views).

## Run it
```
npm install
npm run dev            # development server: students at  /  ·  admins at  /admin/  ·  org managers at  /org/
                       # (/admin and /org without the slash also work — they redirect)
npm run build          # production build -> dist/ (dist/index.html = students, dist/admin/index.html = admins)

# single-file HTML previews (double-click to open) -> dist-preview/
npm run build:preview          # campusconnect-test-preview.html  (has the "View as Admin / Org Manager / Student" switch — TESTING ONLY)
npm run build:preview:student  # campusconnect-student.html       (students only)
npm run build:preview:admin    # campusconnect-admin.html         (admins only)
npm run build:preview:org      # campusconnect-org.html           (org managers only)
```

## What's inside
```
src/
  main-student.jsx / main-admin.jsx   the two separate apps (separate pages + separate bundles)
  main-test.jsx                       "View as Admin / Student" switch — for testing/preview only, never deploy
  App.jsx                             StudentSite / AdminSite / TestSite
  styles.css                   all styling (same look as the HTML version)
  lib/
    store.jsx                  the data (saved in the browser's localStorage) + auto-removal of finished events
    attendance.js              attendance slots, missed scans, fines
    utils.js                   dates, money, CSV/calendar downloads, password hashing
    orgs.js                    org events, fine-change requests + approval
    auth.js                    admin + org manager sign-in (placeholders, see below)
  components/
    Picker.jsx                 calendar + time pickers
    QR.jsx                     reads + validates a scanned student QR (QR generation is NOT in this app)
  admin/    AdminApp.jsx (login, events, schedules, registrations)  Attendance.jsx  Fines.jsx  Organizations.jsx  Approvals.jsx
  org/      OrgApp.jsx (login + own-org screens)  OrgFines.jsx (fine requests)
  student/  StudentApp.jsx (register, login, events, my attendance)
```

## Admin and student are separate
- Students open `/` and get **only** the student app. The admin screens are not in their bundle.
- Admins open `/admin/` (a different page and bundle, not linked from the student site).
- The "View as" switch exists only in the test preview build.
- **Important:** hiding the admin page is not security. `src/lib/auth.js` is a placeholder (it only checks the boxes are
  filled). Before real use, the admin login and *every* admin action must be verified by the server (e.g. LavaLust).

## Two kinds of events
| | Who attends | Registration | Capacity | Fines |
|---|---|---|---|---|
| **All students are required** (default; Students Week, assemblies…) | every student with an account | none | none | every student who misses a scan |
| **Registration with limited slots** (competitions, workshops…) | students who register (+ walk-ins) | yes | yes | those registered / scanned |

For a required event, students don't need to register. The attendance table lists every student, and when the event ends
all of them are saved to the history (so those who never showed up still get their "missed" record). A student whose
account was created *after* the event ended is not counted.

## Colleges and programs (Calapan City Campus)
Based on https://www.minsu.edu.ph/academics/programs — only the programs offered at the **Calapan City Campus**:

| College | Programs |
|---|---|
| CAS — College of Arts and Sciences | BAEL (AB English Language), BAPsych (AB Psychology) |
| CBM — College of Business and Management | BSTM (Tourism Management), BSHM (Hospitality Management) |
| CCS — College of Computer Studies | BSIT (Information Technology) |
| CCJE — College of Criminal Justice Education | BSCrim (Criminology) |
| CTE — College of Teacher Education | BSEd (Secondary Education), BTVTEd (Technical-Vocational Teacher Education), BTLEd (Technology and Livelihood Education) |

The website has no abbreviations, so these codes are common short forms. The admin can change/add/remove colleges and programs in
*Organizations → Colleges & programs*. Majors (e.g. BSEd – English/Math) are not separate programs.

- **One org manager per college** — a college's manager covers every program under it (CCS covers BSIT and any program added later).
- Students pick their **program** when they register (the dropdown is grouped by college).
- Every event has **Open to: All students** or **Specific colleges / programs**. Tick a college = all its programs; tick some programs = only those
  (ticking every program of a college becomes the whole college).
- A student outside the event's audience **doesn't see it, can't register, and is never fined** for it. If such a student is scanned anyway,
  it is recorded as a walk-in with "no fine".
- An org manager's new events default to *their own college* — change it to "All students" for school-wide events.

## Roles
| Role | Where | Can do |
|---|---|---|
| Admin | `/admin/` | everything; creates the org-manager accounts (Organizations tab); approves fine changes (Approvals tab); can hide any event |
| Org manager | `/org/` | **one per college** (CCS, CBM, CAS, CCJE, CTE). Create / edit / delete **their own org's** events, see their registrations + scan attendance. Fine amount changes are only a *request* — the current fine stays until the admin approves |
| Student | `/` | register once, log in, register for events, see attendance |

Org managers see only their own org's events everywhere (events, schedules, registrations, attendance, fines).
If the admin removes a manager, the org's events stay and the admin takes them over.

## Notes
- Student accounts: a student registers **once** (name, Student ID `MCCXXXX-XXXXX`, program/year/section, password),
  and later logs in with Student ID + password. One account per Student ID.
- No QR generation and no file exports (CSV / calendar) in this version — the backend handles those. Admin and org managers can still *scan* a student QR (the jsQR reader loads from a CDN, so it needs an internet connection).
- All data lives in the browser (localStorage). `src/lib/store.jsx` is the one file to replace when a real backend
  (e.g. LavaLust + MySQL) is ready; real login/passwords must be checked on the server, not in the browser.
