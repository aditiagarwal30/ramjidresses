export const RATES_KEY = 'paras.rates.v1';
export const RATES_META_KEY = 'paras.rates.meta.v1';
export const STATE_KEY = 'paras.bill.state.v1';
export const HIST_KEY = 'paras.bill.history.v1';

export function defaultBillState() {
  return {
    customer: '',
    lines: [],
    discount: { type: null, value: 0 },
    gst: 0,
  };
}

export function loadBillState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (raw) return Object.assign(defaultBillState(), JSON.parse(raw));
  } catch (e) { /* noop */ }
  return defaultBillState();
}

export function saveBillState(state) {
  try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (e) { /* noop */ }
}

export function loadHistory() {
  try {
    const raw = localStorage.getItem(HIST_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* noop */ }
  return [];
}

export function saveHistory(h) {
  try { localStorage.setItem(HIST_KEY, JSON.stringify(h)); } catch (e) { /* noop */ }
}

export function loadStoredRates() {
  try {
    const raw = localStorage.getItem(RATES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch (e) { /* noop */ }
  return null;
}

export function loadRatesMeta() {
  try {
    const m = localStorage.getItem(RATES_META_KEY);
    if (m) return JSON.parse(m);
  } catch (e) { /* noop */ }
  return null;
}

export function saveRates(rates, fileName) {
  try {
    localStorage.setItem(RATES_KEY, JSON.stringify(rates));
    localStorage.setItem(RATES_META_KEY, JSON.stringify({
      fileName,
      date: new Date().toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
      }) + ', ' + new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', hour12: true,
      }),
      count: rates.length,
    }));
    return true;
  } catch (e) {
    return false;
  }
}

export function clearStoredRates() {
  try {
    localStorage.removeItem(RATES_KEY);
    localStorage.removeItem(RATES_META_KEY);
  } catch (e) { /* noop */ }
}

export function calcTotals(snap) {
  const subtotal = (snap.lines || []).reduce((s, l) => s + l.rate * l.qty, 0);
  let discAmt = 0;
  const d = snap.discount || { type: null, value: 0 };
  if (d.type === 'pct') discAmt = subtotal * d.value / 100;
  else if (d.type === 'flat') discAmt = d.value;
  if (discAmt > subtotal) discAmt = subtotal;
  const afterDisc = subtotal - discAmt;
  const gstAmt = afterDisc * (snap.gst || 0) / 100;
  const total = afterDisc + gstAmt;
  const qtyCount = (snap.lines || []).reduce((s, l) => s + l.qty, 0);
  return { subtotal, discAmt, afterDisc, gstAmt, total, qtyCount };
}
