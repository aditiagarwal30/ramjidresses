import { useState, useMemo } from 'react';
import { useBill } from '../../state/BillContext.jsx';
import { useUI } from '../../state/UIContext.jsx';
import { fmt, fmt2 } from '../../lib/utils.js';
import { calcTotals } from '../../lib/storage.js';
import { sendBillToWhatsApp, downloadPDF, printPDF, copyText } from '../../lib/pdf.js';
import { buildReceiptText } from '../../lib/receipt.js';

export default function HistoryView({ active }) {
  const { history, updateHistoryItem, deleteHistoryItem } = useBill();
  const { showToast } = useUI();
  const [openId, setOpenId] = useState(null);
  const [editSnapshot, setEditSnapshot] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // Today's date in YYYY-MM-DD format
  const open = openId != null ? history.find((h) => h.id === openId) : null;
  const editing = !!editSnapshot;

  // Filter bills by selected date and calculate total sales
  const { filteredBills, totalSales } = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const filtered = history.filter((bill) => {
      const [day, monthName, year] = (bill.date || '').split(' ');
      const month = monthNames.indexOf(monthName) + 1;
      if (!day || !month || !year) return false;
      const billDate = `${year}-${String(month).padStart(2, '0')}-${String(parseInt(day, 10)).padStart(2, '0')}`;
      return billDate === selectedDate;
    });

    const total = filtered.reduce((sum, bill) => sum + bill.total, 0);

    return { filteredBills: filtered, totalSales: total };
  }, [history, selectedDate]);

  if (open) {
    const t = (m) => showToast(m);
    // For older bills saved before pdfData was added, reconstruct from snapshot
    let pdfData = open.pdfData;
    if (!pdfData && open.snapshot) {
      pdfData = {
        lines: open.snapshot.lines || [],
        customer: open.snapshot.customer || open.customer,
        discount: open.snapshot.discount || { type: null, value: 0 },
        gst: open.snapshot.gst || 0,
        totals: calcTotals(open.snapshot),
        billNo: open.billNo,
        date: open.date,
        time: open.time,
      };
    }
    const text = open.text || (pdfData ? buildReceiptText(pdfData) : '');

    if (editing) {
      const editTotals = calcTotals(editSnapshot);
      const updateLine = (i, patch) => {
        setEditSnapshot((s) => {
          const lines = s.lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l));
          return { ...s, lines };
        });
      };
      const deleteLine = (i) => {
        setEditSnapshot((s) => ({ ...s, lines: s.lines.filter((_, idx) => idx !== i) }));
      };
      const onSave = async () => {
        if (editSnapshot.lines.length === 0) {
          if (!window.confirm('No items left — delete the bill instead?')) return;
          deleteHistoryItem(open.id);
          setEditSnapshot(null);
          setOpenId(null);
          showToast('deleted');
          return;
        }
        const t2 = calcTotals(editSnapshot);
        const updatedPdfData = {
          lines: JSON.parse(JSON.stringify(editSnapshot.lines)),
          customer: editSnapshot.customer,
          discount: editSnapshot.discount,
          gst: editSnapshot.gst,
          totals: t2,
          billNo: open.billNo,
          date: open.date,
          time: open.time,
        };
        const updated = {
          ...open,
          customer: editSnapshot.customer,
          total: t2.total,
          items: editSnapshot.lines.length,
          qty: t2.qtyCount,
          snapshot: editSnapshot,
          pdfData: updatedPdfData,
          text: buildReceiptText({ ...editSnapshot, totals: t2, billNo: open.billNo, date: open.date, time: open.time }),
        };
        await updateHistoryItem(updated);
        setEditSnapshot(null);
        showToast('saved');
      };
      return (
        <section className={'view' + (active ? ' active' : '')}>
          <div className="section-h">
            <span><em>Editing {open.billNo}</em></span>
            <span className="count">{editSnapshot.lines.length} {editSnapshot.lines.length === 1 ? 'LINE' : 'LINES'}</span>
          </div>
          <ol className="bill-lines" style={{ marginBottom: 10 }}>
            {editSnapshot.lines.map((l, i) => (
              <li key={i} className="bill-line" style={{ alignItems: 'flex-start' }}>
                <span className="num">{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="it-name">
                    {l.brand}{l.article ? ' / ' + l.article : ''}
                    {l.custom && <em style={{ fontSize: 11, color: 'var(--muted)' }}> (manual)</em>}
                  </div>
                  <div className="it-detail" style={{ marginBottom: 4 }}>
                    {l.size ? `SIZE ${l.size}` : ''}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <label style={{ fontSize: 10, color: 'var(--muted)' }}>Qty</label>
                    <input
                      type="number"
                      value={l.qty}
                      min="0"
                      inputMode="numeric"
                      onChange={(e) => updateLine(i, { qty: parseFloat(e.target.value) || 0 })}
                      style={{ width: 56, padding: '4px 6px', fontSize: 13, border: '1px solid var(--line)', borderRadius: 6 }}
                    />
                    <label style={{ fontSize: 10, color: 'var(--muted)' }}>Rate</label>
                    <input
                      type="number"
                      value={l.rate}
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      onChange={(e) => updateLine(i, { rate: parseFloat(e.target.value) || 0 })}
                      style={{ width: 72, padding: '4px 6px', fontSize: 13, border: '1px solid var(--line)', borderRadius: 6 }}
                    />
                    <button
                      className="btn danger"
                      style={{ padding: '4px 8px', fontSize: 10 }}
                      onClick={() => deleteLine(i)}
                    >
                      DEL
                    </button>
                  </div>
                </div>
                <div className="it-amount">{fmt(l.rate * l.qty)}</div>
              </li>
            ))}
          </ol>
          <div className="bill-totals">
            <div className="total-row">
              <span className="lbl">Subtotal</span>
              <span className="val">{fmt(editTotals.subtotal)}</span>
            </div>
            {editTotals.discAmt > 0 && (
              <div className="total-row">
                <span className="lbl">Discount</span>
                <span className="val" style={{ color: 'var(--bad)' }}>− {fmt(editTotals.discAmt)}</span>
              </div>
            )}
            {editSnapshot.gst > 0 && (
              <div className="total-row">
                <span className="lbl">GST {editSnapshot.gst}%</span>
                <span className="val">+ {fmt(editTotals.gstAmt)}</span>
              </div>
            )}
            <div className="total-row grand">
              <span className="lbl">Total</span>
              <span className="val"><span className="rs">₹</span>{fmt2(editTotals.total)}</span>
            </div>
          </div>
          <div className="actions" style={{ marginTop: 10 }}>
            <button className="btn" onClick={() => setEditSnapshot(null)}>CANCEL</button>
            <button className="btn primary" onClick={onSave}>SAVE CHANGES</button>
          </div>
        </section>
      );
    }

    return (
      <section className={'view' + (active ? ' active' : '')}>
        <div className="section-h">
          <span><em>Saved Bills</em></span>
          <span className="count">{filteredBills.length}{filteredBills.length === 1 ? ' BILL' : ' BILLS'}</span>
        </div>
        <button className="btn" style={{ marginBottom: 10 }} onClick={() => { setOpenId(null); setEditSnapshot(null); }}>← BACK</button>
        <div className="receipt">{text}</div>
        <div className="actions" style={{ marginTop: 10 }}>
          <button
            className="btn whatsapp"
            style={{ gridColumn: 'span 2' }}
            onClick={() => pdfData ? sendBillToWhatsApp(pdfData, t, { masked: !!pdfData.masked }) : t('PDF data unavailable')}
          >
            📄 SEND PDF · WHATSAPP
          </button>
        </div>
        <div className="actions" style={{ marginTop: 6 }}>
          <button className="btn" onClick={() => pdfData ? printPDF(pdfData, t, { masked: !!pdfData.masked }) : t('PDF data unavailable')}>🖨 PRINT</button>
          <button className="btn" onClick={() => pdfData ? downloadPDF(pdfData, t, { masked: !!pdfData.masked }) : t('PDF data unavailable')}>SAVE PDF</button>
        </div>
        <div className="actions" style={{ marginTop: 6 }}>
          <button className="btn" style={{ gridColumn: 'span 2' }} onClick={() => copyText(text, t)}>COPY TEXT</button>
        </div>
        <div className="actions" style={{ marginTop: 6 }}>
          <button
            className="btn"
            onClick={() => {
              const baseSnap = open.snapshot
                ? JSON.parse(JSON.stringify(open.snapshot))
                : {
                    customer: open.customer || '',
                    lines: pdfData?.lines ? JSON.parse(JSON.stringify(pdfData.lines)) : [],
                    discount: pdfData?.discount || { type: null, value: 0 },
                    gst: pdfData?.gst || 0,
                  };
              setEditSnapshot(baseSnap);
            }}
          >
            EDIT BILL
          </button>
          <button
            className="btn danger"
            onClick={() => {
              if (!window.confirm('Delete this bill?')) return;
              deleteHistoryItem(open.id);
              setOpenId(null);
              showToast('deleted');
            }}
          >
            DELETE BILL
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="view active">
      <div className="section-h">
        <span><em>Saved Bills</em></span>
        <span className="count">{history.length}{history.length === 1 ? ' BILL' : ' BILLS'}</span>
      </div>

      {/* Date picker and total sales */}
      <div style={{ marginBottom: 16, padding: '12px', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 8 }}>
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            Select Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: 14,
              border: '1px solid var(--line)',
              borderRadius: 6,
              background: 'var(--bg)',
              fontFamily: 'inherit',
              boxSizing: 'border-box'
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, color: 'var(--muted)' }}>
            {filteredBills.length} bill{filteredBills.length !== 1 ? 's' : ''} on {new Date(selectedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          <div style={{ fontSize: 16, fontWeight: 'bold', color: 'var(--accent)' }}>
            <span className="rs">₹</span>{fmt2(totalSales)}
          </div>
        </div>
      </div>

      {filteredBills.length === 0 ? (
        <div className="empty">
          <div className="big">No bills on this date</div>
          <div>select a different date to see bills</div>
        </div>
      ) : (
        filteredBills.map((h) => (
          <div className="hist-item" key={h.id} onClick={() => setOpenId(h.id)}>
            <div className="hist-info">
              <div className={'hist-name' + (h.customer ? '' : ' unnamed')}>
                {h.customer || 'No name'}{' '}
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', fontWeight: 400, letterSpacing: '0.04em' }}>
                  {h.billNo}
                </span>
              </div>
              <div className="hist-meta">{h.date} · {h.time} · {h.items} items</div>
            </div>
            <div className="hist-amt"><span className="rs">₹</span>{fmt2(h.total)}</div>
          </div>
        ))
      )}
    </section>
  );
}
