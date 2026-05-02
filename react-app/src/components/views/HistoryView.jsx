import { useState, useMemo } from 'react';
import { useBill } from '../../state/BillContext.jsx';
import { useUI } from '../../state/UIContext.jsx';
import { fmt2 } from '../../lib/utils.js';
import { calcTotals } from '../../lib/storage.js';
import { sendBillToWhatsApp, downloadPDF, copyText } from '../../lib/pdf.js';
import { buildReceiptText } from '../../lib/receipt.js';

export default function HistoryView({ active }) {
  const { history, deleteHistoryItem } = useBill();
  const { showToast } = useUI();
  const [openId, setOpenId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // Today's date in YYYY-MM-DD format
  const open = openId != null ? history.find((h) => h.id === openId) : null;

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

    return (
      <section className={'view' + (active ? ' active' : '')}>
        <div className="section-h">
          <span><em>Saved Bills</em></span>
          <span className="count">{filteredBills.length}{filteredBills.length === 1 ? ' BILL' : ' BILLS'}</span>
        </div>
        <button className="btn" style={{ marginBottom: 10 }} onClick={() => setOpenId(null)}>← BACK</button>
        <div className="receipt">{text}</div>
        <div className="actions" style={{ marginTop: 10 }}>
          <button
            className="btn whatsapp"
            style={{ gridColumn: 'span 2' }}
            onClick={() => pdfData ? sendBillToWhatsApp(pdfData, t) : t('PDF data unavailable')}
          >
            📄 SEND PDF · WHATSAPP
          </button>
        </div>
        <div className="actions" style={{ marginTop: 6 }}>
          <button className="btn" onClick={() => copyText(text, t)}>COPY</button>
          <button className="btn" onClick={() => pdfData ? downloadPDF(pdfData, t) : t('PDF data unavailable')}>SAVE PDF</button>
        </div>
        <div className="actions" style={{ marginTop: 6 }}>
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
