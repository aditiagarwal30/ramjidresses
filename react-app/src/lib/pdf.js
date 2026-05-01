import { jsPDF } from 'jspdf';

/**
 * Generate a thermal-receipt-style PDF (80mm wide, dynamic height).
 * billData: { lines, customer, discount, gst, totals, billNo, date, time }
 */
export function generatePDF(billData) {
  const pageW = 80;
  const margin = 6;
  const contentW = pageW - margin * 2;

  const baseH = 70;
  const lineH = 10;
  const estH =
    baseH +
    billData.lines.length * lineH +
    (billData.discount.type ? 6 : 0) +
    (billData.gst > 0 ? 6 : 0);
  const pageH = Math.max(140, estH);

  const doc = new jsPDF({ unit: 'mm', format: [pageW, pageH], orientation: 'portrait' });

  let y = margin + 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('RAMJI DRESSES', pageW / 2, y, { align: 'center' });
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('TAX INVOICE / BILL', pageW / 2, y, { align: 'center' });
  y += 4;
  doc.setLineWidth(0.2);
  doc.line(margin, y, pageW - margin, y);
  y += 4;

  doc.setFontSize(8);
  doc.text(`Bill: ${billData.billNo}`, margin, y);
  doc.text(billData.date, pageW - margin, y, { align: 'right' });
  y += 4;
  doc.text(`Time: ${billData.time}`, margin, y);
  if (billData.customer) {
    doc.text(`Customer: ${billData.customer}`, pageW - margin, y, { align: 'right' });
  }
  y += 3;
  doc.setLineDashPattern([0.5, 0.5], 0);
  doc.line(margin, y, pageW - margin, y);
  doc.setLineDashPattern([], 0);
  y += 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('ITEM', margin, y);
  doc.text('QTY', pageW - margin - 26, y, { align: 'right' });
  doc.text('RATE', pageW - margin - 14, y, { align: 'right' });
  doc.text('AMT', pageW - margin, y, { align: 'right' });
  y += 1;
  doc.setLineWidth(0.15);
  doc.line(margin, y, pageW - margin, y);
  y += 3.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  billData.lines.forEach((l, i) => {
    const itemNameRaw = `${i + 1}. ${l.brand}${l.article ? ' ' + l.article : ''}${l.size ? ' · ' + l.size : ''}`;
    const maxNameW = contentW - 28;
    const wrapped = doc.splitTextToSize(itemNameRaw, maxNameW);
    doc.text(wrapped[0], margin, y);
    doc.text(String(l.qty), pageW - margin - 26, y, { align: 'right' });
    doc.text(String(Math.round(l.rate)), pageW - margin - 14, y, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(String(Math.round(l.rate * l.qty)), pageW - margin, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    y += 4;
    for (let w = 1; w < wrapped.length; w++) {
      doc.setFontSize(7);
      doc.text(wrapped[w], margin + 3, y);
      doc.setFontSize(8);
      y += 3.5;
    }
  });

  y += 1;
  doc.setLineDashPattern([0.5, 0.5], 0);
  doc.line(margin, y, pageW - margin, y);
  doc.setLineDashPattern([], 0);
  y += 4;

  const t = billData.totals;
  doc.setFontSize(8);
  doc.text('Subtotal', margin, y);
  doc.text(String(Math.round(t.subtotal)), pageW - margin, y, { align: 'right' });
  y += 4;
  if (t.discAmt > 0) {
    const dl = billData.discount.type === 'pct'
      ? `Discount (${billData.discount.value}%)`
      : 'Discount';
    doc.text(dl, margin, y);
    doc.text('-' + Math.round(t.discAmt), pageW - margin, y, { align: 'right' });
    y += 4;
  }
  if (billData.gst > 0) {
    doc.text(`GST ${billData.gst}%`, margin, y);
    doc.text('+' + Math.round(t.gstAmt), pageW - margin, y, { align: 'right' });
    y += 4;
  }
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageW - margin, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('TOTAL', margin, y);
  doc.text('Rs. ' + Math.round(t.total).toLocaleString('en-IN'), pageW - margin, y, { align: 'right' });
  y += 4;
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageW - margin, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`${billData.lines.length} items · ${t.qtyCount} qty`, pageW / 2, y, { align: 'center' });
  y += 5;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.text('Thank you — visit again', pageW / 2, y, { align: 'center' });

  return doc;
}

/**
 * "Send PDF on WhatsApp": uses the Web Share API to hand the PDF to the OS
 * share sheet. On mobile (Android Chrome / iOS Safari) the sheet includes
 * WhatsApp; picking it attaches the PDF properly with a pre-filled caption.
 *
 * If the browser doesn't support file share (most desktops), we tell the
 * user to use SAVE PDF instead — we explicitly DO NOT auto-download here.
 */
export async function sendBillToWhatsApp(billData, toast) {
  const doc = generatePDF(billData);
  if (!doc) {
    toast('PDF lib not ready');
    return;
  }
  const blob = doc.output('blob');
  const fileName = `bill-${billData.billNo.replace('#', '')}.pdf`;
  const file = new File([blob], fileName, { type: 'application/pdf' });

  if (!navigator.canShare || !navigator.canShare({ files: [file] })) {
    toast('Sharing not supported here · use SAVE PDF');
    return;
  }

  try {
    await navigator.share({
      title: 'Bill ' + billData.billNo,
      text:
        `Bill ${billData.billNo}` +
        (billData.customer ? ` — ${billData.customer}` : '') +
        `\nTotal: ₹${Math.round(billData.totals.total).toLocaleString('en-IN')}`,
      files: [file],
    });
    toast('shared ✓');
  } catch (e) {
    if (e.name === 'AbortError') return; // user cancelled
    toast('Share failed · try SAVE PDF');
  }
}

export function downloadPDF(billData, toast) {
  const doc = generatePDF(billData);
  if (!doc) { toast('PDF lib not ready'); return; }
  doc.save(`bill-${billData.billNo.replace('#', '')}.pdf`);
  toast('PDF saved to device');
}

export function copyText(t, toast) {
  navigator.clipboard.writeText(t).then(() => toast('copied to clipboard'))
    .catch(() => {
      const ta = document.createElement('textarea');
      ta.value = t;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      toast('copied');
    });
}
