import { useMemo, useState } from 'react';
import { useRates } from '../../state/RatesContext.jsx';
import { useBill } from '../../state/BillContext.jsx';
import { useUI } from '../../state/UIContext.jsx';
import { parseInput } from '../../lib/parser.js';
import { fmt } from '../../lib/utils.js';

export default function QuickBar() {
  const { idx } = useRates();
  const { addLine, addManual } = useBill();
  const { showModal, hideModal, showToast } = useUI();
  const [val, setVal] = useState('');

  const live = useMemo(() => {
    const v = val.trim();
    if (!v) return { tone: '', text: 'or type shorthand here · "x" or "*" optional' };
    const r = parseInput(v, idx);
    if (r.kind === 'item') {
      const billed = Math.max(0, (r.row.rate || 0) - 10);
      return {
        tone: 'success',
        text: `→ ${r.row.brand}${r.row.article ? ' ' + r.row.article : ''} sz ${r.row.size} · ${r.qty} × ${fmt(billed)} = ${fmt(r.qty * billed)}`,
      };
    }
    if (r.kind === 'manual')
      return { tone: 'success', text: `→ ${r.qty} × ${fmt(r.rate)} = ${fmt(r.qty * r.rate)}` };
    if (r.kind === 'lookup')
      return { tone: '', text: `${r.rows.length} matches — be more specific or add qty (× N)` };
    if (r.kind === 'ambiguous') return { tone: '', text: r.message };
    if (r.kind === 'partial') return { tone: 'error', text: r.message };
    return { tone: 'error', text: r.message || 'no match' };
  }, [val, idx]);

  const submit = () => {
    const raw = val.trim();
    if (!raw) return;
    const r = parseInput(raw, idx);
    if (r.kind === 'item') {
      addLine(r.row, r.qty);
      showToast(`Added · ${r.row.brand}${r.row.article ? ' ' + r.row.article : ''} ${r.row.size ? 'sz ' + r.row.size : ''} × ${r.qty}`);
      setVal('');
      return;
    }
    if (r.kind === 'manual') {
      addManual(r.qty, r.rate);
      showToast(`Manual added · ${r.qty} × ${fmt(r.rate)}`);
      setVal('');
      return;
    }
    if (r.kind === 'ambiguous') {
      showModal({
        title: r.message,
        hideOk: true,
        body: (
          <>
            {r.options.map((o, i) => (
              <button
                key={i}
                className="btn"
                style={{
                  display: 'block', width: '100%', marginBottom: 6,
                  textAlign: 'left', padding: 12, textTransform: 'none',
                  letterSpacing: 0, fontSize: 14,
                }}
                onClick={() => {
                  addLine(o.row, o.qty);
                  showToast(`Added · ${o.row.brand}${o.row.article ? ' ' + o.row.article : ''} ${o.row.size ? 'sz ' + o.row.size : ''} × ${o.qty}`);
                  hideModal();
                  setVal('');
                }}
              >
                {o.label}
              </button>
            ))}
          </>
        ),
      });
    }
  };

  return (
    <div className="quickbar">
      <div className="quick-label">Manual Entry</div>
      <div className="quick-input-wrap">
        <span className="quick-icon">＋</span>
        <input
          className="quick-input"
          type="text"
          placeholder='e.g. "6 x 250"  or  "sahil 2030 2"'
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
          autoComplete="off"
        />
        <button className="quick-add-btn" onClick={submit}>ADD</button>
      </div>
      <div className={'quick-helper' + (live.tone ? ' ' + live.tone : '')}>{live.text}</div>
    </div>
  );
}
