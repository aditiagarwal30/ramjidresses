import { escapeHtml } from '../../lib/utils.js';
import { useUI } from '../../state/UIContext.jsx';
import { sendBillToWhatsApp, downloadPDF, copyText } from '../../lib/pdf.js';

export default function DoneBillModal({ text, pdfData, onNewBill }) {
  const { showToast, hideModal } = useUI();

  const t = (m) => showToast(m);

  return (
    <>
      <div
        className="receipt"
        style={{ margin: 0, fontSize: '11.5px', lineHeight: 1.5 }}
        dangerouslySetInnerHTML={{ __html: escapeHtml(text) }}
      />
      <div className="actions" style={{ marginTop: 14 }}>
        <button
          className="btn whatsapp"
          style={{ gridColumn: 'span 2' }}
          onClick={() => sendBillToWhatsApp(pdfData, t)}
        >
          📄 SEND PDF · WHATSAPP
        </button>
      </div>
      <div className="actions" style={{ marginTop: 6 }}>
        <button className="btn" onClick={() => copyText(text, t)}>COPY</button>
        <button className="btn" onClick={() => downloadPDF(pdfData, t)}>SAVE PDF</button>
      </div>
      <div className="actions" style={{ marginTop: 6 }}>
        <button
          className="btn primary"
          style={{ gridColumn: 'span 2' }}
          onClick={() => { onNewBill(); hideModal(); }}
        >
          NEW BILL
        </button>
      </div>
    </>
  );
}
