// Calendar + time pickers: tap a field to pick instead of typing.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { fmtT, pad, todayStr } from '../lib/utils.js';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const show = (kind, v) =>
  !v ? '' : kind === 'date'
    ? new Date(v + 'T00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    : fmtT(v);

/** kind = 'date' (value "YYYY-MM-DD") or 'time' (value "HH:MM"). `min` only applies to dates. */
export default function PickerField({ value, onChange, kind, min = '', placeholder }) {
  const [open, setOpen] = useState(false);
  const inp = useRef(null);
  return (
    <>
      <input
        ref={inp}
        type="text"
        readOnly
        className="pickdisp"
        value={show(kind, value)}
        placeholder={placeholder || (kind === 'date' ? 'Tap to pick a date' : 'Tap to pick a time')}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
          }
        }}
      />
      {open && (
        <Popover
          anchor={inp}
          kind={kind}
          value={value}
          min={min}
          onPick={(v) => {
            onChange(v);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function Popover({ anchor, kind, value, min, onPick, onClose }) {
  const pop = useRef(null);
  const [pos, setPos] = useState({ left: -9999, top: -9999 });

  const place = () => {
    const a = anchor.current;
    const p = pop.current;
    if (!a || !p) return;
    const r = a.getBoundingClientRect();
    const left = Math.min(Math.max(8, r.left), window.innerWidth - p.offsetWidth - 8);
    let top = r.bottom + 4;
    if (top + p.offsetHeight > window.innerHeight - 8) top = Math.max(8, r.top - p.offsetHeight - 4);
    setPos((prev) => (prev.left === left && prev.top === top ? prev : { left, top }));
  };
  useLayoutEffect(place);

  useEffect(() => {
    const down = (e) => {
      if (pop.current && !pop.current.contains(e.target) && e.target !== anchor.current) onClose();
    };
    const key = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('pointerdown', down);
    document.addEventListener('keydown', key);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      document.removeEventListener('pointerdown', down);
      document.removeEventListener('keydown', key);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  });

  return createPortal(
    <div ref={pop} className="pickpop" style={{ display: 'block', left: pos.left, top: pos.top }}>
      {kind === 'date'
        ? <DateView value={value} min={min} onPick={onPick} onClose={onClose} />
        : <TimeView value={value} onPick={onPick} onClose={onClose} />}
    </div>,
    document.body,
  );
}

function DateView({ value, min, onPick, onClose }) {
  const base = value || (min > todayStr() ? min : todayStr());
  const [view, setView] = useState({ y: +base.slice(0, 4), m: +base.slice(5, 7) - 1 });
  const { y, m } = view;
  const today = todayStr();
  const startDow = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const nav = (n) => {
    let nm = m + n;
    let ny = y;
    if (nm < 0) { nm = 11; ny--; }
    if (nm > 11) { nm = 0; ny++; }
    setView({ y: ny, m: nm });
  };
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(<div key={'b' + i} />);
  for (let day = 1; day <= days; day++) {
    const ds = y + '-' + pad(m + 1) + '-' + pad(day);
    cells.push(
      <button
        key={ds}
        type="button"
        className={(ds === value ? 'sel ' : '') + (ds === today ? 'today' : '')}
        disabled={!!min && ds < min}
        onClick={() => onPick(ds)}
      >
        {day}
      </button>,
    );
  }
  return (
    <>
      <div className="cal-head">
        <button type="button" onClick={() => nav(-1)}>‹</button>
        <span>{MONTHS[m]} {y}</span>
        <button type="button" onClick={() => nav(1)}>›</button>
      </div>
      <div className="cal-grid">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((x) => <div key={x} className="dow">{x}</div>)}
        {cells}
      </div>
      <div className="pick-foot">
        <button type="button" onClick={() => onPick(min && today < min ? min : today)}>Today</button>
        <button type="button" onClick={onClose}>Close</button>
      </div>
    </>
  );
}

function TimeView({ value, onPick, onClose }) {
  const [h0, m0] = (value || '09:00').split(':').map(Number);
  const [t, setT] = useState({ h: (h0 % 12) || 12, m: m0, ap: h0 < 12 ? 'AM' : 'PM' });
  const box = useRef(null);
  const hrs = [...Array(12)].map((_, i) => i + 1);
  const mins = [...new Set([...Array(12)].map((_, i) => i * 5).concat([t.m]))].sort((a, b) => a - b);

  useLayoutEffect(() => {
    box.current?.querySelectorAll('.tcol').forEach((c) => {
      const b = c.querySelector('.sel');
      if (b) c.scrollTop = b.offsetTop - c.clientHeight / 2 + b.offsetHeight / 2;
    });
  }, [t]);

  return (
    <div ref={box}>
      <div className="tprev">{t.h}:{pad(t.m)} {t.ap}</div>
      <div className="tcols">
        <div className="tcol">
          <div className="lbl">Hour</div>
          {hrs.map((h) => <button key={h} type="button" className={h === t.h ? 'sel' : ''} onClick={() => setT({ ...t, h })}>{h}</button>)}
        </div>
        <div className="tcol">
          <div className="lbl">Min</div>
          {mins.map((mm) => <button key={mm} type="button" className={mm === t.m ? 'sel' : ''} onClick={() => setT({ ...t, m: mm })}>{pad(mm)}</button>)}
        </div>
        <div className="tcol">
          <div className="lbl">AM/PM</div>
          {['AM', 'PM'].map((a) => <button key={a} type="button" className={a === t.ap ? 'sel' : ''} onClick={() => setT({ ...t, ap: a })}>{a}</button>)}
        </div>
      </div>
      <div className="pick-foot">
        <button type="button" onClick={onClose}>Cancel</button>
        <button type="button" className="ok" onClick={() => onPick(pad((t.h % 12) + (t.ap === 'PM' ? 12 : 0)) + ':' + pad(t.m))}>OK</button>
      </div>
    </div>
  );
}
