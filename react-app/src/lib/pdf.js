import { jsPDF } from 'jspdf';

/**
 * Generate an A4 tax-invoice PDF. Long bills paginate across multiple A4
 * sheets (real page breaks) instead of being squeezed onto one tall page.
 * billData: { lines, customer, discount, gst, totals, billNo, date, time }
 */
export function generatePDF(billData) {
  const pageW = 210; // A4 width in mm
  const pageH = 297; // A4 height in mm
  const margin = 16;
  const right = pageW - margin;

  // Column x-positions (right edges are right-aligned)
  const numX = margin;
  const itemX = margin + 9;
  const qtyRight = 132;
  const rateRight = 162;
  const amtRight = right;
  const maxNameW = qtyRight - itemX - 8;

  // Bottom of the printable area for line items.
  const bottomLimit = pageH - margin - 6;

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  let y = 0;

  const drawTableHeader = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('#', numX, y);
    doc.text('ITEM', itemX, y);
    doc.text('QTY', qtyRight, y, { align: 'right' });
    doc.text('RATE', rateRight, y, { align: 'right' });
    doc.text('AMOUNT', amtRight, y, { align: 'right' });
    y += 2;
    doc.setLineWidth(0.3);
    doc.line(margin, y, right, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
  };

  const drawPageHeader = (continued) => {
    y = margin + 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('RAMJI DRESSES', pageW / 2, y, { align: 'center' });
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('TAX INVOICE / BILL' + (continued ? ' (continued)' : ''), pageW / 2, y, {
      align: 'center',
    });
    y += 6;
    doc.setLineWidth(0.4);
    doc.line(margin, y, right, y);
    y += 8;

    doc.setFontSize(10);
    doc.text(`Bill: ${billData.billNo}`, margin, y);
    doc.text(billData.date, right, y, { align: 'right' });
    y += 5;
    doc.text(`Time: ${billData.time}`, margin, y);
    if (billData.customer) {
      doc.text(`Customer: ${billData.customer}`, right, y, { align: 'right' });
    }
    y += 8;
    drawTableHeader();
  };

  drawPageHeader(false);

  billData.lines.forEach((l, i) => {
    const itemNameRaw = `${l.brand}${l.article ? ' ' + l.article : ''}${l.size ? ' · Size ' + l.size : ''}`;
    const wrapped = doc.splitTextToSize(itemNameRaw, maxNameW);
    const rowH = Math.max(7, wrapped.length * 4.6 + 2.5);

    if (y + rowH > bottomLimit) {
      doc.addPage();
      drawPageHeader(true);
    }

    doc.text(String(i + 1), numX, y);
    doc.text(wrapped, itemX, y);
    doc.text(String(l.qty), qtyRight, y, { align: 'right' });
    doc.text(String(Math.round(l.rate)), rateRight, y, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(String(Math.round(l.rate * l.qty)), amtRight, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    y += rowH;
  });

  // Totals block — keep it together; push to a new page if it won't fit.
  const t = billData.totals;
  const rows = 1 + (t.discAmt > 0 ? 1 : 0) + (billData.gst > 0 ? 1 : 0);
  const totalsH = rows * 6 + 30;
  if (y + totalsH > bottomLimit) {
    doc.addPage();
    drawPageHeader(true);
  }

  y += 2;
  doc.setLineWidth(0.3);
  doc.line(margin, y, right, y);
  y += 8;

  const labelX = 128;
  doc.setFontSize(11);
  doc.text('Subtotal', labelX, y);
  doc.text(String(Math.round(t.subtotal)), amtRight, y, { align: 'right' });
  y += 6;
  if (t.discAmt > 0) {
    const dl =
      billData.discount.type === 'pct'
        ? `Discount (${billData.discount.value}%)`
        : 'Discount';
    doc.text(dl, labelX, y);
    doc.text('-' + Math.round(t.discAmt), amtRight, y, { align: 'right' });
    y += 6;
  }
  if (billData.gst > 0) {
    doc.text(`GST ${billData.gst}%`, labelX, y);
    doc.text('+' + Math.round(t.gstAmt), amtRight, y, { align: 'right' });
    y += 6;
  }
  doc.setLineWidth(0.4);
  doc.line(labelX, y, right, y);
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('TOTAL', labelX, y);
  doc.text('Rs. ' + Math.round(t.total).toLocaleString('en-IN'), amtRight, y, { align: 'right' });
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`${billData.lines.length} items · ${t.qtyCount} qty`, margin, y);
  y += 8;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10);
  doc.text('Thank you — visit again', pageW / 2, y, { align: 'center' });

  // Page numbers across all pages (now that the total count is known).
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Page ${p} of ${pageCount}`, pageW / 2, pageH - 8, { align: 'center' });
  }

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

/**
 * Open the OS print dialog for the bill. Generates the A4 PDF, loads it into
 * a hidden iframe, and triggers print — so the user picks any printer / paper
 * and gets the proper multi-page layout instead of a screenshot.
 */
export function printPDF(billData, toast) {
  const doc = generatePDF(billData);
  if (!doc) { toast('PDF lib not ready'); return; }

  doc.autoPrint();
  const url = doc.output('bloburl');

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.src = url;

  iframe.onload = () => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) {
      // Some mobile browsers block iframe printing — fall back to a new tab.
      window.open(url, '_blank');
    }
    // Clean up well after the print dialog has had time to open.
    setTimeout(() => {
      iframe.remove();
      URL.revokeObjectURL(url);
    }, 60000);
  };

  document.body.appendChild(iframe);
  toast('opening print…');
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
