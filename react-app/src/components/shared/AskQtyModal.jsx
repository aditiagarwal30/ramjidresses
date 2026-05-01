import { useEffect, useRef, useState } from 'react';
import { fmt } from '../../lib/utils.js';
import { useUI } from '../../state/UIContext.jsx';

export default function AskQtyModal({ row, onConfirm }) {
  const [qty, setQty] = useState(1);
  const inputRef = useRef(null);
  const { hideModal } = useUI();

  useEffect(() => {
    const t = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 100);
    return () => clearTimeout(t);
  }, []);

  const submit = () => {
    const q = parseInt(qty, 10);
    if (q > 0) onConfirm(q);
    hideModal();
  };

  return (
    <>
      <div style={{ fontWeight: 600, fontSize: 15 }}>
        {row.brand}{row.article ? ' / ' + row.article : ''}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
        SIZE {row.size} · {fmt(row.rate)}
      </div>
      <label>Quantity</label>
      <div className="qty-input-row">
        <button className="qty-step" onClick={() => setQty((q) => Math.max(1, (parseInt(q, 10) || 1) - 1))}>−</button>
        <input
          ref={inputRef}
          className="qty-input"
          type="number"
          value={qty}
          min="1"
          inputMode="numeric"
          onChange={(e) => setQty(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
        />
        <button className="qty-step" onClick={() => setQty((q) => (parseInt(q, 10) || 0) + 1)}>+</button>
      </div>
      <div className="modal-actions" style={{ marginTop: 16 }}>
        <button className="btn primary" onClick={submit} style={{ flex: 1 }}>ADD</button>
      </div>
    </>
  );
}
