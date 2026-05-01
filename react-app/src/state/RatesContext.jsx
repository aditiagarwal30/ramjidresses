import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_RATES } from '../data/rates.js';
import { buildIndexes } from '../lib/indexes.js';
import {
  loadStoredRates,
  loadRatesMeta,
  saveRates as persistRates,
} from '../lib/storage.js';
import { useAuth } from './AuthContext.jsx';
import { fetchRateSheet, upsertRates } from '../lib/ratesRemote.js';

const RatesContext = createContext(null);

function loadInitialRates() {
  const stored = loadStoredRates();
  return stored && stored.length ? stored : DEFAULT_RATES;
}

export function RatesProvider({ children }) {
  const { user } = useAuth();
  const [rates, setRates] = useState(loadInitialRates);
  const [meta, setMeta] = useState(loadRatesMeta);
  const [ratesSyncStatus, setRatesSyncStatus] = useState('idle');

  const idx = useMemo(() => buildIndexes(rates), [rates]);

  // On user available: pull the shared rate sheet. If cloud is empty but this
  // device already has a custom local sheet (meta means it came from a CSV
  // upload), seed cloud with it — one-shot migration so existing customers
  // don't lose their rates when sync turns on.
  useEffect(() => {
    if (!user) return;
    let canceled = false;
    setRatesSyncStatus('syncing');
    (async () => {
      try {
        const sheet = await fetchRateSheet();
        if (canceled) return;
        if (sheet?.rates && Array.isArray(sheet.rates) && sheet.rates.length) {
          setRates(sheet.rates);
          if (persistRates(sheet.rates, sheet.file_name)) {
            setMeta(loadRatesMeta());
          }
        } else {
          const localMeta = loadRatesMeta();
          const localRates = loadStoredRates();
          if (localMeta && Array.isArray(localRates) && localRates.length) {
            await upsertRates(localRates, localMeta.fileName, user.id);
          }
        }
        setRatesSyncStatus('synced');
      } catch (e) {
        console.error('rate sheet sync failed', e);
        if (!canceled) setRatesSyncStatus(navigator.onLine ? 'error' : 'offline');
      }
    })();
    return () => { canceled = true; };
  }, [user]);

  const runRemote = useCallback(async (fn) => {
    if (!user) return { ok: true };
    setRatesSyncStatus('syncing');
    try {
      await fn();
      setRatesSyncStatus('synced');
      return { ok: true };
    } catch (e) {
      console.error('rates remote write failed', e);
      setRatesSyncStatus(navigator.onLine ? 'error' : 'offline');
      return { ok: false, error: e };
    }
  }, [user]);

  // "Add & update": only the supplied rows are upserted; existing cloud rows
  // with other keys are preserved.
  const mergeNewRates = useCallback(async (rows, fileName) => {
    const keyOf = (r) => `${r.brand}|${r.article || ''}|${r.size}`;
    let added = 0;
    let updated = 0;
    let merged;
    setRates((prev) => {
      const map = new Map();
      for (const r of prev) map.set(keyOf(r), r);
      for (const r of rows) {
        const k = keyOf(r);
        if (map.has(k)) updated++;
        else added++;
        map.set(k, r);
      }
      merged = Array.from(map.values());
      return merged;
    });
    const okLocal = persistRates(merged, fileName);
    if (okLocal) setMeta(loadRatesMeta());
    const remote = await runRemote(() => upsertRates(rows, fileName, user.id));
    return { okLocal, okRemote: remote.ok, added, updated, error: remote.error };
  }, [runRemote, user]);

  const value = useMemo(
    () => ({ rates, meta, idx, ratesSyncStatus, mergeNewRates }),
    [rates, meta, idx, ratesSyncStatus, mergeNewRates]
  );

  return <RatesContext.Provider value={value}>{children}</RatesContext.Provider>;
}

export function useRates() {
  const ctx = useContext(RatesContext);
  if (!ctx) throw new Error('useRates must be used inside RatesProvider');
  return ctx;
}
