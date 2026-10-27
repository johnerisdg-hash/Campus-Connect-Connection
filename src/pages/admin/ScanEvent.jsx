import { useCallback, useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api.js';
import { useAuth } from '../../AuthContext.jsx';

const SLOTS = [
  ['am_in', 'Morning IN'],
  ['am_out', 'Morning OUT'],
  ['pm_in', 'Afternoon IN'],
  ['pm_out', 'Afternoon OUT']
];

export default function ScanEvent() {
  const { id } = useParams();
  const { user } = useAuth();
  const basePath = user?.role === 'organizer' ? '/org' : '/admin';
  const scannerRef = useRef(null);
  const busyRef = useRef(false);
  const [event, setEvent] = useState(null);
  const [slot, setSlot] = useState('am_in');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    api.get('/admin/events')
      .then((data) => {
        const found = (data.events || []).find((item) => String(item.id) === String(id));
        if (!found) throw new Error('Event not found.');
        setEvent(found);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  const onScanSuccess = useCallback(async (token) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setResult(null);
    setError('');

    try {
      const response = await api.post('/admin/checkin', {
        token,
        event_id: Number(id),
        slot
      });

      setResult({ ok: Boolean(response.ok), message: response.message || 'Scan processed.' });
    } catch (e) {
      setResult({ ok: false, message: e.message });
    } finally {
      window.setTimeout(() => { busyRef.current = false; }, 1800);
    }
  }, [id, slot]);

  useEffect(() => {
    if (!event) return undefined;

    const scanner = new Html5QrcodeScanner('admin-qr-reader', {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      rememberLastUsedCamera: true
    }, false);
    scannerRef.current = scanner;
    scanner.render(onScanSuccess, () => {});

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch((e) => {
          console.error('Unable to stop QR scanner cleanly.', e);
        });
        scannerRef.current = null;
      }
    };
  }, [event, onScanSuccess]);

  return (
    <section className="admin-scan-page">
      <Link className="admin-back-link" to={`${basePath}/dashboard`}>← Back to dashboard</Link>
      <h1 className="admin-page-title">{event ? `Scan attendance: ${event.title}` : 'Scan attendance'}</h1>

      {error && <p className="admin-form-message error" role="alert">{error}</p>}

      {event && (
        <>
          <label className="admin-form-field admin-scan-slot">
            <span>Session you are scanning now</span>
            <select value={slot} onChange={(e) => setSlot(e.target.value)}>
              {SLOTS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>

          <div className="admin-scan-card">
            <div id="admin-qr-reader" />
            {result && (
              <p className={`admin-scan-result ${result.ok ? 'success' : 'error'}`} role="status">
                {result.message}
              </p>
            )}
          </div>

          <Link className="admin-button blue" to={`${basePath}/events/${id}/attendance`}>View attendance &amp; fines</Link>
        </>
      )}
    </section>
  );
}
