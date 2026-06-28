import { useState } from 'react';
import { escapeHtml } from '../../lib/utils.js';
import { useUI } from '../../state/UIContext.jsx';
import { sendBillToWhatsApp, downloadPDF, printPDF, copyText } from '../../lib/pdf.js';
import { buildReceiptText } from '../../lib/receipt.js';

export default function DoneBillModal({ text, pdfData, onConfirm, confirmLabel = 'DONE', onNewBill }) {
  const { showToast, hideModal } = useUI();
  const [masked, setMasked] = useState(!!pdfData?.masked);
  const [finalText, setFinalText] = useState(text);
  const [finalPdfData, setFinalPdfData] = useState(pdfData);
  const [finalized, setFinalized] = useState(false);
  const [saving, setSaving] = useState(false);

  const t = (m) => showToast(m);
  const opts = { masked };

  // Remember the choice on the record so history re-prints match.
  const toggleMasked = () => {
    const v = !masked;
    setMasked(v);
    if (finalPdfData) setFinalPdfData({ ...finalPdfData, masked: v });
  };

  const handleConfirm = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const saved = await onConfirm();
      if (saved !== false) {
        if (saved?.pdfData) {
          setFinalPdfData(saved.pdfData);
          setFinalText(buildReceiptText(saved.pdfData));
        }
        setFinalized(true);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    hideModal();
  };

  const handleNewBill = () => {
    if (onNewBill) onNewBill();
    hideModal();
  };

  return (
    <>
      <div
        className="receipt"
        style={{ margin: 0, fontSize: '11.5px', lineHeight: 1.5 }}
        dangerouslySetInnerHTML={{ __html: escapeHtml(finalText) }}
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

      {finalized ? (
        <>
          <div className="actions" style={{ marginTop: 12 }}>
            <button
              className="btn whatsapp"
              style={{ gridColumn: 'span 2' }}
              onClick={() => finalPdfData ? sendBillToWhatsApp(finalPdfData, t, opts) : t('PDF data unavailable')}
            >
              📄 SEND PDF · WHATSAPP
            </button>
          </div>
          <div className="actions" style={{ marginTop: 6 }}>
            <button className="btn" onClick={() => finalPdfData ? printPDF(finalPdfData, t, opts) : t('PDF data unavailable')}>🖨 PRINT</button>
            <button className="btn" onClick={() => finalPdfData ? downloadPDF(finalPdfData, t, opts) : t('PDF data unavailable')}>SAVE PDF</button>
          </div>
          <div className="actions" style={{ marginTop: 6 }}>
            <button className="btn" style={{ gridColumn: 'span 2' }} onClick={() => copyText(finalText, t)}>
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
                onClick={handleClose}
              >
                CLOSE
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="actions" style={{ marginTop: 12 }}>
          <button
            className="btn primary"
            style={{ gridColumn: 'span 2' }}
            onClick={handleConfirm}
            disabled={saving}
          >
            {saving ? 'FINALIZING…' : confirmLabel}
          </button>
        </div>
      )}
    </>
  );
}
