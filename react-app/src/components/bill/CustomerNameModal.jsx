import { useState } from 'react';
import { useBill } from '../../state/BillContext.jsx';
import { useUI } from '../../state/UIContext.jsx';

export default function CustomerNameModal() {
  const { state, setCustomer, setSalesman, setAddress } = useBill();
  const { hideModal } = useUI();
  const [name, setName] = useState(state.customer || '');
  const [sman, setSman] = useState(state.salesman || '');
  const [addr, setAddr] = useState(state.address || '');
  const [err, setErr] = useState('');

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setErr('Customer name is required');
      return;
    }
    setCustomer(trimmed);
    setSalesman(sman.trim());
    setAddress(addr.trim());
    hideModal();
  };

  return (
    <>
      <label>Customer name</label>
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
      <label style={{ marginTop: 12 }}>Salesman <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span></label>
      <input
        type="text"
        value={sman}
        placeholder="e.g. Hari Om Ji"
        onChange={(e) => setSman(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') save(); }}
      />
      <label style={{ marginTop: 12 }}>Address <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span></label>
      <input
        type="text"
        value={addr}
        placeholder="e.g. NZF"
        onChange={(e) => setAddr(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') save(); }}
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
