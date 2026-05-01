import { useState } from 'react';
import { useBill } from '../../state/BillContext.jsx';
import { useUI } from '../../state/UIContext.jsx';

export default function EditLineModal({ idx }) {
  const { state, updateLine, removeLine } = useBill();
  const { hideModal } = useUI();
  const line = state.lines[idx];
  const [qty, setQty] = useState(line ? line.qty : 0);
  const [rate, setRate] = useState(line ? line.rate : 0);

  if (!line) return null;

  const save = () => {
    const q = parseFloat(qty);
    const r = parseFloat(rate);
    if (!isFinite(q) || q <= 0) {
      removeLine(idx);
    } else {
      updateLine(idx, { qty: q, ...(isFinite(r) ? { rate: r } : {}) });
    }
    hideModal();
  };

  const remove = () => {
    removeLine(idx);
    hideModal();
  };

  return (
    <>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px', color: 'var(--muted)', marginBottom: 6 }}>
        {line.brand}{line.article ? ' / ' + line.article : ''}{line.size ? ' · sz ' + line.size : ''}
      </div>
      <label>Quantity</label>
      <input type="number" value={qty} min="0" inputMode="numeric" onChange={(e) => setQty(e.target.value)} />
      <label>Rate (₹)</label>
      <input type="number" value={rate} min="0" step="0.01" inputMode="decimal" onChange={(e) => setRate(e.target.value)} />
      <div className="modal-actions" style={{ marginTop: 16 }}>
        <button className="btn danger" onClick={remove}>DELETE</button>
        <button className="btn primary" style={{ flex: 1 }} onClick={save}>SAVE</button>
      </div>
    </>
  );
}
