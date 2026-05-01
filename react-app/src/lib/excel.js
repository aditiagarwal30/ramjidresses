import * as XLSX from 'xlsx';

export async function readSheetFromFile(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  if (!wb.SheetNames.length) return { json: [], headers: [] };
  const ws = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
  return { json, headers: json.length ? Object.keys(json[0]) : [] };
}

export function parseRateRows(rows) {
  const out = { rows: [], errors: [], brands: new Set(), fatal: null };
  if (!rows.length) return out;
  const keys = Object.keys(rows[0]);
  const norm = (s) => s.toLowerCase().replace(/[\s_\-]+/g, '');
  const findCol = (...patterns) => {
    for (const p of patterns) {
      const k = keys.find((k) => norm(k) === p);
      if (k) return k;
    }
    for (const p of patterns) {
      const k = keys.find((k) => norm(k).includes(p));
      if (k) return k;
    }
    return null;
  };
  const colBrand = findCol('brand', 'company', 'mfg');
  const colArticle = findCol('article', 'art', 'code', 'sku', 'design');
  const colSize = findCol('size', 'sz');
  const colRate = findCol('rate', 'price', 'mrp', 'amount', 'cost');

  if (!colBrand || !colSize || !colRate) {
    const missing = [];
    if (!colBrand) missing.push('brand');
    if (!colSize) missing.push('size');
    if (!colRate) missing.push('rate');
    out.fatal = 'Missing column(s): ' + missing.join(', ');
    return out;
  }
  rows.forEach((row, i) => {
    const brand = String(row[colBrand] || '').trim().toUpperCase();
    const article = colArticle ? String(row[colArticle] || '').trim().toUpperCase() : '';
    const size = String(row[colSize] || '').trim().toUpperCase();
    const rateRaw = String(row[colRate] || '').replace(/[₹,\s]/g, '');
    const rate = parseFloat(rateRaw);
    if (!brand || !size || isNaN(rate) || rate <= 0) {
      out.errors.push({ row: i + 2 });
      return;
    }
    out.rows.push({ brand, article, size, rate });
    out.brands.add(brand);
  });
  return out;
}
