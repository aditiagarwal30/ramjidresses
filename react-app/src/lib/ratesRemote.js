import { supabase } from './supabase.js';

const BATCH = 500;

function toRow(r, userId, when) {
  return {
    brand: r.brand,
    article: r.article || '',
    size: r.size,
    rate: r.rate,
    updated_by: userId,
    updated_at: when,
  };
}

async function upsertMeta(fileName, userId, when) {
  const { error } = await supabase.from('rate_sheet_meta').upsert(
    {
      id: 1,
      file_name: fileName || null,
      updated_by: userId,
      updated_at: when,
    },
    { onConflict: 'id' }
  );
  if (error) throw error;
}

export async function fetchRateSheet() {
  if (!supabase) return null;
  // Postgrest caps a single select at 1000 rows by default, so we page through
  // explicitly. Order by the primary key for a stable pagination window.
  const PAGE = 1000;
  const cols = 'brand,article,size,rate';
  const first = await supabase
    .from('rates')
    .select(cols, { count: 'exact' })
    .order('brand').order('article').order('size')
    .range(0, PAGE - 1);
  if (first.error) throw first.error;
  const total = first.count ?? (first.data?.length ?? 0);
  const all = first.data || [];
  while (all.length < total) {
    const next = await supabase
      .from('rates')
      .select(cols)
      .order('brand').order('article').order('size')
      .range(all.length, all.length + PAGE - 1);
    if (next.error) throw next.error;
    if (!next.data || next.data.length === 0) break;
    all.push(...next.data);
  }
  const metaRes = await supabase
    .from('rate_sheet_meta')
    .select('file_name,updated_at')
    .eq('id', 1)
    .maybeSingle();
  if (metaRes.error) throw metaRes.error;
  return {
    rates: all,
    file_name: metaRes.data?.file_name || null,
    updated_at: metaRes.data?.updated_at || null,
  };
}

// Upsert just the supplied rows. Existing rows with other keys are untouched.
// Used for the "Add & update" merge flow.
export async function upsertRates(rows, fileName, userId) {
  if (!supabase) throw new Error('Supabase not configured');
  // Postgres rejects duplicate conflict-target rows within a single ON CONFLICT
  // upsert (SQLSTATE 21000). User-uploaded sheets often contain dupes, so
  // collapse by (brand|article|size) here — last occurrence wins.
  const seen = new Map();
  for (const r of rows) seen.set(`${r.brand}|${r.article || ''}|${r.size}`, r);
  const deduped = Array.from(seen.values());
  const when = new Date().toISOString();
  for (let i = 0; i < deduped.length; i += BATCH) {
    const batch = deduped.slice(i, i + BATCH).map((r) => toRow(r, userId, when));
    const { error } = await supabase
      .from('rates')
      .upsert(batch, { onConflict: 'brand,article,size' });
    if (error) throw error;
  }
  await upsertMeta(fileName, userId, when);
}

