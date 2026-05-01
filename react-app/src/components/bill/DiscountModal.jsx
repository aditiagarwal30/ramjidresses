import { useState } from 'react';
import { useBill } from '../../state/BillContext.jsx';
import { useUI } from '../../state/UIContext.jsx';

export default function DiscountModal() {
  const { state, setDiscount } = useBill();
  const { hideModal } = useUI();
  const [type, setType] = useState(state.discount.type === 'flat' ? 'flat' : 'pct');
  const [value, setValue] = useState(state.discount.value || '');

  const save = () => {
    const v = parseFloat(value) || 0;
    setDiscount({ type: v > 0 ? type : null, value: v });
    hideModal();
  };

  const remove = () => {
    setDiscount({ type: null, value: 0 });
    hideModal();
  };

  return (
    <>
      <label>Type</label>
      <div className="mode-toggle">
        <button className={type === 'pct' ? 'active' : ''} onClick={() => setType('pct')}>PERCENT</button>
        <button className={type === 'flat' ? 'active' : ''} onClick={() => setType('flat')}>FLAT ₹</button>
      </div>
      <label>Value</label>
      <input
        type="number"
        value={value}
        min="0"
        inputMode="decimal"
        onChange={(e) => setValue(e.target.value)}
        autoFocus
      />
      <div className="modal-actions" style={{ marginTop: 16 }}>
        <button className="btn danger" onClick={remove}>REMOVE</button>
        <button className="btn primary" style={{ flex: 1 }} onClick={save}>SAVE</button>
      </div>
    </>
  );
}
