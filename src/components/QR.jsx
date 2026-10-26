// Student QR: READING + validating only. Generating / saving QR codes is not done in this app (the backend does that).
// The QR reader (window.jsQR) comes from the CDN script in admin/index.html and org/index.html.
import { SID_RE } from '../lib/utils.js';

// What a student QR contains: {"app":"CampusConnect","type":"student","sid":...,"name":...,"ys":...,"chk":...}
export function qrCheck(s) {
  let h = 5381;
  const str = 'CampusConnect|' + s.sid + '|' + s.name + '|' + s.ys;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

// Only QR codes that follow the CampusConnect student template are accepted.
// QR codes made with other generators (or edited ones) are rejected and attendance is not recorded.
export function parseStudentQR(text) {
  let o;
  try {
    o = JSON.parse(text);
  } catch {
    return null;
  }
  if (!o || typeof o !== 'object' || o.app !== 'CampusConnect' || o.type !== 'student') return null;
  if (![o.sid, o.name, o.ys].every((v) => typeof v === 'string' && v.trim())) return null;
  if (!SID_RE.test(o.sid)) return null;
  if (o.chk !== qrCheck(o)) return null;
  return { sid: o.sid, name: o.name, ys: o.ys };
}

// read a QR code out of a canvas (returns the text or null)
export function decodeCanvas(c) {
  if (!window.jsQR) return null;
  const img = c.getContext('2d').getImageData(0, 0, c.width, c.height);
  const r = window.jsQR(img.data, c.width, c.height);
  return r ? r.data : null;
}
