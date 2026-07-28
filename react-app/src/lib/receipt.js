/**
 * Build a 36-char-wide plain-text receipt for clipboard / WhatsApp.
 * Input: { date, time, billNo, customer, lines, totals, discount, gst }
 */
export function buildReceiptText(b) {
  const W = 58;
  const nameWidth = 42;
  const amountWidth = 6;
  const remarkWidth = 16;
  const sep = '-'.repeat(W);
  const seph = '='.repeat(W);

  const padRight = (text, width) => text + ' '.repeat(Math.max(0, width - text.length));
  const padLeft = (text, width) => ' '.repeat(Math.max(0, width - text.length)) + text;
  const tableLine = (left, mid, right) => {
    return `${padRight(left, nameWidth)} ${padLeft(mid, amountWidth)}  ${padRight(right, remarkWidth)}`;
  };
  const line = (l, r = '') => {
    const sp = Math.max(1, W - l.length - r.length);
    return l + ' '.repeat(sp) + r;
  };

  const splitText = (text, width) => {
    const chunks = [];
    const words = String(text).split(' ').filter(Boolean);
    let current = '';
    const flush = () => {
      if (current) { chunks.push(current); current = ''; }
    };
    for (const word of words) {
      if ((current + (current ? ' ' : '') + word).length <= width) {
        current = current ? `${current} ${word}` : word;
      } else {
        flush();
        if (word.length <= width) {
          current = word;
        } else {
          for (let i = 0; i < word.length; i += width) {
            chunks.push(word.slice(i, i + width));
          }
        }
      }
    }
    flush();
    return chunks.length ? chunks : [''];
  };

  let out = '';
  out += '       SAHIB TRADERS\n';
  out += '       — — — — — — —\n';
  out += tableLine(b.date, '', b.time) + '\n';
  out += tableLine('Bill ' + b.billNo, '', b.customer ? '' + b.customer : '') + '\n';
  out += seph + '\n';
  out += tableLine('ITEM', 'AMT', 'REMARKS') + '\n';
  out += sep + '\n';
  b.lines.forEach((l, i) => {
    const name = `${i + 1}. ${l.brand}${l.article ? ' ' + l.article : ''}${l.size ? ' ' + l.size : ''}`;
    const rt = `${l.qty}x${Math.round(l.rate)}`;
    const am = '' + Math.round(l.rate * l.qty);
    const remark = l.remark ? String(l.remark).trim() : '';
    const nameLines = splitText(name, nameWidth);
    const remarkLines = remark ? splitText(remark, remarkWidth) : [''];
    const maxLines = Math.max(nameLines.length, remarkLines.length);

    for (let idx = 0; idx < maxLines; idx += 1) {
      const left = nameLines[idx] || '';
      const mid = idx === 0 ? am : '';
      const right = remarkLines[idx] || '';
      out += tableLine(left, mid, right) + '\n';
    }
    out += '   ' + rt + '\n';
  });
  out += sep + '\n';
  out += tableLine('Subtotal', '' + Math.round(b.totals.subtotal), '') + '\n';
  if (b.totals.discAmt > 0) {
    const dl = b.discount.type === 'pct' ? `Discount ${b.discount.value}%` : 'Discount';
    out += tableLine(dl, '-' + Math.round(b.totals.discAmt), '') + '\n';
  }
  if (b.gst > 0) out += tableLine(`GST ${b.gst}%`, '+' + Math.round(b.totals.gstAmt), '') + '\n';
  if (b.totals.transport > 0) out += tableLine('Transport', '+' + Math.round(b.totals.transport), '') + '\n';
  if (b.totals.previousBalance > 0) out += tableLine('Previous Balance', '+' + Math.round(b.totals.previousBalance), '') + '\n';
  if (b.totals.deposit > 0) out += tableLine('Deposit', '-' + Math.round(b.totals.deposit), '') + '\n';
  out += seph + '\n';
  out += tableLine('TOTAL  Rs.', Math.round(b.totals.total).toLocaleString('en-IN'), '') + '\n';
  out += seph + '\n';
  out += tableLine(`${b.lines.length} items`, `${b.totals.qtyCount} qty`, '') + '\n';
  out += '\n  Thank you — visit again\n';
  return out;
}
