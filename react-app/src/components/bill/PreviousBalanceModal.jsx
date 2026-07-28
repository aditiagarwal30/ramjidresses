import { useState } from 'react';
import { useBill } from '../../state/BillContext.jsx';
import { useUI } from '../../state/UIContext.jsx';

export default function PreviousBalanceModal() {
  const { state, setPreviousBalance } = useBill();
  const { hideModal } = useUI();
  const [val, setVal] = useState(state.previousBalance || '');

  const save = () => {
    setPreviousBalance(parseFloat(val) || 0);
    hideModal();
  };

  const remove = () => {
    setPreviousBalance(0);
    hideModal();
  };

  return (
    <>
      <label>Previous Balance (₹)</label>
      <input
        type="number"
        value={val}
        min="0"
        inputMode="decimal"
        placeholder="e.g. 1200"
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') save(); }}
        autoFocus
      />
      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>
        Added to the final bill total (previous dues).
      </div>
      <div className="modal-actions" style={{ marginTop: 16 }}>
        <button className="btn danger" onClick={remove}>REMOVE</button>
        <button className="btn primary" style={{ flex: 1 }} onClick={save}>SAVE</button>
      </div>
    </>
  );
}
