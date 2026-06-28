import { useState } from 'react';
import { useBill } from '../../state/BillContext.jsx';
import { useUI } from '../../state/UIContext.jsx';

export default function DepositModal() {
  const { state, setDeposit } = useBill();
  const { hideModal } = useUI();
  const [val, setVal] = useState(state.deposit || '');

  const save = () => {
    setDeposit(parseFloat(val) || 0);
    hideModal();
  };

  const remove = () => {
    setDeposit(0);
    hideModal();
  };

  return (
    <>
      <label>Deposit / advance (₹)</label>
      <input
        type="number"
        value={val}
        min="0"
        inputMode="decimal"
        placeholder="e.g. 500"
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') save(); }}
        autoFocus
      />
      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>
        Subtracted from the net bill.
      </div>
      <div className="modal-actions" style={{ marginTop: 16 }}>
        <button className="btn danger" onClick={remove}>REMOVE</button>
        <button className="btn primary" style={{ flex: 1 }} onClick={save}>SAVE</button>
      </div>
    </>
  );
}
