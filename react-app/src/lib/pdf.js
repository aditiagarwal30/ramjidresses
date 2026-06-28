import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

// Broadcast / WhatsApp channel the bottom QR points to.
export const CHANNEL_URL = 'https://chat.whatsapp.com/DHti4FTnLnk9yHelWuACUy?mode=gi_t';

const FIRM = 'SAHIB TRADERS';
const GREETING = 'JI AYA NU';

// Palette (RGB)
const C_LIGHTGREEN = [226, 240, 217];
const C_GREEN = [112, 173, 71];
const C_YELLOW = [255, 242, 0];
const C_GREENHL = [169, 208, 142];
const C_MUTED = [110, 110, 110];

/**
 * Generate an A5 wholesale-style invoice PDF that mirrors the shop's paper
 * format: greeting band, customer band, meta rows, a bordered item table,
 * a green TOTAL row, the TRANSPORT/TAX/DEPOSIT/NET BILL footer, and a QR to
 * the firm's broadcast channel. Long bills paginate across A5 sheets.
 * billData: { lines, customer, salesman, discount, gst, totals, billNo, date, time }
 */
export function generatePDF(billData, opts = {}) {
  const masked = !!opts.masked; // hide the ITEM column (item names removed)
  const pageW = 148; // A5 width in mm
  const pageH = 210; // A5 height in mm
  const margin = 7;
  const left = margin;
  const right = pageW - margin;   // 141
  const contentW = right - left;  // 134

  // Item-table columns — widths differ when the ITEM column is masked off.
  const colDefs = masked
    ? [{ k: 'sno', w: 16 }, { k: 'qty', w: 28 }, { k: 'rate', w: 30 }, { k: 'total', w: 36 }, { k: 'rem', w: 24 }]
    : [{ k: 'sno', w: 11 }, { k: 'item', w: 47 }, { k: 'qty', w: 16 }, { k: 'rate', w: 17 }, { k: 'total', w: 22 }, { k: 'rem', w: 21 }];
  const col = {};
  let acc = left;
  for (const d of colDefs) { col[d.k] = { x0: acc, x1: acc + d.w, c: acc + d.w / 2 }; acc += d.w; }
  // Internal divider x-positions (right edge of every column except the last).
  const dividers = colDefs.slice(0, -1).map((d) => col[d.k].x1);
  const snoC = col.sno.c;
  const qtyC = col.qty.c;
  const rateC = col.rate.c;
  const totalC = col.total.c;
  const remC = col.rem.c;
  const itemX = masked ? 0 : col.item.x0 + 2;
  const itemMaxW = masked ? 0 : col.item.w - 4;
  // "TOTAL" summary label spans from the left edge to the QTY column.
  const totalLabelC = (left + col.qty.x0) / 2;

  const ITEMS_BOTTOM = pageH - margin - 4;

  const doc = new jsPDF({ unit: 'mm', format: 'a5', orientation: 'portrait' });
  let y = 0;

  const setText = (c) => doc.setTextColor(c[0], c[1], c[2]);
  const setFill = (c) => doc.setFillColor(c[0], c[1], c[2]);

  // QR rendered as vector squares (sync — no async image step).
  const drawQR = (text, x, qy, size) => {
    let qr;
    try { qr = QRCode.create(text, { errorCorrectionLevel: 'M' }); }
    catch (e) { return; }
    const n = qr.modules.size;
    const data = qr.modules.data;
    const px = size / n;
    setFill([0, 0, 0]);
    for (let r = 0; r < n; r++) {
      for (let col = 0; col < n; col++) {
        if (data[r * n + col]) {
          doc.rect(x + col * px, qy + r * px, px + 0.03, px + 0.03, 'F');
        }
      }
    }
  };

  // Yellow column header — repeats on every page.
  const drawTableHead = () => {
    const h = 8;
    setFill(C_YELLOW);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.rect(left, y, contentW, h, 'FD');
    dividers.forEach((x) => doc.line(x, y, x, y + h));
    setText([0, 0, 0]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const hy = y + 5.4;
    doc.text('S.NO', snoC, hy, { align: 'center' });
    if (!masked) doc.text('ITEM', itemX, hy);
    doc.text('QTY', qtyC, hy, { align: 'center' });
    doc.text('RATE', rateC, hy, { align: 'center' });
    doc.text('TOTAL', totalC, hy, { align: 'center' });
    doc.text('REMARKS', remC, hy, { align: 'center' });
    y += h;
  };

  // Slim continuation marker on pages 2+.
  const contHeader = () => {
    y = margin;
    setText(C_MUTED);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(FIRM + ' (contd.)', pageW / 2, y + 4, { align: 'center' });
    y += 6;
  };

  // Full top banner (page 1 only).
  const drawTopHeader = () => {
    y = margin;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);

    // Greeting + firm band
    const bH = 15;
    setFill(C_LIGHTGREEN);
    doc.rect(left, y, contentW, bH, 'FD');
    setText([0, 0, 0]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(GREETING, pageW / 2, y + 5.5, { align: 'center' });
    doc.setFontSize(15);
    doc.text(FIRM, pageW / 2, y + 12, { align: 'center' });
    y += bH;

    // Customer band
    const cH = 9;
    setFill(C_GREEN);
    doc.rect(left, y, contentW, cH, 'FD');
    setText([0, 0, 0]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(billData.customer || '—', pageW / 2, y + 6.2, { align: 'center' });
    y += cH;

    // Meta rows (2 rows × 2 cells)
    const mH = 7;
    const midX = left + contentW / 2;
    const labelVal = (lbl, val, x, yy) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      setText([0, 0, 0]);
      doc.text(lbl, x + 2, yy + 4.8);
      const lw = doc.getTextWidth(lbl);
      doc.setFont('helvetica', 'normal');
      doc.text(' ' + val, x + 2 + lw, yy + 4.8);
    };

    doc.rect(left, y, contentW / 2, mH);
    doc.rect(midX, y, contentW / 2, mH);
    labelVal('ADDRESS:-', billData.address || '', left, y);
    labelVal('DATE:-', billData.date || '', midX, y);
    y += mH;

    doc.rect(left, y, contentW / 2, mH);
    doc.rect(midX, y, contentW / 2, mH);
    labelVal('INVOICE NO:-', billData.billNo || '', left, y);
    // Salesman (+ time) sits in the top-right cell.
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    setText([0, 0, 0]);
    const rv = (billData.salesman ? billData.salesman + '   ' : '') + (billData.time || '');
    doc.text(rv, midX + 2, y + 4.8);
    y += mH;

    drawTableHead();
  };

  drawTopHeader();

  // --- item rows ---
  doc.setLineWidth(0.3);
  billData.lines.forEach((l, i) => {
    const nm = `${l.brand}${l.article ? ' ' + l.article : ''}${l.size ? ' ' + l.size : ''}`;
    const wrapped = masked ? [] : doc.splitTextToSize(nm, itemMaxW);
    const rH = Math.max(7, wrapped.length * 3.8 + 3);

    if (y + rH > ITEMS_BOTTOM) {
      doc.addPage();
      contHeader();
      drawTableHead();
    }

    doc.setDrawColor(0, 0, 0);
    doc.rect(left, y, contentW, rH);
    dividers.forEach((x) => doc.line(x, y, x, y + rH));

    setText([0, 0, 0]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const by = wrapped.length > 1 ? y + 4 : y + rH / 2 + 1.4;
    doc.text(String(i + 1), snoC, by, { align: 'center' });
    if (!masked) doc.text(wrapped, itemX, by);
    doc.text(String(l.qty), qtyC, by, { align: 'center' });
    doc.text(String(Math.round(l.rate)), rateC, by, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text(String(Math.round(l.rate * l.qty)), totalC, by, { align: 'center' });
    y += rH;
  });

  const t = billData.totals;

  // Footer rows. DISCOUNT only appears when there is one, so the printed
  // figures always reconcile: TOTAL − DISCOUNT + TRANSPORT + TAX − DEPOSIT = NET BILL.
  const rows = [];
  if (t.discAmt > 0) {
    const dl = billData.discount && billData.discount.type === 'pct'
      ? `DISCOUNT ${billData.discount.value}%`
      : 'DISCOUNT';
    rows.push({ label: dl, value: '- ' + Math.round(t.discAmt) });
  }
  rows.push({ label: 'TRANSPORT', value: t.transport > 0 ? '+ ' + Math.round(t.transport) : '' });
  rows.push({ label: 'TAX', value: t.gstAmt > 0 ? '+ ' + Math.round(t.gstAmt) : '' });
  rows.push({ label: 'DEPOSIT', value: t.deposit > 0 ? '- ' + Math.round(t.deposit) : '' });
  rows.push({ label: 'NET BILL', value: String(Math.round(t.total)), net: true });

  // --- TOTAL row + footer: keep together; move to a fresh page if needed ---
  const totH = 8;
  const footRowH = 9;
  const footH = footRowH * rows.length;
  if (y + totH + footH + 8 > ITEMS_BOTTOM) {
    doc.addPage();
    contHeader();
  }

  // TOTAL row (green qty + total cells)
  setFill(C_GREENHL);
  doc.rect(col.qty.x0, y, col.qty.x1 - col.qty.x0, totH, 'F');
  doc.rect(col.total.x0, y, col.total.x1 - col.total.x0, totH, 'F');
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(left, y, contentW, totH);
  dividers.forEach((x) => doc.line(x, y, x, y + totH));
  setText([0, 0, 0]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  const ty = y + 5.4;
  doc.text('TOTAL', totalLabelC, ty, { align: 'center' });
  doc.text(String(t.qtyCount), qtyC, ty, { align: 'center' });
  doc.text(String(Math.round(t.subtotal)), totalC, ty, { align: 'center' });
  y += totH;

  // --- footer: DISCOUNT / TRANSPORT / TAX / DEPOSIT / NET BILL  +  QR ---
  const footTop = y;
  const labelW = 38;
  const valueW = 30;
  const fValX = left + labelW;        // 45
  const qrZoneX = fValX + valueW;     // 75
  const qrZoneW = right - qrZoneX;    // 66

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  rows.forEach((row, i) => {
    const ry = footTop + i * footRowH;
    if (row.net) {
      setFill(C_GREENHL);
      doc.rect(fValX, ry, valueW, footRowH, 'F');
    }
    doc.rect(left, ry, labelW, footRowH);
    doc.rect(fValX, ry, valueW, footRowH);
    setText([0, 0, 0]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(row.label.length > 7 ? 9 : 10);
    doc.text(row.label, left + 2, ry + footRowH / 2 + 1.6);
    if (row.value) {
      doc.setFontSize(10);
      doc.text(
        row.value,
        fValX + valueW - 2,
        ry + footRowH / 2 + 1.6,
        { align: 'right' }
      );
    }
  });

  // QR zone (spans all 4 footer rows)
  doc.rect(qrZoneX, footTop, qrZoneW, footH);
  setText([0, 0, 0]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(FIRM, qrZoneX + qrZoneW / 2, footTop + 4.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  setText(C_MUTED);
  doc.text('Scan to join our channel', qrZoneX + qrZoneW / 2, footTop + 8, { align: 'center' });
  const qrSize = Math.min(qrZoneW - 6, footH - 12);
  drawQR(CHANNEL_URL, qrZoneX + (qrZoneW - qrSize) / 2, footTop + 10, qrSize);
  y = footTop + footH;

  // Closing line
  y += 5;
  setText(C_MUTED);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.text('HAVE A NICE DAY', pageW / 2, y, { align: 'center' });

  // Page numbers only when it spills past one sheet.
  const pageCount = doc.getNumberOfPages();
  if (pageCount > 1) {
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      setText(C_MUTED);
      doc.text(`Page ${p} / ${pageCount}`, pageW / 2, pageH - 3.5, { align: 'center' });
    }
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
export async function sendBillToWhatsApp(billData, toast, opts = {}) {
  const doc = generatePDF(billData, opts);
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
 * Print the bill. Opens the generated PDF in a new tab and lets the PDF
 * viewer drive the print dialog (via autoPrint).
 *
 * We deliberately DON'T use a hidden iframe + contentWindow.print(): on
 * Safari/macOS that prints the host web page (the app UI) instead of the
 * PDF inside the iframe. Opening the real PDF guarantees the right document
 * is what gets printed.
 */
export function printPDF(billData, toast, opts = {}) {
  const doc = generatePDF(billData, opts);
  if (!doc) { toast('PDF lib not ready'); return; }

  doc.autoPrint();
  const url = doc.output('bloburl');

  const win = window.open(url, '_blank');
  if (!win) {
    // Pop-up blocked — fall back to a direct download so the user still
    // gets the correct PDF (which they can then print).
    const tag = opts.masked ? '-masked' : '';
    doc.save(`bill-${billData.billNo.replace('#', '')}${tag}.pdf`);
    toast('Pop-up blocked · PDF saved — open it to print');
    return;
  }

  // Some viewers ignore autoPrint; nudge the print dialog once the PDF loads.
  try {
    win.addEventListener('load', () => {
      try { win.focus(); win.print(); } catch (e) { /* viewer handles it */ }
    });
  } catch (e) { /* cross-viewer access blocked — autoPrint still applies */ }

  // Release the blob URL well after the viewer has loaded it.
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  toast('opening print…');
}

export function downloadPDF(billData, toast, opts = {}) {
  const doc = generatePDF(billData, opts);
  if (!doc) { toast('PDF lib not ready'); return; }
  const tag = opts.masked ? '-masked' : '';
  doc.save(`bill-${billData.billNo.replace('#', '')}${tag}.pdf`);
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
