import { useState } from 'react';
import { useBill } from '../../state/BillContext.jsx';
import { useUI } from '../../state/UIContext.jsx';

export default function TransportModal() {
  const { state, setTransport } = useBill();
  const { hideModal } = useUI();
  const [val, setVal] = useState(state.transport || '');

  const save = () => {
    setTransport(parseFloat(val) || 0);
    hideModal();
  };

  const remove = () => {
    setTransport(0);
    hideModal();
  };

  return (
    <>
      <label>Transport charges (₹)</label>
      <input
        type="number"
        value={val}
        min="0"
        inputMode="decimal"
        placeholder="e.g. 200"
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') save(); }}
        autoFocus
      />
      <div className="modal-actions" style={{ marginTop: 16 }}>
        <button className="btn danger" onClick={remove}>REMOVE</button>
        <button className="btn primary" style={{ flex: 1 }} onClick={save}>SAVE</button>
      </div>
    </>
  );
}
