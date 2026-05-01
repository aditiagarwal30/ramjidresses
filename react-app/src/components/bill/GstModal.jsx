import { useState } from 'react';
import { useBill } from '../../state/BillContext.jsx';
import { useUI } from '../../state/UIContext.jsx';

export default function GstModal() {
  const { state, setGst } = useBill();
  const { hideModal } = useUI();
  const [val, setVal] = useState(state.gst || '');

  const save = () => {
    setGst(parseFloat(val) || 0);
    hideModal();
  };

  return (
    <>
      <input
        type="number"
        value={val}
        min="0"
        max="50"
        step="0.5"
        inputMode="decimal"
        placeholder="e.g. 5"
        onChange={(e) => setVal(e.target.value)}
        autoFocus
      />
      <div className="modal-actions" style={{ marginTop: 16 }}>
        <button className="btn primary" style={{ flex: 1 }} onClick={save}>SAVE</button>
      </div>
    </>
  );
}
