/**
 * Build sorted brand list and lookup indexes from a flat RATES array.
 * Returns { brands, brandIndex, brandArticles }.
 */
export function buildIndexes(rates) {
  const brands = [...new Set(rates.map((r) => r.brand))].sort();
  const brandIndex = {};
  const brandArticles = {};
  rates.forEach((r) => {
    if (!brandIndex[r.brand]) brandIndex[r.brand] = [];
    brandIndex[r.brand].push(r);
    if (!brandArticles[r.brand]) brandArticles[r.brand] = [];
    if (!brandArticles[r.brand].includes(r.article)) brandArticles[r.brand].push(r.article);
  });
  return { brands, brandIndex, brandArticles };
}
