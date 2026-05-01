/**
 * Build a 36-char-wide plain-text receipt for clipboard / WhatsApp.
 * Input: { date, time, billNo, customer, lines, totals, discount, gst }
 */
export function buildReceiptText(b) {
  const W = 36;
  const line = (l, r = '') => {
    const sp = Math.max(1, W - l.length - r.length);
    return l + ' '.repeat(sp) + r;
  };
  const sep = '-'.repeat(W);
  const seph = '='.repeat(W);

  let out = '';
  out += '       RAMJI DRESSES\n';
  out += '       — — — — — — —\n';
  out += line(b.date, b.time) + '\n';
  out += line('Bill ' + b.billNo, b.customer ? '' + b.customer : '') + '\n';
  out += seph + '\n';
  b.lines.forEach((l, i) => {
    const name = `${i + 1}. ${l.brand}${l.article ? ' ' + l.article : ''}${l.size ? ' ' + l.size : ''}`;
    const rt = `${l.qty}x${Math.round(l.rate)}`;
    const am = '' + Math.round(l.rate * l.qty);
    out += line(name.slice(0, W - am.length - 1), am) + '\n';
    out += '   ' + rt + '\n';
  });
  out += sep + '\n';
  out += line('Subtotal', '' + Math.round(b.totals.subtotal)) + '\n';
  if (b.totals.discAmt > 0) {
    const dl = b.discount.type === 'pct' ? `Discount ${b.discount.value}%` : 'Discount';
    out += line(dl, '-' + Math.round(b.totals.discAmt)) + '\n';
  }
  if (b.gst > 0) out += line(`GST ${b.gst}%`, '+' + Math.round(b.totals.gstAmt)) + '\n';
  out += seph + '\n';
  out += line('TOTAL  Rs.', Math.round(b.totals.total).toLocaleString('en-IN')) + '\n';
  out += seph + '\n';
  out += line(`${b.lines.length} items`, `${b.totals.qtyCount} qty`) + '\n';
  out += '\n  Thank you — visit again\n';
  return out;
}
