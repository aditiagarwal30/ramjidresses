import { supabase } from './supabase.js';

// Map a DB row to the shape the rest of the app expects (matches BillContext.finalizeBill).
function rowToBill(row) {
  const created = new Date(row.created_at);
  const fallbackDate = created.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  const fallbackTime = created.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
  const billNo = row.bill_no || '#…';
  const date = row.snapshot?._dateStr || fallbackDate;
  const time = row.snapshot?._timeStr || fallbackTime;
  // bill_no is the source of truth — overwrite any stale value cached in pdf_data.
  const pdfData = row.pdf_data ? { ...row.pdf_data, billNo, date, time } : null;
  return {
    id: row.id,
    billNo,
    customer: row.customer || '',
    date,
    time,
    total: Number(row.total) || 0,
    items: row.items || 0,
    qty: row.qty || 0,
    snapshot: row.snapshot,
    pdfData,
  };
}

export async function fetchAllBills() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('bills')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(rowToBill);
}

export async function insertBill(bill, userId) {
  if (!supabase) throw new Error('Supabase not configured');
  // Stash original date/time strings inside snapshot so display matches device clock.
  const snapshot = { ...(bill.snapshot || {}), _dateStr: bill.date, _timeStr: bill.time };
  const payload = {
    id: bill.id,
    customer: bill.customer || null,
    total: bill.total,
    items: bill.items,
    qty: bill.qty,
    snapshot,
    pdf_data: bill.pdfData || null,
    created_by: userId,
  };
  const { data, error } = await supabase
    .from('bills')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return rowToBill(data);
}

// Update an existing bill's editable fields. Bill number, id, created_at,
// created_by are intentionally not touched — the bill keeps its identity.
export async function updateBill(bill) {
  if (!supabase) throw new Error('Supabase not configured');
  const snapshot = { ...(bill.snapshot || {}), _dateStr: bill.date, _timeStr: bill.time };
  const payload = {
    customer: bill.customer || null,
    total: bill.total,
    items: bill.items,
    qty: bill.qty,
    snapshot,
    pdf_data: bill.pdfData || null,
  };
  const { data, error } = await supabase
    .from('bills')
    .update(payload)
    .eq('id', bill.id)
    .select()
    .single();
  if (error) throw error;
  return rowToBill(data);
}

export async function softDeleteBill(id) {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase
    .from('bills')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}
