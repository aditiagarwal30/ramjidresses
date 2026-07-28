import { norm, normSize, lev, fmt } from './utils.js';
import { SHORTFORMS } from '../data/shortforms.js';

/**
 * Returns { brand, score, ambiguous? } or null.
 * Lookup keyed off the prebuilt index.
 */
export function matchBrand(qRaw, { brands, brandIndex }) {
  const q = norm(qRaw);
  if (!q) return null;
  if (brandIndex[q]) return { brand: q, score: 0 };
  if (SHORTFORMS[q.toLowerCase()]) {
    const b = SHORTFORMS[q.toLowerCase()];
    if (brandIndex[b]) return { brand: b, score: 0 };
  }
  const sw = brands.filter((b) => b.startsWith(q));
  if (sw.length === 1) return { brand: sw[0], score: 1 };
  if (sw.length > 1) return { brand: sw[0], score: 1, ambiguous: sw };
  const ct = brands.filter((b) => b.includes(q));
  if (ct.length === 1) return { brand: ct[0], score: 2 };
  if (ct.length > 1) return { brand: ct[0], score: 2, ambiguous: ct };
  let best = null;
  let bestD = 99;
  brands.forEach((b) => {
    const d = lev(q, b);
    if (d < bestD && d <= Math.max(2, Math.floor(b.length / 3))) {
      bestD = d;
      best = b;
    }
  });
  if (best) return { brand: best, score: 3 + bestD };
  return null;
}

export function matchArticle(brand, qRaw, { brandArticles }) {
  const q = norm(qRaw);
  if (q === '') return brandArticles[brand].includes('') ? '' : null;
  const arts = brandArticles[brand].filter((a) => a !== '');
  if (arts.includes(q)) return q;
  const sw = arts.filter((a) => norm(a).startsWith(q));
  if (sw.length === 1) return sw[0];
  if (sw.length > 1) return { ambiguous: sw };
  const ct = arts.filter((a) => norm(a).includes(q));
  if (ct.length === 1) return ct[0];
  if (ct.length > 1) return { ambiguous: ct };
  return null;
}

export function findRow(brand, article, size, { brandIndex }) {
  return brandIndex[brand].find(
    (r) => norm(r.article) === norm(article) && normSize(r.size) === normSize(size)
  );
}

/**
 * Shorthand parser. Returns one of:
 *   { kind:'lookup', rows }
 *   { kind:'item', row, qty }
 *   { kind:'manual', qty, rate }
 *   { kind:'ambiguous', message, options:[{label,row,qty}] }
 *   { kind:'partial', message, rows }
 *   { kind:'error', message }
 */
export function parseInput(raw, idx) {
  if (!raw) return { kind: 'error', message: 'empty' };
  let s = raw.trim().replace(/[×*]/g, 'x');
  s = s.replace(/\s+/g, ' ');
  let qty = null;
  const tokens = s.split(' ').filter(Boolean);

  // Manual mode: "6 x 250" or "6 * 250" or "6 250"
  const xyMatch = s.match(/^\s*(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*$/i);
  if (xyMatch) {
    qty = parseInt(xyMatch[1], 10);
    const rate = parseFloat(xyMatch[2]);
    return { kind: 'manual', qty, rate };
  }
  if (
    tokens.length === 2 &&
    /^\d+$/.test(tokens[0]) &&
    /^\d+(\.\d+)?$/.test(tokens[1])
  ) {
    const a = parseInt(tokens[0], 10);
    const b = parseFloat(tokens[1]);
    if (b >= a || b > 50) return { kind: 'manual', qty: a, rate: b };
  }

  let endQty = null;
  if (qty === null && tokens.length >= 2) {
    const last = tokens[tokens.length - 1];
    if (/^\d{1,3}$/.test(last)) endQty = parseInt(last, 10);
  }

  function tryResolve(toks, qtyVal) {
    if (toks.length === 0) return { kind: 'error', message: 'empty' };
    const bm = matchBrand(toks[0], idx);
    if (!bm) return { kind: 'error', message: 'brand not found: ' + toks[0] };
    if (
      bm.ambiguous &&
      bm.ambiguous.length > 1 &&
      toks.length === 1 &&
      qtyVal === null
    ) {
      return {
        kind: 'lookup',
        rows: bm.ambiguous.flatMap((b) => idx.brandIndex[b]),
      };
    }
    const brand = bm.brand;
    const rest = toks.slice(1);
    if (rest.length === 0) {
      if (qtyVal !== null) return { kind: 'error', message: 'need article/size for ' + brand };
      return { kind: 'lookup', rows: idx.brandIndex[brand] };
    }
    const brandRows = idx.brandIndex[brand];
    if (rest.length === 1) {
      const bySize = brandRows.filter((r) => normSize(r.size) === normSize(rest[0]));
      if (bySize.length === 1) {
        if (qtyVal !== null) return { kind: 'item', row: bySize[0], qty: qtyVal };
        return { kind: 'lookup', rows: bySize };
      }
      if (bySize.length > 1) {
        if (qtyVal !== null) {
          return {
            kind: 'ambiguous',
            message: `${brand} ${rest[0]} — pick article:`,
            options: bySize.map((r) => ({
              label: `${r.article || '—'} · ${fmt(r.rate)}`,
              row: r,
              qty: qtyVal,
            })),
          };
        }
        return { kind: 'lookup', rows: bySize };
      }
      const am = matchArticle(brand, rest[0], idx);
      if (am && typeof am === 'string') {
        const rows = brandRows.filter((r) => norm(r.article) === norm(am));
        if (qtyVal !== null && rows.length === 1) return { kind: 'item', row: rows[0], qty: qtyVal };
        if (qtyVal !== null) {
          return {
            kind: 'ambiguous',
            message: `${brand} ${am} — pick size:`,
            options: rows.map((r) => ({
              label: `Size ${r.size} · ${fmt(r.rate)}`,
              row: r,
              qty: qtyVal,
            })),
          };
        }
        return { kind: 'lookup', rows };
      }
      if (am && am.ambiguous) {
        return {
          kind: 'lookup',
          rows: brandRows.filter((r) => am.ambiguous.includes(r.article)),
        };
      }
      return { kind: 'error', message: `no match for ${brand} ${rest[0]}` };
    }
    // 2+ rest tokens
    const lastTok = rest[rest.length - 1];
    const articleQuery = rest.slice(0, -1).join(' ');
    const am = matchArticle(brand, articleQuery, idx);
    if (am && typeof am === 'string') {
      const r = findRow(brand, am, lastTok, idx);
      if (r) {
        if (qtyVal !== null) return { kind: 'item', row: r, qty: qtyVal };
        return { kind: 'lookup', rows: [r] };
      }
      const rows = brandRows.filter((rr) => norm(rr.article) === norm(am));
      return {
        kind: 'partial',
        message: `${brand} ${am} — size "${lastTok}" not found. Available:`,
        rows,
      };
    }
    if (am && am.ambiguous) {
      return {
        kind: 'lookup',
        rows: brandRows.filter((r) => am.ambiguous.includes(r.article)),
      };
    }
    return { kind: 'error', message: `can't parse "${rest.join(' ')}" within ${brand}` };
  }

  if (endQty !== null) {
    const r = tryResolve(tokens.slice(0, -1), endQty);
    if (r.kind === 'item' || r.kind === 'ambiguous') return r;
  }
  return tryResolve(tokens, qty);
}
