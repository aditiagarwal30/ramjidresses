import { useState } from 'react';
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
  const open = openId != null ? history.find((h) => h.id === openId) : null;

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
          <span className="count">{history.length}{history.length === 1 ? ' BILL' : ' BILLS'}</span>
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
      {history.length === 0 ? (
        <div className="empty">
          <div className="big">No bills yet</div>
          <div>finish a bill — it'll appear here</div>
        </div>
      ) : (
        history.map((h) => (
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
