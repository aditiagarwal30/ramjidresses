import { useEffect, useRef, useState } from 'react';
import { fmt } from '../../lib/utils.js';
import { useUI } from '../../state/UIContext.jsx';

export default function EditRateModal({ row, onSave }) {
  const [rate, setRate] = useState(String(row.rate ?? ''));
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);
  const { hideModal, showToast } = useUI();

  useEffect(() => {
    const t = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 100);
    return () => clearTimeout(t);
  }, []);

  const submit = async () => {
    const v = parseFloat(rate);
    if (!(v >= 0)) { showToast('enter a valid rate'); return; }
    if (v === row.rate) { hideModal(); return; }
    setSaving(true);
    const res = await onSave(row, v);
    setSaving(false);
    hideModal();
    if (res?.okRemote === false) showToast('saved locally · cloud sync failed');
    else showToast('rate updated ✓');
  };

  return (
    <>
      <div style={{ fontWeight: 600, fontSize: 15 }}>
        {row.brand}{row.article ? ' / ' + row.article : ''}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
        SIZE {row.size} · was {fmt(row.rate)}
      </div>
      <label>New rate (₹)</label>
      <div className="qty-input-row">
        <input
          ref={inputRef}
          className="qty-input"
          type="number"
          value={rate}
          min="0"
          inputMode="decimal"
          onChange={(e) => setRate(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
        />
      </div>
      <div className="modal-actions" style={{ marginTop: 16 }}>
        <button className="btn primary" onClick={submit} disabled={saving} style={{ flex: 1 }}>
          {saving ? 'SAVING…' : 'SAVE RATE'}
        </button>
      </div>
    </>
  );
}
