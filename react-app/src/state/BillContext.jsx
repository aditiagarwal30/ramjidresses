import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  defaultBillState,
  loadBillState,
  saveBillState,
  loadHistory,
  saveHistory,
  calcTotals,
} from '../lib/storage.js';
import { useAuth } from './AuthContext.jsx';
import { fetchAllBills, insertBill, updateBill, softDeleteBill } from '../lib/billsRemote.js';

const BillContext = createContext(null);

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  // Fallback for older browsers
  return 'b-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
}

export function BillProvider({ children }) {
  const { user } = useAuth();
  const [state, setState] = useState(loadBillState);
  const [history, setHistory] = useState(loadHistory);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [pendingCount, setPendingCount] = useState(0);

  // persist bill state on every change
  useEffect(() => { saveBillState(state); }, [state]);
  useEffect(() => { saveHistory(history); }, [history]);

  // Pull remote bills whenever a user becomes available.
  useEffect(() => {
    if (!user) return;
    let canceled = false;
    setSyncStatus('syncing');
    (async () => {
      try {
        const remote = await fetchAllBills();
        if (canceled) return;
        setHistory((prev) => {
          const remoteIds = new Set(remote.map((b) => b.id));
          const localOnly = prev.filter((b) => !remoteIds.has(b.id));
          return [...localOnly, ...remote];
        });
        setPendingCount(0);
        setSyncStatus('synced');
      } catch (e) {
        console.error('fetchAllBills failed', e);
        if (!canceled) setSyncStatus(navigator.onLine ? 'error' : 'offline');
      }
    })();
    return () => { canceled = true; };
  }, [user]);

  const totals = useMemo(() => calcTotals(state), [state]);

  const setCustomer = useCallback((name) => {
    setState((s) => ({ ...s, customer: (name || '').trim() }));
  }, []);

  const setSalesman = useCallback((name) => {
    setState((s) => ({ ...s, salesman: (name || '').trim() }));
  }, []);

  const setAddress = useCallback((address) => {
    setState((s) => ({ ...s, address: (address || '').trim() }));
  }, []);

  const addLine = useCallback((row, qty, opts = {}) => {
    if (!qty || qty <= 0) return;
    // Print rate on the sheet is ₹10 above what gets billed.
    const billedRate = Math.max(0, (row.rate || 0) - 10);
    setState((s) => ({
      ...s,
      lines: [
        ...s.lines,
        {
          brand: row.brand,
          article: row.article || '',
          size: row.size || '',
          rate: billedRate,
          qty,
          custom: !!opts.custom,
        },
      ],
    }));
  }, []);

  const addManual = useCallback((qty, rate) => {
    if (!qty || qty <= 0) return;
    setState((s) => ({
      ...s,
      lines: [
        ...s.lines,
        { brand: 'Manual', article: '', size: '', rate, qty, custom: true },
      ],
    }));
  }, []);

  const updateLine = useCallback((idx, patch) => {
    setState((s) => {
      const lines = [...s.lines];
      const cur = lines[idx];
      if (!cur) return s;
      lines[idx] = { ...cur, ...patch };
      return { ...s, lines };
    });
  }, []);

  const removeLine = useCallback((idx) => {
    setState((s) => {
      const lines = [...s.lines];
      lines.splice(idx, 1);
      return { ...s, lines };
    });
  }, []);

  const setDiscount = useCallback((discount) => {
    setState((s) => ({ ...s, discount }));
  }, []);

  const setGst = useCallback((gst) => {
    setState((s) => ({ ...s, gst }));
  }, []);

  const setTransport = useCallback((amount) => {
    setState((s) => ({ ...s, transport: Math.max(0, Number(amount) || 0) }));
  }, []);

  const setDeposit = useCallback((amount) => {
    setState((s) => ({ ...s, deposit: Math.max(0, Number(amount) || 0) }));
  }, []);

  const clearBill = useCallback(() => {
    setState(defaultBillState());
  }, []);

  const finalizeBill = useCallback(() => {
    // Build a snapshot. Bill number is server-assigned on insert; placeholder until then.
    const snapshot = JSON.parse(JSON.stringify(state));
    const t = calcTotals(snapshot);
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
    const timeStr = now.toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
    const billNo = '#…';
    const billRecord = {
      id: newId(),
      billNo,
      customer: snapshot.customer,
      date: dateStr,
      time: timeStr,
      total: t.total,
      items: snapshot.lines.length,
      qty: t.qtyCount,
      snapshot,
      pdfData: {
        lines: JSON.parse(JSON.stringify(snapshot.lines)),
        customer: snapshot.customer,
        salesman: snapshot.salesman || '',
        address: snapshot.address || '',
        discount: snapshot.discount,
        gst: snapshot.gst,
        totals: t,
        billNo,
        date: dateStr,
        time: timeStr,
      },
    };
    return billRecord;
  }, [state]);

  const pushHistory = useCallback(async (billRecord) => {
    // Optimistic local insert.
    setHistory((h) => [billRecord, ...h]);
    if (!user) return billRecord;
    setSyncStatus('syncing');
    try {
      const saved = await insertBill(billRecord, user.id);
      const merged = { ...saved, text: billRecord.text };
      setHistory((h) => h.map((b) => (b.id === saved.id ? merged : b)));
      setSyncStatus('synced');
      return merged;
    } catch (e) {
      console.error('insertBill failed', e);
      setSyncStatus(navigator.onLine ? 'error' : 'offline');
      setPendingCount((c) => c + 1);
      return billRecord;
    }
  }, [user]);

  const updateHistoryItem = useCallback(async (billRecord) => {
    setHistory((h) => h.map((b) => (b.id === billRecord.id ? billRecord : b)));
    if (!user) return billRecord;
    setSyncStatus('syncing');
    try {
      const saved = await updateBill(billRecord);
      const merged = { ...saved, text: billRecord.text };
      setHistory((h) => h.map((b) => (b.id === saved.id ? merged : b)));
      setSyncStatus('synced');
      return merged;
    } catch (e) {
      console.error('updateBill failed', e);
      setSyncStatus(navigator.onLine ? 'error' : 'offline');
      setPendingCount((c) => c + 1);
      return billRecord;
    }
  }, [user]);

  const deleteHistoryItem = useCallback(async (id) => {
    setHistory((h) => h.filter((x) => x.id !== id));
    if (!user) return;
    try {
      await softDeleteBill(id);
    } catch (e) {
      console.error('softDeleteBill failed', e);
      setSyncStatus(navigator.onLine ? 'error' : 'offline');
    }
  }, [user]);

  const value = useMemo(
    () => ({
      state, totals, history, syncStatus, pendingCount,
      setCustomer, setSalesman, setAddress, addLine, addManual, updateLine, removeLine,
      setDiscount, setGst, setTransport, setDeposit, clearBill, finalizeBill, pushHistory, updateHistoryItem, deleteHistoryItem,
    }),
    [
      state, totals, history, syncStatus, pendingCount,
      setCustomer, setSalesman, setAddress, addLine, addManual, updateLine, removeLine,
      setDiscount, setGst, setTransport, setDeposit, clearBill, finalizeBill, pushHistory, updateHistoryItem, deleteHistoryItem,
    ]
  );

  return <BillContext.Provider value={value}>{children}</BillContext.Provider>;
}

export function useBill() {
  const ctx = useContext(BillContext);
  if (!ctx) throw new Error('useBill must be used inside BillProvider');
  return ctx;
}
