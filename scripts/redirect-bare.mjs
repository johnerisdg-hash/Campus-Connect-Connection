// "/admin" and "/org" (without the trailing slash) would otherwise open the STUDENT page in the dev server.
// This sends them to "/admin/" and "/org/" instead. Used by vite.config.js (dev + preview server).
export function redirectBare(req, res, next) {
  const m = /^\/(admin|org)(\?.*)?$/.exec(req.url || '');
  if (!m) return next();
  res.statusCode = 302;
  res.setHeader('Location', '/' + m[1] + '/' + (m[2] || ''));
  res.end();
}
