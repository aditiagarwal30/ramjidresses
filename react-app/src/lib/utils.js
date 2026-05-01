export const fmt = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
export const fmt2 = (n) => Math.round(n).toLocaleString('en-IN');
export const norm = (s) => (s || '').toString().trim().toUpperCase();
// normSize: strips *, /, -, spaces so "20*30" = "2030" = "20/30" = "20-30"
export const normSize = (s) => String(s || '').toUpperCase().replace(/[\s*/\-]/g, '');

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

/* Levenshtein for typo matching */
export function lev(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m = [];
  for (let i = 0; i <= b.length; i++) m[i] = [i];
  for (let j = 0; j <= a.length; j++) m[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      m[i][j] = b[i - 1] === a[j - 1]
        ? m[i - 1][j - 1]
        : Math.min(m[i - 1][j - 1], m[i][j - 1], m[i - 1][j]) + 1;
    }
  }
  return m[b.length][a.length];
}
