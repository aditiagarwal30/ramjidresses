import { useState } from 'react';
import { useBill } from '../../state/BillContext.jsx';
import { useUI } from '../../state/UIContext.jsx';

export default function CustomerNameModal() {
  const { state, setCustomer } = useBill();
  const { hideModal } = useUI();
  const [name, setName] = useState(state.customer || '');

  const save = () => {
    setCustomer(name);
    hideModal();
  };

  return (
    <>
      <input
        type="text"
        value={name}
        placeholder="e.g. Rahul"
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') save(); }}
        autoFocus
      />
      <div className="modal-actions" style={{ marginTop: 16 }}>
        <button className="btn primary" style={{ flex: 1 }} onClick={save}>SAVE</button>
      </div>
    </>
  );
}
