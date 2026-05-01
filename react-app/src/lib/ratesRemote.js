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
  const [ratesRes, metaRes] = await Promise.all([
    supabase.from('rates').select('brand,article,size,rate'),
    supabase.from('rate_sheet_meta').select('file_name,updated_at').eq('id', 1).maybeSingle(),
  ]);
  if (ratesRes.error) throw ratesRes.error;
  if (metaRes.error) throw metaRes.error;
  return {
    rates: ratesRes.data || [],
    file_name: metaRes.data?.file_name || null,
    updated_at: metaRes.data?.updated_at || null,
  };
}

// Upsert just the supplied rows. Existing rows with other keys are untouched.
// Used for the "Add & update" merge flow.
export async function upsertRates(rows, fileName, userId) {
  if (!supabase) throw new Error('Supabase not configured');
  const when = new Date().toISOString();
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH).map((r) => toRow(r, userId, when));
    const { error } = await supabase
      .from('rates')
      .upsert(batch, { onConflict: 'brand,article,size' });
    if (error) throw error;
  }
  await upsertMeta(fileName, userId, when);
}

