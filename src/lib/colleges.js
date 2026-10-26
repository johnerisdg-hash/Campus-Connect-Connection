// Colleges and their degree programs — Mindoro State University, CALAPAN CITY CAMPUS only.
// Source: https://www.minsu.edu.ph/academics/programs (programs listed for the Calapan City Campus).
// The website does not give abbreviations, so the codes below are common short forms and can be changed by the admin
// (Organizations → Colleges & programs). A code must be unique: it is used for matching students to events.
export const DEFAULT_COLLEGES = [
  {
    code: 'CAS', name: 'College of Arts and Sciences',
    programs: [
      { code: 'BAEL', name: 'Bachelor of Arts in English Language' },
      { code: 'BAPsych', name: 'Bachelor of Arts in Psychology' },
    ],
  },
  {
    code: 'CBM', name: 'College of Business and Management',
    programs: [
      { code: 'BSTM', name: 'Bachelor of Science in Tourism Management' },
      { code: 'BSHM', name: 'Bachelor of Science in Hospitality Management' },
    ],
  },
  {
    code: 'CCS', name: 'College of Computer Studies',
    programs: [{ code: 'BSIT', name: 'Bachelor of Science in Information Technology' }],
  },
  {
    code: 'CCJE', name: 'College of Criminal Justice Education',
    programs: [{ code: 'BSCrim', name: 'Bachelor of Science in Criminology' }],
  },
  {
    code: 'CTE', name: 'College of Teacher Education',
    programs: [
      { code: 'BSEd', name: 'Bachelor of Secondary Education' },
      { code: 'BTVTEd', name: 'Bachelor of Technical-Vocational Teacher Education' },
      { code: 'BTLEd', name: 'Bachelor of Technology and Livelihood Education' },
    ],
  },
];

export const allPrograms = (db) => db.colleges.flatMap((c) => c.programs.map((p) => ({ ...p, college: c.code })));
export const collegeOfProgram = (db, code) => {
  const lc = (code || '').toLowerCase();
  const c = db.colleges.find((x) => x.programs.some((p) => p.code.toLowerCase() === lc));
  return c ? c.code : '';
};
// codes are shared between colleges and programs (an event audience can hold either), so they must all be different
export const codeTaken = (db, code) => {
  const lc = code.toLowerCase();
  return db.colleges.some((c) => c.code.toLowerCase() === lc || c.programs.some((p) => p.code.toLowerCase() === lc));
};
