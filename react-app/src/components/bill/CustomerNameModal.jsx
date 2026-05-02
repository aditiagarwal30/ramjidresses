import { useState } from 'react';
import { useBill } from '../../state/BillContext.jsx';
import { useUI } from '../../state/UIContext.jsx';

export default function CustomerNameModal() {
  const { state, setCustomer } = useBill();
  const { hideModal } = useUI();
  const [name, setName] = useState(state.customer || '');
  const [err, setErr] = useState('');

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setErr('Customer name is required');
      return;
    }
    setCustomer(trimmed);
    hideModal();
  };

  return (
    <>
      <input
        type="text"
        value={name}
        placeholder="e.g. Rahul"
        onChange={(e) => {
          setName(e.target.value);
          if (err) setErr('');
        }}
        onKeyDown={(e) => { if (e.key === 'Enter') save(); }}
        autoFocus
      />
      {err && (
        <div style={{ marginTop: 10, color: 'var(--bad, #c4451c)', fontSize: 12 }}>
          {err}
        </div>
      )}
      <div className="modal-actions" style={{ marginTop: 16 }}>
        <button className="btn primary" style={{ flex: 1 }} onClick={save}>SAVE</button>
      </div>
    </>
  );
}
