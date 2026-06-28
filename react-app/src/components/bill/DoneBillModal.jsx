import { useState } from 'react';
import { escapeHtml } from '../../lib/utils.js';
import { useUI } from '../../state/UIContext.jsx';
import { sendBillToWhatsApp, downloadPDF, printPDF, copyText } from '../../lib/pdf.js';

export default function DoneBillModal({ text, pdfData, onConfirm, confirmLabel = 'DONE', onNewBill }) {
  const { showToast, hideModal } = useUI();
  const [masked, setMasked] = useState(!!pdfData?.masked);

  const t = (m) => showToast(m);
  const opts = { masked };

  // Remember the choice on the record so history re-prints match.
  const toggleMasked = () => {
    const v = !masked;
    setMasked(v);
    if (pdfData) pdfData.masked = v;
  };

  const handleConfirm = async () => {
    await onConfirm();
    hideModal();
  };

  const handleNewBill = () => {
    onNewBill();
    hideModal();
  };

  return (
    <>
      <div
        className="receipt"
        style={{ margin: 0, fontSize: '11.5px', lineHeight: 1.5 }}
        dangerouslySetInnerHTML={{ __html: escapeHtml(text) }}
      />

      <button
        type="button"
        className={'mask-toggle' + (masked ? ' on' : '')}
        onClick={toggleMasked}
        style={{ marginTop: 12 }}
      >
        <span className="box">{masked ? '✓' : ''}</span>
        <span>
          Masked bill
          <span style={{ color: 'var(--muted)', fontWeight: 400 }}> · hide item names</span>
        </span>
      </button>

      <div className="actions" style={{ marginTop: 12 }}>
        <button
          className="btn whatsapp"
          style={{ gridColumn: 'span 2' }}
          onClick={() => sendBillToWhatsApp(pdfData, t, opts)}
        >
          📄 SEND PDF · WHATSAPP
        </button>
      </div>
      <div className="actions" style={{ marginTop: 6 }}>
        <button className="btn" onClick={() => printPDF(pdfData, t, opts)}>🖨 PRINT</button>
        <button className="btn" onClick={() => downloadPDF(pdfData, t, opts)}>SAVE PDF</button>
      </div>
      <div className="actions" style={{ marginTop: 6 }}>
        <button className="btn" style={{ gridColumn: 'span 2' }} onClick={() => copyText(text, t)}>
          COPY TEXT
        </button>
      </div>
      <div className="actions" style={{ marginTop: 6 }}>
        {onNewBill ? (
          <button
            className="btn primary"
            style={{ gridColumn: 'span 2' }}
            onClick={handleNewBill}
          >
            NEW BILL
          </button>
        ) : (
          <button
            className="btn primary"
            style={{ gridColumn: 'span 2' }}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </button>
        )}
      </div>
    </>
  );
}
