import { useBill } from '../../state/BillContext.jsx';
import { useUI } from '../../state/UIContext.jsx';
import { fmt, fmt2 } from '../../lib/utils.js';
import EditLineModal from './EditLineModal.jsx';
import CustomerNameModal from './CustomerNameModal.jsx';

export default function BillCard() {
  const { state, totals } = useBill();
  const { showModal } = useUI();

  const editName = () => {
    showModal({
      title: 'Customer name',
      body: <CustomerNameModal />,
      hideOk: true, // CustomerNameModal renders its own save
    });
  };

  const editLine = (idx) => {
    showModal({
      title: `Edit line ${idx + 1}`,
      body: <EditLineModal idx={idx} />,
      hideOk: true,
    });
  };

  return (
    <div className="bill-card">
      <div className="bill-head">
        <div style={{ flex: 1, cursor: 'pointer' }} onClick={editName}>
          <div className="label">Customer</div>
          <div className={'name' + (state.customer ? '' : ' placeholder')}>
            {state.customer || '— add name —'}
          </div>
          {state.salesman && (
            <div className="label" style={{ marginTop: 4 }}>
              Salesman · {state.salesman}
            </div>
          )}
          {state.address && (
            <div className="label" style={{ marginTop: 4 }}>
              Address · {state.address}
            </div>
          )}
        </div>
        <button
          className="btn"
          style={{ fontSize: '10.5px', padding: '7px 10px' }}
          onClick={editName}
        >
          EDIT
        </button>
      </div>

      <ol className="bill-lines">
        {state.lines.length === 0 ? (
          <div className="bill-empty">No items yet — type below or use Guided Add</div>
        ) : (
          state.lines.map((l, i) => (
            <li key={i} className="bill-line" onClick={() => editLine(i)}>
              <span className="num">{i + 1}</span>
              <div>
                <div className="it-name">
                  {l.brand}{l.article ? ' / ' + l.article : ''}
                  {l.custom && <em style={{ fontSize: 11, color: 'var(--muted)' }}> (manual)</em>}
                </div>
                <div className="it-detail">
                  {l.size ? `SIZE ${l.size} · ` : ''}{l.qty} × {fmt(l.rate)}
                </div>
              </div>
              <div className="it-amount">
                {fmt(l.rate * l.qty)}
                <span className="x">tap to edit</span>
              </div>
            </li>
          ))
        )}
      </ol>

      {state.lines.length > 0 && (
        <div className="bill-totals">
          <div className="total-row">
            <span className="lbl">Subtotal</span>
            <span className="val">{fmt(totals.subtotal)}</span>
          </div>
          {totals.discAmt > 0 && (
            <div className="total-row">
              <span className="lbl">
                {state.discount.type === 'pct' ? `Discount (${state.discount.value}%)` : 'Discount'}
              </span>
              <span className="val" style={{ color: 'var(--bad)' }}>− {fmt(totals.discAmt)}</span>
            </div>
          )}
          {state.gst > 0 && (
            <div className="total-row">
              <span className="lbl">GST {state.gst}%</span>
              <span className="val">+ {fmt(totals.gstAmt)}</span>
            </div>
          )}
          {totals.transport > 0 && (
            <div className="total-row">
              <span className="lbl">Transport</span>
              <span className="val">+ {fmt(totals.transport)}</span>
            </div>
          )}
          {totals.previousBalance > 0 && (
            <div className="total-row">
              <span className="lbl">Previous Balance</span>
              <span className="val">+ {fmt(totals.previousBalance)}</span>
            </div>
          )}
          {totals.deposit > 0 && (
            <div className="total-row">
              <span className="lbl">Deposit</span>
              <span className="val" style={{ color: 'var(--bad)' }}>− {fmt(totals.deposit)}</span>
            </div>
          )}
          <div className="total-row grand">
            <span className="lbl">Total</span>
            <span className="val">
              <span className="rs">₹</span>{fmt2(totals.total)}
            </span>
          </div>
          <div className="total-row" style={{ marginTop: 6 }}>
            <span className="lbl">{state.lines.length} ITEMS · {totals.qtyCount} QTY</span>
            <span className="val mono" style={{ fontSize: '10.5px', color: 'var(--muted)' }}>
              {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
