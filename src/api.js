async function request(path, options = {}) {
  const res = await fetch('/api' + path, { credentials: 'include', ...options });
  let data = null;
  try { data = await res.json(); } catch { /* a PHP error page is HTML, not JSON */ }
  if (!res.ok) throw new Error(data?.error || data?.message || `Request failed (${res.status})`);
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) =>
    request(path, {
      method: 'POST',
      ...(body instanceof FormData
        ? { body }
        : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) })
    })
};